import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  Label,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────

interface AffordabilityPoint {
  date: string;
  year: number;
  month?: number;
  salaryToAfford: number;
  medianIncome: number;
  homeValue: number;
  mortgageRate: number;
}

interface AffordabilityHistoryResponse {
  zip: string;
  period: "yearly" | "monthly";
  data: AffordabilityPoint[];
  meta: {
    downPaymentPct: number;
    propertyTaxRate: number;
    insuranceRate: number;
    housingCostRatio: number;
    source: string;
    description: string;
  };
}

interface AffordabilityChartProps {
  selectedZip: string | null;
  className?: string;
}

// ─── Custom Tooltip ───────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const salaryData = payload.find((p: any) => p.dataKey === "salaryToAfford");
  const incomeData = payload.find((p: any) => p.dataKey === "medianIncome");
  const homeValueData = payload[0]?.payload;

  const salary = salaryData?.value;
  const income = incomeData?.value;
  const gap = salary && income ? salary - income : null;
  const gapPct = salary && income ? ((gap! / income) * 100).toFixed(0) : null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground text-sm">{label}</p>
      {salaryData && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} />
          <span className="text-muted-foreground">Salary to Afford:</span>
          <span className="font-bold text-foreground">${(salary / 1000).toFixed(0)}K</span>
        </div>
      )}
      {incomeData && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-muted-foreground">Median Income:</span>
          <span className="font-bold text-foreground">${(income / 1000).toFixed(0)}K</span>
        </div>
      )}
      {gap != null && gap > 0 && (
        <div className="pt-1 border-t border-border">
          <span className="text-red-500 font-semibold">
            Gap: ${(gap / 1000).toFixed(0)}K ({gapPct}% above income)
          </span>
        </div>
      )}
      {gap != null && gap <= 0 && (
        <div className="pt-1 border-t border-border">
          <span className="text-emerald-500 font-semibold">
            Affordable ✓ (income covers costs)
          </span>
        </div>
      )}
      {homeValueData?.homeValue && (
        <div className="text-muted-foreground">
          Home Value: ${(homeValueData.homeValue / 1000).toFixed(0)}K • Rate: {homeValueData.mortgageRate}%
        </div>
      )}
    </div>
  );
}

// ─── Custom Data Label ────────────────────────────────────────

function DataLabel({ x, y, value, index, data, dataKey }: any) {
  // Only show labels at key points: first, last, and every 4th point for yearly, every 6th for monthly
  if (!data || !value) return null;
  const totalPoints = data.length;
  const interval = totalPoints > 15 ? 6 : 4;
  const isKeyPoint = index === 0 || index === totalPoints - 1 || index % interval === 0;
  if (!isKeyPoint) return null;

  const label = `$${(value / 1000).toFixed(0)}K`;
  const yOffset = dataKey === "salaryToAfford" ? -12 : 16;
  const fill = dataKey === "salaryToAfford" ? "#6b7280" : "#22c55e";

  return (
    <text x={x} y={y + yOffset} textAnchor="middle" fontSize={10} fontWeight={600} fill={fill}>
      {label}
    </text>
  );
}

// ─── Year Range Constants ─────────────────────────────────────

const YEARLY_START = 2005;
const YEARLY_END = 2025;
const YEARLY_RANGE = YEARLY_END - YEARLY_START;

// ─── Main Component ───────────────────────────────────────────

