import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock,
  Home,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  RefreshCw,
  Unlink
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PerformanceData {
  configured: boolean;
  message?: string;
  summary?: {
    gciYTD: number;
    gciL12M: number;
    pendingGCI: number;
    avgPerDeal: number;
    totalDealsYTD: number;
  };
  dealBreakdown?: {
    buyerCount: number;
    buyerVolume: number;
    sellerCount: number;
    sellerVolume: number;
    totalVolume: number;
    avgSalePrice: number;
  };
  insights?: {
    yoyChange: number;
    avgDaysToClose: number;
    pendingCount: number;
  };
  pendingPipeline?: Array<{
    id: string;
    address: string;
    price: number;
    closingDate: string | null;
    gci: number;
    status: string;
    listing: boolean;
  }>;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatFullCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MyPerformancePage() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery<PerformanceData>({
    queryKey: ["/api/rezen/performance"],
    queryFn: async () => {
      const res = await fetch("/api/rezen/performance", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const result = await res.json();
      setLastUpdated(new Date());
      return result;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const linkMutation = useMutation({
    mutationFn: async (yentaId: string) => {
      const res = await fetch("/api/rezen/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ yentaId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to link account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setYentaIdInput("");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rezen/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ yentaId: "" }),
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!data?.configured) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <h1 className="text-3xl font-display font-bold mb-8">My Performance</h1>
          
          <Card className="border-2 border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Connect Your ReZen Account</h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Link your ReZen account to see your GCI, deals, and performance metrics.
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Yenta ID</label>
                    <Input
                      placeholder="e.g., 0d71597f-e3af-47bd-9645-59fc2910656e"
                      value={yentaIdInput}
                      onChange={(e) => setYentaIdInput(e.target.value)}
                      data-testid="input-yenta-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Yenta ID can be found in your ReZen profile URL or ask your team leader.
                    </p>
                  </div>
                  
                  {linkMutation.error && (
                    <p className="text-sm text-destructive">
                      {(linkMutation.error as Error).message}
                    </p>
                  )}
                  
                  <Button
                    className="w-full bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,44%)]"
                    onClick={() => linkMutation.mutate(yentaIdInput)}
                    disabled={!yentaIdInput || linkMutation.isPending}
                    data-testid="button-connect-rezen"
                  >
                    {linkMutation.isPending ? "Connecting..." : "Connect Account"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const { summary, dealBreakdown, insights, pendingPipeline } = data;
  const totalDeals = (dealBreakdown?.buyerCount || 0) + (dealBreakdown?.sellerCount || 0);
  const buyerPercent = totalDeals > 0 ? ((dealBreakdown?.buyerCount || 0) / totalDeals) * 100 : 50;
  const lastYearGCI = insights?.yoyChange && summary?.gciYTD 
    ? summary.gciYTD / (1 + insights.yoyChange / 100) 
    : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">My Performance</h1>
            <p className="text-muted-foreground mt-1">
              Your ReZen transaction data and metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Last updated: {formatLastUpdated(lastUpdated)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-disconnect">
                  <Unlink className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect ReZen Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your ReZen connection. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" data-testid="card-gci-ytd">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">GCI YTD</span>
              </div>
              <p className="text-3xl font-bold text-emerald-900">
                {formatCurrency(summary?.gciYTD || 0)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {(insights?.yoyChange || 0) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${(insights?.yoyChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Math.abs(insights?.yoyChange || 0).toFixed(0)}% YoY
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200" data-testid="card-gci-l12m">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">GCI L12M</span>
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(summary?.gciL12M || 0)}
              </p>
              <p className="text-sm text-blue-600 mt-2">Last 12 months</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200" data-testid="card-pending-gci">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Pending GCI</span>
              </div>
              <p className="text-3xl font-bold text-amber-900">
                {formatCurrency(summary?.pendingGCI || 0)}
              </p>
              <p className="text-sm text-amber-600 mt-2">
                {insights?.pendingCount || 0} deals in pipeline
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200" data-testid="card-avg-per-deal">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Avg per Deal</span>
              </div>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(summary?.avgPerDeal || 0)}
              </p>
              <p className="text-sm text-purple-600 mt-2">Commission avg</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card data-testid="card-buyer-side">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                Buyer Side
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold">{dealBreakdown?.buyerCount || 0}</span>
                  <span className="text-lg text-muted-foreground">deals</span>
                </div>
                <div className="text-2xl font-semibold text-blue-600">
                  {formatCurrency(dealBreakdown?.buyerVolume || 0)} volume
                </div>
                <Progress value={buyerPercent} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(buyerPercent)}% of your deals
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-seller-side">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Building2 className="h-5 w-5 text-orange-600" />
                Seller Side (Listings)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-bold">{dealBreakdown?.sellerCount || 0}</span>
                  <span className="text-lg text-muted-foreground">deals</span>
                </div>
                <div className="text-2xl font-semibold text-orange-600">
                  {formatCurrency(dealBreakdown?.sellerVolume || 0)} volume
                </div>
                <Progress value={100 - buyerPercent} className="h-3 [&>div]:bg-orange-500" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(100 - buyerPercent)}% of your deals
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Average Sale Price</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(dealBreakdown?.avgSalePrice || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Avg Days to Close</p>
                  <p className="text-2xl font-bold mt-1">{insights?.avgDaysToClose || 0} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50" data-testid="card-yoy">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-slate-600" />
                    <span className="font-medium">Year-over-Year</span>
                  </div>
                  <p className={`text-lg font-semibold ${(insights?.yoyChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    You're {(insights?.yoyChange || 0) >= 0 ? 'UP' : 'DOWN'} {Math.abs(insights?.yoyChange || 0).toFixed(0)}% compared to this time last year!
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">{currentYear} YTD</p>
                  <p className="font-semibold">{formatCurrency(summary?.gciYTD || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">{currentYear - 1} YTD</p>
                  <p className="font-semibold">{formatCurrency(lastYearGCI)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {pendingPipeline && pendingPipeline.length > 0 && (
          <Card data-testid="card-pipeline">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Pipeline
              </CardTitle>
              <CardDescription>Your active transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Est. Close</TableHead>
                      <TableHead className="text-right">My GCI</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPipeline.map((deal) => (
                      <TableRow key={deal.id} data-testid={`row-pipeline-${deal.id}`}>
                        <TableCell className="font-medium max-w-[250px] truncate">
                          {deal.address}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatFullCurrency(deal.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatDate(deal.closingDate)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {formatFullCurrency(deal.gci)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={deal.listing ? "default" : "secondary"}>
                            {deal.status === "OPEN" ? (deal.listing ? "Listing" : "Pending") : deal.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pendingPipeline.length > 10 && (
                <p className="text-sm text-center text-muted-foreground mt-4">
                  Showing first 10 of {pendingPipeline.length} transactions
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
