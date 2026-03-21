import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Rocket,
  Users,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Zap,

  RefreshCw,
} from "lucide-react";
import {
  useXanoRoster,
  useXanoTransactionsClosed,
  useXanoNetwork,
  formatCurrency,
  formatNumber,
  type XanoRosterMember,
} from "@/lib/xano";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";

// ── Constants ──────────────────────────────────────
const GOAL_AGENTS = 300;
const GOAL_VOLUME = 1_000_000_000; // $1B
const GOAL_YEAR = 2026;

// ── Utility: parse date safely ──
function safeDate(d: string | undefined | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ── Utility: month key ──
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`;
}

// ── Component ──────────────────────────────────────

export default function GrowthTrajectoryPage() {
  const { data: roster, isLoading: rosterLoading, refetch: refetchRoster } = useXanoRoster();
  const { data: closedTxns, isLoading: closedLoading, refetch: refetchClosed } = useXanoTransactionsClosed();
  const { data: network, isLoading: networkLoading, refetch: refetchNetwork } = useXanoNetwork();

  const isLoading = rosterLoading || closedLoading || networkLoading;

  const handleRefresh = () => {
    refetchRoster();
    refetchClosed();
    refetchNetwork();
  };

  // ── Core Analysis ──
  const analysis = useMemo(() => {
    if (!roster) return null;

    const now = new Date();
    const currentMonth = monthKey(now);

    // Active agents
    const activeAgents = roster.filter(
      (m) =>
        m.status?.toLowerCase() !== "terminated" &&
        m.status?.toLowerCase() !== "inactive"
    );
    const totalActive = activeAgents.length;

    // ── Join date analysis (growth curve) ──
    const joinsByMonth: Record<string, { joins: number; cumulative: number; names: string[] }> = {};
    const sortedByJoin = [...activeAgents]
      .map((a) => ({
        ...a,
        joinParsed: safeDate(a.join_date),
        displayName: a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim(),
      }))
      .filter((a) => a.joinParsed)
      .sort((a, b) => a.joinParsed!.getTime() - b.joinParsed!.getTime());

    // Build monthly join data
    let cumulative = 0;
    const monthSet = new Set<string>();
    sortedByJoin.forEach((a) => {
      const mk = monthKey(a.joinParsed!);
      monthSet.add(mk);
      if (!joinsByMonth[mk]) joinsByMonth[mk] = { joins: 0, cumulative: 0, names: [] };
      joinsByMonth[mk].joins++;
      joinsByMonth[mk].names.push(a.displayName);
    });

    // Fill in gaps and compute cumulative
    const allMonths = Array.from(monthSet).sort();
    // Extend to include current month
    if (allMonths.length > 0 && !allMonths.includes(currentMonth)) {
      allMonths.push(currentMonth);
    }

    cumulative = 0;
    const growthData = allMonths.map((mk) => {
      const entry = joinsByMonth[mk] || { joins: 0, cumulative: 0, names: [] };
      cumulative += entry.joins;
      return {
        month: mk,
        label: monthLabel(mk),
        newJoins: entry.joins,
        totalAgents: cumulative,
        goalLine: GOAL_AGENTS,
      };
    });

    // ── Recent growth velocity (last 6 months) ──
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentJoins = sortedByJoin.filter(
      (a) => a.joinParsed! >= sixMonthsAgo
    );
    const monthlyJoinRate = recentJoins.length / 6;

    // ── Departures (estimate from terminated) ──
    const allRoster = roster || [];
    const terminated = allRoster.filter(
      (m) => m.status?.toLowerCase() === "terminated" || m.status?.toLowerCase() === "inactive"
    );
    const recentTerminated = terminated.filter((m) => {
      // Use any date field to approximate departure
      const d = safeDate(m.last_login) || safeDate(m.join_date);
      return d && d >= sixMonthsAgo;
    });
    const monthlyDepartureRate = recentTerminated.length / 6;
    const netMonthlyGrowth = monthlyJoinRate - monthlyDepartureRate;

    // ── Projection ──
    const agentsNeeded = GOAL_AGENTS - totalActive;
    const monthsToGoal = netMonthlyGrowth > 0 ? Math.ceil(agentsNeeded / netMonthlyGrowth) : Infinity;
    const projectedGoalDate = new Date(now);
    projectedGoalDate.setMonth(projectedGoalDate.getMonth() + monthsToGoal);
    const onTrack = monthsToGoal <= 12; // Can hit 300 by end of 2026

    // Project forward for chart
    const projectionData = [];
    let projected = totalActive;
    for (let i = 1; i <= 18; i++) {
      const projDate = new Date(now);
      projDate.setMonth(projDate.getMonth() + i);
      projected += netMonthlyGrowth;
      projectionData.push({
        month: monthKey(projDate),
        label: monthLabel(monthKey(projDate)),
        projected: Math.round(projected),
        goalLine: GOAL_AGENTS,
      });
    }

    // ── Tenure breakdown ──
    const tenureBuckets = {
      "< 3 months": 0,
      "3-6 months": 0,
      "6-12 months": 0,
      "1-2 years": 0,
      "2-3 years": 0,
      "3+ years": 0,
    };
    activeAgents.forEach((a) => {
      const jd = safeDate(a.join_date);
      if (!jd) return;
      const days = Math.floor((now.getTime() - jd.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 90) tenureBuckets["< 3 months"]++;
      else if (days < 180) tenureBuckets["3-6 months"]++;
      else if (days < 365) tenureBuckets["6-12 months"]++;
      else if (days < 730) tenureBuckets["1-2 years"]++;
      else if (days < 1095) tenureBuckets["2-3 years"]++;
      else tenureBuckets["3+ years"]++;
    });

    const tenureData = Object.entries(tenureBuckets).map(([range, count]) => ({
      range,
      count,
      pct: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
    }));

    // ── Location breakdown ──
    const locationCounts: Record<string, number> = {};
    activeAgents.forEach((a) => {
      const loc = a.location || "Unknown";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const locationData = Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Volume per agent ──
    const totalVolume = (closedTxns || []).reduce(
      (sum, t) => sum + (t.volume || t.price || t.sale_price || t.close_price || 0),
      0
    );
    const volumePerAgent = totalActive > 0 ? totalVolume / totalActive : 0;
    const volumeGoalPerAgent = GOAL_VOLUME / GOAL_AGENTS; // ~$3.33M per agent
    const currentRunRate = totalVolume; // annualized from available data
    const volumeGap = GOAL_VOLUME - currentRunRate;

    // ── What needs to happen ──
    // Two paths to $1B: more agents OR more production per agent
    const agentsNeededAtCurrentPace = volumePerAgent > 0 ? Math.ceil(GOAL_VOLUME / volumePerAgent) : 999;
    const productionGapPct =
      volumePerAgent > 0
        ? Math.round(((volumeGoalPerAgent - volumePerAgent) / volumePerAgent) * 100)
        : 0;

    // ── Quarterly join trends ──
    const quarterlyData: { quarter: string; joins: number; departures: number; net: number }[] = [];
    const quarters = [
      { label: "Q1 2025", start: new Date(2025, 0, 1), end: new Date(2025, 3, 1) },
      { label: "Q2 2025", start: new Date(2025, 3, 1), end: new Date(2025, 6, 1) },
      { label: "Q3 2025", start: new Date(2025, 6, 1), end: new Date(2025, 9, 1) },
      { label: "Q4 2025", start: new Date(2025, 9, 1), end: new Date(2026, 0, 1) },
      { label: "Q1 2026", start: new Date(2026, 0, 1), end: new Date(2026, 3, 1) },
    ];
    quarters.forEach((q) => {
      const joins = sortedByJoin.filter(
        (a) => a.joinParsed! >= q.start && a.joinParsed! < q.end
      ).length;
      const deps = terminated.filter((m) => {
        const d = safeDate(m.last_login) || safeDate(m.join_date);
        return d && d >= q.start && d < q.end;
      }).length;
      quarterlyData.push({
        quarter: q.label,
        joins,
        departures: deps,
        net: joins - deps,
      });
    });

    return {
      totalActive,
      agentsNeeded,
      monthlyJoinRate: Math.round(monthlyJoinRate * 10) / 10,
      monthlyDepartureRate: Math.round(monthlyDepartureRate * 10) / 10,
      netMonthlyGrowth: Math.round(netMonthlyGrowth * 10) / 10,
      monthsToGoal,
      projectedGoalDate,
      onTrack,
      progressPct: Math.round((totalActive / GOAL_AGENTS) * 100),
      growthData: growthData.slice(-24), // Last 24 months
      projectionData,
      tenureData,
      locationData,
      totalVolume,
      volumePerAgent,
      volumeGoalPerAgent,
      currentRunRate,
      volumeGap,
      agentsNeededAtCurrentPace,
      productionGapPct,
      quarterlyData,
      recentJoins: recentJoins.slice(-10).reverse().map((a) => ({
        name: a.displayName,
        joinDate: a.joinParsed!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      })),
    };
  }, [roster, closedTxns]);

  if (isLoading || !analysis) {
    return (
      <DashboardLayout title="Growth Trajectory" subtitle="Loading growth data..." icon={Rocket}>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const {
    totalActive,
    agentsNeeded,
    monthlyJoinRate,
    monthlyDepartureRate,
    netMonthlyGrowth,
    monthsToGoal,
    projectedGoalDate,
    onTrack,
    progressPct,
    growthData,
    projectionData,
    tenureData,
    locationData,
    totalVolume,
    volumePerAgent,
    volumeGoalPerAgent,
    currentRunRate,
    volumeGap,
    agentsNeededAtCurrentPace,
    productionGapPct,
    quarterlyData,
    recentJoins,
  } = analysis;

  // Combine historical + projection for the main chart
  const combinedChartData = [
    ...growthData.map((d) => ({
      ...d,
      actual: d.totalAgents,
      projected: undefined as number | undefined,
    })),
    ...projectionData.map((d) => ({
      ...d,
      actual: undefined as number | undefined,
      newJoins: undefined as number | undefined,
      totalAgents: undefined as number | undefined,
    })),
  ];

  // Bridge the gap: add projected starting from last actual
  if (growthData.length > 0) {
    const lastActual = growthData[growthData.length - 1];
    if (projectionData.length > 0 && !projectionData[0].projected) {
      // Already has projected values
    }
    // Set the first projection point to match last actual
    if (combinedChartData.length > growthData.length) {
      combinedChartData[growthData.length - 1].projected = lastActual.totalAgents;
    }
  }

  return (
    <DashboardLayout
      title="Growth Trajectory"
      subtitle={`Path to ${GOAL_AGENTS} agents & $1B in ${GOAL_YEAR}`}
      icon={Rocket}
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── Hero Progress Bar ── */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="text-lg font-bold">
                    {totalActive} → {GOAL_AGENTS} Agents
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {agentsNeeded} more needed • {progressPct}% of goal
                  </p>
                </div>
              </div>
              <Badge
                variant={onTrack ? "default" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {onTrack ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    On Track
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Needs Acceleration
                  </>
                )}
              </Badge>
            </div>
            <Progress value={progressPct} className="h-4" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Current: {totalActive}</span>
              <span>
                Projected:{" "}
                {monthsToGoal < Infinity
                  ? projectedGoalDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "Not on current trajectory"}
              </span>
              <span>Goal: {GOAL_AGENTS}</span>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI Row ── */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Active Agents
              </div>
              <div className="text-3xl font-bold">{totalActive}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {agentsNeeded} to goal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                Monthly Joins
              </div>
              <div className="text-3xl font-bold text-green-600">
                {monthlyJoinRate}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                avg last 6 months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                Monthly Departures
              </div>
              <div className="text-3xl font-bold text-red-600">
                {monthlyDepartureRate}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                avg last 6 months
              </p>
            </CardContent>
          </Card>

          <Card className={netMonthlyGrowth > 0 ? "border-green-500/30" : "border-red-500/30"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Net Growth/Mo
              </div>
              <div
                className={`text-3xl font-bold ${
                  netMonthlyGrowth > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {netMonthlyGrowth > 0 ? "+" : ""}
                {netMonthlyGrowth}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthsToGoal < Infinity
                  ? `${monthsToGoal} months to 300`
                  : "Negative growth"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                ETA to 300
              </div>
              <div className="text-2xl font-bold">
                {monthsToGoal < Infinity
                  ? projectedGoalDate.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthsToGoal < Infinity ? `${monthsToGoal} months` : "Need positive net growth"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── What Needs to Happen Alert ── */}
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <span className="font-semibold text-blue-600">Path to $1B: </span>
            At current volume/agent ({formatCurrency(volumePerAgent, true)}), you'd need{" "}
            <strong>{agentsNeededAtCurrentPace} agents</strong> to hit $1B.
            {agentsNeededAtCurrentPace > GOAL_AGENTS ? (
              <span>
                {" "}
                To hit it with {GOAL_AGENTS} agents, each needs to average{" "}
                <strong>{formatCurrency(volumeGoalPerAgent, true)}</strong>/year
                {productionGapPct > 0 ? ` (${productionGapPct}% increase needed)` : ""}.
              </span>
            ) : (
              <span>
                {" "}
                That's {agentsNeededAtCurrentPace < GOAL_AGENTS ? "fewer than" : "exactly"}{" "}
                {GOAL_AGENTS} — production per agent is strong! 🎯
              </span>
            )}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="trajectory">
          <TabsList>
            <TabsTrigger value="trajectory">📈 Growth Curve</TabsTrigger>
            <TabsTrigger value="velocity">⚡ Recruiting Velocity</TabsTrigger>
            <TabsTrigger value="composition">👥 Team Composition</TabsTrigger>
            <TabsTrigger value="scenarios">🎯 Scenarios</TabsTrigger>
          </TabsList>

          {/* ── TRAJECTORY TAB ── */}
          <TabsContent value="trajectory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Agent Growth: Historical + Projected
                </CardTitle>
                <CardDescription>
                  Solid line = actual headcount • Dashed line = projected at current velocity •
                  Red line = 300 agent goal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval={Math.floor(combinedChartData.length / 12)}
                    />
                    <YAxis domain={[0, Math.max(GOAL_AGENTS + 50, totalActive + 100)]} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === "actual"
                          ? "Actual Agents"
                          : name === "projected"
                          ? "Projected"
                          : name,
                      ]}
                    />
                    <ReferenceLine
                      y={GOAL_AGENTS}
                      stroke="#ef4444"
                      strokeDasharray="8 4"
                      label={{ value: "300 Goal", position: "right", fill: "#ef4444" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#3b82f6"
                      fill="#3b82f680"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#8b5cf6"
                      fill="#8b5cf640"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Joins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Recent Joins
                </CardTitle>
                <CardDescription>Last 10 agents who joined</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentJoins.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="outline">{a.joinDate}</Badge>
                    </div>
                  ))}
                  {recentJoins.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent joins found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── VELOCITY TAB ── */}
          <TabsContent value="velocity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quarterly Recruiting Velocity
                </CardTitle>
                <CardDescription>
                  Joins vs departures by quarter — net growth is what matters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="joins" name="Joins" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="departures"
                      name="Departures"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="net" name="Net Growth" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Required recruiting pace card */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">
                    To hit 300 by Dec 2026
                  </div>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const monthsLeft = Math.max(
                        1,
                        (new Date(2026, 11, 31).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24 * 30)
                      );
                      const needed = Math.ceil(agentsNeeded / monthsLeft);
                      return `${needed}+ net/month`;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required net monthly growth rate
                  </p>
                  <div className="mt-3">
                    <Badge
                      variant={
                        netMonthlyGrowth >=
                        Math.ceil(
                          agentsNeeded /
                            Math.max(
                              1,
                              (new Date(2026, 11, 31).getTime() - new Date().getTime()) /
                                (1000 * 60 * 60 * 24 * 30)
                            )
                        )
                          ? "default"
                          : "destructive"
                      }
                    >
                      Currently: {netMonthlyGrowth > 0 ? "+" : ""}
                      {netMonthlyGrowth}/mo
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">
                    Gross recruits needed/mo
                  </div>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const monthsLeft = Math.max(
                        1,
                        (new Date(2026, 11, 31).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24 * 30)
                      );
                      const netNeeded = Math.ceil(agentsNeeded / monthsLeft);
                      return `${Math.ceil(netNeeded + monthlyDepartureRate)}+ gross/mo`;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must recruit more than lose
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Retention Rate</div>
                  <div className="text-2xl font-bold">
                    {totalActive > 0 && monthlyDepartureRate > 0
                      ? `${Math.round(
                          ((totalActive - monthlyDepartureRate * 12) / totalActive) * 100
                        )}%`
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Annualized agent retention
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── COMPOSITION TAB ── */}
          <TabsContent value="composition" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Tenure Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Tenure Distribution
                  </CardTitle>
                  <CardDescription>How long agents have been with Spyglass</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tenureData.map((t, i) => (
                      <div key={t.range} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{t.range}</span>
                          <span className="font-medium">
                            {t.count} ({t.pct}%)
                          </span>
                        </div>
                        <Progress
                          value={t.pct}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Location Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Breakdown
                  </CardTitle>
                  <CardDescription>Agent distribution by market</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={locationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="location"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SCENARIOS TAB ── */}
          <TabsContent value="scenarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  What-If Scenarios
                </CardTitle>
                <CardDescription>
                  Different paths to 300 agents and $1B in production
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Scenario 1: Current pace */}
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Current Pace</Badge>
                      <span className="text-sm text-muted-foreground">
                        {netMonthlyGrowth > 0 ? "+" : ""}{netMonthlyGrowth} agents/month net
                      </span>
                    </div>
                    <p className="text-sm">
                      {monthsToGoal < Infinity ? (
                        <>
                          At current velocity, you'll reach 300 agents by{" "}
                          <strong>
                            {projectedGoalDate.toLocaleDateString("en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </strong>
                          . {onTrack ? "This is on track for 2026. 🎯" : "This misses the 2026 target. ⚠️"}
                        </>
                      ) : (
                        <>
                          Net growth is flat or negative — need to recruit more than you're losing. ❌
                        </>
                      )}
                    </p>
                  </div>

                  {/* Scenario 2: Accelerated recruiting */}
                  <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-600">Accelerated</Badge>
                      <span className="text-sm text-muted-foreground">
                        Double recruiting + reduce churn 25%
                      </span>
                    </div>
                    <p className="text-sm">
                      {(() => {
                        const acceleratedJoins = monthlyJoinRate * 2;
                        const reducedDepartures = monthlyDepartureRate * 0.75;
                        const acceleratedNet = acceleratedJoins - reducedDepartures;
                        const months = Math.ceil(agentsNeeded / acceleratedNet);
                        const date = new Date();
                        date.setMonth(date.getMonth() + months);
                        return (
                          <>
                            With 2x recruiting ({Math.round(acceleratedJoins)}/mo) and 25% less churn,
                            you'd hit 300 by{" "}
                            <strong>
                              {date.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}
                            </strong>{" "}
                            ({months} months). This requires dedicated recruiting resources.
                          </>
                        );
                      })()}
                    </p>
                  </div>

                  {/* Scenario 3: Houston expansion */}
                  <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-600">Houston Push</Badge>
                      <span className="text-sm text-muted-foreground">
                        Dedicated Houston recruiting campaign
                      </span>
                    </div>
                    <p className="text-sm">
                      Houston is the largest real estate market in Texas. A dedicated recruiting
                      push adding 8-10 agents/month from Houston alone could dramatically
                      accelerate the timeline. Combined with Austin retention, this could close
                      the gap in{" "}
                      <strong>
                        {Math.ceil(agentsNeeded / (netMonthlyGrowth + 8))} months
                      </strong>
                      .
                    </p>
                  </div>

                  {/* Revenue math */}
                  <div className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-yellow-600">$1B Math</Badge>
                      <span className="text-sm text-muted-foreground">
                        Production per agent needed
                      </span>
                    </div>
                    <p className="text-sm">
                      Current: {formatCurrency(volumePerAgent, true)}/agent/year.
                      With 300 agents at current productivity = {formatCurrency(volumePerAgent * 300, true)}.
                      {volumePerAgent * 300 >= GOAL_VOLUME ? (
                        <> That exceeds $1B! 🎉</>
                      ) : (
                        <>
                          {" "}
                          Gap: {formatCurrency(GOAL_VOLUME - volumePerAgent * 300, true)}.
                          Need {formatCurrency(volumeGoalPerAgent, true)}/agent or{" "}
                          {agentsNeededAtCurrentPace} agents at current pace.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}