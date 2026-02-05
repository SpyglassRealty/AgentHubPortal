import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, TrendingUp, TrendingDown, Clock, Star, ChevronRight, AlertCircle, Users, DollarSign, BarChart3, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentProfile {
  agentId: string;
  mlsId: string;
  licenseNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  currentBrokerage: string;
  brokerageHistory: {
    name: string;
    startDate: string;
    endDate: string | null;
    transactionCount: number;
    totalVolume: number;
    isCurrent: boolean;
  }[];
  careerStats: {
    totalTransactions: number;
    totalVolume: number;
    avgPrice: number;
    yearsActive: number;
    firstTransactionDate: string | null;
    lastTransactionDate: string | null;
  };
  annualProduction: {
    year: number;
    transactions: number;
    volume: number;
    avgPrice: number;
    brokerage: string;
  }[];
  specialization: {
    primaryCity: string;
    propertyTypes: { type: string; percentage: number }[];
    priceRange: { min: number; max: number; avg: number };
    buyerVsSeller: { buyer: number; seller: number };
  };
  signals: {
    recentBrokerageChange: boolean;
    volumeDecline: boolean;
    volumeGrowth: boolean;
    avgTimeAtBrokerage: number;
    isTopProducer: boolean;
  };
}

interface VolumeChartData {
  year: number;
  volume: number;
  brokerage: string;
  brokerageColor?: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Simple volume chart component
function VolumeChart({ data, brokerageHistory }: { data: VolumeChartData[]; brokerageHistory: AgentProfile['brokerageHistory'] }) {
  if (!data || data.length === 0) return null;
  
  const maxVolume = Math.max(...data.map(d => d.volume));
  const years = data.map(d => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  // Get unique brokerages for legend
  const uniqueBrokerages = [...new Map(data.map(d => [d.brokerage, d.brokerageColor])).entries()];
  
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {uniqueBrokerages.map(([name, color]) => (
          <div key={name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color || '#6B7280' }}
            />
            <span className="text-muted-foreground truncate max-w-[150px]">{name}</span>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="relative h-48 flex items-end gap-1">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(maxVolume)}</span>
          <span>{formatCurrency(maxVolume / 2)}</span>
          <span>$0</span>
        </div>
        
        {/* Bars */}
        <div className="ml-14 flex-1 flex items-end gap-1">
          {data.map((d, i) => (
            <div 
              key={d.year} 
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div 
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{ 
                  height: `${(d.volume / maxVolume) * 160}px`,
                  backgroundColor: d.brokerageColor || '#6B7280',
                  minHeight: '4px'
                }}
                title={`${d.year}: ${formatCurrency(d.volume)} (${d.brokerage})`}
              />
              <span className="text-xs text-muted-foreground">{d.year}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Avg line note */}
      <p className="text-xs text-muted-foreground text-center">
        Avg. time at brokerage: {brokerageHistory.length > 0 
          ? (brokerageHistory.reduce((sum, b) => {
              const start = new Date(b.startDate);
              const end = b.endDate ? new Date(b.endDate) : new Date();
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
            }, 0) / brokerageHistory.length).toFixed(1)
          : '—'
        } yrs
      </p>
    </div>
  );
}

// Brokerage timeline component
function BrokerageTimeline({ history }: { history: AgentProfile['brokerageHistory'] }) {
  return (
    <div className="space-y-3">
      {history.map((b, i) => (
        <div 
          key={i} 
          className={`flex items-start gap-3 p-3 rounded-lg ${b.isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}
        >
          <div className={`w-2 h-2 rounded-full mt-2 ${b.isCurrent ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{b.name}</span>
              {b.isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(b.startDate)} — {b.endDate ? formatDate(b.endDate) : 'Present'}
            </div>
            <div className="text-sm mt-1">
              {b.transactionCount} deals · {formatCurrency(b.totalVolume)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Agent profile card
function AgentProfileCard({ agent, chartData }: { agent: AgentProfile; chartData: VolumeChartData[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
          {agent.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{agent.name}</h2>
          <p className="text-muted-foreground">{agent.currentBrokerage}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {agent.email && (
              <a href={`mailto:${agent.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <Mail className="w-3 h-3" /> {agent.email}
              </a>
            )}
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <Phone className="w-3 h-3" /> {agent.phone}
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            License: {agent.licenseNumber} · MLS ID: {agent.mlsId}
          </p>
        </div>
      </div>

      {/* Signals / Badges */}
      <div className="flex flex-wrap gap-2">
        {agent.signals.isTopProducer && (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Star className="w-3 h-3 mr-1" /> Top Producer
          </Badge>
        )}
        {agent.signals.recentBrokerageChange && (
          <Badge variant="outline" className="border-orange-500/50 text-orange-600">
            <Building2 className="w-3 h-3 mr-1" /> Recent Move
          </Badge>
        )}
        {agent.signals.volumeDecline && (
          <Badge variant="outline" className="border-red-500/50 text-red-600">
            <TrendingDown className="w-3 h-3 mr-1" /> Volume Decline
          </Badge>
        )}
        {agent.signals.volumeGrowth && (
          <Badge variant="outline" className="border-green-500/50 text-green-600">
            <TrendingUp className="w-3 h-3 mr-1" /> Growing
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(agent.careerStats.totalVolume)}</div>
            <div className="text-sm text-muted-foreground">Career Volume</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{agent.careerStats.totalTransactions}</div>
            <div className="text-sm text-muted-foreground">Total Deals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(agent.careerStats.avgPrice)}</div>
            <div className="text-sm text-muted-foreground">Avg Price</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{agent.careerStats.yearsActive}</div>
            <div className="text-sm text-muted-foreground">Years Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total sales volume across brokerages</CardTitle>
        </CardHeader>
        <CardContent>
          <VolumeChart data={chartData} brokerageHistory={agent.brokerageHistory} />
        </CardContent>
      </Card>

      {/* Two columns: Brokerage History + Specialization */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Brokerage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BrokerageTimeline history={agent.brokerageHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Specialization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Primary Market</div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {agent.specialization.primaryCity}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground mb-1">Price Range</div>
              <div>{formatCurrency(agent.specialization.priceRange.min)} — {formatCurrency(agent.specialization.priceRange.max)}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Property Types</div>
              <div className="flex flex-wrap gap-2">
                {agent.specialization.propertyTypes.map(pt => (
                  <Badge key={pt.type} variant="secondary">
                    {pt.type} ({pt.percentage}%)
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Buyer vs Seller</div>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${agent.specialization.buyerVsSeller.buyer}%` }}
                  title={`Buyer: ${agent.specialization.buyerVsSeller.buyer}%`}
                />
                <div 
                  className="bg-green-500" 
                  style={{ width: `${agent.specialization.buyerVsSeller.seller}%` }}
                  title={`Seller: ${agent.specialization.buyerVsSeller.seller}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Buyer {agent.specialization.buyerVsSeller.buyer}%</span>
                <span>Seller {agent.specialization.buyerVsSeller.seller}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RecruitmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Check data status
  const { data: status } = useQuery({
    queryKey: ['recruitment-status'],
    queryFn: async () => {
      const res = await fetch('/api/recruitment/status');
      return res.json();
    },
  });

  // Search agents
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['agent-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const res = await fetch(`/api/recruitment/agents/search?q=${encodeURIComponent(searchQuery)}`);
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  // Get agent profile
  const { data: agentData, isLoading: isLoadingAgent } = useQuery({
    queryKey: ['agent-profile', selectedAgent],
    queryFn: async () => {
      if (!selectedAgent) return null;
      const res = await fetch(`/api/recruitment/agents/${encodeURIComponent(selectedAgent)}`);
      return res.json();
    },
    enabled: !!selectedAgent,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults?.agents?.[0]) {
      setSelectedAgent(searchResults.agents[0].licenseNumber);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent Recruitment</h1>
        <p className="text-muted-foreground">
          Search and analyze agent production history for recruiting
        </p>
      </div>

      {/* Data Status Banner */}
      {status && !status.hasSoldDataAccess && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">Demo Mode — Limited Data</p>
            <p className="text-sm text-amber-600/80">
              {status.message} Real agent data will be available once Repliers grants sold data access.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by agent name or license number (e.g., Tracy Trevino, TREC#0657808)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isSearching || searchQuery.length < 2}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Quick search results */}
          {searchResults?.agents && searchResults.agents.length > 0 && !selectedAgent && (
            <div className="mt-4 space-y-2">
              {searchResults.agents.map((agent: AgentProfile) => (
                <button
                  key={agent.agentId}
                  onClick={() => setSelectedAgent(agent.licenseNumber)}
                  className="w-full p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {agent.currentBrokerage} · {agent.licenseNumber}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Profile */}
      {selectedAgent && (
        <>
          <div className="mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedAgent(null)}
              className="text-muted-foreground"
            >
              ← Back to search
            </Button>
          </div>

          {isLoadingAgent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : agentData?.agent ? (
            <AgentProfileCard agent={agentData.agent} chartData={agentData.chartData} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Agent not found
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!selectedAgent && !searchResults?.agents?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Search for an agent</h3>
            <p className="text-muted-foreground mb-4">
              Enter an agent's name or TREC license number to view their production history
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setSearchQuery('Tracy Trevino')}
              >
                Try: Tracy Trevino
              </Badge>
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setSearchQuery('TREC#0657808')}
              >
                Try: TREC#0657808
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
