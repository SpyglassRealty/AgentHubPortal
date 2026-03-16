import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  Building, 
  User,
  Copy,
  Check
} from "lucide-react";
import {
  useXanoTransactionsClosed,
  useXanoTransactionsPending,
  formatCurrency,
  formatNumber,
} from "@/lib/xano";

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

interface UnifiedAgentSearchProps {
  title?: string;
  subtitle?: string;
  maxResults?: number;
  showFullStats?: boolean;
}

export function UnifiedAgentSearch({ 
  title = "Agent Search",
  subtitle = "Search and compare agent performance data",
  maxResults = 20,
  showFullStats = false
}: UnifiedAgentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);
  
  const closedTx = useXanoTransactionsClosed();
  const pendingTx = useXanoTransactionsPending();
  
  const isLoading = closedTx.isLoading || pendingTx.isLoading;

  // Calculate agent performance data using SAME logic as Agent Insights
  const agents = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];
    const pending = Array.isArray(pendingTx.data) ? pendingTx.data : [];

    const agentMap: Record<string, AgentPerformance> = {};

    // Process closed transactions (SAME logic as Agent Insights)
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

    // Process pending transactions (SAME logic as Agent Insights)
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

    // Calculate averages using SAME logic as Agent Insights
    Object.values(agentMap).forEach((a) => {
      a.avgSalePrice = a.closedUnits > 0 ? a.closedVolume / a.closedUnits : 0;
      a.avgDaysToClose = a.closedUnits > 0 ? Math.floor(30 + Math.random() * 60) : 0;
    });

    return Object.values(agentMap).filter((a) => a.closedUnits > 0);
  }, [closedTx.data, pendingTx.data]);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents.slice(0, maxResults);
    
    const query = searchQuery.toLowerCase();
    return agents
      .filter((agent) => agent.name.toLowerCase().includes(query))
      .slice(0, maxResults);
  }, [agents, searchQuery, maxResults]);

  // Copy agent stats to clipboard
  const copyAgentStats = useCallback(async (agent: AgentPerformance) => {
    const stats = `${agent.name} - Performance Summary\n` +
      `Average Sales Price: ${formatCurrency(agent.avgSalePrice)}\n` +
      `Total Volume: ${formatCurrency(agent.closedVolume)}\n` +
      `Units Sold: ${formatNumber(agent.closedUnits)}\n` +
      `Total GCI: ${formatCurrency(agent.gci)}\n` +
      `Pipeline: ${agent.pendingUnits} units (${formatCurrency(agent.pendingVolume)})`;
    
    try {
      await navigator.clipboard.writeText(stats);
      setCopiedAgentId(agent.name);
      setTimeout(() => setCopiedAgentId(null), 2000);
    } catch (error) {
      console.error('Failed to copy stats:', error);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-[#EF4923]" />
            {title}
          </h2>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search agents by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            {searchQuery ? `${filteredAgents.length} agents found` : `Showing top ${Math.min(agents.length, maxResults)} agents`}
          </span>
          {agents.length > maxResults && !searchQuery && (
            <Badge variant="outline">
              {agents.length - maxResults}+ more available
            </Badge>
          )}
        </div>
      )}

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(null).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {searchQuery ? "No agents found" : "No agent data available"}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? `No agents match "${searchQuery}". Try a different search term.`
                : "Agent performance data will appear here once transactions are loaded."
              }
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <Card key={agent.name} className="hover:shadow-md transition-all duration-200 relative">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#EF4923]/10 flex items-center justify-center">
                    <span className="text-[#EF4923] font-semibold">
                      {agent.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">
                      {agent.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Building className="h-3 w-3" />
                      <span>{agent.closedUnits} units • {agent.pendingUnits} pending</span>
                    </div>
                  </div>
                  
                  {/* Copy Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => copyAgentStats(agent)}
                    title="Copy agent stats"
                  >
                    {copiedAgentId === agent.name ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Key Metrics - Clean & Focused */}
                <div className="space-y-3">
                  {/* Average Sales Price - PRIMARY METRIC */}
                  <div className="flex items-center justify-between p-3 bg-[#EF4923]/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#EF4923]" />
                      <span className="text-sm font-medium">Avg Sales Price</span>
                    </div>
                    <span className="text-lg font-bold text-[#EF4923]">
                      {formatCurrency(agent.avgSalePrice)}
                    </span>
                  </div>

                  {/* Total Volume & GCI */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Total Volume</div>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(agent.closedVolume, true)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Total GCI</div>
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(agent.gci, true)}
                      </div>
                    </div>
                  </div>

                  {/* Pipeline (if showing full stats) */}
                  {showFullStats && agent.pendingUnits > 0 && (
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-gray-700">Pipeline</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(agent.pendingVolume, true)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Performance Badge */}
                <div className="mt-4 flex justify-center">
                  {agent.closedUnits >= 10 ? (
                    <Badge className="bg-green-100 text-green-800">High Performer</Badge>
                  ) : agent.closedUnits >= 5 ? (
                    <Badge className="bg-blue-100 text-blue-800">Active Agent</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600">Emerging</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}