import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  content: string;
  source?: string;
}

export function InfoTooltip({ content, source }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            data-testid="button-info-tooltip"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs bg-popover text-popover-foreground border shadow-md p-3"
        >
          <p className="text-sm leading-relaxed">{content}</p>
          {source && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              Source: {source}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
