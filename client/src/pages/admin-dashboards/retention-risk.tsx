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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Eye,
  UserMinus,
  Activity,
  Flame,
  Target,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  useXanoRoster,
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoListings,
  formatCurrency,
  formatNumber,
  getMonthKey,
  type XanoRosterMember,
  type XanoTransaction,
  type XanoListing,
} from "@/lib/xano";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────

interface RiskSignal {
  name: string;
  severity: "critical" | "warning" | "info";
  description: string;
  weight: number;
}

interface AgentRetentionProfile {
  name: string;
  agentId: number;
  riskScore: number; // 0-100, higher = more risk
  riskLevel: "critical" | "high" | "moderate" | "low";
  signals: RiskSignal[];
  // Production metrics
  closedVolumeLast12Mo: number;
  closedVolumeTrailing3Mo: number;
  closedVolumePrior3Mo: number;
  velocityTrend: "declining" | "stable" | "growing";
  velocityChangePct: number;
  totalDealsLast12Mo: number;
  avgDealSize: number;
  // Engagement metrics
  pendingDeals: number;
  pendingVolume: number;
  activeListings: number;
  daysSinceLastClose: number;
  daysSinceJoin: number;
  // Revenue impact
  estimatedAnnualBrokerageRevenue: number;
  pctOfTotalVolume: number;
}

// ── Risk Calculation Engine ──────────────────────────

