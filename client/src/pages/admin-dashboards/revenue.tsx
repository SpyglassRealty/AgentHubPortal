import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  formatCurrency,
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
} from "recharts";
import { useMemo, useState } from "react";

export default function RevenuePage() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const [chartView, setChartView] = useState<"gross" | "deductions" | "net">("gross");

  const isLoading = closedTx.isLoading;

  const metrics = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];

    const grossIncome = closed.reduce(
      (sum, t) => sum + (t.gci || t.gross_commission || 0),
      0
    );
    // Estimate deductions at ~28% of gross (typical brokerage split)
    const deductions = grossIncome * 0.28;
    const netIncome = grossIncome - deductions;

    // Monthly breakdown
    const monthlyData: Record<
      string,
      { month: string; key: string; gross: number; deductions: number; net: number }
    > = {};
    closed.forEach((t) => {
      const date = t.close_date || t.closing_date || t.created_at;
      if (!date) return;
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        const d = new Date(date);
        monthlyData[key] = {
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          key,
          gross: 0,
          deductions: 0,
          net: 0,
        };
      }
      const gci = t.gci || t.gross_commission || 0;
      monthlyData[key].gross += gci;
      monthlyData[key].deductions += gci * 0.28;
      monthlyData[key].net += gci * 0.72;
    });

    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);

    // Current/Last/Next month
    const now = new Date();
    const currentKey = getMonthKey(now);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = getMonthKey(lastMonth);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextKey = getMonthKey(nextMonth);

    const lastMonthNet = (monthlyData[lastKey]?.net || 0);
    const currentMonthNet = (monthlyData[currentKey]?.net || 0);

    // Next month from pending
    const nextMonthNet = pending
      .filter((t) => {
        const d = t.expected_close_date || t.close_date;
        return d && getMonthKey(d) === nextKey;
      })
      .reduce((sum, t) => sum + (t.gci || t.gross_commission || 0) * 0.72, 0);

    return {
      grossIncome,
      deductions,
      netIncome,
      lastMonthNet,
      currentMonthNet,
      nextMonthNet,
      chartData,
    };
  }, [closedTx.data, pendingTx.data]);

  return (
    <DashboardLayout
      title="Revenue"
      subtitle="Gross income, deductions, and net revenue"
      icon={DollarSign}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            closedTx.refetch();
            pendingTx.refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {isLoading ? (
              Array(6)
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
                  title="Gross Income"
                  value={formatCurrency(metrics.grossIncome, true)}
                  subtitle="Closed"
                  category="revenue"
                />
                <KpiCard
                  title="Deductions"
                  value={formatCurrency(metrics.deductions, true)}
                  subtitle="Closed (est.)"
                  category="revenue"
                />
                <KpiCard
                  title="Net Income"
                  value={formatCurrency(metrics.netIncome, true)}
                  subtitle="Closed"
                  category="revenue"
                />
                <KpiCard
                  title="Net Income"
                  value={formatCurrency(metrics.lastMonthNet, true)}
                  subtitle="Last Month"
                  category="revenue"
                />
                <KpiCard
                  title="Net Income"
                  value={formatCurrency(metrics.currentMonthNet, true)}
                  subtitle="Current Month"
                  category="revenue"
                />
                <KpiCard
                  title="Net Income"
                  value={formatCurrency(metrics.nextMonthNet, true)}
                  subtitle="Next Month (est.)"
                  category="revenue"
                />
              </>
            )}
          </div>

          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">
                Monthly Revenue
              </CardTitle>
              <div className="flex gap-1">
                {(["gross", "deductions", "net"] as const).map((view) => (
                  <Button
                    key={view}
                    variant={chartView === view ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setChartView(view)}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
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
                    {chartView === "gross" && (
                      <Bar dataKey="gross" name="Gross" fill="#10b981" radius={[4, 4, 0, 0]} />
                    )}
                    {chartView === "deductions" && (
                      <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    )}
                    {chartView === "net" && (
                      <Bar dataKey="net" name="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Monthly Revenue — All Series
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
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
                    <Bar dataKey="gross" name="Gross" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
