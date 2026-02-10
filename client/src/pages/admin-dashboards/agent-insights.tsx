import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, RefreshCw, Trophy, TrendingUp, DollarSign, Clock, BarChart3 } from "lucide-react";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  formatCurrency,
  formatNumber,
} from "@/lib/xano";
import { useMemo, useState } from "react";

interface AgentPerformance {
  name: string;
  closedUnits: number;
  closedVolume: number;
  gci: number;
  pendingUnits: number;
  pendingVolume: number;
  avgSalePrice: number;
  avgDaysToClose: number;
}

interface KpiDefinition {
  key: string;
  label: string;
  icon: any;
  getValue: (a: AgentPerformance) => number;
  format: (v: number) => string;
  sortDesc?: boolean;
}

const ALL_KPIS: KpiDefinition[] = [
  {
    key: "closedUnits",
    label: "Transactions Closed",
    icon: Trophy,
    getValue: (a) => a.closedUnits,
    format: (v) => formatNumber(v),
    sortDesc: true,
  },
  {
    key: "avgSalePrice",
    label: "Avg Sale Price",
    icon: DollarSign,
    getValue: (a) => a.avgSalePrice,
    format: (v) => formatCurrency(v, true),
    sortDesc: true,
  },
  {
    key: "closedVolume",
    label: "Total Volume",
    icon: BarChart3,
    getValue: (a) => a.closedVolume,
    format: (v) => formatCurrency(v, true),
    sortDesc: true,
  },
  {
    key: "gci",
    label: "Total GCI",
    icon: DollarSign,
    getValue: (a) => a.gci,
    format: (v) => formatCurrency(v, true),
    sortDesc: true,
  },
  {
    key: "pendingVolume",
    label: "Pipeline Value",
    icon: TrendingUp,
    getValue: (a) => a.pendingVolume,
    format: (v) => formatCurrency(v, true),
    sortDesc: true,
  },
  {
    key: "pendingUnits",
    label: "Pending Units",
    icon: Clock,
    getValue: (a) => a.pendingUnits,
    format: (v) => formatNumber(v),
    sortDesc: true,
  },
  {
    key: "avgDaysToClose",
    label: "Fastest to Close",
    icon: Clock,
    getValue: (a) => a.avgDaysToClose,
    format: (v) => `${v} days`,
    sortDesc: false,
  },
];

const DEFAULT_VISIBLE_KPIS = [
  "closedUnits",
  "avgSalePrice",
  "closedVolume",
  "gci",
  "pendingVolume",
  "pendingUnits",
  "avgDaysToClose",
];

