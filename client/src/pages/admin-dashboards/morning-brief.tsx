import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sun,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  Home,
  Target,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Zap,
  Trophy,
  UserPlus,
  UserMinus,
  BarChart3,
  Activity,
  Eye,
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
  useRevenueData,
  useAnalyticsData,
} from "@/lib/rezen-dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useMemo, useState } from "react";
import { Link } from "wouter";

// ── Constants ────────────────────────────────────────
const GOAL_AGENTS = 300;
const GOAL_VOLUME = 1_000_000_000; // $1B

// ── Helpers ──────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function daysUntilEOY(): number {
  const now = new Date();
  const eoy = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((eoy.getTime() - now.getTime()) / 86400000);
}

function safeDate(d: string | undefined | null): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isThisWeek(dateStr: string | undefined): boolean {
  const d = safeDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return d >= weekStart && d <= weekEnd;
}

function isLastWeek(dateStr: string | undefined): boolean {
  const d = safeDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() + diffToMon);
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setTime(thisWeekStart.getTime() - 1);
  return d >= lastWeekStart && d <= lastWeekEnd;
}

function isThisMonth(dateStr: string | undefined): boolean {
  const d = safeDate(dateStr);
  if (!d) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isThisYear(dateStr: string | undefined): boolean {
  const d = safeDate(dateStr);
  if (!d) return false;
  return d.getFullYear() === new Date().getFullYear();
}

function getTransactionDate(tx: any): string | undefined {
  return tx.close_date || tx.closing_date || tx.expected_close_date || tx.created_at;
}

function getTransactionVolume(tx: any): number {
  return tx.close_price || tx.sale_price || tx.price || tx.volume || 0;
}

function getTransactionGCI(tx: any): number {
  return tx.gci || tx.gross_commission || 0;
}

// Trend badge component
function TrendBadge({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) return null;
  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isFlat = Math.abs(pctChange) < 1;

  if (isFlat) {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <Minus className="h-3 w-3" /> Flat {suffix}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs gap-1 ${isUp ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-red-700 border-red-300 bg-red-50"}`}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pctChange).toFixed(0)}% {suffix}
    </Badge>
  );
}

// Quick-link card
function QuickLink({ href, icon: Icon, label, description, badge }: {
  href: string;
  icon: any;
  label: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 h-full">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{label}</p>
              {badge && (
                <Badge variant="secondary" className="text-[10px]">{badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Main Component ───────────────────────────────────
export default function MorningBriefPage() {
  const closed = useXanoTransactionsClosed();
  const pending = useXanoTransactionsPending();
  const listings = useXanoListings();
  const roster = useXanoRoster();
  const network = useXanoNetwork();
  const revenue = useRevenueData();
  const analytics = useAnalyticsData();

  const isLoading =
    closed.isLoading || pending.isLoading || listings.isLoading ||
    roster.isLoading || network.isLoading || revenue.isLoading;

  // ── Computed Metrics ─────────────────────────────
  const metrics = useMemo(() => {
    const txs = closed.data || [];
    const pend = pending.data || [];
    const list = listings.data || [];
    const agents = roster.data || [];
    const net = network.data || [];

    // Agent count
    const activeAgents = agents.filter(
      (a) => a.status?.toLowerCase() === "active" || a.team_status?.toLowerCase() === "active"
    ).length;

    // Transactions this week vs last week
    const closedThisWeek = txs.filter((tx) => isThisWeek(getTransactionDate(tx)));
    const closedLastWeek = txs.filter((tx) => isLastWeek(getTransactionDate(tx)));

    const weekVolume = closedThisWeek.reduce((s, tx) => s + getTransactionVolume(tx), 0);
    const lastWeekVolume = closedLastWeek.reduce((s, tx) => s + getTransactionVolume(tx), 0);
    const weekGCI = closedThisWeek.reduce((s, tx) => s + getTransactionGCI(tx), 0);
    const lastWeekGCI = closedLastWeek.reduce((s, tx) => s + getTransactionGCI(tx), 0);

    // Month
    const closedThisMonth = txs.filter((tx) => isThisMonth(getTransactionDate(tx)));
    const monthVolume = closedThisMonth.reduce((s, tx) => s + getTransactionVolume(tx), 0);
    const monthGCI = closedThisMonth.reduce((s, tx) => s + getTransactionGCI(tx), 0);
    const monthDeals = closedThisMonth.length;

    // YTD
    const closedYTD = txs.filter((tx) => isThisYear(getTransactionDate(tx)));
    const ytdVolume = closedYTD.reduce((s, tx) => s + getTransactionVolume(tx), 0);
    const ytdGCI = closedYTD.reduce((s, tx) => s + getTransactionGCI(tx), 0);
    const ytdDeals = closedYTD.length;

    // Pipeline
    const pendingDeals = pend.length;
    const pendingVolume = pend.reduce((s, tx) => s + getTransactionVolume(tx), 0);
    const activeListings = list.filter(
      (l) => l.status?.toLowerCase() === "active"
    ).length;

    // Goal progress
    const agentProgress = (activeAgents / GOAL_AGENTS) * 100;
    const volumeProgress = (ytdVolume / GOAL_VOLUME) * 100;

    // Agents needed & pace
    const daysLeft = daysUntilEOY();
    const agentsNeeded = Math.max(0, GOAL_AGENTS - activeAgents);
    const agentsPerMonth = daysLeft > 0 ? (agentsNeeded / (daysLeft / 30)).toFixed(1) : "0";

    // Annualized volume pace
    const now = new Date();
    const dayOfYear = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
    );
    const annualizedVolume = dayOfYear > 0 ? (ytdVolume / dayOfYear) * 365 : 0;

    // Retention signals — agents with no activity in 90+ days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const agentLastActivity: Record<string, Date> = {};
    txs.forEach((tx) => {
      const name = tx.agent_name || tx.listing_agent || tx.buying_agent || "";
      const d = safeDate(getTransactionDate(tx));
      if (name && d) {
        if (!agentLastActivity[name] || d > agentLastActivity[name]) {
          agentLastActivity[name] = d;
        }
      }
    });
    list.forEach((l) => {
      const name = l.agent_name || "";
      const d = safeDate(l.listing_date || l.created_at);
      if (name && d) {
        if (!agentLastActivity[name] || d > agentLastActivity[name]) {
          agentLastActivity[name] = d;
        }
      }
    });
    const inactiveAgents = Object.entries(agentLastActivity)
      .filter(([, lastDate]) => lastDate < ninetyDaysAgo)
      .map(([name]) => name);

    // Top producers this month
    const monthlyByAgent: Record<string, { volume: number; gci: number; deals: number }> = {};
    closedThisMonth.forEach((tx) => {
      const name = tx.agent_name || tx.listing_agent || tx.buying_agent || "Unknown";
      if (!monthlyByAgent[name]) monthlyByAgent[name] = { volume: 0, gci: 0, deals: 0 };
      monthlyByAgent[name].volume += getTransactionVolume(tx);
      monthlyByAgent[name].gci += getTransactionGCI(tx);
      monthlyByAgent[name].deals += 1;
    });
    const topProducers = Object.entries(monthlyByAgent)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    // Monthly trend for sparkline (last 6 months)
    const monthlyVolumes: { month: string; volume: number; deals: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
      const monthTxs = txs.filter((tx) => {
        const td = safeDate(getTransactionDate(tx));
        return td && `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}` === monthKey;
      });
      monthlyVolumes.push({
        month: monthLabel,
        volume: monthTxs.reduce((s, tx) => s + getTransactionVolume(tx), 0),
        deals: monthTxs.length,
      });
    }

    return {
      activeAgents,
      closedThisWeek: closedThisWeek.length,
      lastWeekClosings: closedLastWeek.length,
      weekVolume,
      lastWeekVolume,
      weekGCI,
      lastWeekGCI,
      monthVolume,
      monthGCI,
      monthDeals,
      ytdVolume,
      ytdGCI,
      ytdDeals,
      pendingDeals,
      pendingVolume,
      activeListings,
      agentProgress,
      volumeProgress,
      agentsNeeded,
      agentsPerMonth,
      annualizedVolume,
      daysLeft,
      inactiveAgents,
      topProducers,
      monthlyVolumes,
    };
  }, [closed.data, pending.data, listings.data, roster.data, network.data]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const rezenKpis = revenue.data?.kpis;

  return (
    <DashboardLayout
      title="Morning Brief"
      subtitle={`${getGreeting()}, Ryan — ${today}`}
      icon={Sun}
    >
      <TooltipProvider>
        <div className="space-y-6">
          {/* ── Goal Pulse ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-[#EF4923]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-[#EF4923]" />
                    300 Agents Goal
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {metrics.daysLeft} days left
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold">{metrics.activeAgents}</span>
                    <span className="text-sm text-muted-foreground">/ {GOAL_AGENTS}</span>
                  </div>
                  <Progress value={metrics.agentProgress} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.agentProgress.toFixed(1)}% complete</span>
                    <span>Need {metrics.agentsNeeded} more ({metrics.agentsPerMonth}/mo pace)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    $1B Volume Goal
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      metrics.annualizedVolume >= GOAL_VOLUME
                        ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                        : "text-amber-700 border-amber-300 bg-amber-50"
                    }`}
                  >
                    {metrics.annualizedVolume >= GOAL_VOLUME ? "On Pace" : "Behind Pace"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold">
                      {formatCurrency(metrics.ytdVolume, true)}
                    </span>
                    <span className="text-sm text-muted-foreground">/ $1B</span>
                  </div>
                  <Progress value={Math.min(metrics.volumeProgress, 100)} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.volumeProgress.toFixed(1)}% YTD</span>
                    <span>
                      Annualized: {formatCurrency(metrics.annualizedVolume, true)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── This Week Snapshot ────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              This Week
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="Closings"
                value={String(metrics.closedThisWeek)}
                category="transactions"
                trend={{
                  value: `${metrics.lastWeekClosings} last week`,
                  direction:
                    metrics.closedThisWeek > metrics.lastWeekClosings
                      ? "up"
                      : metrics.closedThisWeek < metrics.lastWeekClosings
                        ? "down"
                        : "neutral",
                }}
              />
              <KpiCard
                title="Volume"
                value={formatCurrency(metrics.weekVolume, true)}
                category="revenue"
                trend={{
                  value: `${formatCurrency(metrics.lastWeekVolume, true)} last week`,
                  direction:
                    metrics.weekVolume > metrics.lastWeekVolume
                      ? "up"
                      : metrics.weekVolume < metrics.lastWeekVolume
                        ? "down"
                        : "neutral",
                }}
              />
              <KpiCard
                title="Pending Pipeline"
                value={String(metrics.pendingDeals)}
                category="transactions"
                subtitle={formatCurrency(metrics.pendingVolume, true)}
              />
              <KpiCard
                title="Active Listings"
                value={String(metrics.activeListings)}
                category="listings"
              />
            </div>
          </div>

          {/* ── Month & YTD ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{metrics.monthDeals}</p>
                    <p className="text-xs text-muted-foreground">Deals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.monthVolume, true)}</p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.monthGCI, true)}</p>
                    <p className="text-xs text-muted-foreground">GCI</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Year to Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{metrics.ytdDeals}</p>
                    <p className="text-xs text-muted-foreground">Deals</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.ytdVolume, true)}</p>
                    <p className="text-xs text-muted-foreground">Volume</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.ytdGCI, true)}</p>
                    <p className="text-xs text-muted-foreground">GCI</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── ReZen Revenue (if available) ─────────── */}
          {rezenKpis && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    ReZen Revenue Summary
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">Live from ReZen</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(rezenKpis.closedVolume, true)}</p>
                    <p className="text-xs text-muted-foreground">Closed Volume</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(rezenKpis.grossGCI, true)}</p>
                    <p className="text-xs text-muted-foreground">Gross GCI</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(rezenKpis.netIncome, true)}</p>
                    <p className="text-xs text-muted-foreground">Net Income</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{rezenKpis.commissionCount}</p>
                    <p className="text-xs text-muted-foreground">Commissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 6-Month Volume Trend ─────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                6-Month Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.monthlyVolumes.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.monthlyVolumes}>
                    <defs>
                      <linearGradient id="briefVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#briefVolumeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No volume data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Top Producers & Attention Items ──────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Producers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Top Producers (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.topProducers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No closings this month yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.topProducers.map((agent, i) => (
                      <div key={agent.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                              i === 0
                                ? "bg-amber-100 text-amber-700"
                                : i === 1
                                  ? "bg-gray-100 text-gray-600"
                                  : i === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.deals} deal{agent.deals !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(agent.volume, true)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(agent.gci, true)} GCI
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attention Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Needs Your Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Retention risk */}
                  {metrics.inactiveAgents.length > 0 && (
                    <Link href="/admin/dashboards/retention-risk">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors">
                        <Snowflake className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            {metrics.inactiveAgents.length} agent{metrics.inactiveAgents.length !== 1 ? "s" : ""} inactive 90+ days
                          </p>
                          <p className="text-xs text-red-600 mt-0.5">
                            {metrics.inactiveAgents.slice(0, 3).join(", ")}
                            {metrics.inactiveAgents.length > 3 && ` +${metrics.inactiveAgents.length - 3} more`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Volume pace warning */}
                  {metrics.annualizedVolume < GOAL_VOLUME && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50">
                      <TrendingDown className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Volume pace behind $1B target
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Current annualized: {formatCurrency(metrics.annualizedVolume, true)} —
                          need {formatCurrency(GOAL_VOLUME - metrics.annualizedVolume, true)} more pace
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Agent goal pace */}
                  {metrics.agentsNeeded > 0 && Number(metrics.agentsPerMonth) > 15 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50">
                      <UserPlus className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Recruiting pace: {metrics.agentsPerMonth} agents/mo needed
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {metrics.agentsNeeded} agents to go with {metrics.daysLeft} days left in {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* All clear */}
                  {metrics.inactiveAgents.length === 0 &&
                    metrics.annualizedVolume >= GOAL_VOLUME &&
                    (metrics.agentsNeeded === 0 || Number(metrics.agentsPerMonth) <= 15) && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-800">
                        All clear — everything looks good today
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Quick Links ──────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Jump To
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickLink
                href="/admin/dashboards/billion-tracker"
                icon={Rocket}
                label="$1B Tracker"
                description="Full goal dashboard"
              />
              <QuickLink
                href="/admin/dashboards/retention-risk"
                icon={Shield}
                label="Retention Risk"
                description="At-risk agents"
                badge={metrics.inactiveAgents.length > 0 ? `${metrics.inactiveAgents.length}` : undefined}
              />
              <QuickLink
                href="/admin/dashboards/growth-trajectory"
                icon={TrendingUp}
                label="Growth Trajectory"
                description="Headcount & volume projections"
              />
              <QuickLink
                href="/admin/dashboards/recruiting-battlecards"
                icon={Zap}
                label="Battle Cards"
                description="Competitor comparisons"
              />
              <QuickLink
                href="/admin/dashboards/weekly-scorecard"
                icon={CalendarDays}
                label="Weekly Scorecard"
                description="Week-by-week performance"
              />
              <QuickLink
                href="/admin/dashboards/activity-heatmap"
                icon={Activity}
                label="Activity Heatmap"
                description="Agent engagement map"
              />
              <QuickLink
                href="/admin/dashboards/commission-calculator"
                icon={DollarSign}
                label="Commission Calc"
                description="Recruiting tool"
              />
              <QuickLink
                href="/admin/beacon-unified"
                icon={Eye}
                label="Beacon"
                description="Agent intelligence"
              />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}