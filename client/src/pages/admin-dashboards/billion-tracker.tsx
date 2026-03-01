import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Calendar,
  Zap,
  Trophy,
  ArrowRight,
  Flame,
  Clock,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import {
  useRevenueData,
  useAnalyticsData,
  useRefreshDashboard,
  formatCurrency,
  formatNumber,
  type MonthlyTrend,
} from "@/lib/rezen-dashboard";
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
  ReferenceLine,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { useMemo } from "react";

// ── Constants ────────────────────────────────────────
const GOAL_VOLUME = 1_000_000_000; // $1B
const GOAL_AGENTS = 300;
const CURRENT_AGENTS = 179;
const GOAL_YEAR = 2026;

// Monthly volume targets (seasonality-adjusted for Austin real estate)
// Austin market has strong spring/summer, softer winter
const MONTHLY_SEASONALITY: Record<string, number> = {
  Jan: 0.065, Feb: 0.070, Mar: 0.085, Apr: 0.095, May: 0.105,
  Jun: 0.110, Jul: 0.105, Aug: 0.095, Sep: 0.085, Oct: 0.080,
  Nov: 0.055, Dec: 0.050,
};

// ── Helpers ──────────────────────────────────────────

function getMonthIndex(monthStr: string): number {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months.findIndex((m) => monthStr.startsWith(m));
  return m >= 0 ? m : 0;
}

function getDaysInYear(year: number): number {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getMonthsRemaining(): number {
  const now = new Date();
  return 12 - now.getMonth(); // months left including current
}

// Pace status helpers
type PaceStatus = "ahead" | "on-track" | "behind" | "critical";

function getPaceStatus(pctComplete: number, pctYearElapsed: number): PaceStatus {
  const ratio = pctComplete / Math.max(pctYearElapsed, 0.01);
  if (ratio >= 1.1) return "ahead";
  if (ratio >= 0.9) return "on-track";
  if (ratio >= 0.7) return "behind";
  return "critical";
}

function getPaceColor(status: PaceStatus): string {
  switch (status) {
    case "ahead": return "text-emerald-500";
    case "on-track": return "text-blue-500";
    case "behind": return "text-amber-500";
    case "critical": return "text-red-500";
  }
}

function getPaceBgColor(status: PaceStatus): string {
  switch (status) {
    case "ahead": return "bg-emerald-500";
    case "on-track": return "bg-blue-500";
    case "behind": return "bg-amber-500";
    case "critical": return "bg-red-500";
  }
}

function getPaceLabel(status: PaceStatus): string {
  switch (status) {
    case "ahead": return "Ahead of Pace";
    case "on-track": return "On Track";
    case "behind": return "Behind Pace";
    case "critical": return "Needs Attention";
  }
}

function getPaceIcon(status: PaceStatus) {
  switch (status) {
    case "ahead": return <Flame className="h-4 w-4" />;
    case "on-track": return <Target className="h-4 w-4" />;
    case "behind": return <Clock className="h-4 w-4" />;
    case "critical": return <AlertTriangle className="h-4 w-4" />;
  }
}

// ── Custom Tooltip ───────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, true)}
        </p>
      ))}
    </div>
  );
};

// ── Big Number Display ───────────────────────────────

