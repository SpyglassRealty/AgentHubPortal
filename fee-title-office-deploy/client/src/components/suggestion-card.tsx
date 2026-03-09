import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  X,
  ArrowRight,
  Inbox
} from "lucide-react";
import { Link } from "wouter";
import type { ContextSuggestion } from "@shared/schema";

interface SuggestionCardProps {
  suggestion: ContextSuggestion;
}

const suggestionIcons: Record<string, typeof AlertCircle> = {
  deal_action: AlertCircle,
  closing_soon: Calendar,
  pipeline_empty: Inbox,
  task_overdue: Clock,
  appointments_today: Calendar,
  deal_summary: TrendingUp,
};

const suggestionColors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  deal_action: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-900" },
  closing_soon: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", text: "text-emerald-900" },
  pipeline_empty: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", text: "text-blue-900" },
  task_overdue: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", text: "text-red-900" },
  appointments_today: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600", text: "text-purple-900" },
  deal_summary: { bg: "bg-[#FEF2F0]", border: "border-[#F8A080]", icon: "text-[#D4401F]", text: "text-[#5B3A28]" },
};

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const queryClient = useQueryClient();
  const Icon = suggestionIcons[suggestion.suggestionType] || AlertCircle;
  const colors = suggestionColors[suggestion.suggestionType] || suggestionColors.deal_action;

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/context/suggestions/${suggestion.id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/suggestions"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/context/suggestions/${suggestion.id}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/suggestions"] });
    },
  });

  return (
    <Card 
      className={`${colors.bg} ${colors.border} border-2 transition-all hover:shadow-md`}
      data-testid={`card-suggestion-${suggestion.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${colors.text}`} data-testid="text-suggestion-title">
              {suggestion.title}
            </h3>
            {suggestion.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {suggestion.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {suggestion.recommendedAppId && (
                <Link href={`/app/${suggestion.recommendedAppId}`}>
                  <Button
                    size="sm"
                    className="bg-[#EF4923] hover:bg-[#D4401F] text-white"
                    data-testid="button-take-action"
                  >
                    Take Action
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                data-testid="button-mark-done"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Done
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dismissMutation.mutate()}
            disabled={dismissMutation.isPending}
            data-testid="button-dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
