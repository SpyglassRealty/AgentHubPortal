import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Home, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface MarketPulseData {
  totalProperties: number;
  active: number;
  underContract: number;
  sold: number;
  activeSfr: number;
  activeCondo: number;
  underContractSfr: number;
  underContractCondo: number;
  lastUpdatedAt: string;
}

export default function MarketPulse() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, isError, refetch, isFetching } = useQuery<MarketPulseData>({
    queryKey: ['/api/market-pulse'],
    queryFn: async () => {
      const res = await fetch('/api/market-pulse');
      if (!res.ok) throw new Error('Failed to fetch market data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const chartData = data ? [
    { name: 'Active SFR', count: data.activeSfr, fill: 'hsl(142, 76%, 36%)' },
    { name: 'Active Condo', count: data.activeCondo, fill: 'hsl(142, 76%, 50%)' },
    { name: 'Pending SFR', count: data.underContractSfr, fill: 'hsl(45, 93%, 47%)' },
    { name: 'Pending Condo', count: data.underContractCondo, fill: 'hsl(45, 93%, 60%)' },
  ].filter(item => item.count > 0) : [];

  const totalProperties = data?.totalProperties || 0;
  const activeSfr = data?.activeSfr || 0;
  const activeCondo = data?.activeCondo || 0;
  const underContractSfr = data?.underContractSfr || 0;
  const underContractCondo = data?.underContractCondo || 0;
  const totalSold = data?.sold || 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              <CardTitle className="text-lg">Market Pulse</CardTitle>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Austin Metro Area</p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-[hsl(28,94%,54%)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading market data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              <CardTitle className="text-lg">Market Pulse</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="gap-2"
              data-testid="button-refresh-market"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Austin Metro Area</p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Unable to load market data</p>
              <p className="text-sm mt-1">Please try again later</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="card-market-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(28,94%,54%)]" />
            <CardTitle className="text-lg">Market Pulse</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {data?.lastUpdatedAt && (
              <span className="text-xs text-muted-foreground">
                Last updated: {format(new Date(data.lastUpdatedAt), 'M/d/yyyy, h:mm a')}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              data-testid="button-refresh-market"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Austin Metro Area</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="square"
              />
              <Bar 
                dataKey="count" 
                fill="hsl(28, 94%, 54%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium mb-2">
                <Home className="h-3 w-3" />
                Active Listings
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">SFR</span>
                  <span className="font-bold" data-testid="text-active-sfr">{activeSfr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Condo</span>
                  <span className="font-bold" data-testid="text-active-condo">{activeCondo.toLocaleString()}</span>
                </div>
                <div className="border-t pt-1 flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-emerald-700" data-testid="text-total-active">{(activeSfr + activeCondo).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-amber-700 text-xs font-medium mb-2">
                <Building2 className="h-3 w-3" />
                Under Contract
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">SFR</span>
                  <span className="font-bold" data-testid="text-pending-sfr">{underContractSfr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Condo</span>
                  <span className="font-bold" data-testid="text-pending-condo">{underContractCondo.toLocaleString()}</span>
                </div>
                <div className="border-t pt-1 flex justify-between items-center">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-amber-700" data-testid="text-total-pending">{(underContractSfr + underContractCondo).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
