import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRevenueData,
  useRefreshDashboard,
  formatCurrency,
  formatNumber,
} from "@/lib/rezen-dashboard";
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
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function RevenuePage() {
  const { data, isLoading, isError, error } = useRevenueData();
  const refreshMutation = useRefreshDashboard();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const kpis = data?.kpis;
  const monthlyTrend = data?.monthlyTrend || [];

  return (
    <DashboardLayout
      title="Revenue Dashboard"
      subtitle="Gross income, net revenue, and commission analytics — powered by ReZen"
      icon={DollarSign}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || refreshMutation.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${
              isLoading || refreshMutation.isPending ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      }
    >
      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as any)?.message || "Failed to load revenue data. Make sure your ReZen account is linked."}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {isLoading ? (
          Array(6)
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
              title="Closed Volume"
              value={formatCurrency(kpis?.closedVolume, true)}
              subtitle="Total sale prices"
              category="transactions"
              tooltip="Sum of all sale prices on closed transactions"
            />
            <KpiCard
              title="Gross GCI"
              value={formatCurrency(kpis?.grossGCI, true)}
              subtitle="Total commissions"
              category="revenue"
              tooltip="Gross Commission Income across all closed transactions"
            />
            <KpiCard
              title="Net Income"
              value={formatCurrency(kpis?.netIncome, true)}
              subtitle="After splits/fees"
              category="revenue"
              tooltip="Total net payout after brokerage splits and fees"
            />
            <KpiCard
              title="Avg Commission"
              value={formatCurrency(kpis?.avgCommission, true)}
              subtitle="Per transaction"
              category="revenue"
              tooltip="Average gross commission per closed transaction"
            />
            <KpiCard
              title="Commissions"
              value={formatNumber(kpis?.commissionCount)}
              subtitle="Closed deals"
              category="transactions"
              tooltip="Total number of closed transactions"
            />
            <KpiCard
              title="Fees & Splits"
              value={formatCurrency(kpis?.feesDeductions, true)}
              subtitle="Gross − Net"
              category="revenue"
              tooltip="Difference between gross GCI and net payout (brokerage splits, fees, etc.)"
            />
          </>
        )}
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Monthly Revenue Trend (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              No monthly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="grossGCI"
                  name="Gross GCI"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="netIncome"
                  name="Net Income"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#3b82f6" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Volume Trend */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Monthly Closed Volume & Deal Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No monthly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  yAxisId="left"
                  className="text-xs"
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  className="text-xs"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  name="Closed Volume"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                  opacity={0.7}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Deal Count"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#f59e0b" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
