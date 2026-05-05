import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Suggestion {
  index: 0 | 1 | 2;
  label: "Quick update" | "Full response" | "Ask a question";
  body: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  voiceMatched: boolean;
}

export function SuggestedReplies({
  messageId,
  onUseSuggestion,
}: {
  messageId: string;
  onUseSuggestion: (body: string) => void;
}) {
  const [usedIndex, setUsedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery<SuggestionsResponse>({
    queryKey: ["/api/gmail/suggest-replies", messageId],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/suggest-replies/${messageId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate suggestions");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isError) return null;

  return (
    <div className="border-t shrink-0">
      {/* Collapsed header / toggle */}
      <button
        onClick={() => !isLoading && setIsExpanded(prev => !prev)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted/40 ${isLoading ? 'cursor-default' : 'cursor-pointer'}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-[#EF4923] animate-spin shrink-0" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#EF4923] shrink-0" />
        )}
        <span className="font-medium flex-1">
          {isLoading ? "Generating suggestions…" : "3 suggested replies"}
        </span>
        {!isLoading && data?.voiceMatched && (
          <Badge variant="secondary" className="text-xs">
            Voice matched
          </Badge>
        )}
        {!isLoading && (
          isExpanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded card grid */}
      {isExpanded && data?.suggestions && (
        <div className="px-4 pb-4 bg-muted/30">
          <div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3 pt-3">
            {data.suggestions.map((s) => (
              <div
                key={s.index}
                className="rounded-lg border bg-background p-3 flex flex-col gap-2 min-w-[200px] sm:min-w-0"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </span>
                <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">
                  {s.body}
                </p>
                <Button
                  variant={usedIndex === s.index ? "secondary" : "outline"}
                  size="sm"
                  className="w-full text-xs mt-auto shrink-0"
                  onClick={() => {
                    setUsedIndex(s.index);
                    setIsExpanded(false);
                    onUseSuggestion(s.body);
                  }}
                >
                  {usedIndex === s.index ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      In draft
                    </>
                  ) : (
                    "Use this reply"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
