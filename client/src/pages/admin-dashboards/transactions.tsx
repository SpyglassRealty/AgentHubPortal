import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  useXanoTransactionsTerminated,
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
} from "recharts";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function TransactionsPage() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const terminatedTx = useXanoTransactionsTerminated();
  const [search, setSearch] = useState("");

  const isLoading = closedTx.isLoading || pendingTx.isLoading;

  const metrics = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];

    const closedUnits = closed.length;
    const closedVolume = closed.reduce(
      (sum, t) => sum + (t.close_price || t.sale_price || t.price || t.volume || 0),
      0
    );
    const closedGci = closed.reduce(
      (sum, t) => sum + (t.gci || t.gross_commission || 0),
      0
    );
    const pendingUnits = pending.length;
    const pendingVolume = pending.reduce(
      (sum, t) => sum + (t.price || t.sale_price || t.volume || 0),
      0
    );
    const pendingGci = pending.reduce(
      (sum, t) => sum + (t.gci || t.gross_commission || 0),
      0
    );

    // Monthly data for chart
    const monthlyData: Record<string, { month: string; key: string; units: number; volume: number }> = {};
    closed.forEach((t) => {
      const date = t.close_date || t.closing_date || t.created_at;
      if (!date) return;
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        const d = new Date(date);
        monthlyData[key] = {
          month: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
          key,
          units: 0,
          volume: 0,
        };
      }
      monthlyData[key].units++;
      monthlyData[key].volume += t.close_price || t.sale_price || t.price || t.volume || 0;
    });

    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);

    // Rolling average
    let rollingSum = 0;
    const rollingData = chartData.map((d, i) => {
      rollingSum += d.units;
      const avg = rollingSum / (i + 1);
      return { ...d, rollingAvg: Math.round(avg * 10) / 10 };
    });

    // Current / Last / Next month stats
    const now = new Date();
    const currentKey = getMonthKey(now);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastKey = getMonthKey(lastMonth);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextKey = getMonthKey(nextMonth);

    const lastMonthClosed = closed.filter((t) => {
      const d = t.close_date || t.closing_date;
      return d && getMonthKey(d) === lastKey;
    }).length;

    const currentMonthClosed = closed.filter((t) => {
      const d = t.close_date || t.closing_date;
      return d && getMonthKey(d) === currentKey;
    }).length;

    const currentMonthPending = pending.filter((t) => {
      const d = t.expected_close_date || t.close_date;
      return d && getMonthKey(d) === currentKey;
    }).length;

    const nextMonthPending = pending.filter((t) => {
      const d = t.expected_close_date || t.close_date;
      return d && getMonthKey(d) === nextKey;
    }).length;

    return {
      closedUnits,
      closedVolume,
      closedGci,
      pendingUnits,
      pendingVolume,
      pendingGci,
      chartData: rollingData,
      lastMonthClosed,
      currentMonthClosed,
      currentMonthPending,
      nextMonthPending,
    };
  }, [closedTx.data, pendingTx.data]);

  // Filtered records for table
  const closedRecords = useMemo(() => {
    const data = Array.isArray(closedTx.data) ? closedTx.data : [];
    if (!search) return data.slice(0, 50);
    const q = search.toLowerCase();
    return data
      .filter(
        (t) =>
          (t.address || t.street_address || "").toLowerCase().includes(q) ||
          (t.agent_name || t.listing_agent || t.buying_agent || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [closedTx.data, search]);

  return (
    <DashboardLayout
      title="Transactions"
      subtitle="Closed, pending, and terminated transactions"
      icon={FileText}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            closedTx.refetch();
            pendingTx.refetch();
            terminatedTx.refetch();
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
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* KPI Row 1 */}
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
                <KpiCard title="Closed Units" value={formatNumber(metrics.closedUnits)} category="transactions" />
                <KpiCard title="Closed Volume" value={formatCurrency(metrics.closedVolume, true)} category="transactions" />
                <KpiCard title="Closed GCI" value={formatCurrency(metrics.closedGci, true)} category="transactions" />
                <KpiCard title="Pending Units" value={formatNumber(metrics.pendingUnits)} category="transactions" />
                <KpiCard title="Pending Volume" value={formatCurrency(metrics.pendingVolume, true)} category="transactions" />
                <KpiCard title="Pending GCI" value={formatCurrency(metrics.pendingGci, true)} category="transactions" />
              </>
            )}
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Closed Units (Rolling Avg)
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
                    <Bar dataKey="units" name="Monthly Units" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="rollingAvg"
                      name="Rolling Avg"
                      stroke="#1e40af"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              title="Last Month Closed"
              value={formatNumber(metrics.lastMonthClosed)}
              category="transactions"
            />
            <KpiCard
              title="Current Month"
              value={formatNumber(metrics.currentMonthClosed + metrics.currentMonthPending)}
              subtitle={`${metrics.currentMonthClosed} Closed + ${metrics.currentMonthPending} Pending`}
              category="transactions"
            />
            <KpiCard
              title="Next Month Pending"
              value={formatNumber(metrics.nextMonthPending)}
              category="transactions"
            />
          </div>
        </TabsContent>

        <TabsContent value="records">
          <div className="mb-4">
            <Input
              placeholder="Search by address or agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">GCI</TableHead>
                    <TableHead>Close Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : closedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    closedRecords.map((t, i) => (
                      <TableRow key={t.id || i}>
                        <TableCell className="font-medium">
                          {t.address || t.street_address || "—"}
                        </TableCell>
                        <TableCell>
                          {t.agent_name || t.listing_agent || t.buying_agent || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t.representation || t.type || t.transaction_type || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(t.close_price || t.sale_price || t.price || t.volume)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(t.gci || t.gross_commission)}
                        </TableCell>
                        <TableCell>
                          {t.close_date || t.closing_date
                            ? new Date(t.close_date || t.closing_date!).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
