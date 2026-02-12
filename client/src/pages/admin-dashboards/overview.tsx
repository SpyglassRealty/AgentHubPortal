import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LayoutDashboard,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useRevenueData,
  useAnalyticsData,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      {label && <p className="text-sm font-medium mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 100
            ? formatCurrency(entry.value, true)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboardOverview() {
  const revenue = useRevenueData();
  const analytics = useAnalyticsData();
  const refreshMutation = useRefreshDashboard();

  const isLoading = revenue.isLoading || analytics.isLoading;
  const hasError = revenue.isError || analytics.isError;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const kpis = revenue.data?.kpis;
  const monthlyTrend = revenue.data?.monthlyTrend || [];
  const byType = analytics.data?.byType || [];
  const agentDistribution = analytics.data?.agentDistribution || [];

  return (
    <DashboardLayout
      title="Business Dashboard"
      subtitle="Spyglass Realty — Team overview powered by ReZen"
      icon={LayoutDashboard}
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
      {hasError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load some data from ReZen. Make sure your ReZen account is linked in settings.
            {revenue.error && ` Revenue: ${(revenue.error as any)?.message}`}
            {analytics.error && ` Analytics: ${(analytics.error as any)?.message}`}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              title="Closed Deals"
              value={formatNumber(kpis?.commissionCount)}
              category="transactions"
              tooltip="Total closed transactions in ReZen"
            />
            <KpiCard
              title="Closed Volume"
              value={formatCurrency(kpis?.closedVolume, true)}
              category="transactions"
              tooltip="Total dollar volume of closed transactions"
            />
            <KpiCard
              title="Gross GCI"
              value={formatCurrency(kpis?.grossGCI, true)}
              category="revenue"
              tooltip="Total Gross Commission Income"
            />
            <KpiCard
              title="Net Income"
              value={formatCurrency(kpis?.netIncome, true)}
              category="revenue"
              tooltip="Total net payout after splits and fees"
            />
            <KpiCard
              title="Avg Commission"
              value={formatCurrency(kpis?.avgCommission, true)}
              category="revenue"
              tooltip="Average commission per closed deal"
            />
            <KpiCard
              title="Fees & Splits"
              value={formatCurrency(kpis?.feesDeductions, true)}
              category="revenue"
              tooltip="Total deductions (gross - net)"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Monthly Revenue (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
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
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Transaction Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Transaction Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : byType.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {byType.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volume Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Monthly Closed Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="volume"
                  name="Volume"
                  fill="#8b5cf6"
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
