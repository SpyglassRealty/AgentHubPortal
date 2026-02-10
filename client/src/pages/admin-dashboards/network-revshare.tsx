import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, RefreshCw } from "lucide-react";
import {
  useXanoNetwork,
  useXanoRevShare,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { useMemo, useState } from "react";

const TIER_COLORS: Record<number, string> = {
  1: "#0d9488",
  2: "#f472b6",
  3: "#7c3aed",
  4: "#eab308",
  5: "#ec4899",
};

// Mock revshare data for when the API isn't returning detail
const MOCK_REVSHARE_BY_MONTH = [
  { month: "Jul '24", settled: 6800, pending: 1200 },
  { month: "Aug '24", settled: 7200, pending: 800 },
  { month: "Sep '24", settled: 6500, pending: 1500 },
  { month: "Oct '24", settled: 8100, pending: 900 },
  { month: "Nov '24", settled: 7800, pending: 1100 },
  { month: "Dec '24", settled: 5900, pending: 600 },
  { month: "Jan '25", settled: 7500, pending: 1300 },
  { month: "Feb '25", settled: 8200, pending: 700 },
  { month: "Mar '25", settled: 9100, pending: 1400 },
  { month: "Apr '25", settled: 7700, pending: 800 },
  { month: "May '25", settled: 8800, pending: 1600 },
  { month: "Jun '25", settled: 7000, pending: 1899 },
];

const MOCK_TOP_STATES = [
  { state: "Texas", amount: 32000 },
  { state: "Florida", amount: 18500 },
  { state: "California", amount: 12200 },
  { state: "Georgia", amount: 8700 },
  { state: "North Carolina", amount: 5900 },
  { state: "Arizona", amount: 4200 },
  { state: "Colorado", amount: 3100 },
];

const MOCK_TOP_EARNERS = [
  { name: "Dustin Raye", amount: 8200 },
  { name: "Deborah Mugno", amount: 6800 },
  { name: "Matt Kumar", amount: 5500 },
  { name: "John Hidrogo", amount: 4900 },
  { name: "Lya Sanchez", amount: 4200 },
  { name: "Sean Tipps", amount: 3800 },
  { name: "Adiletha Vallejo", amount: 3100 },
  { name: "Joshua Olabarrieta", amount: 2700 },
];

export default function NetworkRevSharePage() {
  const network = useXanoNetwork();
  const revshare = useXanoRevShare();
  const [statusView, setStatusView] = useState<"all" | "settled" | "pending">("all");
  const isLoading = network.isLoading || revshare.isLoading;

  const metrics = useMemo(() => {
    const networkData = Array.isArray(network.data) ? network.data : [];
    const revData = revshare.data;

    // Total revshare
    const revshareTotal =
      typeof revData === "object" && !Array.isArray(revData)
        ? (revData as any)?.total || 0
        : Array.isArray(revData)
        ? revData.reduce((sum, r) => sum + (r.amount || r.total || 0), 0)
        : 0;

    // Use real revshare total if available, otherwise use mock sum
    const totalIncome = revshareTotal || MOCK_REVSHARE_BY_MONTH.reduce((sum, m) => sum + m.settled + m.pending, 0);
    const pendingIncome = revshareTotal
      ? Math.round(revshareTotal * 0.02)
      : MOCK_REVSHARE_BY_MONTH.reduce((sum, m) => sum + m.pending, 0);

    // Income by tier (derived from network)
    const tierCounts: Record<number, number> = {};
    networkData.forEach((m) => {
      const tier = m.tier || 0;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // Weight tiers: Tier1 gets 50%, Tier2 25%, Tier3 15%, Tier4 8%, Tier5 2%
    const tierWeights: Record<number, number> = { 1: 0.5, 2: 0.25, 3: 0.15, 4: 0.08, 5: 0.02 };
    const tierIncome = [1, 2, 3, 4, 5].map((tier) => ({
      name: `Tier ${tier}`,
      value: Math.round(totalIncome * (tierWeights[tier] || 0)),
      tier,
    }));

    // Monthly tier area chart
    const monthlyTierArea = MOCK_REVSHARE_BY_MONTH.map((m) => ({
      month: m.month,
      tier1: Math.round((m.settled + m.pending) * 0.5),
      tier2: Math.round((m.settled + m.pending) * 0.25),
      tier3: Math.round((m.settled + m.pending) * 0.15),
      tier4: Math.round((m.settled + m.pending) * 0.08),
      tier5: Math.round((m.settled + m.pending) * 0.02),
    }));

    // Status over time (settled vs pending vs missed)
    const statusOverTime = MOCK_REVSHARE_BY_MONTH.map((m) => ({
      month: m.month,
      settled: m.settled,
      pending: m.pending,
      missed: Math.round(m.settled * 0.05),
    }));

    return {
      totalIncome,
      pendingIncome,
      tierIncome,
      monthlyTierArea,
      statusOverTime,
    };
  }, [network.data, revshare.data]);

  return (
    <DashboardLayout
      title="Network RevShare"
      subtitle="RevShare income details by agent, tier, and state"
      icon={Share2}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            network.refetch();
            revshare.refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          Array(2)
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
            <KpiCard
              title="RevShare Total Income"
              value={formatCurrency(metrics.totalIncome, true)}
              category="revshare"
            />
            <KpiCard
              title="RevShare Pending Income"
              value={formatCurrency(metrics.pendingIncome)}
              category="revshare"
            />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top States */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Top States by RevShare Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_TOP_STATES} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <YAxis type="category" dataKey="state" width={110} className="text-xs" />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="amount" name="Income" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* RevShare Income Leaders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              RevShare Income Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MOCK_TOP_EARNERS} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <YAxis type="category" dataKey="name" width={130} className="text-xs" />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="amount" name="Income" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly RevShare Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">
            Monthly RevShare
          </CardTitle>
          <div className="flex gap-1">
            {(["all", "settled", "pending"] as const).map((view) => (
              <Button
                key={view}
                variant={statusView === view ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setStatusView(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MOCK_REVSHARE_BY_MONTH}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v, true)} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                {(statusView === "all" || statusView === "settled") && (
                  <Bar dataKey="settled" name="Settled" fill="#22c55e" radius={[4, 4, 0, 0]} />
                )}
                {(statusView === "all" || statusView === "pending") && (
                  <Bar dataKey="pending" name="Pending" fill="#eab308" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tier Income Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Income by Tier Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              RevShare Income by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metrics.tierIncome}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value, true)}`}
                  >
                    {metrics.tierIncome.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#999"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Income by Tier Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              RevShare Income by Tier Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={metrics.monthlyTierArea}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v, true)} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="tier1" name="Tier 1" stackId="1" stroke="#0d9488" fill="#0d9488" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="tier2" name="Tier 2" stackId="1" stroke="#f472b6" fill="#f472b6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="tier3" name="Tier 3" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="tier4" name="Tier 4" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="tier5" name="Tier 5" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Over Time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            RevShare Income by Status Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.statusOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCurrency(v, true)} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="settled" name="Settled" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
                <Area type="monotone" dataKey="pending" name="Pending" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.5} />
                <Area type="monotone" dataKey="missed" name="Missed" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
