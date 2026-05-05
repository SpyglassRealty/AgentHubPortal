import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";

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
    <div className="border-t bg-muted/30 p-4 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#EF4923]" />
        <span className="text-sm font-medium">Suggested replies</span>
        {data?.voiceMatched && (
          <Badge variant="secondary" className="text-xs">
            Voice matched
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border bg-background p-3 space-y-2 min-w-[200px] sm:min-w-0"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-full mt-1" />
            </div>
          ))}
        </div>
      ) : data?.suggestions ? (
        <div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3">
          {data.suggestions.map((s) => (
            <div
              key={s.index}
              className="rounded-lg border bg-background p-3 flex flex-col gap-2 min-w-[200px] sm:min-w-0"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {s.label}
              </span>
              <p className="text-sm text-foreground line-clamp-3 flex-1 whitespace-pre-wrap">
                {s.body}
              </p>
              <Button
                variant={usedIndex === s.index ? "secondary" : "outline"}
                size="sm"
                className="w-full text-xs mt-auto shrink-0"
                onClick={() => {
                  setUsedIndex(s.index);
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
      ) : null}
    </div>
  );
}
