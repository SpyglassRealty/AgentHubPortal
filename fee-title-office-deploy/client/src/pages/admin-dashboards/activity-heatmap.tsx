import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Search,
  AlertTriangle,
  Flame,
  Snowflake,
  TrendingUp,
  Users,
  Filter,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoListings,
  useXanoRoster,
  formatCurrency,
} from "@/lib/xano";
import { useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────
interface AgentActivity {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  joinDate?: string;
  // Monthly activity: array of 12 months with counts
  monthlyClosings: number[];
  monthlyListings: number[];
  monthlyPending: number[];
  totalClosings: number;
  totalVolume: number;
  totalGci: number;
  lastActivityDate: string | null;
  daysSinceLastActivity: number;
  activityScore: number; // 0-100
  trend: "hot" | "warming" | "stable" | "cooling" | "cold" | "frozen";
  pendingDeals: number;
}

// ── Color scale for heatmap ──────────────────────────
function getHeatColor(count: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count === 2) return "bg-emerald-300 dark:bg-emerald-800";
  if (count <= 4) return "bg-emerald-400 dark:bg-emerald-700";
  if (count <= 6) return "bg-emerald-500 dark:bg-emerald-600";
  return "bg-emerald-600 dark:bg-emerald-500";
}

function getTrendIcon(trend: AgentActivity["trend"]) {
  switch (trend) {
    case "hot": return <Flame className="h-3.5 w-3.5 text-orange-500" />;
    case "warming": return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    case "stable": return <Activity className="h-3.5 w-3.5 text-blue-500" />;
    case "cooling": return <TrendingUp className="h-3.5 w-3.5 text-amber-500 rotate-180" />;
    case "cold": return <Snowflake className="h-3.5 w-3.5 text-blue-400" />;
    case "frozen": return <Snowflake className="h-3.5 w-3.5 text-red-500" />;
  }
}