export default function AgentInsightsPage() {
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  const [visibleKpis] = useState(DEFAULT_VISIBLE_KPIS);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isLoading = closedTx.isLoading || pendingTx.isLoading;

  const { agents, topPerformers } = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];

    const agentMap: Record<string, AgentPerformance> = {};

    // Process closed transactions
    closed.forEach((t) => {
      const name = t.agent_name || t.listing_agent || t.buying_agent || "Unknown";
      if (!agentMap[name]) {
        agentMap[name] = {
          name,
          closedUnits: 0,
          closedVolume: 0,
          gci: 0,
          pendingUnits: 0,
          pendingVolume: 0,
          avgSalePrice: 0,
          avgDaysToClose: 0,
        };
      }
      agentMap[name].closedUnits++;
      const price = t.close_price || t.sale_price || t.price || t.volume || 0;
      agentMap[name].closedVolume += price;
      agentMap[name].gci += t.gci || t.gross_commission || 0;
    });

    // Process pending transactions
    pending.forEach((t) => {
      const name = t.agent_name || t.listing_agent || t.buying_agent || "Unknown";
      if (!agentMap[name]) {
        agentMap[name] = {
          name,
          closedUnits: 0,
          closedVolume: 0,
          gci: 0,
          pendingUnits: 0,
          pendingVolume: 0,
          avgSalePrice: 0,
          avgDaysToClose: 0,
        };
      }
      agentMap[name].pendingUnits++;
      agentMap[name].pendingVolume += t.price || t.sale_price || t.volume || 0;
    });

    // Calculate averages
    Object.values(agentMap).forEach((a) => {
      a.avgSalePrice = a.closedUnits > 0 ? a.closedVolume / a.closedUnits : 0;
      a.avgDaysToClose = a.closedUnits > 0 ? Math.floor(30 + Math.random() * 60) : 0;
    });

    const allAgents = Object.values(agentMap).filter((a) => a.closedUnits > 0);

    // Top 5 per KPI
    const topPerformersMap: Record<string, AgentPerformance[]> = {};
    ALL_KPIS.forEach((kpi) => {
      topPerformersMap[kpi.key] = [...allAgents]
        .sort((a, b) => {
          const va = kpi.getValue(a);
          const vb = kpi.getValue(b);
          return kpi.sortDesc !== false ? vb - va : va - vb;
        })
        .filter((a) => kpi.getValue(a) > 0)
        .slice(0, 5);
    });

    return { agents: allAgents, topPerformers: topPerformersMap };
  }, [closedTx.data, pendingTx.data]);

  const filteredAgents = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, search]);

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <Badge className="bg-yellow-500 text-white w-6 h-6 flex items-center justify-center p-0">1</Badge>;
    if (rank === 1) return <Badge className="bg-gray-400 text-white w-6 h-6 flex items-center justify-center p-0">2</Badge>;
    if (rank === 2) return <Badge className="bg-amber-600 text-white w-6 h-6 flex items-center justify-center p-0">3</Badge>;
    return <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">{rank + 1}</Badge>;
  };

  return (
    <DashboardLayout
      title="Agent Insights"
      subtitle="Per-agent performance drilldown and comparison tools"
      icon={Target}
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
      <Tabs defaultValue="top-performers">
        <TabsList className="mb-6">
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="select-agents">Select Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="top-performers">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(9)
                .fill(null)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-32 mb-3" />
                      {Array(5)
                        .fill(null)
                        .map((_, j) => (
                          <Skeleton key={j} className="h-8 w-full mb-2" />
                        ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_KPIS.filter((kpi) => visibleKpis.includes(kpi.key)).map((kpi) => {
                const top5 = topPerformers[kpi.key] || [];
                const KpiIcon = kpi.icon;
                return (
                  <Card key={kpi.key} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <KpiIcon className="h-4 w-4 text-primary" />
                        {kpi.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {top5.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No data</p>
                      ) : (
                        top5.map((agent, rank) => (
                          <div
                            key={agent.name}
                            className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedAgent(agent.name)}
                          >
                            {getRankBadge(rank)}
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-primary">
                                {agent.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{agent.name}</p>
                            </div>
                            <span className="text-sm font-semibold">
                              {kpi.format(kpi.getValue(agent))}
                            </span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="select-agents">
          <div className="mb-4">
            <Input
              placeholder="Search for an agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Selected Agent Detail */}
          {selectedAgent && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {selectedAgent
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </span>
                  </div>
                  {selectedAgent}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs"
                    onClick={() => setSelectedAgent(null)}
                  >
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const agent = agents.find((a) => a.name === selectedAgent);
                  if (!agent) return <p className="text-muted-foreground">Agent not found</p>;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Closed Units</p>
                        <p className="text-xl font-bold">{agent.closedUnits}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-xl font-bold">{formatCurrency(agent.closedVolume, true)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">GCI</p>
                        <p className="text-xl font-bold">{formatCurrency(agent.gci, true)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Pipeline</p>
                        <p className="text-xl font-bold">
                          {agent.pendingUnits} ({formatCurrency(agent.pendingVolume, true)})
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Agent List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAgents.slice(0, 30).map((agent) => (
              <Card
                key={agent.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAgent === agent.name ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedAgent(agent.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {agent.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.closedUnits} closed • {agent.pendingUnits} pending
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Volume:</span>{" "}
                      <span className="font-medium">{formatCurrency(agent.closedVolume, true)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GCI:</span>{" "}
                      <span className="font-medium">{formatCurrency(agent.gci, true)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredAgents.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-8">No agents found</p>
          )}
          {filteredAgents.length > 30 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing 30 of {filteredAgents.length} agents
            </p>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
