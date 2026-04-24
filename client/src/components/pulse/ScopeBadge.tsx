import { Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ScopeInfo } from "./types";

interface ScopeBadgeProps {
  scope: ScopeInfo;
}

export default function ScopeBadge({ scope }: ScopeBadgeProps) {
  if (scope.type !== "community" || !scope.communityName) return null;
  return (
    <Badge
      variant="outline"
      className="text-[10px] gap-1.5 font-normal text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-400"
    >
      <Navigation className="h-2.5 w-2.5" />
      ZIP {scope.zip} · {scope.communityName}
    </Badge>
  );
}
