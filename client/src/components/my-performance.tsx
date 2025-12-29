import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function MyPerformance() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ["/api/rezen/performance"],
    queryFn: async () => {
      const res = await fetch("/api/rezen/performance", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

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
      setLinkDialogOpen(false);
      setYentaIdInput("");
    },
  });

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.configured) {
    return (
      <Card className="col-span-full border-dashed border-2 border-muted-foreground/20">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Connect Your ReZen Account</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Link your ReZen account to see your GCI, deals, and performance metrics
              </p>
            </div>
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,44%)]" data-testid="button-link-rezen">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link ReZen Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Your ReZen Account</DialogTitle>
                  <DialogDescription>
                    Enter your Yenta ID from your ReZen profile URL. It's the UUID at the end of your profile link.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Yenta ID</label>
                    <Input
                      placeholder="e.g., 0d71597f-e3af-47bd-9645-59fc2910656e"
                      value={yentaIdInput}
                      onChange={(e) => setYentaIdInput(e.target.value)}
                      data-testid="input-yenta-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      Find this in your ReZen profile URL after /profile/
                    </p>
                  </div>
                  {linkMutation.error && (
                    <p className="text-sm text-destructive">
                      {(linkMutation.error as Error).message}
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => linkMutation.mutate(yentaIdInput)}
                    disabled={!yentaIdInput || linkMutation.isPending}
                    data-testid="button-submit-yenta-id"
                  >
                    {linkMutation.isPending ? "Linking..." : "Link Account"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, dealBreakdown, insights, pendingPipeline } = data;
  const totalDeals = (dealBreakdown?.buyerCount || 0) + (dealBreakdown?.sellerCount || 0);
  const buyerPercent = totalDeals > 0 ? ((dealBreakdown?.buyerCount || 0) / totalDeals) * 100 : 50;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(28,94%,54%)]" />
            My Performance
          </h2>
          <p className="text-sm text-muted-foreground">Your ReZen transaction data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" data-testid="card-gci-ytd">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">GCI YTD</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">
              {formatCurrency(summary?.gciYTD || 0)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {summary?.totalDealsYTD || 0} deals closed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200" data-testid="card-gci-l12m">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">GCI L12M</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(summary?.gciL12M || 0)}
            </p>
            <p className="text-xs text-blue-600 mt-1">Last 12 months</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200" data-testid="card-pending-gci">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Pending GCI</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">
              {formatCurrency(summary?.pendingGCI || 0)}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {insights?.pendingCount || 0} deals in pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200" data-testid="card-avg-per-deal">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Avg per Deal</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatCurrency(summary?.avgPerDeal || 0)}
            </p>
            <p className="text-xs text-purple-600 mt-1">Commission avg</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-deal-breakdown">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Deal Breakdown
            </CardTitle>
            <CardDescription>Buyer vs Seller side analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 font-medium">
                Buyer ({dealBreakdown?.buyerCount || 0})
              </span>
              <span className="text-orange-600 font-medium">
                Seller ({dealBreakdown?.sellerCount || 0})
              </span>
            </div>
            <Progress value={buyerPercent} className="h-3" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600 font-medium">Buyer Volume</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(dealBreakdown?.buyerVolume || 0)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50">
                <p className="text-xs text-orange-600 font-medium">Seller Volume</p>
                <p className="text-lg font-bold text-orange-900">
                  {formatCurrency(dealBreakdown?.sellerVolume || 0)}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Sale Price</span>
                <span className="font-semibold">{formatCurrency(dealBreakdown?.avgSalePrice || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-insights">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-600" />
              Performance Insights
            </CardTitle>
            <CardDescription>Key metrics and trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium">Year-over-Year</p>
                <p className="text-xs text-muted-foreground">vs same period last year</p>
              </div>
              <div className="flex items-center gap-1">
                {(insights?.yoyChange || 0) >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-lg font-bold ${(insights?.yoyChange || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Math.abs(insights?.yoyChange || 0).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium">Avg Days to Close</p>
                <p className="text-xs text-muted-foreground">Contract to closing</p>
              </div>
              <span className="text-lg font-bold text-slate-700">
                {insights?.avgDaysToClose || 0} days
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium">Active Pipeline</p>
                <p className="text-xs text-muted-foreground">Open transactions</p>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {insights?.pendingCount || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingPipeline && pendingPipeline.length > 0 && (
        <Card data-testid="card-pipeline">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Pipeline
            </CardTitle>
            <CardDescription>Your active transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Est. GCI</TableHead>
                    <TableHead className="text-center">Close Date</TableHead>
                    <TableHead className="text-center">Side</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPipeline.slice(0, 5).map((deal) => (
                    <TableRow key={deal.id} data-testid={`row-pipeline-${deal.id}`}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {deal.address}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatFullCurrency(deal.price)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {formatFullCurrency(deal.gci)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(deal.closingDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={deal.listing ? "default" : "secondary"}>
                          {deal.listing ? "Seller" : "Buyer"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pendingPipeline.length > 5 && (
              <p className="text-sm text-center text-muted-foreground mt-3">
                +{pendingPipeline.length - 5} more transactions
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