function calculateRetentionRisk(
  agent: XanoRosterMember,
  closedTxns: XanoTransaction[],
  pendingTxns: XanoTransaction[],
  listings: XanoListing[],
  totalBrokerageVolume: number
): AgentRetentionProfile {
  const now = new Date();
  const signals: RiskSignal[] = [];

  // Get agent's transactions
  const agentName = agent.name || `${agent.first_name || ""} ${agent.last_name || ""}`.trim();
  const matchAgent = (txn: XanoTransaction) => {
    const txnAgent = (txn.agent_name || "").toLowerCase();
    const matchName = agentName.toLowerCase();
    return txnAgent === matchName || txnAgent.includes(matchName) || matchName.includes(txnAgent);
  };

  const agentClosed = closedTxns.filter(matchAgent);
  const agentPending = pendingTxns.filter(matchAgent);
  const agentListings = listings.filter((l) => {
    const listAgent = (l.agent_name || "").toLowerCase();
    const matchName = agentName.toLowerCase();
    return listAgent === matchName || listAgent.includes(matchName) || matchName.includes(listAgent);
  });

  // ── Time-based filtering ──
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const getCloseDate = (t: XanoTransaction) =>
    new Date(t.close_date || t.closing_date || t.created_at || "");
  const getVolume = (t: XanoTransaction) =>
    t.volume || t.price || t.sale_price || t.close_price || 0;
  const getGCI = (t: XanoTransaction) => t.gci || t.gross_commission || 0;

  // Last 12 months transactions
  const last12Mo = agentClosed.filter((t) => getCloseDate(t) >= twelveMonthsAgo);
  const closedVolumeLast12Mo = last12Mo.reduce((sum, t) => sum + getVolume(t), 0);
  const totalDealsLast12Mo = last12Mo.length;

  // Trailing 3 months vs prior 3 months (velocity trend)
  const trailing3Mo = agentClosed.filter((t) => getCloseDate(t) >= threeMonthsAgo);
  const prior3Mo = agentClosed.filter(
    (t) => getCloseDate(t) >= sixMonthsAgo && getCloseDate(t) < threeMonthsAgo
  );

  const closedVolumeTrailing3Mo = trailing3Mo.reduce((sum, t) => sum + getVolume(t), 0);
  const closedVolumePrior3Mo = prior3Mo.reduce((sum, t) => sum + getVolume(t), 0);

  // Velocity trend calculation
  let velocityChangePct = 0;
  let velocityTrend: "declining" | "stable" | "growing" = "stable";
  if (closedVolumePrior3Mo > 0) {
    velocityChangePct =
      ((closedVolumeTrailing3Mo - closedVolumePrior3Mo) / closedVolumePrior3Mo) * 100;
    if (velocityChangePct < -25) velocityTrend = "declining";
    else if (velocityChangePct > 25) velocityTrend = "growing";
  } else if (closedVolumeTrailing3Mo === 0) {
    velocityTrend = "declining";
    velocityChangePct = -100;
  }

  // Days since last close
  const closeDates = agentClosed.map((t) => getCloseDate(t).getTime()).filter((d) => !isNaN(d));
  const lastCloseDate = closeDates.length > 0 ? Math.max(...closeDates) : 0;
  const daysSinceLastClose = lastCloseDate
    ? Math.floor((now.getTime() - lastCloseDate) / (1000 * 60 * 60 * 24))
    : 999;

  // Days since join
  const joinDate = agent.join_date ? new Date(agent.join_date) : now;
  const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  // Pending pipeline
  const pendingDeals = agentPending.length;
  const pendingVolume = agentPending.reduce((sum, t) => sum + getVolume(t), 0);
  const activeListings = agentListings.filter(
    (l) => l.status?.toLowerCase() === "active" || l.status?.toLowerCase() === "new"
  ).length;

  // Revenue impact
  const estimatedGCI = last12Mo.reduce((sum, t) => sum + getGCI(t), 0);
  const estimatedAnnualBrokerageRevenue = estimatedGCI * 0.15; // rough 15% brokerage take
  const pctOfTotalVolume =
    totalBrokerageVolume > 0 ? (closedVolumeLast12Mo / totalBrokerageVolume) * 100 : 0;
  const avgDealSize = totalDealsLast12Mo > 0 ? closedVolumeLast12Mo / totalDealsLast12Mo : 0;

  // ── RISK SIGNALS ──

  // 1. Production velocity declining
  if (velocityTrend === "declining" && totalDealsLast12Mo > 0) {
    if (velocityChangePct <= -50) {
      signals.push({
        name: "Production Cliff",
        severity: "critical",
        description: `Volume dropped ${Math.abs(Math.round(velocityChangePct))}% in last 3 months vs prior 3 months`,
        weight: 30,
      });
    } else if (velocityChangePct <= -25) {
      signals.push({
        name: "Declining Velocity",
        severity: "warning",
        description: `Volume down ${Math.abs(Math.round(velocityChangePct))}% quarter-over-quarter`,
        weight: 20,
      });
    }
  }

  // 2. Extended inactivity (no closes)
  if (daysSinceLastClose > 180 && daysSinceJoin > 90) {
    signals.push({
      name: "Extended Inactivity",
      severity: "critical",
      description: `No closed transactions in ${daysSinceLastClose} days`,
      weight: 25,
    });
  } else if (daysSinceLastClose > 90 && daysSinceJoin > 60) {
    signals.push({
      name: "Growing Silence",
      severity: "warning",
      description: `${daysSinceLastClose} days since last close`,
      weight: 15,
    });
  }

  // 3. Empty pipeline — no pending deals AND no active listings
  if (pendingDeals === 0 && activeListings === 0 && daysSinceJoin > 60) {
    signals.push({
      name: "Empty Pipeline",
      severity: "critical",
      description: "No pending deals or active listings — no revenue path visible",
      weight: 25,
    });
  } else if (pendingDeals === 0 && daysSinceJoin > 60) {
    signals.push({
      name: "No Pending Deals",
      severity: "warning",
      description: "Zero pending transactions in pipeline",
      weight: 10,
    });
  }

  // 4. High producer slowing down (extra weight — these losses hurt most)
  if (pctOfTotalVolume >= 2 && velocityTrend === "declining") {
    signals.push({
      name: "Key Producer at Risk",
      severity: "critical",
      description: `Top producer (${pctOfTotalVolume.toFixed(1)}% of volume) showing decline`,
      weight: 20,
    });
  }

  // 5. Recently capped but velocity down (possible "hit cap, coast, then leave" pattern)
  if (agent.capped && velocityTrend === "declining") {
    signals.push({
      name: "Post-Cap Slowdown",
      severity: "warning",
      description: "Agent hit cap but production is declining — possible exit pattern",
      weight: 15,
    });
  }

  // 6. New agent failing to launch (joined >90 days, zero or very low production)
  if (daysSinceJoin >= 90 && daysSinceJoin <= 365 && totalDealsLast12Mo <= 1) {
    signals.push({
      name: "Struggling New Agent",
      severity: "warning",
      description: `Joined ${daysSinceJoin} days ago, only ${totalDealsLast12Mo} deal(s) closed`,
      weight: 15,
    });
  }

  // 7. Tenure risk — agents in year 2-3 with flat or declining production are flight risks
  if (daysSinceJoin >= 365 && daysSinceJoin <= 1095 && velocityTrend !== "growing") {
    if (totalDealsLast12Mo > 0 && totalDealsLast12Mo <= 4) {
      signals.push({
        name: "Year 2-3 Plateau",
        severity: "info",
        description: "Mid-tenure agent with modest production — retention intervention opportunity",
        weight: 10,
      });
    }
  }

  // ── Calculate composite risk score ──
  const rawScore = signals.reduce((sum, s) => sum + s.weight, 0);
  const riskScore = Math.min(100, rawScore);

  let riskLevel: "critical" | "high" | "moderate" | "low";
  if (riskScore >= 70) riskLevel = "critical";
  else if (riskScore >= 45) riskLevel = "high";
  else if (riskScore >= 20) riskLevel = "moderate";
  else riskLevel = "low";

  return {
    name: agentName,
    agentId: agent.id,
    riskScore,
    riskLevel,
    signals,
    closedVolumeLast12Mo,
    closedVolumeTrailing3Mo,
    closedVolumePrior3Mo,
    velocityTrend,
    velocityChangePct,
    totalDealsLast12Mo,
    avgDealSize,
    pendingDeals,
    pendingVolume,
    activeListings,
    daysSinceLastClose,
    daysSinceJoin,
    estimatedAnnualBrokerageRevenue,
    pctOfTotalVolume,
  };
}

