import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";
import type { TrendMonth } from "./types";

function formatFullPrice(n: number): string {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number): string {
  if (!n) return "0";
  return n.toLocaleString();
}

interface MarketTrendsProps {
  trends?: TrendMonth[];
  isLoading: boolean;
}

export default function MarketTrends({ trends, isLoading }: MarketTrendsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#999" : "#666";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!trends?.length) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#EF4923]" />
        Market Trends — Last 6 Months
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median Sale Price */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Median Sale Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4923" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4923" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis
                  tick={{ fill: textColor, fontSize: 12 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatFullPrice(value), "Median Price"]}
                />
                <Area
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="#EF4923"
                  strokeWidth={2.5}
                  fill="url(#priceGrad)"
                  dot={{ r: 4, fill: "#EF4923", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#EF4923" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Closed Sales Volume */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Closed Sales (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4923" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#EF4923" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatNumber(value), "Sales"]}
                />
                <Bar dataKey="closedCount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average DOM */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              Average Days on Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="domGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "#2a2a2a" : "#fff",
                    border: "1px solid",
                    borderColor: isDark ? "#444" : "#ddd",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} days`, "Avg DOM"]}
                />
                <Area
                  type="monotone"
                  dataKey="avgDom"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#domGrad)"
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#8b5cf6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
