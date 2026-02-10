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
import { Network as NetworkIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "recharts";
import { useMemo, useState } from "react";

const TIER_COLORS: Record<number, string> = {
  1: "#0d9488",
  2: "#f472b6",
  3: "#7c3aed",
  4: "#eab308",
  5: "#ec4899",
};

const TIER_BADGE_COLORS: Record<number, string> = {
  1: "bg-teal-500 text-white",
  2: "bg-pink-500 text-white",
  3: "bg-purple-500 text-white",
  4: "bg-yellow-500 text-white",
  5: "bg-pink-400 text-white",
};

export default function NetworkPage() {
  const network = useXanoNetwork();
  const revshare = useXanoRevShare();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");

  const isLoading = network.isLoading;

  const metrics = useMemo(() => {
    const data = Array.isArray(network.data) ? network.data : [];
    const revData = revshare.data;

    const active = data.filter(
      (m) => !m.status || m.status === "Active" || m.status === "active"
    );
    const totalAgents = active.length || data.length;

    // Tier counts
    const tierCounts: Record<number, { total: number; coSponsored: number }> = {};
    data.forEach((m) => {
      const tier = m.tier || 0;
      if (!tierCounts[tier]) tierCounts[tier] = { total: 0, coSponsored: 0 };
      tierCounts[tier].total++;
      if (m.sponsorship_type === "Co-Sponsored" || m.sponsorship_type === "co-sponsored") {
        tierCounts[tier].coSponsored++;
      }
    });

    const coSponsored = data.filter(
      (m) => m.sponsorship_type === "Co-Sponsored" || m.sponsorship_type === "co-sponsored"
    ).length;

    // Tier pie data
    const tierPieData = Object.entries(tierCounts)
      .filter(([tier]) => Number(tier) > 0)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([tier, { total }]) => ({
        name: `Tier ${tier}`,
        value: total,
        tier: Number(tier),
      }));

    // RevShare metrics
    const revshareTotal = typeof revData === 'object' && !Array.isArray(revData)
      ? (revData as any)?.total || 0
      : Array.isArray(revData)
        ? revData.reduce((sum, r) => sum + (r.amount || r.total || 0), 0)
        : 0;

    // Recent additions (last 90 days)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentAdditions = data
      .filter((m) => {
        const joinDate = m.join_date ? new Date(m.join_date) : null;
        return joinDate && joinDate >= ninetyDaysAgo;
      })
      .sort((a, b) => new Date(b.join_date!).getTime() - new Date(a.join_date!).getTime());

    // Monthly additions
    const monthlyAdditions: Record<string, number> = {};
    data.forEach((m) => {
      if (!m.join_date) return;
      const key = getMonthKey(m.join_date);
      monthlyAdditions[key] = (monthlyAdditions[key] || 0) + 1;
    });

    const additionsChart = Object.entries(monthlyAdditions)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, count]) => ({
        month: new Date(key + "-01").toLocaleString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        additions: count,
      }));

    // Top sponsors
    const sponsorCounts: Record<string, number> = {};
    data.forEach((m) => {
      const sponsor = m.sponsor || m.sponsor_name;
      if (sponsor) {
        sponsorCounts[sponsor] = (sponsorCounts[sponsor] || 0) + 1;
      }
    });
    const topSponsors = Object.entries(sponsorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalAgents,
      coSponsored,
      tierCounts,
      tierPieData,
      revshareTotal,
      recentAdditions,
      additionsChart,
      topSponsors,
    };
  }, [network.data, revshare.data]);

  // Filtered members for table
  const filteredMembers = useMemo(() => {
    const data = Array.isArray(network.data) ? network.data : [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (m) =>
        (m.name || `${m.first_name || ""} ${m.last_name || ""}`).toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.sponsor || m.sponsor_name || "").toLowerCase().includes(q)
    );
  }, [network.data, search]);

  return (
    <DashboardLayout
      title="Network"
      subtitle="Network members, tiers, and RevShare overview"
      icon={NetworkIcon}
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
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {isLoading ? (
              Array(4)
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
                  title="Total Agents"
                  value={formatNumber(metrics.totalAgents)}
                  subtitle={`${metrics.coSponsored} co-sponsored`}
                  category="network"
                />
                <KpiCard
                  title="RevShare Total"
                  value={formatCurrency(metrics.revshareTotal, true)}
                  category="revshare"
                />
                <KpiCard
                  title="Recent Additions"
                  value={formatNumber(metrics.recentAdditions.length)}
                  subtitle="Last 90 days"
                  category="network"
                />
                <KpiCard
                  title="Top Sponsors"
                  value={metrics.topSponsors.length > 0 ? metrics.topSponsors[0].name : "—"}
                  subtitle={
                    metrics.topSponsors.length > 0
                      ? `${metrics.topSponsors[0].count} members`
                      : ""
                  }
                  category="network"
                />
              </>
            )}
          </div>

          {/* Tier Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((tier) => {
              const tc = metrics.tierCounts[tier];
              return (
                <Card key={tier} className={`border-l-4`} style={{ borderLeftColor: TIER_COLORS[tier] }}>
                  <CardContent className="p-4 text-center">
                    <Badge className={TIER_BADGE_COLORS[tier]} variant="secondary">
                      Tier {tier}
                    </Badge>
                    <div className="text-2xl font-bold mt-2">
                      {tc?.total || 0}
                    </div>
                    {tc?.coSponsored ? (
                      <div className="text-xs text-muted-foreground">
                        {tc.coSponsored} co-sponsored
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Agents by Tier */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Active Agents by Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={metrics.tierPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                      >
                        {metrics.tierPieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={TIER_COLORS[entry.tier] || "#999"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Additions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Agent Additions by Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={metrics.additionsChart}>
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
                      <Bar dataKey="additions" name="Additions" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Sponsors */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Top 10 — Network Sizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.topSponsors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" name="Members" fill="#0d9488" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Additions Table */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Recent Agent Additions ({metrics.recentAdditions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sponsor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentAdditions.slice(0, 15).map((m, i) => (
                    <TableRow key={m.id || i}>
                      <TableCell>
                        {m.join_date
                          ? new Date(m.join_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={TIER_BADGE_COLORS[m.tier || 0] || "bg-gray-400 text-white"}
                          variant="secondary"
                        >
                          {m.tier || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—"}
                      </TableCell>
                      <TableCell>{m.phone || "—"}</TableCell>
                      <TableCell>{m.email || "—"}</TableCell>
                      <TableCell>{m.sponsor || m.sponsor_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <div className="mb-4">
            <Input
              placeholder="Search by name, email, or sponsor..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(10)
                      .fill(null)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.slice(0, 100).map((m, i) => (
                      <TableRow key={m.id || i}>
                        <TableCell className="font-medium">
                          {m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={TIER_BADGE_COLORS[m.tier || 0] || "bg-gray-400 text-white"}
                            variant="secondary"
                          >
                            {m.tier || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.status === "Active" || m.status === "active" ? "default" : "outline"}>
                            {m.status || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {m.join_date ? new Date(m.join_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>{m.sponsor || m.sponsor_name || "—"}</TableCell>
                        <TableCell>{m.sponsorship_type || "—"}</TableCell>
                        <TableCell>{m.network_size || 0}</TableCell>
                        <TableCell className="text-xs">{m.email || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {filteredMembers.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Showing 100 of {filteredMembers.length} members
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
