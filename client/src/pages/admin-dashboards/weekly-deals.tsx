import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarDays,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useWeeklyDeals,
  useRefreshDashboard,
  formatCurrency,
  formatNumber,
  formatDate,
} from "@/lib/rezen-dashboard";
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
  Legend,
} from "recharts";

const COLORS = ["#EF4923", "#94a3b8"];
const BAR_COLORS = ["#EF4923", "#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      {label && <p className="text-sm font-medium mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function WeeklyDealsPage() {
  const { data, isLoading, isError, error } = useWeeklyDeals();
  const refreshMutation = useRefreshDashboard();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const kpis = data?.kpis;
  const deals = data?.deals || [];
  const leadSourceBreakdown = data?.leadSourceBreakdown || [];
  const companyVsNonCompany = data?.companyVsNonCompany || [];

  return (
    <DashboardLayout
      title="Weekly Deals"
      subtitle="Sale transactions put into contract in the past 7 days"
      icon={CalendarDays}
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
            Failed to load weekly deals data.{" "}
            {(error as any)?.message && `Error: ${(error as any).message}`}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(4)
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
              title="Deals This Week"
              value={formatNumber(kpis?.totalDeals)}
              category="transactions"
              tooltip="Sale transactions with firm date in the past 7 days"
            />
            <KpiCard
              title="Total Volume"
              value={formatCurrency(kpis?.totalVolume, true)}
              category="revenue"
              tooltip="Total contract price of this week's deals"
            />
            <KpiCard
              title="Company Leads"
              value={formatNumber(kpis?.companyLeads)}
              category="transactions"
              tooltip="Deals with a named lead source (company-provided)"
            />
            <KpiCard
              title="Non-Company Leads"
              value={formatNumber(kpis?.nonCompanyLeads)}
              category="listings"
              tooltip="Deals with no lead source (agent self-generated)"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Lead Source Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : leadSourceBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No deals this week
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={leadSourceBreakdown}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} className="text-xs" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    className="text-xs"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Deals"
                    radius={[0, 4, 4, 0]}
                  >
                    {leadSourceBreakdown.map((_, index) => (
                      <Cell
                        key={index}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Company vs Non-Company Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Company vs Non-Company Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : companyVsNonCompany.every((d) => d.value === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No deals this week
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={companyVsNonCompany}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {companyVsNonCompany.map((_, index) => (
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

      {/* Deals Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            This Week's Deals ({deals.length})
          </CardTitle>
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
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No deals this week</p>
              <p className="text-sm">
                Sale transactions with a firm date in the past 7 days will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Address
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Agent
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Lead Source
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Company Lead
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">
                      Price
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr
                      key={deal.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium">{deal.address}</div>
                        {(deal.city || deal.state) && (
                          <div className="text-xs text-muted-foreground">
                            {[deal.city, deal.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {deal.agent}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            deal.leadSource === "None"
                              ? "text-muted-foreground italic"
                              : ""
                          }
                        >
                          {deal.leadSource}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {deal.isCompanyLead ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 inline-block" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground/40 inline-block" />
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium whitespace-nowrap">
                        {formatCurrency(deal.price)}
                      </td>
                      <td className="py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(deal.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
