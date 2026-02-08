import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Home,
  DollarSign,
  Clock,
  BarChart3,
  Ruler,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewData } from "./types";

// ─── Formatters ──────────────────────────────────────────────
function formatPrice(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatNumber(n: number): string {
  if (!n) return "0";
  return n.toLocaleString();
}

// ─── Animated Counter ────────────────────────────────────────
function AnimatedNumber({
  value,
  formatter,
  duration = 1200,
}: {
  value: number;
  formatter: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prevValue.current = end;
  }, [value, duration]);

  return <>{formatter(display)}</>;
}

// ─── Hero Stats Bar ──────────────────────────────────────────
interface HeroStatsBarProps {
  data?: OverviewData;
  isLoading: boolean;
}

export default function HeroStatsBar({ data, isLoading }: HeroStatsBarProps) {
  const stats = [
    {
      label: "Active Listings",
      value: data?.totalActive || 0,
      formatter: formatNumber,
      icon: Home,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Median List Price",
      value: data?.medianListPrice || 0,
      formatter: formatPrice,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg Days on Market",
      value: data?.avgDom || 0,
      formatter: (n: number) => `${n}`,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "New This Week",
      value: data?.newLast7 || 0,
      formatter: formatNumber,
      icon: Activity,
      color: "text-[#EF4923]",
      bgColor: "bg-[#EF4923]/10",
    },
    {
      label: "Months of Supply",
      value: data?.monthsOfSupply || 0,
      formatter: (n: number) => n.toFixed(1),
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Price / Sq Ft",
      value: data?.avgPricePerSqft || 0,
      formatter: (n: number) => `$${n}`,
      icon: Ruler,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <Card
          key={i}
          className="group relative overflow-hidden border-border hover:border-[#EF4923]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        >
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="text-xl font-bold font-display mt-0.5">
                  <AnimatedNumber value={stat.value} formatter={stat.formatter} />
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
