import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  category?: "transactions" | "revenue" | "listings" | "network" | "revshare";
  tooltip?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}

const categoryColors: Record<string, string> = {
  transactions: "border-l-teal-500",
  revenue: "border-l-emerald-500",
  listings: "border-l-pink-400",
  network: "border-l-red-400",
  revshare: "border-l-orange-400",
};

const categoryBadgeColors: Record<string, string> = {
  transactions: "bg-teal-500 text-white",
  revenue: "bg-emerald-500 text-white",
  listings: "bg-pink-400 text-white",
  network: "bg-red-400 text-white",
  revshare: "bg-orange-400 text-white",
};

export function KpiCard({
  title,
  value,
  subtitle,
  category = "transactions",
  tooltip,
  trend,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow hover:shadow-md",
        categoryColors[category],
        className
      )}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
        {category && (
          <span
            className={cn(
              "text-[10px] font-medium uppercase px-2 py-0.5 rounded-full mb-2",
              categoryBadgeColors[category]
            )}
          >
            {category === "revshare" ? "RevShare" : category.charAt(0).toUpperCase() + category.slice(1)}
          </span>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="text-3xl font-bold mt-1">{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
        {trend && (
          <div
            className={cn(
              "text-xs font-medium mt-1",
              trend.direction === "up" && "text-emerald-600",
              trend.direction === "down" && "text-red-500",
              trend.direction === "neutral" && "text-muted-foreground"
            )}
          >
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