export default function AffordabilityChart({
  selectedZip,
  className = "",
}: AffordabilityChartProps) {
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const [yearRange, setYearRange] = useState<[number, number]>([YEARLY_START, YEARLY_END]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#999" : "#666";

  // Fetch affordability history data
  const { data: historyData, isLoading } = useQuery<AffordabilityHistoryResponse>({
    queryKey: ["/api/pulse/v2/zip", selectedZip, "affordability-history", period],
    queryFn: async () => {
      const zip = selectedZip || "78704";
      const res = await fetch(
        `/api/pulse/v2/zip/${zip}/affordability-history?period=${period}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch affordability history");
      return res.json();
    },
    enabled: !!selectedZip,
    staleTime: 1000 * 60 * 5,
  });

  // Filter data by year range
  const filteredData = useMemo(() => {
    if (!historyData?.data) return [];
    return historyData.data.filter((point) => {
      const year = point.year;
      return year >= yearRange[0] && year <= yearRange[1];
    });
  }, [historyData?.data, yearRange]);

  // Calculate gap stats
  const gapStats = useMemo(() => {
    if (!filteredData.length) return null;
    const latest = filteredData[filteredData.length - 1];
    const earliest = filteredData[0];
    const currentGap = latest.salaryToAfford - latest.medianIncome;
    const startGap = earliest.salaryToAfford - earliest.medianIncome;
    const maxSalary = Math.max(...filteredData.map((d) => d.salaryToAfford));
    const minSalary = Math.min(...filteredData.map((d) => d.salaryToAfford));
    return {
      currentGap,
      startGap,
      gapGrowth: currentGap - startGap,
      maxSalary,
      minSalary,
      latestYear: latest.date,
      latestSalary: latest.salaryToAfford,
      latestIncome: latest.medianIncome,
    };
  }, [filteredData]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!filteredData.length) return;
    const csv = [
      "Date,Salary to Afford,Median Income,Home Value,Mortgage Rate",
      ...filteredData.map(
        (d) => `${d.date},${d.salaryToAfford},${d.medianIncome},${d.homeValue},${d.mortgageRate}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affordability-history-${selectedZip || "78704"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredData, selectedZip]);

  // Y-axis formatter
  const formatYAxis = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-display font-bold text-foreground">
                Salary to Afford a House
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px] text-xs">
                    <p>
                      Annual salary required so that mortgage + property tax + insurance ≤ 30% of
                      gross income. Assumes 20% down, 30-year fixed rate.
                    </p>
                    {historyData?.meta && (
                      <p className="mt-1 text-muted-foreground">
                        Tax rate: {(historyData.meta.propertyTaxRate * 100).toFixed(1)}% •
                        Insurance: {(historyData.meta.insuranceRate * 100).toFixed(1)}%
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {selectedZip && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ZIP {selectedZip} • {period === "yearly" ? "Yearly" : "Monthly"} •{" "}
                {yearRange[0]}–{yearRange[1]}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!filteredData.length}
            className="bg-[#EF4923] hover:bg-[#d4411f] text-white text-xs h-7 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period toggle */}
          <div className="flex bg-muted rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => setPeriod("yearly")}
              className={`px-2.5 py-1 rounded transition-colors ${
                period === "yearly"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-2.5 py-1 rounded transition-colors ${
                period === "monthly"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Gap stat badge */}
          {gapStats && gapStats.currentGap > 0 && (
            <div className="ml-auto px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-600 dark:text-red-400">
              Gap: ${(gapStats.currentGap / 1000).toFixed(0)}K above median income
            </div>
          )}
          {gapStats && gapStats.currentGap <= 0 && (
            <div className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Affordable ✓
            </div>
          )}
        </div>

        {/* Summary stats */}
        {gapStats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-md border border-border bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Salary Needed</p>
              <p className="text-sm font-bold text-foreground">
                ${(gapStats.latestSalary / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-2 rounded-md border border-border bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Median Income</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ${(gapStats.latestIncome / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-2 rounded-md border border-border bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Year</p>
              <p className="text-sm font-bold text-foreground">{gapStats.latestYear}</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4 flex-1 min-h-[300px]">
        {isLoading ? (
          <Skeleton className="h-full w-full min-h-[280px]" />
        ) : !filteredData.length ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground min-h-[280px]">
            {!selectedZip
              ? "Click a zip code on the map to see affordability trends"
              : "No affordability data available"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Gap fill between the two lines */}
                <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />

              <XAxis
                dataKey="date"
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                interval={period === "monthly" ? 5 : 1}
              />

              <YAxis
                tick={{ fill: textColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                tickFormatter={formatYAxis}
                width={65}
                domain={["auto", "auto"]}
              />

              <RechartsTooltip content={<CustomTooltip />} />

              {/* Salary to Afford line (dark gray) */}
              <Line
                type="monotone"
                dataKey="salaryToAfford"
                name="Salary to Afford"
                stroke={isDark ? "#9ca3af" : "#4b5563"}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: isDark ? "#9ca3af" : "#4b5563", stroke: "#fff", strokeWidth: 2 }}
                label={<DataLabel data={filteredData} dataKey="salaryToAfford" />}
              />

              {/* Median Income line (green) */}
              <Line
                type="monotone"
                dataKey="medianIncome"
                name="Median Income"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                label={<DataLabel data={filteredData} dataKey="medianIncome" />}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Year Range Slider */}
      {period === "yearly" && filteredData.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{yearRange[0]}</span>
            <span className="font-semibold">Year Range</span>
            <span>{yearRange[1]}</span>
          </div>
          <Slider
            min={YEARLY_START}
            max={YEARLY_END}
            step={1}
            value={yearRange}
            onValueChange={(val) => setYearRange(val as [number, number])}
            className="w-full"
          />
        </div>
      )}

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-0.5 rounded-full"
            style={{ backgroundColor: isDark ? "#9ca3af" : "#4b5563" }}
          />
          <span className="text-muted-foreground">Salary to Afford</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Median Income</span>
        </div>
        <div className="ml-auto text-[10px] text-muted-foreground/60">
          {historyData?.meta?.source || "Zillow / Freddie Mac / Census"}
        </div>
      </div>
    </div>
  );
}
