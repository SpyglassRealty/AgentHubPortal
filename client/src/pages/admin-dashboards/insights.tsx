import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const DONUT_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#64748b",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      {label && <p className="text-sm font-medium mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color || entry.payload?.fill }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 1000
            ? formatCurrency(entry.value, true)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

const renderCustomLabel = ({ name, percent }: any) => {
  if (percent < 0.03) return null;
  return `${name} (${(percent * 100).toFixed(0)}%)`;
};

export default function InsightsPage() {
  const { data, isLoading, isError, error } = useAnalyticsData();
  const refreshMutation = useRefreshDashboard();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  return (
    <DashboardLayout
      title="Transaction Analytics"
      subtitle="Breakdown by type, agent, and property — powered by ReZen"
      icon={Lightbulb}
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
            {(error as any)?.message || "Failed to load analytics data."}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {data && (
        <div className="mb-6 text-sm text-muted-foreground">
          Analyzing <span className="font-semibold text-foreground">{formatNumber(data.totalTransactions)}</span> closed transactions
        </div>
      )}

      {/* 2×2 grid of chart panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: By Transaction Type — Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              By Transaction Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : !data?.byType?.length ? (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="count"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {data.byType.map((_, index) => (
                        <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {data.byType.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {item.count} deals · {formatCurrency(item.volume, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Production by Agent — Horizontal Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Production by Agent (Top 15)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : !data?.topAgents?.length ? (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(320, data.topAgents.length * 32)}>
                <BarChart
                  data={data.topAgents}
                  layout="vertical"
                  margin={{ left: 100, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tickFormatter={(v) => formatCurrency(v, true)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    width={95}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-md">
                          <p className="text-sm font-medium mb-1">{d.name}</p>
                          <p className="text-sm">Volume: {formatCurrency(d.volume)}</p>
                          <p className="text-sm">GCI: {formatCurrency(d.gci)}</p>
                          <p className="text-sm">Deals: {d.count}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="volume" name="Volume" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: By Lead Source — Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              By Lead Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : !data?.byLeadSource?.length ? (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.byLeadSource.slice(0, 12)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="volume"
                      label={({ name, percent }) =>
                        percent >= 0.04 ? `${name.length > 15 ? name.slice(0, 14) + '…' : name}` : null
                      }
                      labelLine={false}
                    >
                      {data.byLeadSource.slice(0, 12).map((_: any, index: number) => (
                        <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-md">
                            <p className="text-sm font-medium mb-1">{d.name}</p>
                            <p className="text-sm">Sales: {formatCurrency(d.volume)}</p>
                            <p className="text-sm">GCI: {formatCurrency(d.gci)}</p>
                            <p className="text-sm">Avg Comm: {d.avgCommissionPct?.toFixed(2)}%</p>
                            <p className="text-sm">{d.count} Transactions</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
                  {data.byLeadSource.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-muted-foreground whitespace-nowrap ml-2">
                        {formatCurrency(item.volume, true)} · {item.count} deals
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 4: Agent Distribution — Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Volume Distribution by Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : !data?.agentDistribution?.length ? (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                No data available
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.agentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent >= 0.04 ? `${name.split(" ")[0]} (${(percent * 100).toFixed(0)}%)` : null
                      }
                      labelLine={false}
                    >
                      {data.agentDistribution.map((_, index) => (
                        <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-md">
                            <p className="text-sm font-medium mb-1">{d.name}</p>
                            <p className="text-sm">Volume: {formatCurrency(d.value)}</p>
                            <p className="text-sm">GCI: {formatCurrency(d.gci)}</p>
                            <p className="text-sm">Deals: {d.count}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
                  {data.agentDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-muted-foreground whitespace-nowrap ml-2">
                        {formatCurrency(item.value, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
