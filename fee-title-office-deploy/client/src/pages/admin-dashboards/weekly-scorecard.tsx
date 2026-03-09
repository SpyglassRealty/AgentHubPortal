import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  Home,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoListings,
  useXanoRoster,
  useXanoNetwork,
  formatCurrency,
  formatNumber,
} from "@/lib/xano";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { useMemo, useState } from "react";

// ── Utility: get start/end of a week (Mon-Sun) ──────
function getWeekBounds(date: Date): { start: Date; end: Date; label: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const label = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return { start, end, label };
}

function isInRange(dateStr: string | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
}

// ── Trend indicator component ────────────────────────
function TrendBadge({ current, previous, format = "number", invertColor = false }: {
  current: number;
  previous: number;
  format?: "number" | "currency" | "percent";
  invertColor?: boolean;
}) {
  if (previous === 0 && current === 0) return <Badge variant="outline" className="text-xs"><Minus className="h-3 w-3 mr-1" /> Flat</Badge>;
  const pctChange = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isGood = invertColor ? !isUp : isUp;
  const color = Math.abs(pctChange) < 2 ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-500";
  const Icon = Math.abs(pctChange) < 2 ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pctChange).toFixed(1)}% vs prev week
    </span>
  );
}

export default function WeeklyScorecard() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const listings = useXanoListings();
  const roster = useXanoRoster();
  const network = useXanoNetwork();

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  const isLoading = closedTx.isLoading || pendingTx.isLoading || listings.isLoading || roster.isLoading;

  // ── Compute metrics for the selected week ──────────
  const data = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + weekOffset * 7);
    const thisWeek = getWeekBounds(targetDate);

    const prevDate = new Date(targetDate);
    prevDate.setDate(targetDate.getDate() - 7);
    const prevWeek = getWeekBounds(prevDate);

    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];
    const listingsArr = Array.isArray(listings.data) ? listings.data : [];
    const rosterArr = Array.isArray(roster.data) ? roster.data : [];
    const networkArr = Array.isArray(network.data) ? network.data : [];

    // This week's closings
    const thisWeekClosed = closed.filter(t =>
      isInRange(t.close_date || t.closing_date || t.created_at, thisWeek.start, thisWeek.end)
    );
    const prevWeekClosed = closed.filter(t =>
      isInRange(t.close_date || t.closing_date || t.created_at, prevWeek.start, prevWeek.end)
    );

    const thisWeekVolume = thisWeekClosed.reduce((s, t) => s + (t.close_price || t.sale_price || t.price || t.volume || 0), 0);
    const prevWeekVolume = prevWeekClosed.reduce((s, t) => s + (t.close_price || t.sale_price || t.price || t.volume || 0), 0);

    const thisWeekGci = thisWeekClosed.reduce((s, t) => s + (t.gci || t.gross_commission || 0), 0);
    const prevWeekGci = prevWeekClosed.reduce((s, t) => s + (t.gci || t.gross_commission || 0), 0);

    // New listings this week
    const thisWeekListings = listingsArr.filter(l =>
      isInRange(l.listing_date || l.created_at, thisWeek.start, thisWeek.end)
    );
    const prevWeekListings = listingsArr.filter(l =>
      isInRange(l.listing_date || l.created_at, prevWeek.start, prevWeek.end)
    );

    // Active roster + new joins
    const totalAgents = rosterArr.filter(r => r.status === "Active" || r.status === "active" || r.team_status === "Active").length || rosterArr.length;
    const newJoins = rosterArr.filter(r => isInRange(r.join_date, thisWeek.start, thisWeek.end));
    const prevJoins = rosterArr.filter(r => isInRange(r.join_date, prevWeek.start, prevWeek.end));

    // Pending deals snapshot
    const activePending = pending.filter(p => p.status !== "Terminated" && p.status !== "Cancelled");

    // Top closers this week
    const agentClosings: Record<string, { name: string; units: number; volume: number; gci: number }> = {};
    thisWeekClosed.forEach(t => {
      const name = t.agent_name || t.listing_agent || t.buying_agent || "Unknown";
      if (!agentClosings[name]) agentClosings[name] = { name, units: 0, volume: 0, gci: 0 };
      agentClosings[name].units++;
      agentClosings[name].volume += t.close_price || t.sale_price || t.price || t.volume || 0;
      agentClosings[name].gci += t.gci || t.gross_commission || 0;
    });
    const topClosers = Object.values(agentClosings).sort((a, b) => b.volume - a.volume).slice(0, 5);

    // Weekly trend (last 8 weeks for the chart)
    const weeklyTrend = [];
    for (let i = -7; i <= 0; i++) {
      const wd = new Date(targetDate);
      wd.setDate(targetDate.getDate() + i * 7);
      const wb = getWeekBounds(wd);
      const weekClosed = closed.filter(t =>
        isInRange(t.close_date || t.closing_date || t.created_at, wb.start, wb.end)
      );
      const vol = weekClosed.reduce((s, t) => s + (t.close_price || t.sale_price || t.price || t.volume || 0), 0);
      const gci = weekClosed.reduce((s, t) => s + (t.gci || t.gross_commission || 0), 0);
      weeklyTrend.push({
        week: wb.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        units: weekClosed.length,
        volume: vol,
        gci: gci,
        isCurrent: i === 0,
      });
    }

    // Goals progress (annualized from current pace)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysElapsed = (now.getTime() - yearStart.getTime()) / 86400000;
    const ytdClosed = closed.filter(t => {
      const d = t.close_date || t.closing_date || t.created_at;
      return d && new Date(d) >= yearStart;
    });
    const ytdVolume = ytdClosed.reduce((s, t) => s + (t.close_price || t.sale_price || t.price || t.volume || 0), 0);
    const projectedAnnualVolume = daysElapsed > 0 ? (ytdVolume / daysElapsed) * 365 : 0;
    const volumeGoal = 1_000_000_000; // $1B goal
    const agentGoal = 300;

    // Health signals
    const healthSignals = [];
    if (thisWeekClosed.length > prevWeekClosed.length) {
      healthSignals.push({ type: "positive" as const, text: `Closings up ${thisWeekClosed.length - prevWeekClosed.length} vs last week` });
    } else if (thisWeekClosed.length < prevWeekClosed.length) {
      healthSignals.push({ type: "warning" as const, text: `Closings down ${prevWeekClosed.length - thisWeekClosed.length} vs last week` });
    }
    if (newJoins.length > 0) {
      healthSignals.push({ type: "positive" as const, text: `${newJoins.length} new agent${newJoins.length > 1 ? "s" : ""} joined this week` });
    }
    if (activePending.length > 10) {
      healthSignals.push({ type: "positive" as const, text: `${activePending.length} deals in pipeline` });
    } else if (activePending.length < 5) {
      healthSignals.push({ type: "warning" as const, text: `Only ${activePending.length} deals in pipeline — watch recruiting/lead gen` });
    }
    if (projectedAnnualVolume >= volumeGoal) {
      healthSignals.push({ type: "positive" as const, text: `On pace for ${formatCurrency(projectedAnnualVolume, true)} — hitting $1B goal!` });
    } else {
      const gap = volumeGoal - projectedAnnualVolume;
      healthSignals.push({ type: "warning" as const, text: `${formatCurrency(gap, true)} below $1B pace — need to accelerate` });
    }

    return {
      thisWeek,
      prevWeek,
      thisWeekClosed,
      prevWeekClosed,
      thisWeekVolume,
      prevWeekVolume,
      thisWeekGci,
      prevWeekGci,
      thisWeekListings,
      prevWeekListings,
      totalAgents,
      newJoins,
      prevJoins,
      activePending,
      topClosers,
      weeklyTrend,
      ytdVolume,
      projectedAnnualVolume,
      volumeGoal,
      agentGoal,
      healthSignals,
      weekNumber: getWeekNumber(targetDate),
    };
  }, [closedTx.data, pendingTx.data, listings.data, roster.data, network.data, weekOffset]);

  return (
    <DashboardLayout
      title={`Weekly Scorecard — Week ${data.weekNumber}`}
      subtitle={data.thisWeek.label}
      icon={CalendarDays}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Health Signals Banner ───────────────────── */}
          {data.healthSignals.length > 0 && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Week at a Glance</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {data.healthSignals.map((signal, i) => (
                    <Badge
                      key={i}
                      variant={signal.type === "positive" ? "default" : "destructive"}
                      className={`text-xs ${signal.type === "positive" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}`}
                    >
                      {signal.type === "positive" ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {signal.text}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── KPI Row ────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Closings</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{data.thisWeekClosed.length}</div>
                <TrendBadge current={data.thisWeekClosed.length} previous={data.prevWeekClosed.length} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Volume</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(data.thisWeekVolume, true)}</div>
                <TrendBadge current={data.thisWeekVolume} previous={data.prevWeekVolume} format="currency" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">GCI</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.thisWeekGci, true)}</div>
                <TrendBadge current={data.thisWeekGci} previous={data.prevWeekGci} format="currency" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">New Listings</span>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{data.thisWeekListings.length}</div>
                <TrendBadge current={data.thisWeekListings.length} previous={data.prevWeekListings.length} />
              </CardContent>
            </Card>
          </div>

          {/* ── Team & Pipeline Row ────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Agents</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{data.totalAgents}</div>
                <span className="text-xs text-muted-foreground">
                  {data.newJoins.length > 0 ? `+${data.newJoins.length} new this week` : "No new joins this week"}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pipeline</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{data.activePending.length}</div>
                <span className="text-xs text-muted-foreground">pending deals</span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Path to 300</span>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{data.totalAgents} <span className="text-sm font-normal text-muted-foreground">/ {data.agentGoal}</span></div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(100, (data.totalAgents / data.agentGoal) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">$1B Pace</span>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(data.projectedAnnualVolume, true)}</div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div
                    className={`rounded-full h-2 transition-all ${data.projectedAnnualVolume >= data.volumeGoal ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, (data.projectedAnnualVolume / data.volumeGoal) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Charts Row ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Trend */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">8-Week Trend</CardTitle>
                <CardDescription>Volume & closings over the last 8 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.weeklyTrend} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="volume"
                      tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis yAxisId="units" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Volume") return formatCurrency(value, true);
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="volume" dataKey="volume" name="Volume" radius={[4, 4, 0, 0]}>
                      {data.weeklyTrend.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isCurrent ? "#0d9488" : "#94a3b8"}
                          fillOpacity={entry.isCurrent ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                    <Line yAxisId="units" type="monotone" dataKey="units" name="Closings" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Closers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Top Closers This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topClosers.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No closings recorded this week
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.topClosers.map((agent, i) => (
                      <div key={agent.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">{agent.units} closing{agent.units > 1 ? "s" : ""}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(agent.volume, true)}</div>
                          {agent.gci > 0 && (
                            <div className="text-xs text-emerald-600">{formatCurrency(agent.gci, true)} GCI</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Year-to-Date Summary ───────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2026 Year-to-Date</CardTitle>
              <CardDescription>Progress toward annual goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">YTD Closed Volume</div>
                  <div className="text-xl font-bold">{formatCurrency(data.ytdVolume, true)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((data.ytdVolume / data.volumeGoal) * 100).toFixed(1)}% of $1B goal
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${Math.min(100, (data.ytdVolume / data.volumeGoal) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Projected Annual Volume</div>
                  <div className={`text-xl font-bold ${data.projectedAnnualVolume >= data.volumeGoal ? "text-emerald-600" : "text-amber-600"}`}>
                    {formatCurrency(data.projectedAnnualVolume, true)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.projectedAnnualVolume >= data.volumeGoal
                      ? `${formatCurrency(data.projectedAnnualVolume - data.volumeGoal, true)} ahead of goal!`
                      : `${formatCurrency(data.volumeGoal - data.projectedAnnualVolume, true)} below goal`}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Agent Growth</div>
                  <div className="text-xl font-bold">{data.totalAgents} <span className="text-sm font-normal text-muted-foreground">agents</span></div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.agentGoal - data.totalAgents} more needed for 300 goal
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-violet-500 rounded-full h-2"
                      style={{ width: `${Math.min(100, (data.totalAgents / data.agentGoal) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