function BigNumber({ value, label, sublabel, icon: Icon, color = "text-foreground" }: {
  value: string;
  label: string;
  sublabel?: string;
  icon?: any;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        {Icon && <Icon className={`h-5 w-5 ${color}`} />}
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sublabel && (
        <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export default function BillionTrackerPage() {
  const revenue = useRevenueData();
  const analytics = useAnalyticsData();
  const refreshMutation = useRefreshDashboard();

  const isLoading = revenue.isLoading || analytics.isLoading;
  const hasError = revenue.isError || analytics.isError;

  // ── Computed metrics ─────────────────────────────

  const metrics = useMemo(() => {
    const monthlyTrend = revenue.data?.monthlyTrend || [];
    const kpis = revenue.data?.kpis;
    const topAgents = analytics.data?.topAgents || [];

    // Filter to current year only
    const currentYearData = monthlyTrend.filter((m) => m.key.startsWith(String(GOAL_YEAR)));
    
    // Total closed volume this year
    const ytdVolume = currentYearData.reduce((sum, m) => sum + (m.volume || 0), 0);
    
    // Use KPI total volume as truth (includes all closed, not just this year's monthly buckets)
    // But filter to current year from monthly data
    const totalVolume = ytdVolume > 0 ? ytdVolume : (kpis?.closedVolume || 0);

    // Progress percentage
    const pctComplete = (totalVolume / GOAL_VOLUME) * 100;

    // Time calculations
    const dayOfYear = getDayOfYear();
    const daysInYear = getDaysInYear(GOAL_YEAR);
    const pctYearElapsed = (dayOfYear / daysInYear) * 100;
    const daysRemaining = daysInYear - dayOfYear;
    const monthsRemaining = getMonthsRemaining();

    // Pace
    const paceStatus = getPaceStatus(pctComplete, pctYearElapsed);
    const runRate = dayOfYear > 0 ? totalVolume / dayOfYear : 0;
    const projectedEOY = runRate * daysInYear;
    const onPaceTarget = (pctYearElapsed / 100) * GOAL_VOLUME;
    const gapToTarget = totalVolume - onPaceTarget;
    
    // What we need
    const volumeRemaining = GOAL_VOLUME - totalVolume;
    const volumePerMonthNeeded = monthsRemaining > 0 ? volumeRemaining / monthsRemaining : 0;
    const volumePerDayNeeded = daysRemaining > 0 ? volumeRemaining / daysRemaining : 0;

    // Deals metrics
    const dealCount = currentYearData.reduce((sum, m) => sum + (m.count || 0), 0) || (kpis?.commissionCount || 0);
    const avgDealSize = dealCount > 0 ? totalVolume / dealCount : 430000; // Austin avg fallback
    const dealsNeeded = avgDealSize > 0 ? Math.ceil(volumeRemaining / avgDealSize) : 0;
    const dealsPerMonthNeeded = monthsRemaining > 0 ? Math.ceil(dealsNeeded / monthsRemaining) : 0;

    // Agent productivity
    const avgVolumePerAgent = CURRENT_AGENTS > 0 ? totalVolume / CURRENT_AGENTS : 0;
    const avgVolumePerAgentAnnualized = dayOfYear > 0 ? (avgVolumePerAgent / dayOfYear) * daysInYear : 0;
    const agentsNeededAtCurrentRate = avgVolumePerAgentAnnualized > 0
      ? Math.ceil(GOAL_VOLUME / avgVolumePerAgentAnnualized)
      : GOAL_AGENTS;

    // Monthly chart data with targets
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = months.map((month, idx) => {
      const monthKey = `${GOAL_YEAR}-${String(idx + 1).padStart(2, "0")}`;
      const actual = currentYearData.find((m) => m.key === monthKey);
      const targetVolume = GOAL_VOLUME * (MONTHLY_SEASONALITY[month] || 1/12);
      
      return {
        month,
        actual: actual?.volume || 0,
        target: targetVolume,
        gci: actual?.grossGCI || 0,
        deals: actual?.count || 0,
      };
    });

    // Cumulative chart data
    let cumActual = 0;
    let cumTarget = 0;
    const cumulativeData = chartData.map((d) => {
      cumActual += d.actual;
      cumTarget += d.target;
      return {
        month: d.month,
        actual: cumActual,
        target: cumTarget,
        gap: cumActual - cumTarget,
      };
    });

    // Top agents from analytics
    const topPerformers = topAgents.slice(0, 10).map((a, idx) => ({
      rank: idx + 1,
      name: a.name,
      volume: a.volume,
      deals: a.count,
      gci: a.gci,
      pctOfGoal: (a.volume / GOAL_VOLUME) * 100,
    }));

    // Monthly GCI
    const ytdGCI = currentYearData.reduce((sum, m) => sum + (m.grossGCI || 0), 0) || (kpis?.grossGCI || 0);

    return {
      totalVolume,
      pctComplete,
      pctYearElapsed,
      paceStatus,
      runRate,
      projectedEOY,
      onPaceTarget,
      gapToTarget,
      volumeRemaining,
      volumePerMonthNeeded,
      volumePerDayNeeded,
      daysRemaining,
      monthsRemaining,
      dealCount,
      avgDealSize,
      dealsNeeded,
      dealsPerMonthNeeded,
      avgVolumePerAgent,
      avgVolumePerAgentAnnualized,
      agentsNeededAtCurrentRate,
      chartData,
      cumulativeData,
      topPerformers,
      ytdGCI,
    };
  }, [revenue.data, analytics.data]);

  // ── Loading State ────────────────────────────────

  if (isLoading) {
    return (
      <DashboardLayout
        title="$1B Goal Tracker"
        subtitle="Loading production data..."
        icon={Rocket}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  const {
    totalVolume, pctComplete, pctYearElapsed, paceStatus,
    projectedEOY, gapToTarget, volumeRemaining, volumePerMonthNeeded,
    daysRemaining, monthsRemaining, dealCount, avgDealSize,
    dealsNeeded, dealsPerMonthNeeded, avgVolumePerAgent,
    avgVolumePerAgentAnnualized, agentsNeededAtCurrentRate,
    chartData, cumulativeData, topPerformers, ytdGCI,
    volumePerDayNeeded, runRate,
  } = metrics;

  return (
    <DashboardLayout
      title="$1B Goal Tracker"
      subtitle={`Spyglass Realty ${GOAL_YEAR} — The road to one billion`}
      icon={Rocket}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={isLoading || refreshMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {hasError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some data couldn't be loaded from ReZen. Dashboard may show partial results.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hero: The Big Number ──────────────────── */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-10" />
          
          <CardContent className="relative p-8">
            {/* Main progress */}
            <div className="text-center mb-6">
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center justify-center gap-2">
                <Rocket className="h-4 w-4" />
                {GOAL_YEAR} PRODUCTION GOAL
              </div>
              <div className="text-6xl font-black tracking-tight mb-1">
                {formatCurrency(totalVolume, true)}
              </div>
              <div className="text-lg text-muted-foreground">
                of {formatCurrency(GOAL_VOLUME, true)} goal
              </div>
            </div>

            {/* Progress bar */}
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{pctComplete.toFixed(1)}% complete</span>
                <span>{(100 - pctComplete).toFixed(1)}% remaining</span>
              </div>
              <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                {/* Volume progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(pctComplete, 100)}%` }}
                />
                {/* Time marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                  style={{ left: `${Math.min(pctYearElapsed, 100)}%` }}
                  title={`${pctYearElapsed.toFixed(0)}% of year elapsed`}
                />
                {/* Time label */}
                <div
                  className="absolute -top-5 text-[10px] text-muted-foreground transform -translate-x-1/2"
                  style={{ left: `${Math.min(pctYearElapsed, 100)}%` }}
                >
                  Today
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Jan 1</span>
                <span>Dec 31</span>
              </div>
            </div>

            {/* Pace status badge */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`text-sm py-1 px-4 ${getPaceColor(paceStatus)} border-current`}
              >
                {getPaceIcon(paceStatus)}
                <span className="ml-2 font-semibold">{getPaceLabel(paceStatus)}</span>
                <span className="ml-2 text-muted-foreground">
                  {gapToTarget >= 0 ? "+" : ""}{formatCurrency(gapToTarget, true)} vs pace
                </span>
              </Badge>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ── KPI Row ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Projected EOY</div>
            <div className="text-2xl font-bold">{formatCurrency(projectedEOY, true)}</div>
            <div className={`text-xs font-medium ${projectedEOY >= GOAL_VOLUME ? "text-emerald-500" : "text-amber-500"}`}>
              {projectedEOY >= GOAL_VOLUME ? "✓ On pace to exceed goal" : `${formatCurrency(GOAL_VOLUME - projectedEOY, true)} short`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Volume Needed / Month</div>
            <div className="text-2xl font-bold">{formatCurrency(volumePerMonthNeeded, true)}</div>
            <div className="text-xs text-muted-foreground">
              {monthsRemaining} months remaining
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Deals This Year</div>
            <div className="text-2xl font-bold">{formatNumber(dealCount)}</div>
            <div className="text-xs text-muted-foreground">
              Avg {formatCurrency(avgDealSize, true)} / deal
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Deals Still Needed</div>
            <div className="text-2xl font-bold">{formatNumber(dealsNeeded)}</div>
            <div className="text-xs text-muted-foreground">
              ~{dealsPerMonthNeeded} / month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cumulative Volume vs Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumulative Volume vs Target</CardTitle>
            <CardDescription>Running total vs seasonality-adjusted $1B pace</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v, true)}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target Pace"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual Volume"
                  stroke="#8b5cf6"
                  fill="url(#gradActual)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Volume: Actual vs Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Volume</CardTitle>
            <CardDescription>Actual vs monthly target (seasonality-adjusted)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v, true)}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.actual >= entry.target ? "#10b981" : entry.actual > 0 ? "#f59e0b" : "#e5e7eb"}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Agent Productivity & Headcount ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Agent Headcount Tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agent Headcount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">{CURRENT_AGENTS}</div>
                <div className="text-sm text-muted-foreground">of {GOAL_AGENTS} target</div>
              </div>
              
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  style={{ width: `${(CURRENT_AGENTS / GOAL_AGENTS) * 100}%` }}
                />
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                {GOAL_AGENTS - CURRENT_AGENTS} agents to recruit
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net adds needed/month</span>
                  <span className="font-medium">
                    {Math.ceil((GOAL_AGENTS - CURRENT_AGENTS) / Math.max(monthsRemaining, 1))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agents needed at current rate</span>
                  <span className="font-medium">{agentsNeededAtCurrentRate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current avg/agent (YTD)</span>
                  <span className="font-medium">{formatCurrency(avgVolumePerAgent, true)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Projected avg/agent (annual)</span>
                  <span className="font-medium">{formatCurrency(avgVolumePerAgentAnnualized, true)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* The Math */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              The Math
            </CardTitle>
            <CardDescription>What it takes to hit $1B</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Volume Remaining
                </div>
                <div className="text-2xl font-bold">{formatCurrency(volumeRemaining, true)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily run rate needed</span>
                  <span className="font-medium">{formatCurrency(volumePerDayNeeded, true)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current daily run rate</span>
                  <span className={`font-medium ${runRate >= volumePerDayNeeded ? "text-emerald-500" : "text-amber-500"}`}>
                    {formatCurrency(runRate, true)}
                  </span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly GCI (YTD avg)</span>
                  <span className="font-medium">
                    {formatCurrency(monthsRemaining < 12 ? ytdGCI / (12 - monthsRemaining || 1) : 0, true)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">YTD GCI</span>
                  <span className="font-medium">{formatCurrency(ytdGCI, true)}</span>
                </div>
                <div className="border-t my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days remaining</span>
                  <span className="font-medium">{daysRemaining}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Months remaining</span>
                  <span className="font-medium">{monthsRemaining}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scenarios
            </CardTitle>
            <CardDescription>Paths to $1B</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  label: "Keep current pace",
                  agents: CURRENT_AGENTS,
                  perAgent: avgVolumePerAgentAnnualized,
                  result: CURRENT_AGENTS * avgVolumePerAgentAnnualized,
                },
                {
                  label: "Recruit to 220 agents",
                  agents: 220,
                  perAgent: avgVolumePerAgentAnnualized,
                  result: 220 * avgVolumePerAgentAnnualized,
                },
                {
                  label: "Recruit to 250 agents",
                  agents: 250,
                  perAgent: avgVolumePerAgentAnnualized,
                  result: 250 * avgVolumePerAgentAnnualized,
                },
                {
                  label: "Hit 300 agents",
                  agents: 300,
                  perAgent: avgVolumePerAgentAnnualized,
                  result: 300 * avgVolumePerAgentAnnualized,
                },
                {
                  label: "300 agents + 20% productivity boost",
                  agents: 300,
                  perAgent: avgVolumePerAgentAnnualized * 1.2,
                  result: 300 * avgVolumePerAgentAnnualized * 1.2,
                },
              ].map((scenario, idx) => {
                const hitsGoal = scenario.result >= GOAL_VOLUME;
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${hitsGoal ? "border-emerald-500/30 bg-emerald-500/5" : "border-muted"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{scenario.label}</span>
                      {hitsGoal && <Trophy className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{scenario.agents} agents × {formatCurrency(scenario.perAgent, true)}/agent</span>
                      <span className={`font-bold ${hitsGoal ? "text-emerald-500" : "text-foreground"}`}>
                        {formatCurrency(scenario.result, true)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${hitsGoal ? "bg-emerald-500" : "bg-purple-500"}`}
                        style={{ width: `${Math.min((scenario.result / GOAL_VOLUME) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Performers ───────────────────────── */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Performers — Contributing to $1B
            </CardTitle>
            <CardDescription>
              Your top producers and their share of the goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pl-2">#</th>
                    <th className="text-left py-2">Agent</th>
                    <th className="text-right py-2">Volume</th>
                    <th className="text-right py-2">GCI</th>
                    <th className="text-right py-2">Deals</th>
                    <th className="text-right py-2 pr-2">% of Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((agent) => (
                    <tr key={agent.rank} className="border-b border-muted hover:bg-muted/50 transition-colors">
                      <td className="py-2 pl-2">
                        {agent.rank <= 3 ? (
                          <span className={`font-bold ${
                            agent.rank === 1 ? "text-amber-500" :
                            agent.rank === 2 ? "text-slate-400" :
                            "text-amber-700"
                          }`}>
                            {agent.rank === 1 ? "🥇" : agent.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{agent.rank}</span>
                        )}
                      </td>
                      <td className="py-2 font-medium">{agent.name}</td>
                      <td className="py-2 text-right">{formatCurrency(agent.volume, true)}</td>
                      <td className="py-2 text-right">{formatCurrency(agent.gci, true)}</td>
                      <td className="py-2 text-right">{agent.deals}</td>
                      <td className="py-2 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${Math.min(agent.pctOfGoal * 20, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground min-w-[3rem] text-right">
                            {agent.pctOfGoal.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