// ── Risk Level Config ──────────────────────────────

const RISK_COLORS = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600", fill: "#ef4444" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-600", fill: "#f97316" },
  moderate: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-600", fill: "#eab308" },
  low: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-600", fill: "#22c55e" },
};

const RISK_LABELS = {
  critical: "Critical Risk",
  high: "High Risk",
  moderate: "Moderate",
  low: "Low Risk",
};

// ── Component ──────────────────────────────────────

export default function RetentionRiskPage() {
  const { data: roster, isLoading: rosterLoading, refetch: refetchRoster } = useXanoRoster();
  const { data: closedTxns, isLoading: closedLoading, refetch: refetchClosed } = useXanoTransactionsClosed();
  const { data: pendingTxns, isLoading: pendingLoading, refetch: refetchPending } = useXanoTransactionsPending();
  const { data: listings, isLoading: listingsLoading, refetch: refetchListings } = useXanoListings();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"riskScore" | "revenue" | "volume">("riskScore");
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const isLoading = rosterLoading || closedLoading || pendingLoading || listingsLoading;

  const handleRefresh = () => {
    refetchRoster();
    refetchClosed();
    refetchPending();
    refetchListings();
  };

  // ── Compute all agent risk profiles ──
  const { profiles, summary, riskDistribution, revenueAtRisk, scatterData } = useMemo(() => {
    if (!roster || !closedTxns) {
      return {
        profiles: [],
        summary: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
        riskDistribution: [],
        revenueAtRisk: 0,
        scatterData: [],
      };
    }

    const allClosed = closedTxns || [];
    const allPending = pendingTxns || [];
    const allListings = listings || [];

    // Total brokerage volume (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const totalBrokerageVolume = allClosed
      .filter((t) => {
        const d = new Date(t.close_date || t.closing_date || t.created_at || "");
        return d >= twelveMonthsAgo;
      })
      .reduce((sum, t) => sum + (t.volume || t.price || t.sale_price || t.close_price || 0), 0);

    // Calculate profile for each active roster member
    const activeRoster = roster.filter(
      (m) => m.status?.toLowerCase() !== "terminated" && m.status?.toLowerCase() !== "inactive"
    );

    const computed = activeRoster.map((agent) =>
      calculateRetentionRisk(agent, allClosed, allPending, allListings, totalBrokerageVolume)
    );

    // Summary counts
    const summary = {
      critical: computed.filter((p) => p.riskLevel === "critical").length,
      high: computed.filter((p) => p.riskLevel === "high").length,
      moderate: computed.filter((p) => p.riskLevel === "moderate").length,
      low: computed.filter((p) => p.riskLevel === "low").length,
      total: computed.length,
    };

    // Revenue at risk (critical + high risk agents)
    const revenueAtRisk = computed
      .filter((p) => p.riskLevel === "critical" || p.riskLevel === "high")
      .reduce((sum, p) => sum + p.closedVolumeLast12Mo, 0);

    // Pie chart data
    const riskDistribution = [
      { name: "Critical", value: summary.critical, color: "#ef4444" },
      { name: "High", value: summary.high, color: "#f97316" },
      { name: "Moderate", value: summary.moderate, color: "#eab308" },
      { name: "Low", value: summary.low, color: "#22c55e" },
    ].filter((d) => d.value > 0);

    // Scatter data: volume vs risk score
    const scatterData = computed
      .filter((p) => p.closedVolumeLast12Mo > 0)
      .map((p) => ({
        name: p.name,
        x: p.closedVolumeLast12Mo,
        y: p.riskScore,
        z: p.totalDealsLast12Mo,
        level: p.riskLevel,
      }));

    return { profiles: computed, summary, riskDistribution, revenueAtRisk, scatterData };
  }, [roster, closedTxns, pendingTxns, listings]);

  // ── Filter & sort ──
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (filterLevel !== "all") {
      result = result.filter((p) => p.riskLevel === filterLevel);
    }

    result.sort((a, b) => {
      if (sortBy === "riskScore") return b.riskScore - a.riskScore;
      if (sortBy === "revenue") return b.closedVolumeLast12Mo - a.closedVolumeLast12Mo;
      if (sortBy === "volume") return b.closedVolumeLast12Mo - a.closedVolumeLast12Mo;
      return 0;
    });

    return result;
  }, [profiles, searchQuery, filterLevel, sortBy]);

  // ── Top risk alerts (critical + high with real production) ──
  const topAlerts = useMemo(() => {
    return profiles
      .filter((p) => (p.riskLevel === "critical" || p.riskLevel === "high") && p.closedVolumeLast12Mo > 0)
      .sort((a, b) => b.closedVolumeLast12Mo - a.closedVolumeLast12Mo)
      .slice(0, 5);
  }, [profiles]);

  // ── Signal frequency data ──
  const signalFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    profiles.forEach((p) => {
      p.signals.forEach((s) => {
        freq[s.name] = (freq[s.name] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [profiles]);

  if (isLoading) {
    return (
      <DashboardLayout title="Retention Risk" subtitle="Analyzing agent data..." icon={Shield}>
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

  return (
    <DashboardLayout
      title="Retention Risk"
      subtitle="Early warning system for agent attrition"
      icon={Shield}
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Row ── */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Active Agents
              </div>
              <div className="text-3xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                Critical Risk
              </div>
              <div className="text-3xl font-bold text-red-600">{summary.critical}</div>
              <p className="text-xs text-muted-foreground mt-1">Need immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
                <Eye className="h-4 w-4" />
                High Risk
              </div>
              <div className="text-3xl font-bold text-orange-600">{summary.high}</div>
              <p className="text-xs text-muted-foreground mt-1">Watch closely</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Volume at Risk
              </div>
              <div className="text-2xl font-bold">{formatCurrency(revenueAtRisk, true)}</div>
              <p className="text-xs text-muted-foreground mt-1">Critical + High risk agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                Health Score
              </div>
              <div className="text-3xl font-bold">
                {summary.total > 0
                  ? Math.round(((summary.low + summary.moderate * 0.7) / summary.total) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">Roster stability</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Priority Alerts ── */}
        {topAlerts.length > 0 && (
          <Alert className="border-red-500/30 bg-red-500/5">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <span className="font-semibold text-red-600">Priority Alerts: </span>
              {topAlerts.length} producing agent{topAlerts.length > 1 ? "s" : ""} showing
              retention risk signals.{" "}
              <span className="text-muted-foreground">
                Combined volume: {formatCurrency(topAlerts.reduce((s, a) => s + a.closedVolumeLast12Mo, 0), true)}.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="watchlist">
          <TabsList>
            <TabsTrigger value="watchlist">🔥 Watchlist</TabsTrigger>
            <TabsTrigger value="analysis">📊 Analysis</TabsTrigger>
            <TabsTrigger value="all-agents">👥 All Agents</TabsTrigger>
          </TabsList>

          {/* ── WATCHLIST TAB ── */}
          <TabsContent value="watchlist" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Risk Agents */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-500" />
                    Agents Requiring Attention
                  </CardTitle>
                  <CardDescription>
                    Sorted by production volume — highest-impact retention risks first
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p className="font-medium">No high-impact retention risks detected</p>
                      <p className="text-sm">All producing agents appear stable</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topAlerts.map((agent) => {
                        const colors = RISK_COLORS[agent.riskLevel];
                        const isExpanded = expandedAgent === agent.agentId;
                        return (
                          <div
                            key={agent.agentId}
                            className={`border rounded-lg p-4 ${colors.bg} ${colors.border} cursor-pointer transition-all hover:shadow-sm`}
                            onClick={() => setExpandedAgent(isExpanded ? null : agent.agentId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm`}
                                  style={{ backgroundColor: colors.fill }}
                                >
                                  {agent.riskScore}
                                </div>
                                <div>
                                  <div className="font-semibold">{agent.name}</div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span>{agent.totalDealsLast12Mo} deals</span>
                                    <span>•</span>
                                    <span>{formatCurrency(agent.closedVolumeLast12Mo, true)} vol</span>
                                    <span>•</span>
                                    <VelocityBadge trend={agent.velocityTrend} pct={agent.velocityChangePct} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={colors.text}>
                                  {RISK_LABELS[agent.riskLevel]}
                                </Badge>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Days Since Close</span>
                                    <div className="font-semibold">{agent.daysSinceLastClose}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Pending Deals</span>
                                    <div className="font-semibold">{agent.pendingDeals}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Active Listings</span>
                                    <div className="font-semibold">{agent.activeListings}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Avg Deal Size</span>
                                    <div className="font-semibold">{formatCurrency(agent.avgDealSize, true)}</div>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-sm font-medium">Risk Signals:</span>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {agent.signals.map((s, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className={
                                          s.severity === "critical"
                                            ? "text-red-600 border-red-300"
                                            : s.severity === "warning"
                                            ? "text-orange-600 border-orange-300"
                                            : "text-blue-600 border-blue-300"
                                        }
                                      >
                                        {s.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>

                                <div className="text-sm text-muted-foreground space-y-1">
                                  {agent.signals.map((s, i) => (
                                    <p key={i}>
                                      • <span className="font-medium">{s.name}:</span> {s.description}
                                    </p>
                                  ))}
                                </div>

                                {/* Recommended action */}
                                <div className="bg-background/50 rounded p-3 text-sm">
                                  <span className="font-medium flex items-center gap-1 mb-1">
                                    <Target className="h-3 w-3" /> Recommended Action:
                                  </span>
                                  <p className="text-muted-foreground">
                                    {getRecommendation(agent)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ANALYSIS TAB ── */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Risk Distribution Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Agent count by risk level</CardDescription>
                </CardHeader>
                <CardContent>
                  {riskDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Common Risk Signals */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Risk Signals</CardTitle>
                  <CardDescription>Patterns across your roster</CardDescription>
                </CardHeader>
                <CardContent>
                  {signalFrequency.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={signalFrequency} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      No signals detected
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Volume vs Risk Scatter */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Volume vs Risk Score</CardTitle>
                  <CardDescription>
                    Top-right quadrant = high-volume agents at high risk (priority retention targets)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scatterData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Volume"
                          tickFormatter={(v) => formatCurrency(v, true)}
                          label={{ value: "12-Month Volume", position: "bottom" }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Risk Score"
                          domain={[0, 100]}
                          label={{ value: "Risk Score", angle: -90, position: "left" }}
                        />
                        <ZAxis type="number" dataKey="z" range={[40, 400]} name="Deals" />
                        <Tooltip
                          formatter={(value: any, name: string) => {
                            if (name === "Volume") return formatCurrency(value);
                            return value;
                          }}
                          labelFormatter={(label) => {
                            const point = scatterData.find((d) => d.x === label);
                            return point?.name || "";
                          }}
                        />
                        <Scatter data={scatterData.filter((d) => d.level === "critical")} fill="#ef4444" name="Critical" />
                        <Scatter data={scatterData.filter((d) => d.level === "high")} fill="#f97316" name="High" />
                        <Scatter data={scatterData.filter((d) => d.level === "moderate")} fill="#eab308" name="Moderate" />
                        <Scatter data={scatterData.filter((d) => d.level === "low")} fill="#22c55e" name="Low" />
                        <Legend />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      No production data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ALL AGENTS TAB ── */}
          <TabsContent value="all-agents" className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {["all", "critical", "high", "moderate", "low"].map((level) => (
                  <Button
                    key={level}
                    variant={filterLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterLevel(level)}
                  >
                    {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                    {level !== "all" && (
                      <span className="ml-1 text-xs opacity-70">
                        ({summary[level as keyof typeof summary]})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  variant={sortBy === "riskScore" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("riskScore")}
                >
                  By Risk
                </Button>
                <Button
                  variant={sortBy === "revenue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("revenue")}
                >
                  By Volume
                </Button>
              </div>
            </div>

            {/* Agent Grid */}
            <div className="space-y-2">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No agents match your filters
                </div>
              ) : (
                filteredProfiles.map((agent) => {
                  const colors = RISK_COLORS[agent.riskLevel];
                  const isExpanded = expandedAgent === agent.agentId;
                  return (
                    <div
                      key={agent.agentId}
                      className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                        isExpanded ? `${colors.bg} ${colors.border}` : ""
                      }`}
                      onClick={() => setExpandedAgent(isExpanded ? null : agent.agentId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: colors.fill }}
                          >
                            {agent.riskScore}
                          </div>
                          <div>
                            <span className="font-medium">{agent.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{agent.totalDealsLast12Mo} deals</span>
                              <span>•</span>
                              <span>{formatCurrency(agent.closedVolumeLast12Mo, true)}</span>
                              {agent.signals.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {agent.signals.length} signal{agent.signals.length > 1 ? "s" : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <VelocityBadge trend={agent.velocityTrend} pct={agent.velocityChangePct} />
                          <Badge variant="outline" className={`text-xs ${colors.text}`}>
                            {RISK_LABELS[agent.riskLevel]}
                          </Badge>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Last 3mo Volume</span>
                              <div className="font-semibold">
                                {formatCurrency(agent.closedVolumeTrailing3Mo, true)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Prior 3mo Volume</span>
                              <div className="font-semibold">
                                {formatCurrency(agent.closedVolumePrior3Mo, true)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Days Since Close</span>
                              <div className="font-semibold">{agent.daysSinceLastClose}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Pending</span>
                              <div className="font-semibold">
                                {agent.pendingDeals} ({formatCurrency(agent.pendingVolume, true)})
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Tenure</span>
                              <div className="font-semibold">{Math.round(agent.daysSinceJoin / 30)} months</div>
                            </div>
                          </div>

                          {agent.signals.length > 0 && (
                            <div className="text-sm space-y-1">
                              {agent.signals.map((s, i) => (
                                <p key={i} className="text-muted-foreground">
                                  <span
                                    className={
                                      s.severity === "critical"
                                        ? "text-red-600"
                                        : s.severity === "warning"
                                        ? "text-orange-600"
                                        : "text-blue-600"
                                    }
                                  >
                                    ●
                                  </span>{" "}
                                  <span className="font-medium">{s.name}:</span> {s.description}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="bg-background/50 rounded p-2 text-sm">
                            <span className="font-medium">→ </span>
                            <span className="text-muted-foreground">{getRecommendation(agent)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Showing {filteredProfiles.length} of {summary.total} agents
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Helper Components ──────────────────────────────

function VelocityBadge({ trend, pct }: { trend: string; pct: number }) {
  if (trend === "declining") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
        <ArrowDownRight className="h-3 w-3" />
        {Math.abs(Math.round(pct))}%
      </span>
    );
  }
  if (trend === "growing") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
        <ArrowUpRight className="h-3 w-3" />
        {Math.round(pct)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />
      Stable
    </span>
  );
}

// ── Recommendations Engine ──────────────────────────

function getRecommendation(agent: AgentRetentionProfile): string {
  const signalNames = agent.signals.map((s) => s.name);

  if (signalNames.includes("Key Producer at Risk")) {
    return `Schedule a 1:1 coffee or call with ${agent.name.split(" ")[0]} this week. Ask about their goals and what support they need. This agent represents ${agent.pctOfTotalVolume.toFixed(1)}% of your volume — proactive outreach now could prevent a costly departure.`;
  }

  if (signalNames.includes("Production Cliff")) {
    return `Something changed for ${agent.name.split(" ")[0]} — production dropped significantly. Check in to understand why. Could be personal, could be they're interviewing elsewhere, or could be a market adjustment. A casual conversation is low-cost and high-value.`;
  }

  if (signalNames.includes("Post-Cap Slowdown")) {
    return `${agent.name.split(" ")[0]} hit their cap and slowed down. This is a classic pre-departure pattern. Consider discussing next year's growth plan, mentorship opportunities, or recognition to keep them engaged.`;
  }

  if (signalNames.includes("Extended Inactivity")) {
    return `${agent.name.split(" ")[0]} hasn't closed in ${agent.daysSinceLastClose}+ days. Reach out to understand their situation — they may need leads, training, or are considering leaving the business entirely.`;
  }

  if (signalNames.includes("Struggling New Agent")) {
    return `New agent ${agent.name.split(" ")[0]} needs more support to get traction. Pair them with a mentor, include in team lead gen, or review their business plan together.`;
  }

  if (signalNames.includes("Empty Pipeline")) {
    return `${agent.name.split(" ")[0]} has nothing in the pipeline — no pending deals or listings. Check if they need lead support, marketing help, or are considering a career change.`;
  }

  if (agent.riskLevel === "moderate") {
    return `Monitor ${agent.name.split(" ")[0]} — some minor signals but not urgent. A quick check-in at the next team meeting would be appropriate.`;
  }

  return `${agent.name.split(" ")[0]} appears stable. No immediate action needed.`;
}
