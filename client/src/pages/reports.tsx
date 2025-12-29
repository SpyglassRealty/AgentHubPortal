import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSelector } from "@/components/agent-selector";
import { 
  TrendingUp, 
  DollarSign, 
  Home, 
  AlertCircle, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import type { FubDeal } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface DealsResponse {
  deals: FubDeal[];
  summary: {
    underContractCount: number;
    underContractValue: number;
    closedThisYearCount: number;
    closedThisYearValue: number;
    closedLastYearCount: number;
    closedLastYearValue: number;
  };
  message?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const dealsUrl = selectedAgentId 
    ? `/api/fub/deals?agentId=${selectedAgentId}`
    : `/api/fub/deals`;

  const { data, isLoading, error } = useQuery<DealsResponse>({
    queryKey: ["/api/fub/deals", { agentId: selectedAgentId }],
    queryFn: async () => {
      const res = await fetch(dealsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
  });

  const currentYear = new Date().getFullYear();

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Unable to Load Reports</h2>
          <p className="text-muted-foreground mb-4">
            {(error as Error).message || "Please check your Follow Up Boss connection."}
          </p>
          <a href="https://app.followupboss.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              Open Follow Up Boss
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </Layout>
    );
  }

  const underContractDeals = data?.deals.filter(d => d.status === 'under_contract') || [];
  const closedDeals = data?.deals.filter(d => d.status === 'closed') || [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold" data-testid="text-reports-title">Reports</h1>
            <p className="text-muted-foreground mt-1">
              {selectedAgentId 
                ? "Viewing agent's deals" 
                : "Your deal performance from Follow Up Boss"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.isSuperAdmin && (
              <AgentSelector 
                selectedAgentId={selectedAgentId}
                onAgentChange={setSelectedAgentId}
              />
            )}
            <a href="https://app.followupboss.com/deals" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-[hsl(28,94%,54%)]/30 hover:bg-[hsl(28,94%,54%)]/10">
                Open in Follow Up Boss
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {data?.message && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">{data.message}</p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200" data-testid="card-under-contract">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Under Contract</p>
                    <p className="text-xs text-blue-600/70">Active deals</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-display font-bold text-blue-900">
                    {data?.summary?.underContractCount || 0}
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {formatCurrency(data?.summary?.underContractValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" data-testid="card-closed-this-year">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 font-medium">Closed {currentYear}</p>
                    <p className="text-xs text-emerald-600/70">This year</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-display font-bold text-emerald-900">
                    {data?.summary?.closedThisYearCount || 0}
                  </p>
                  <p className="text-lg font-semibold text-emerald-700">
                    {formatCurrency(data?.summary?.closedThisYearValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200" data-testid="card-closed-last-year">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-500 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 font-medium">Closed {currentYear - 1}</p>
                    <p className="text-xs text-slate-600/70">Last year</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-display font-bold text-slate-900">
                    {data?.summary?.closedLastYearCount || 0}
                  </p>
                  <p className="text-lg font-semibold text-slate-700">
                    {formatCurrency(data?.summary?.closedLastYearValue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[hsl(28,94%,95%)] to-[hsl(28,94%,90%)] border-[hsl(28,94%,70%)]" data-testid="card-total-volume">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-[hsl(28,94%,54%)] flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(28,50%,35%)] font-medium">Total Volume</p>
                    <p className="text-xs text-[hsl(28,50%,45%)]">{currentYear} YTD</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-display font-bold text-[hsl(28,50%,25%)]">
                    {(data?.summary?.closedThisYearCount || 0) + (data?.summary?.underContractCount || 0)}
                  </p>
                  <p className="text-lg font-semibold text-[hsl(28,50%,35%)]">
                    {formatCurrency((data?.summary?.closedThisYearValue || 0) + (data?.summary?.underContractValue || 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Under Contract
              </CardTitle>
              <CardDescription>
                {selectedAgentId ? "Selected agent's active deals" : "Active deals pending closing"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : underContractDeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No deals under contract</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {underContractDeals.map(deal => (
                    <div 
                      key={deal.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      data-testid={`card-deal-${deal.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{deal.name || deal.propertyAddress || 'Untitled Deal'}</p>
                          {deal.clientName && (
                            <p className="text-sm text-muted-foreground mt-0.5">{deal.clientName}</p>
                          )}
                          {deal.closeDate && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Est. Close: {format(parseISO(deal.closeDate), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {deal.price && (
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(deal.price)}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {deal.stage}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Recently Closed
              </CardTitle>
              <CardDescription>
                {selectedAgentId ? "Selected agent's closed deals" : "Deals closed this year"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : closedDeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No closed deals yet this year</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {closedDeals.slice(0, 5).map(deal => (
                    <div 
                      key={deal.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      data-testid={`card-deal-${deal.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{deal.name || deal.propertyAddress || 'Untitled Deal'}</p>
                          {deal.clientName && (
                            <p className="text-sm text-muted-foreground mt-0.5">{deal.clientName}</p>
                          )}
                          {deal.closeDate && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Closed: {format(parseISO(deal.closeDate), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {deal.price && (
                            <p className="font-semibold text-emerald-600">
                              {formatCurrency(deal.price)}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            Closed
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {closedDeals.length > 5 && (
                    <p className="text-sm text-center text-muted-foreground pt-2">
                      +{closedDeals.length - 5} more closed deals
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
