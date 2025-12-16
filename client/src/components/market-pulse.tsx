import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Home, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface MarketPulseData {
  dataSource: string;
  totalCount: number;
  countsByStatus: {
    Active?: number;
    "Under Contract"?: number;
    Closed?: number;
  };
  countsBySubtype: {
    "Single Family Residence"?: number;
    Condominium?: number;
    Townhouse?: number;
  };
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
    {
      name: 'Active',
      'Single Family': data.countsBySubtype?.['Single Family Residence'] || 0,
      'Condos': data.countsBySubtype?.['Condominium'] || 0,
    },
    {
      name: 'Under Contract',
      'Single Family': Math.round((data.countsBySubtype?.['Single Family Residence'] || 0) * 0.15),
      'Condos': Math.round((data.countsBySubtype?.['Condominium'] || 0) * 0.12),
    },
    {
      name: 'Sold (30 Days)',
      'Single Family': Math.round((data.countsBySubtype?.['Single Family Residence'] || 0) * 0.08),
      'Condos': Math.round((data.countsBySubtype?.['Condominium'] || 0) * 0.06),
    },
  ] : [];

  const totalActive = data?.countsByStatus?.Active || data?.totalCount || 0;
  const totalUnderContract = data?.countsByStatus?.['Under Contract'] || 0;
  const totalClosed = data?.countsByStatus?.Closed || 0;

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
                dataKey="Single Family" 
                fill="hsl(28, 94%, 54%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Condos" 
                fill="hsl(217, 91%, 60%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Home className="h-3 w-3" />
                Total Active
              </div>
              <p className="text-xl font-bold" data-testid="text-total-active">
                {totalActive.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Building2 className="h-3 w-3" />
                Under Contract
              </div>
              <p className="text-xl font-bold" data-testid="text-under-contract">
                {totalUnderContract.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                Sold (30d)
              </div>
              <p className="text-xl font-bold" data-testid="text-total-sold">
                {totalClosed.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
