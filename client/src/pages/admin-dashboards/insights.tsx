import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  RefreshCw,
  Send,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Bot,
  Activity,
  Star,
} from "lucide-react";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoListings,
  useXanoNetwork,
  formatCurrency,
  formatNumber,
  getMonthKey,
} from "@/lib/xano";
import { useMemo, useState } from "react";

export default function InsightsPage() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const listings = useXanoListings();
  const network = useXanoNetwork();
  const [activityFilter, setActivityFilter] = useState("all");
  const [noraInput, setNoraInput] = useState("");

  const isLoading =
    closedTx.isLoading || pendingTx.isLoading || listings.isLoading || network.isLoading;

  const metrics = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];
    const listingsData = Array.isArray(listings.data) ? listings.data : [];
    const networkData = Array.isArray(network.data) ? network.data : [];

    const closedUnits = closed.length;
    const totalGci = closed.reduce((sum, t) => sum + (t.gci || t.gross_commission || 0), 0);
    const pendingUnits = pending.length;
    const activeListings = listingsData.length;

    // Listings expiring soon (next 30 days)
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringListings = listingsData.filter((l) => {
      const exp = l.expiration_date ? new Date(l.expiration_date) : null;
      return exp && exp >= now && exp <= thirtyDays;
    });

    // New agents (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newAgents = networkData.filter((m) => {
      const joinDate = m.join_date ? new Date(m.join_date) : null;
      return joinDate && joinDate >= thirtyDaysAgo;
    });

    // Upcoming revenue (pending closing in next 30 days)
    const upcomingRevenue = pending
      .filter((t) => {
        const d = t.expected_close_date || t.close_date;
        if (!d) return false;
        const date = new Date(d);
        return date >= now && date <= thirtyDays;
      })
      .sort((a, b) => {
        const da = new Date(a.expected_close_date || a.close_date || "");
        const db = new Date(b.expected_close_date || b.close_date || "");
        return da.getTime() - db.getTime();
      });

    const upcomingRevenueTotal = upcomingRevenue.reduce(
      (sum, t) => sum + (t.gci || t.gross_commission || 0) * 0.72,
      0
    );

    // Needs attention: overdue deals (pending with expected close in past)
    const overduePending = pending.filter((t) => {
      const d = t.expected_close_date;
      if (!d) return false;
      return new Date(d) < now;
    });
    const overdueVolume = overduePending.reduce(
      (sum, t) => sum + (t.close_price || t.sale_price || t.price || t.volume || 0),
      0
    );

    // Aging deals (pending > 60 days old)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const agingDeals = pending.filter((t) => {
      const d = t.created_at;
      if (!d) return false;
      return new Date(d) < sixtyDaysAgo;
    });
    const agingVolume = agingDeals.reduce(
      (sum, t) => sum + (t.close_price || t.sale_price || t.price || t.volume || 0),
      0
    );

    // Latest activity - combine recent closed/pending transactions
    const recentActivity = [
      ...closed.slice(0, 20).map((t) => ({
        type: "transaction" as const,
        subType: "closed",
        name: t.agent_name || t.listing_agent || t.buying_agent || "Agent",
        detail: t.address || t.street_address || "Property",
        amount: t.close_price || t.sale_price || t.price || t.volume || 0,
        date: t.close_date || t.closing_date || t.created_at || "",
      })),
      ...pending.slice(0, 10).map((t) => ({
        type: "transaction" as const,
        subType: "pending",
        name: t.agent_name || t.listing_agent || t.buying_agent || "Agent",
        detail: t.address || t.street_address || "Property",
        amount: t.price || t.sale_price || t.volume || 0,
        date: t.created_at || "",
      })),
      ...listingsData.slice(0, 10).map((l) => ({
        type: "listing" as const,
        subType: "new",
        name: l.agent_name || "Agent",
        detail: l.address || l.street_address || "Property",
        amount: l.list_price || l.price || 0,
        date: l.listing_date || l.created_at || "",
      })),
      ...newAgents.map((m) => ({
        type: "network" as const,
        subType: "joined",
        name: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Agent",
        detail: `Tier ${m.tier || "—"}`,
        amount: 0,
        date: m.join_date || "",
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    return {
      closedUnits,
      totalGci,
      pendingUnits,
      activeListings,
      expiringListings,
      newAgents,
      upcomingRevenue,
      upcomingRevenueTotal,
      overduePending,
      overdueVolume,
      agingDeals,
      agingVolume,
      recentActivity,
    };
  }, [closedTx.data, pendingTx.data, listings.data, network.data]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return metrics.recentActivity;
    return metrics.recentActivity.filter((a) => {
      if (activityFilter === "transactions") return a.type === "transaction";
      if (activityFilter === "listings") return a.type === "listing";
      if (activityFilter === "network") return a.type === "network";
      return true;
    });
  }, [metrics.recentActivity, activityFilter]);

  const handleRefresh = () => {
    closedTx.refetch();
    pendingTx.refetch();
    listings.refetch();
    network.refetch();
  };

  const getActivityBadge = (type: string, subType: string) => {
    if (type === "transaction" && subType === "closed")
      return <Badge className="bg-teal-500 text-white text-[10px]">Closed</Badge>;
    if (type === "transaction" && subType === "pending")
      return <Badge className="bg-yellow-500 text-white text-[10px]">Pending</Badge>;
    if (type === "listing")
      return <Badge className="bg-pink-400 text-white text-[10px]">Listing</Badge>;
    if (type === "network")
      return <Badge className="bg-red-400 text-white text-[10px]">Network</Badge>;
    return <Badge variant="outline" className="text-[10px]">{subType}</Badge>;
  };

  return (
    <DashboardLayout
      title="Insights"
      subtitle="AI-powered insights, activity feed, and alerts"
      icon={Lightbulb}
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Hero Achievement Banner */}
      <Card className="mb-6 bg-gradient-to-r from-teal-500/10 via-primary/5 to-transparent border-teal-500/30">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="p-3 rounded-full bg-teal-500/20">
            <Star className="h-8 w-8 text-teal-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Great progress! Your team has closed {formatNumber(metrics.closedUnits)} deals.
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(metrics.totalGci, true)} earned • {metrics.pendingUnits} pending •{" "}
              {metrics.activeListings} active listings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array(3)
            .fill(null)
            .map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
        ) : (
          <>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Listings Expiring Soon</span>
                </div>
                <div className="text-2xl font-bold">{metrics.expiringListings.length}</div>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
              </CardContent>
            </Card>
            <KpiCard
              title="Transactions"
              value={formatNumber(metrics.closedUnits)}
              subtitle="Closed this period"
              category="transactions"
            />
            <KpiCard
              title="Revenue"
              value={formatCurrency(metrics.totalGci, true)}
              subtitle="Total GCI"
              category="revenue"
            />
          </>
        )}
      </div>

      {/* NORA AI Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            NORA AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Ask NORA about your team&apos;s performance, market trends, or coaching strategies.
          </p>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Ask NORA a question about your business..."
              value={noraInput}
              onChange={(e) => setNoraInput(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" disabled>
              <Send className="h-4 w-4 mr-1" />
              Ask
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "Who are my top performers this month?",
              "Which deals are at risk?",
              "Suggest coaching tips for new agents",
              "Summarize revenue trends",
            ].map((prompt) => (
              <Badge
                key={prompt}
                variant="outline"
                className="cursor-pointer hover:bg-muted transition-colors text-xs"
                onClick={() => setNoraInput(prompt)}
              >
                {prompt}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            NORA integration coming soon — powered by AgentDashboards AI
          </p>
        </CardContent>
      </Card>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Latest Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 mb-3">
              {["all", "transactions", "listings", "network"].map((f) => (
                <Button
                  key={f}
                  variant={activityFilter === f ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setActivityFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredActivity.slice(0, 15).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                    {getActivityBadge(item.type, item.subType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.amount > 0 && (
                        <p className="text-xs font-medium">{formatCurrency(item.amount, true)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {item.date ? new Date(item.date).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredActivity.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity found</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Revenue */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Upcoming Revenue
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(metrics.upcomingRevenueTotal, true)} in next 30 days
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {metrics.upcomingRevenue.slice(0, 15).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.agent_name || t.listing_agent || t.buying_agent || "Agent"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.address || t.street_address || "Property"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium">
                        {formatCurrency((t.gci || t.gross_commission || 0) * 0.72, true)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.expected_close_date
                          ? new Date(t.expected_close_date).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
                {metrics.upcomingRevenue.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming closings
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {metrics.overduePending.length + metrics.agingDeals.length + metrics.newAgents.length}{" "}
              items
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.overduePending.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        Overdue Deals
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {metrics.overduePending.length} deals
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(metrics.overdueVolume, true)} volume
                    </p>
                  </div>
                )}
                {metrics.agingDeals.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Aging Deals (&gt;60 days)
                      </span>
                    </div>
                    <p className="text-lg font-bold">{metrics.agingDeals.length} deals</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(metrics.agingVolume, true)} volume
                    </p>
                  </div>
                )}
                {metrics.newAgents.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        New Agents
                      </span>
                    </div>
                    <p className="text-lg font-bold">{metrics.newAgents.length} agents</p>
                    <p className="text-xs text-muted-foreground">Joined in last 30 days</p>
                  </div>
                )}
                {metrics.overduePending.length === 0 &&
                  metrics.agingDeals.length === 0 &&
                  metrics.newAgents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nothing needs attention right now 🎉
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
