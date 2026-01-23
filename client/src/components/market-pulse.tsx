import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Home, FileCheck, Clock, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

interface MarketPulseData {
  totalProperties: number;
  active: number;
  activeUnderContract: number;
  pending: number;
  closed: number;
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
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/market-pulse?refresh=true');
      if (!res.ok) throw new Error('Failed to refresh market data');
      return res.json();
    },
    onSuccess: (freshData) => {
      queryClient.setQueryData(['/api/market-pulse'], freshData);
    },
  });
  
  const isRefreshing = isFetching || refreshMutation.isPending;

  const chartData = data ? [
    { name: 'Active', count: data.active, fill: 'hsl(142, 76%, 36%)' },
    { name: 'Under Contract', count: data.activeUnderContract, fill: 'hsl(210, 76%, 50%)' },
    { name: 'Pending', count: data.pending, fill: 'hsl(45, 93%, 47%)' },
    { name: 'Closed', count: data.closed, fill: 'hsl(0, 0%, 45%)' },
  ].filter(item => item.count > 0) : [];

  const totalProperties = data?.totalProperties || 0;
  const active = data?.active || 0;
  const activeUnderContract = data?.activeUnderContract || 0;
  const pending = data?.pending || 0;
  const closed = data?.closed || 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#EF4923]" />
              <CardTitle className="text-lg">Market Pulse</CardTitle>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Austin Metro Area</p>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-[#EF4923] border-t-transparent rounded-full animate-spin" />
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
              <TrendingUp className="h-5 w-5 text-[#EF4923]" />
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
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#EF4923]" />
            <CardTitle className="text-base sm:text-lg">Market Pulse</CardTitle>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {data?.lastUpdatedAt && (
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">
                {format(new Date(data.lastUpdatedAt), 'M/d h:mm a')}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refreshMutation.mutate()}
              disabled={isRefreshing}
              className="gap-1.5 sm:gap-2 h-8 px-2 sm:px-3 text-xs sm:text-sm"
              data-testid="button-refresh-market"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">Austin Metro Area</p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        <div className="h-[160px] sm:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9 }} 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={40}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toString()}
                width={35}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px'
                }}
                formatter={(value: number) => value.toLocaleString()}
              />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1 text-emerald-700 text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                <Home className="h-3 w-3" />
                <span className="truncate">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">On Market</span>
                <span className="font-bold text-emerald-700 text-base sm:text-lg" data-testid="text-active">{active.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1 text-blue-700 text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                <FileCheck className="h-3 w-3" />
                <span className="truncate">Under Contract</span>
              </div>
              <div className="flex justify-end items-center">
                <span className="font-bold text-blue-700 text-base sm:text-lg" data-testid="text-active-under-contract">{activeUnderContract.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1 text-amber-700 text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                <Clock className="h-3 w-3" />
                <span className="truncate">Pending</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Closing Soon</span>
                <span className="font-bold text-amber-700 text-base sm:text-lg" data-testid="text-pending">{pending.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1 text-gray-700 text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                <CheckCircle2 className="h-3 w-3" />
                <span className="truncate">Closed (30d)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Sales</span>
                <span className="font-bold text-gray-700 text-base sm:text-lg" data-testid="text-closed">{closed.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-2 border-t">
          <span className="text-xs sm:text-sm text-muted-foreground">Total Active: </span>
          <span className="font-bold text-base sm:text-lg" data-testid="text-total-properties">{totalProperties.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
