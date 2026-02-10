import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { KpiCard } from "@/components/admin-dashboards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Target, RefreshCw, Users, TrendingUp, ArrowRight } from "lucide-react";
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
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { useMemo } from "react";

// Mock lead data for when Xano leads API isn't configured
const MOCK_LEAD_SOURCES = [
  { name: "Website", count: 245, converted: 32, color: "#0d9488" },
  { name: "Referral", count: 189, converted: 48, color: "#3b82f6" },
  { name: "Zillow", count: 156, converted: 18, color: "#8b5cf6" },
  { name: "Realtor.com", count: 98, converted: 12, color: "#ec4899" },
  { name: "Social Media", count: 87, converted: 8, color: "#f97316" },
  { name: "Open House", count: 64, converted: 14, color: "#eab308" },
  { name: "Cold Call", count: 42, converted: 5, color: "#6b7280" },
];

const MOCK_PIPELINE = [
  { stage: "New", count: 412, value: 145000000 },
  { stage: "Contacted", count: 287, value: 98000000 },
  { stage: "Qualified", count: 156, value: 62000000 },
  { stage: "Showing", count: 89, value: 38000000 },
  { stage: "Offer", count: 45, value: 21000000 },
  { stage: "Under Contract", count: 28, value: 14000000 },
  { stage: "Closed", count: 18, value: 8500000 },
];

const MOCK_MONTHLY_LEADS = [
  { month: "Jul '24", newLeads: 65, converted: 8 },
  { month: "Aug '24", newLeads: 78, converted: 11 },
  { month: "Sep '24", newLeads: 82, converted: 9 },
  { month: "Oct '24", newLeads: 91, converted: 14 },
  { month: "Nov '24", newLeads: 73, converted: 10 },
  { month: "Dec '24", newLeads: 58, converted: 7 },
  { month: "Jan '25", newLeads: 84, converted: 12 },
  { month: "Feb '25", newLeads: 96, converted: 15 },
  { month: "Mar '25", newLeads: 102, converted: 13 },
  { month: "Apr '25", newLeads: 88, converted: 11 },
  { month: "May '25", newLeads: 95, converted: 14 },
  { month: "Jun '25", newLeads: 69, converted: 13 },
];

const MOCK_RECENT_LEADS = [
  { id: 1, name: "John Smith", source: "Website", status: "New", agent: "Dustin Raye", date: "2025-06-28", phone: "(512) 555-0101" },
  { id: 2, name: "Sarah Johnson", source: "Referral", status: "Contacted", agent: "Deborah Mugno", date: "2025-06-27", phone: "(512) 555-0102" },
  { id: 3, name: "Mike Davis", source: "Zillow", status: "Qualified", agent: "Matt Kumar", date: "2025-06-26", phone: "(512) 555-0103" },
  { id: 4, name: "Emily Chen", source: "Social Media", status: "Showing", agent: "Lya Sanchez", date: "2025-06-25", phone: "(512) 555-0104" },
  { id: 5, name: "Robert Wilson", source: "Open House", status: "New", agent: "Sean Tipps", date: "2025-06-24", phone: "(512) 555-0105" },
  { id: 6, name: "Lisa Brown", source: "Realtor.com", status: "Offer", agent: "John Hidrogo", date: "2025-06-23", phone: "(512) 555-0106" },
  { id: 7, name: "David Lee", source: "Website", status: "New", agent: "Dustin Raye", date: "2025-06-22", phone: "(512) 555-0107" },
  { id: 8, name: "Amanda Taylor", source: "Referral", status: "Contacted", agent: "Adiletha Vallejo", date: "2025-06-21", phone: "(512) 555-0108" },
];

const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#6b7280"];

export default function LeadsPage() {
  const isLoading = false; // Mock data always available

  const metrics = useMemo(() => {
    const totalLeads = MOCK_LEAD_SOURCES.reduce((sum, s) => sum + s.count, 0);
    const totalConverted = MOCK_LEAD_SOURCES.reduce((sum, s) => sum + s.converted, 0);
    const conversionRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : "0";
    const avgResponseTime = "2.4h"; // Mock

    const sourcesPieData = MOCK_LEAD_SOURCES.map((s) => ({
      name: s.name,
      value: s.count,
    }));

    return {
      totalLeads,
      totalConverted,
      conversionRate,
      avgResponseTime,
      sourcesPieData,
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      Qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      Showing: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      Offer: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      "Under Contract": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      Closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  return (
    <DashboardLayout
      title="Lead Intelligence"
      subtitle="Lead sources, conversion metrics, and pipeline management"
      icon={Target}
    >
      <Tabs defaultValue="intelligence">
        <TabsList className="mb-6">
          <TabsTrigger value="intelligence">Lead Intelligence</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Leads</span>
                </div>
                <div className="text-3xl font-bold">{metrics.totalLeads}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Converted</span>
                </div>
                <div className="text-3xl font-bold">{metrics.totalConverted}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 text-center">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <div className="text-3xl font-bold">{metrics.conversionRate}%</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-400">
              <CardContent className="p-4 text-center">
                <span className="text-sm text-muted-foreground">Avg Response Time</span>
                <div className="text-3xl font-bold">{metrics.avgResponseTime}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Lead Sources Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={metrics.sourcesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {metrics.sourcesPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Leads Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Leads Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={MOCK_MONTHLY_LEADS}>
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
                    <Bar dataKey="newLeads" name="New Leads" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conversion by Source Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Conversion by Source
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_LEAD_SOURCES.map((source) => (
                    <TableRow key={source.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: source.color }}
                          />
                          <span className="font-medium">{source.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{source.count}</TableCell>
                      <TableCell className="text-right">{source.converted}</TableCell>
                      <TableCell className="text-right font-medium">
                        {((source.converted / source.count) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          {/* Pipeline Funnel */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_PIPELINE.map((stage, i) => {
                  const maxCount = MOCK_PIPELINE[0].count;
                  const widthPct = Math.max((stage.count / maxCount) * 100, 15);
                  return (
                    <div key={stage.stage} className="flex items-center gap-4">
                      <span className="text-sm font-medium w-32 text-right">{stage.stage}</span>
                      <div className="flex-1">
                        <div
                          className="h-8 rounded-md flex items-center px-3 transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        >
                          <span className="text-white text-sm font-medium">{stage.count}</span>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground w-24 text-right">
                        ${(stage.value / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Pipeline Value"
              value="$386.5M"
              subtitle="All stages"
              category="transactions"
            />
            <KpiCard
              title="Active Leads"
              value="412"
              subtitle="In pipeline"
              category="transactions"
            />
            <KpiCard
              title="Avg Days in Pipeline"
              value="34"
              subtitle="New to Closed"
              category="transactions"
            />
            <KpiCard
              title="Win Rate"
              value="4.4%"
              subtitle="Closed / Total"
              category="revenue"
            />
          </div>
        </TabsContent>

        <TabsContent value="people">
          {/* Recent Leads Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Agent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_RECENT_LEADS.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>{lead.agent}</TableCell>
                      <TableCell className="text-sm">{lead.phone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