function getTrendBadge(trend: AgentActivity["trend"]) {
  const config = {
    hot: { label: "Hot", class: "bg-orange-100 text-orange-700 border-orange-200" },
    warming: { label: "Warming", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    stable: { label: "Stable", class: "bg-blue-100 text-blue-700 border-blue-200" },
    cooling: { label: "Cooling", class: "bg-amber-100 text-amber-700 border-amber-200" },
    cold: { label: "Cold", class: "bg-sky-100 text-sky-700 border-sky-200" },
    frozen: { label: "Frozen", class: "bg-red-100 text-red-700 border-red-200" },
  };
  const c = config[trend];
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.class}`}>
      {getTrendIcon(trend)}
      <span className="ml-1">{c.label}</span>
    </Badge>
  );
}

type SortField = "name" | "activity" | "trend" | "lastActive" | "volume";
type FilterTrend = "all" | "hot" | "warming" | "stable" | "cooling" | "cold" | "frozen";

export default function ActivityHeatmap() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const listings = useXanoListings();
  const roster = useXanoRoster();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("activity");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterTrend, setFilterTrend] = useState<FilterTrend>("all");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const isLoading = closedTx.isLoading || pendingTx.isLoading || listings.isLoading || roster.isLoading;

  // ── Build the month labels (last 12 months) ────────
  const monthLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return labels;
  }, []);

  // ── Compute agent activity data ────────────────────
  const agents = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];
    const listingsArr = Array.isArray(listings.data) ? listings.data : [];
    const rosterArr = Array.isArray(roster.data) ? roster.data : [];

    const now = new Date();
    const agentMap = new Map<string, AgentActivity>();

    // Initialize from roster
    rosterArr.forEach(r => {
      const name = r.name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || `Agent ${r.id}`;
      if (!agentMap.has(name)) {
        agentMap.set(name, {
          name,
          email: r.email,
          phone: r.phone,
          location: r.location,
          joinDate: r.join_date,
          monthlyClosings: new Array(12).fill(0),
          monthlyListings: new Array(12).fill(0),
          monthlyPending: new Array(12).fill(0),
          totalClosings: 0,
          totalVolume: 0,
          totalGci: 0,
          lastActivityDate: null,
          daysSinceLastActivity: 999,
          activityScore: 0,
          trend: "frozen",
          pendingDeals: 0,
        });
      }
    });

    // Helper: get month index (0-11) relative to our 12-month window
    function getMonthIndex(dateStr: string): number {
      const d = new Date(dateStr);
      const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      return 11 - monthDiff; // 11 = current month, 0 = 12 months ago
    }

    function updateLastActivity(agent: AgentActivity, dateStr: string) {
      if (!dateStr) return;
      if (!agent.lastActivityDate || new Date(dateStr) > new Date(agent.lastActivityDate)) {
        agent.lastActivityDate = dateStr;
        agent.daysSinceLastActivity = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 86400000);
      }
    }

    // Process closed transactions
    closed.forEach(t => {
      const name = t.agent_name || t.listing_agent || t.buying_agent;
      if (!name) return;
      const date = t.close_date || t.closing_date || t.created_at;
      if (!date) return;

      if (!agentMap.has(name)) {
        agentMap.set(name, {
          name,
          monthlyClosings: new Array(12).fill(0),
          monthlyListings: new Array(12).fill(0),
          monthlyPending: new Array(12).fill(0),
          totalClosings: 0,
          totalVolume: 0,
          totalGci: 0,
          lastActivityDate: null,
          daysSinceLastActivity: 999,
          activityScore: 0,
          trend: "frozen",
          pendingDeals: 0,
        });
      }

      const agent = agentMap.get(name)!;
      const mi = getMonthIndex(date);
      if (mi >= 0 && mi <= 11) {
        agent.monthlyClosings[mi]++;
      }
      agent.totalClosings++;
      agent.totalVolume += t.close_price || t.sale_price || t.price || t.volume || 0;
      agent.totalGci += t.gci || t.gross_commission || 0;
      updateLastActivity(agent, date);
    });

    // Process listings
    listingsArr.forEach(l => {
      const name = l.agent_name;
      if (!name) return;
      const date = l.listing_date || l.created_at;
      if (!date) return;

      if (!agentMap.has(name)) return; // Only track known agents
      const agent = agentMap.get(name)!;
      const mi = getMonthIndex(date);
      if (mi >= 0 && mi <= 11) {
        agent.monthlyListings[mi]++;
      }
      updateLastActivity(agent, date);
    });

    // Process pending
    pending.forEach(p => {
      const name = p.agent_name || p.listing_agent || p.buying_agent;
      if (!name) return;
      if (!agentMap.has(name)) return;
      const agent = agentMap.get(name)!;
      agent.pendingDeals++;
      const date = p.expected_close_date || p.created_at;
      if (date) updateLastActivity(agent, date);
    });

    // Calculate activity scores and trends
    agentMap.forEach(agent => {
      // Activity score: weighted sum of recent months
      // Last month = 30 weight, 2 months ago = 25, 3 = 20, etc.
      const weights = [2, 3, 5, 7, 9, 11, 13, 15, 18, 20, 25, 30]; // oldest to newest
      let weightedSum = 0;
      let maxPossible = 0;
      for (let i = 0; i < 12; i++) {
        const activity = agent.monthlyClosings[i] + agent.monthlyListings[i] * 0.5;
        weightedSum += Math.min(activity, 5) * weights[i]; // cap at 5 per month
        maxPossible += 5 * weights[i];
      }
      agent.activityScore = Math.round((weightedSum / maxPossible) * 100);

      // Add pending bonus
      if (agent.pendingDeals > 0) {
        agent.activityScore = Math.min(100, agent.activityScore + agent.pendingDeals * 5);
      }

      // Determine trend based on recent vs. older activity
      const recent3 = agent.monthlyClosings.slice(9, 12).reduce((a, b) => a + b, 0);
      const older3 = agent.monthlyClosings.slice(6, 9).reduce((a, b) => a + b, 0);

      if (recent3 >= 3 && recent3 > older3) agent.trend = "hot";
      else if (recent3 > older3 && recent3 >= 1) agent.trend = "warming";
      else if (recent3 === older3 && recent3 > 0) agent.trend = "stable";
      else if (recent3 < older3 && recent3 > 0) agent.trend = "cooling";
      else if (recent3 === 0 && older3 > 0) agent.trend = "cold";
      else if (recent3 === 0 && older3 === 0) agent.trend = "frozen";

      // Override: if they have pending deals, they're at least cooling
      if (agent.pendingDeals > 0 && (agent.trend === "cold" || agent.trend === "frozen")) {
        agent.trend = "cooling";
      }
    });

    return Array.from(agentMap.values());
  }, [closedTx.data, pendingTx.data, listings.data, roster.data]);

  // ── Filter and sort ────────────────────────────────
  const filteredAgents = useMemo(() => {
    let result = agents;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
      );
    }

    // Filter by trend
    if (filterTrend !== "all") {
      result = result.filter(a => a.trend === filterTrend);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "activity": cmp = a.activityScore - b.activityScore; break;
        case "trend": {
          const order = { hot: 5, warming: 4, stable: 3, cooling: 2, cold: 1, frozen: 0 };
          cmp = order[a.trend] - order[b.trend];
          break;
        }
        case "lastActive": cmp = b.daysSinceLastActivity - a.daysSinceLastActivity; break;
        case "volume": cmp = a.totalVolume - b.totalVolume; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [agents, searchQuery, sortField, sortAsc, filterTrend]);

  // ── Summary stats ──────────────────────────────────
  const summary = useMemo(() => {
    const trendCounts = { hot: 0, warming: 0, stable: 0, cooling: 0, cold: 0, frozen: 0 };
    agents.forEach(a => trendCounts[a.trend]++);
    const atRisk = trendCounts.cold + trendCounts.frozen;
    const thriving = trendCounts.hot + trendCounts.warming;
    return { trendCounts, atRisk, thriving, total: agents.length };
  }, [agents]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <DashboardLayout
      title="Agent Activity Heatmap"
      subtitle="12-month activity visualization — identify at-risk and thriving agents"
      icon={Activity}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Summary Cards ──────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {(["hot", "warming", "stable", "cooling", "cold", "frozen"] as const).map(trend => (
              <Card
                key={trend}
                className={`cursor-pointer transition-all ${filterTrend === trend ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                onClick={() => setFilterTrend(filterTrend === trend ? "all" : trend)}
              >
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {getTrendIcon({ trend } as AgentActivity)}
                    <span className="text-xs font-medium capitalize">{trend}</span>
                  </div>
                  <div className="text-2xl font-bold">{summary.trendCounts[trend]}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Alert for at-risk agents ───────────────── */}
          {summary.atRisk > 5 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="text-sm font-semibold">{summary.atRisk} agents are cold or frozen</span>
                  <span className="text-xs text-muted-foreground ml-2">— consider outreach or check-ins to prevent attrition</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Controls ──────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {filterTrend !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setFilterTrend("all")}>
                <Filter className="h-3 w-3 mr-1" /> Clear filter
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Showing {filteredAgents.length} of {agents.length} agents
            </span>
          </div>

          {/* ── Heatmap Grid ──────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Agent Activity Grid</CardTitle>
                  <CardDescription>Each cell = closing count for that month. Darker = more active.</CardDescription>
                </div>
                {/* Color legend */}
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-800" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                  <span>More</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th
                        className="text-left py-2 pr-3 font-medium cursor-pointer hover:text-foreground min-w-[180px]"
                        onClick={() => handleSort("name")}
                      >
                        <span className="flex items-center gap-1">Agent <SortIcon field="name" /></span>
                      </th>
                      <th
                        className="text-center py-2 px-2 font-medium cursor-pointer hover:text-foreground w-16"
                        onClick={() => handleSort("trend")}
                      >
                        <span className="flex items-center justify-center gap-1">Trend <SortIcon field="trend" /></span>
                      </th>
                      {monthLabels.map(m => (
                        <th key={m.key} className="text-center py-2 px-1 font-medium w-10" title={m.fullLabel}>
                          {m.label}
                        </th>
                      ))}
                      <th
                        className="text-center py-2 px-2 font-medium cursor-pointer hover:text-foreground w-16"
                        onClick={() => handleSort("activity")}
                      >
                        <span className="flex items-center justify-center gap-1">Score <SortIcon field="activity" /></span>
                      </th>
                      <th
                        className="text-right py-2 pl-3 font-medium cursor-pointer hover:text-foreground w-24"
                        onClick={() => handleSort("volume")}
                      >
                        <span className="flex items-center justify-end gap-1">Volume <SortIcon field="volume" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map(agent => (
                      <>
                        <tr
                          key={agent.name}
                          className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
                        >
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate max-w-[160px]">{agent.name}</div>
                                {agent.location && (
                                  <div className="text-[10px] text-muted-foreground truncate">{agent.location}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {getTrendBadge(agent.trend)}
                          </td>
                          <TooltipProvider>
                            {agent.monthlyClosings.map((count, mi) => (
                              <td key={mi} className="py-2 px-1 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`w-7 h-7 rounded-sm mx-auto flex items-center justify-center text-[10px] font-medium transition-colors ${getHeatColor(count)} ${count > 0 ? "text-emerald-900 dark:text-emerald-100" : "text-gray-400 dark:text-gray-600"}`}
                                    >
                                      {count > 0 ? count : ""}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-medium">{agent.name}</p>
                                    <p className="text-xs">{monthLabels[mi].fullLabel}: {count} closing{count !== 1 ? "s" : ""}</p>
                                    {agent.monthlyListings[mi] > 0 && (
                                      <p className="text-xs">{agent.monthlyListings[mi]} listing{agent.monthlyListings[mi] !== 1 ? "s" : ""}</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            ))}
                          </TooltipProvider>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div
                                className="w-8 h-2 rounded-full bg-muted overflow-hidden"
                                title={`Activity Score: ${agent.activityScore}/100`}
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    agent.activityScore >= 60 ? "bg-emerald-500" :
                                    agent.activityScore >= 30 ? "bg-amber-500" : "bg-red-400"
                                  }`}
                                  style={{ width: `${agent.activityScore}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium w-6">{agent.activityScore}</span>
                            </div>
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <span className="text-sm font-medium">{formatCurrency(agent.totalVolume, true)}</span>
                          </td>
                        </tr>
                        {/* Expanded detail row */}
                        {expandedAgent === agent.name && (
                          <tr key={`${agent.name}-detail`} className="bg-muted/30">
                            <td colSpan={16} className="py-3 px-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs block mb-0.5">Total Closings</span>
                                  <span className="font-semibold">{agent.totalClosings}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block mb-0.5">Total GCI</span>
                                  <span className="font-semibold text-emerald-600">{formatCurrency(agent.totalGci, true)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block mb-0.5">Pending Deals</span>
                                  <span className="font-semibold">{agent.pendingDeals}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block mb-0.5">Last Activity</span>
                                  <span className="font-semibold">
                                    {agent.lastActivityDate
                                      ? `${agent.daysSinceLastActivity}d ago`
                                      : "Never"}
                                  </span>
                                </div>
                                {agent.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <a href={`mailto:${agent.email}`} className="text-xs text-primary hover:underline">{agent.email}</a>
                                  </div>
                                )}
                                {agent.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <a href={`tel:${agent.phone}`} className="text-xs text-primary hover:underline">{agent.phone}</a>
                                  </div>
                                )}
                                {agent.joinDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">Joined {new Date(agent.joinDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              {/* Recommended action */}
                              <div className="mt-3 p-2 rounded-md bg-background border text-xs">
                                <span className="font-medium">Recommended Action: </span>
                                {agent.trend === "frozen" && "Schedule a 1-on-1 check-in. Agent has had no activity — they may have left or be disengaged."}
                                {agent.trend === "cold" && "Reach out with a warm call. Recent activity has stopped — early intervention prevents departures."}
                                {agent.trend === "cooling" && "Touch base casually. Production is declining — they may need support, leads, or mentoring."}
                                {agent.trend === "stable" && "Good rhythm. Consider offering growth opportunities or advanced training to push them higher."}
                                {agent.trend === "warming" && "Recognize their momentum! A public shout-out or incentive could amplify their trajectory."}
                                {agent.trend === "hot" && "Celebrate this top performer. Consider them for mentorship roles or leadership track."}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAgents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No agents match your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
