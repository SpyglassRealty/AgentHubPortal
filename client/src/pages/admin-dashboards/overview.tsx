import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LayoutDashboard,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoListings,
  useXanoNetwork,
  useXanoRevShare,
  useXanoRoster,
  formatCurrency,
  formatNumber,
  getMonthKey,
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
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useMemo } from "react";

const COLORS = ["#0d9488", "#f472b6", "#7c3aed", "#eab308", "#ec4899"];

export default function AdminDashboardOverview() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const listings = useXanoListings();
  const network = useXanoNetwork();
  const revshare = useXanoRevShare();
  const roster = useXanoRoster();

  const isLoading =
    closedTx.isLoading ||
    pendingTx.isLoading ||
    listings.isLoading ||
    network.isLoading;

  const hasError =
    closedTx.isError ||
    pendingTx.isError ||
    listings.isError ||
    network.isError;

  // ── Computed metrics ────────────────────────────────
  const metrics = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];
    const listingsData = Array.isArray(listings.data) ? listings.data : [];
    const networkData = Array.isArray(network.data) ? network.data : [];
    const revshareData = Array.isArray(revshare.data) ? revshare.data : [];
    const rosterData = Array.isArray(roster.data) ? roster.data : [];

    // Closed transactions metrics
    const closedUnits = closed.length;
    const closedVolume = closed.reduce(
      (sum, t) => sum + (t.close_price || t.sale_price || t.price || t.volume || 0),
      0
    );
    const closedGci = closed.reduce(
      (sum, t) => sum + (t.gci || t.gross_commission || 0),
      0
    );

    // Pending
    const pendingUnits = pending.length;
    const pendingVolume = pending.reduce(
      (sum, t) => sum + (t.price || t.sale_price || t.volume || 0),
      0
    );

    // Avg sale price
    const avgSalePrice = closedUnits > 0 ? closedVolume / closedUnits : 0;

    // Listings
    const totalListings = listingsData.length;
    const totalListingVolume = listingsData.reduce(
      (sum, l) => sum + (l.list_price || l.price || 0),
      0
    );

    // Network tiers
    const networkActive = networkData.filter(
      (m) => m.status === "Active" || m.status === "active"
    );
    const totalAgents = networkActive.length || networkData.length;
    const tierCounts: Record<number, number> = {};
    networkData.forEach((m) => {
      const tier = m.tier || 0;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // RevShare totals
    const revshareTotal = typeof revshareData === 'object' && !Array.isArray(revshareData) 
      ? (revshareData as any)?.total || 0
      : Array.isArray(revshareData) 
        ? revshareData.reduce((sum, r) => sum + (r.amount || r.total || 0), 0)
        : 0;

    // Roster
    const rosterCount = rosterData.length;

    // Monthly closed units (for chart)
    const monthlyData: Record<string, { month: string; units: number; volume: number; gci: number }> = {};
    closed.forEach((t) => {
      const date = t.close_date || t.closing_date || t.created_at;
      if (!date) return;
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        const d = new Date(date);
        monthlyData[key] = {
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          units: 0,
          volume: 0,
          gci: 0,
        };
      }
      monthlyData[key].units++;
      monthlyData[key].volume += t.close_price || t.sale_price || t.price || t.volume || 0;
      monthlyData[key].gci += t.gci || t.gross_commission || 0;
    });

    const chartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v);

    // Tier pie data
    const tierPieData = Object.entries(tierCounts)
      .filter(([tier]) => Number(tier) > 0)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([tier, count]) => ({
        name: `Tier ${tier}`,
        value: count,
      }));

    return {
      closedUnits,
      closedVolume,
      closedGci,
      pendingUnits,
      pendingVolume,
      avgSalePrice,
      totalListings,
      totalListingVolume,
      totalAgents,
      tierCounts,
      tierPieData,
      revshareTotal,
      rosterCount,
      chartData,
    };
  }, [closedTx.data, pendingTx.data, listings.data, network.data, revshare.data, roster.data]);

  const handleRefresh = () => {
    closedTx.refetch();
    pendingTx.refetch();
    listings.refetch();
    network.refetch();
    revshare.refetch();
    roster.refetch();
  };

  return (
    <DashboardLayout
      title="Business Dashboard"
      subtitle="Spyglass Realty — Team overview powered by AgentDashboards"
      icon={LayoutDashboard}
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {hasError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load some data from AgentDashboards. Check the Xano auth token in
            admin settings. Errors:{" "}
            {[closedTx.error, pendingTx.error, listings.error, network.error]
              .filter(Boolean)
              .map((e: any) => e?.message)
              .join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Row 1 - Transactions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? (
          Array(5)
            .fill(null)
            .map((_, i) => (
              <Card key={i} className="border-l-4 border-l-muted">
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
        ) : (
          <>
            <KpiCard
              title="Closed Units"
              value={formatNumber(metrics.closedUnits)}
              category="transactions"
              tooltip="Total number of closed transactions in the period"
            />
            <KpiCard
              title="Closed Volume"
              value={formatCurrency(metrics.closedVolume, true)}
              category="transactions"
              tooltip="Total dollar volume of closed transactions"
            />
            <KpiCard
              title="Closed GCI"
              value={formatCurrency(metrics.closedGci, true)}
              category="transactions"
              tooltip="Gross Commission Income from closed transactions"
            />
            <KpiCard
              title="Pending Units"
              value={formatNumber(metrics.pendingUnits)}
              category="transactions"
            />
            <KpiCard
              title="Avg Sale Price"
              value={formatCurrency(metrics.avgSalePrice, true)}
              category="transactions"
            />
          </>
        )}
      </div>

      {/* KPI Row 2 - Mixed */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? (
          Array(5)
            .fill(null)
            .map((_, i) => (
              <Card key={i} className="border-l-4 border-l-muted">
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
        ) : (
          <>
            <KpiCard
              title="Gross Income"
              value={formatCurrency(metrics.closedGci, true)}
              subtitle="Closed"
              category="revenue"
            />
            <KpiCard
              title="Net Income"
              value={formatCurrency(metrics.closedGci * 0.72, true)}
              subtitle="Closed (est.)"
              category="revenue"
            />
            <KpiCard
              title="Total Listings"
              value={formatNumber(metrics.totalListings)}
              category="listings"
            />
            <KpiCard
              title="Total Agents"
              value={formatNumber(metrics.totalAgents)}
              category="network"
            />
            <KpiCard
              title="RevShare Income"
              value={formatCurrency(metrics.revshareTotal, true)}
              category="revshare"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Units Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Closed Units (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={metrics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="units"
                    name="Monthly Units"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agents by Tier Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Active Agents by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : metrics.tierPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.tierPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {metrics.tierPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No network data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="gci"
                  name="GCI"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
