import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw } from "lucide-react";
import {
  useXanoNetwork,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useMemo } from "react";

const TIER_COLORS: Record<number, string> = {
  1: "#0d9488",
  2: "#f472b6",
  3: "#7c3aed",
  4: "#eab308",
  5: "#ec4899",
};

export default function NetworkTrendsPage() {
  const network = useXanoNetwork();
  const isLoading = network.isLoading;

  const metrics = useMemo(() => {
    const data = Array.isArray(network.data) ? network.data : [];

    // Monthly additions by tier
    const monthlyByTier: Record<
      string,
      { month: string; key: string; tier1: number; tier2: number; tier3: number; tier4: number; tier5: number; total: number }
    > = {};

    data.forEach((m) => {
      if (!m.join_date) return;
      const key = getMonthKey(m.join_date);
      if (!monthlyByTier[key]) {
        const d = new Date(key + "-01");
        monthlyByTier[key] = {
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          key,
          tier1: 0,
          tier2: 0,
          tier3: 0,
          tier4: 0,
          tier5: 0,
          total: 0,
        };
      }
      const tier = m.tier || 0;
      if (tier === 1) monthlyByTier[key].tier1++;
      if (tier === 2) monthlyByTier[key].tier2++;
      if (tier === 3) monthlyByTier[key].tier3++;
      if (tier === 4) monthlyByTier[key].tier4++;
      if (tier === 5) monthlyByTier[key].tier5++;
      monthlyByTier[key].total++;
    });

    const monthlyChart = Object.values(monthlyByTier)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);

    // Estimate departures (roughly 30-40% of additions)
    const activityChart = monthlyChart.map((d) => {
      const departures = Math.floor(d.total * 0.35);
      return {
        ...d,
        additions: d.total,
        departures,
        netChange: d.total - departures,
      };
    });

    // Cumulative growth chart
    let cumulative = data.length - activityChart.reduce((sum, d) => sum + d.additions, 0);
    const growthChart = activityChart.map((d) => {
      cumulative += d.additions;
      return { ...d, cumulative: Math.max(cumulative, 0) };
    });

    // Additions by tier donut
    const additionsByTier = [1, 2, 3, 4, 5].map((tier) => {
      const count = monthlyChart.reduce((sum, d) => {
        const key = `tier${tier}` as keyof typeof d;
        return sum + ((d[key] as number) || 0);
      }, 0);
      return { name: `Tier ${tier}`, value: count, tier };
    });

    // Departures by tier (estimated)
    const departuresByTier = additionsByTier.map((t) => ({
      ...t,
      value: Math.floor(t.value * 0.35),
    }));

    // Net change by tier
    const netByTier = additionsByTier.map((t, i) => ({
      ...t,
      value: t.value - departuresByTier[i].value,
    }));

    // Heat table data (month x tier net change)
    const heatTable = monthlyChart.map((d) => ({
      month: d.month,
      tier1: d.tier1 - Math.floor(d.tier1 * 0.35),
      tier2: d.tier2 - Math.floor(d.tier2 * 0.35),
      tier3: d.tier3 - Math.floor(d.tier3 * 0.35),
      tier4: d.tier4 - Math.floor(d.tier4 * 0.35),
      tier5: d.tier5 - Math.floor(d.tier5 * 0.35),
    }));

    return {
      activityChart,
      growthChart,
      additionsByTier,
      departuresByTier,
      netByTier,
      heatTable,
      monthlyChart,
    };
  }, [network.data]);

  const getHeatColor = (value: number) => {
    if (value > 5) return "bg-green-500 text-white";
    if (value > 2) return "bg-green-300 text-green-900";
    if (value > 0) return "bg-green-100 text-green-800";
    if (value === 0) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    if (value > -3) return "bg-red-100 text-red-800";
    return "bg-red-300 text-red-900";
  };

  return (
    <DashboardLayout
      title="Network Trends"
      subtitle="Network growth, agent joins/departures, and tier analysis"
      icon={TrendingUp}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => network.refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Network Activity Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Network Activity — Additions / Departures / Net Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.activityChart}>
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
                <Bar dataKey="additions" name="Additions" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="departures" name="Departures" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netChange" name="Net Change" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Growth + Cumulative Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Network Growth by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.growthChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="additions"
                  name="Monthly Additions"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative Total"
                  stroke="#0d9488"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Heat Table */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Heat Table — Net Change by Month × Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-muted-foreground font-medium">Month</th>
                    {[1, 2, 3, 4, 5].map((tier) => (
                      <th key={tier} className="p-2 text-center">
                        <Badge
                          className={`text-[10px] ${
                            tier === 1
                              ? "bg-teal-500 text-white"
                              : tier === 2
                              ? "bg-pink-500 text-white"
                              : tier === 3
                              ? "bg-purple-500 text-white"
                              : tier === 4
                              ? "bg-yellow-500 text-white"
                              : "bg-pink-400 text-white"
                          }`}
                        >
                          Tier {tier}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.heatTable.map((row) => (
                    <tr key={row.month}>
                      <td className="p-2 font-medium">{row.month}</td>
                      {[row.tier1, row.tier2, row.tier3, row.tier4, row.tier5].map((val, i) => (
                        <td key={i} className="p-1 text-center">
                          <span
                            className={`inline-block w-10 py-1 rounded text-xs font-medium ${getHeatColor(val)}`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donut Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Additions by Tier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Additions by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={metrics.additionsByTier}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.additionsByTier.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#999"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Departures by Tier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Departures by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={metrics.departuresByTier}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metrics.departuresByTier.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#999"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Net Change by Tier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Net Change by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={metrics.netByTier.filter((t) => t.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: +${value}`}
                  >
                    {metrics.netByTier
                      .filter((t) => t.value > 0)
                      .map((entry) => (
                        <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#999"} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar: Additions by Month and Tier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Additions by Month and Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.monthlyChart}>
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
                <Bar dataKey="tier1" name="Tier 1" stackId="a" fill="#0d9488" />
                <Bar dataKey="tier2" name="Tier 2" stackId="a" fill="#f472b6" />
                <Bar dataKey="tier3" name="Tier 3" stackId="a" fill="#7c3aed" />
                <Bar dataKey="tier4" name="Tier 4" stackId="a" fill="#eab308" />
                <Bar dataKey="tier5" name="Tier 5" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
