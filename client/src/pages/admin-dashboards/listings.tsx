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
import { Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useXanoListings,
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

export default function ListingsPage() {
  const listings = useXanoListings();
  const [search, setSearch] = useState("");

  const isLoading = listings.isLoading;

  const metrics = useMemo(() => {
    const data = Array.isArray(listings.data) ? listings.data : [];

    const totalListings = data.length;
    const totalVolume = data.reduce(
      (sum, l) => sum + (l.list_price || l.price || 0),
      0
    );

    // Monthly listings
    const monthlyData: Record<string, { month: string; key: string; count: number }> = {};
    data.forEach((l) => {
      const date = l.listing_date || l.created_at;
      if (!date) return;
      const key = getMonthKey(date);
      if (!monthlyData[key]) {
        const d = new Date(date);
        monthlyData[key] = {
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          key,
          count: 0,
        };
      }
      monthlyData[key].count++;
    });

    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);

    // Rolling average
    let rollingSum = 0;
    const rollingData = chartData.map((d, i) => {
      rollingSum += d.count;
      return { ...d, rollingAvg: Math.round((rollingSum / (i + 1)) * 10) / 10 };
    });

    const listingsPerMonth =
      chartData.length > 0
        ? Math.round(chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length)
        : 0;

    return { totalListings, totalVolume, listingsPerMonth, chartData: rollingData };
  }, [listings.data]);

  const filteredListings = useMemo(() => {
    const data = Array.isArray(listings.data) ? listings.data : [];
    if (!search) return data.slice(0, 50);
    const q = search.toLowerCase();
    return data
      .filter(
        (l) =>
          (l.address || l.street_address || "").toLowerCase().includes(q) ||
          (l.agent_name || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [listings.data, search]);

  return (
    <DashboardLayout
      title="Listings"
      subtitle="Active and historical listing data"
      icon={Home}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => listings.refetch()}
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
          {/* KPI Cards */}
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
                <KpiCard
                  title="Total Listings"
                  value={formatNumber(metrics.totalListings)}
                  category="listings"
                />
                <KpiCard
                  title="Total Volume"
                  value={formatCurrency(metrics.totalVolume, true)}
                  category="listings"
                />
                <KpiCard
                  title="Listings Per Month"
                  value={formatNumber(metrics.listingsPerMonth)}
                  category="listings"
                />
              </>
            )}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Listings Over Time
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
                    <Bar dataKey="count" name="New Listings" fill="#f472b6" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="rollingAvg"
                      name="12-Month Rolling Avg"
                      stroke="#1e40af"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>List Date</TableHead>
                    <TableHead>Expiration</TableHead>
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
                  ) : filteredListings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No listings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredListings.map((l, i) => (
                      <TableRow key={l.id || i}>
                        <TableCell className="font-medium">
                          {l.address || l.street_address || "—"}
                        </TableCell>
                        <TableCell>{l.agent_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.status || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(l.list_price || l.price)}
                        </TableCell>
                        <TableCell>
                          {l.listing_date
                            ? new Date(l.listing_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {l.expiration_date
                            ? new Date(l.expiration_date).toLocaleDateString()
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
