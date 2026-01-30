import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ExternalLink, Building2, RefreshCw, Loader2, TrendingUp,
  Home, FileCheck, Clock, CheckCircle2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { AustinMetroListings } from "@/components/properties/AustinMetroListings";

interface AppUsage {
  appId: string;
  clickCount: number;
}

interface MarketPulseData {
  totalProperties: number;
  active: number;
  activeUnderContract: number;
  pending: number;
  closed: number;
  lastUpdatedAt: string;
}

// RESO Status configuration
const RESO_STATUSES = [
  { key: 'Active', label: 'Active' },
  { key: 'Active Under Contract', label: 'Under Contract' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

// Status configuration for Market Pulse
const STATUS_CONFIG = [
  { key: 'Active', label: 'Active', sublabel: 'On Market', color: '#22C55E', textColor: 'text-green-600', bgLight: 'bg-green-50', bgDark: 'bg-green-900/20', borderColor: 'border-green-200', icon: Home },
  { key: 'Active Under Contract', label: 'Under Contract', sublabel: '', color: '#3B82F6', textColor: 'text-blue-600', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20', borderColor: 'border-blue-200', icon: FileCheck },
  { key: 'Pending', label: 'Pending', sublabel: 'Closing Soon', color: '#EAB308', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', bgDark: 'bg-yellow-900/20', borderColor: 'border-yellow-200', icon: Clock },
  { key: 'Closed', label: 'Closed (30d)', sublabel: 'Sales', color: '#9CA3AF', textColor: 'text-gray-600', bgLight: 'bg-gray-50', bgDark: 'bg-gray-700/50', borderColor: 'border-gray-300', icon: CheckCircle2 },
];

// Combined Market Pulse + Listings Component
function MarketPulseWithListings() {
  const { isDark } = useTheme();
  const searchString = useSearch();
  
  // Parse URL search params for initial status
  const urlParams = new URLSearchParams(searchString);
  const urlStatus = urlParams.get('status') || 'Active';
  
  // State for status filter (passed to AustinMetroListings)
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);

  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  // Sync status filter with URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const newStatus = params.get('status');
    if (newStatus && RESO_STATUSES.some(s => s.key === newStatus)) {
      setStatusFilter(newStatus);
    } else {
      setStatusFilter('Active');
    }
  }, [searchString]);
  
  // Handler to change status filter (used by bar chart clicks)
  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
  };

  // Fetch Market Pulse data
  const { 
    data: marketData, 
    isLoading: marketLoading, 
    refetch: refetchMarket,
    isFetching: marketFetching 
  } = useQuery<MarketPulseData>({
    queryKey: ['/api/market-pulse'],
    queryFn: async () => {
      const res = await fetch('/api/market-pulse');
      if (!res.ok) throw new Error('Failed to fetch market data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const isRefreshing = marketFetching;

  const handleRefresh = async () => {
    await refetchMarket();
  };

  // Market stats with values
  const getStatValue = (key: string) => {
    if (!marketData) return 0;
    switch (key) {
      case 'Active': return marketData.active;
      case 'Active Under Contract': return marketData.activeUnderContract;
      case 'Pending': return marketData.pending;
      case 'Closed': return marketData.closed;
      default: return 0;
    }
  };

  const maxValue = marketData 
    ? Math.max(marketData.active, marketData.activeUnderContract, marketData.pending, marketData.closed, 1)
    : 1;

  return (
    <>
      <Card className={`${cardBg} border ${borderColor}`} data-testid="card-market-pulse-listings">
        {/* Header with unified refresh button */}
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#EF4923]/10">
                <TrendingUp className="w-5 h-5 text-[#EF4923]" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Market Pulse</CardTitle>
                <p className={`text-xs sm:text-sm ${textSecondary}`}>Austin Metro Area</p>
              </div>
            </div>
            
            {/* Single Refresh Button for Both Sections */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-1.5 h-8 px-2 sm:px-3 text-xs sm:text-sm self-start sm:self-auto"
              data-testid="button-refresh-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 sm:px-6">
          {/* Market Pulse Bar Chart */}
          {marketLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#EF4923]" />
            </div>
          ) : (
            <>
              {/* Vertical Bar Chart - Growing Upward */}
              <div className="mb-6">
                {/* Chart Container */}
                <div className="relative h-44 flex items-end justify-around gap-2 px-4">
                  {/* Y-axis guideline */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-[10px] text-gray-400 py-1">
                    <span>{Math.round(maxValue / 1000)}k</span>
                    <span>{Math.round((maxValue / 2) / 1000)}k</span>
                    <span>0</span>
                  </div>
                  
                  {/* Bars */}
                  <div className="flex-1 flex items-end justify-around gap-3 h-full ml-8">
                    {STATUS_CONFIG.map((item) => {
                      const value = getStatValue(item.key);
                      const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      
                      return (
                        <div
                          key={item.key}
                          className="flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
                          onClick={() => handleStatusChange(item.key)}
                          data-testid={`bar-${item.key.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {/* Bar */}
                          <div
                            className="w-full max-w-20 rounded-t-lg transition-all duration-200 group-hover:opacity-75 group-hover:scale-105"
                            style={{
                              height: `${Math.max(heightPercent, 1)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                          {/* Label */}
                          <p className={`text-[10px] mt-2 text-center ${textSecondary} group-hover:text-[#EF4923]`}>
                            {item.label.replace(' (30d)', '')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <p className={`text-xs text-center mt-1 ${textSecondary}`}>
                  Click any bar to filter listings
                </p>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {STATUS_CONFIG.map((item) => {
                  const Icon = item.icon;
                  const value = getStatValue(item.key);
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleStatusChange(item.key)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200
                        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                        ${isDark ? item.bgDark : item.bgLight} ${item.borderColor}`}
                      data-testid={`stat-card-${item.key.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-4 h-4 ${item.textColor}`} />
                        <span className={`text-sm font-medium ${item.textColor}`}>{item.label}</span>
                      </div>
                      {item.sublabel && (
                        <p className={`text-xs ${textSecondary}`}>{item.sublabel}</p>
                      )}
                      <p className={`text-xl font-bold ${item.textColor} text-right`}>
                        {value.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Total Inventory */}
              <div className="mb-6 text-center">
                <span className={textSecondary}>Total Inventory: </span>
                <span className={`font-bold ${textPrimary}`}>
                  {(marketData?.totalProperties || 0).toLocaleString()}
                </span>
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {/* Austin Metro Listings - Enhanced with Filters, Pagination, and View Modes */}
      <AustinMetroListings initialStatus={statusFilter} />
    </>
  );
}

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  
  const { data: usageData } = useQuery<{ usage: AppUsage[] }>({
    queryKey: ["/api/app-usage/properties"],
    staleTime: 1000 * 60 * 5,
  });

  const trackUsage = useMutation({
    mutationFn: async (appId: string) => {
      return apiRequest("POST", "/api/app-usage/track", { appId, page: "properties" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-usage/properties"] });
    },
  });

  const baseApps = apps.filter(app => 
    app.categories?.includes("Sales") || 
    app.id === "client-data" || 
    app.id === "jointly"
  );

  const propertyApps = useMemo(() => {
    if (!usageData?.usage?.length) return baseApps;
    
    const usageMap = new Map(usageData.usage.map(u => [u.appId, u.clickCount]));
    return [...baseApps].sort((a, b) => {
      const countA = usageMap.get(a.id) || 0;
      const countB = usageMap.get(b.id) || 0;
      return countB - countA;
    });
  }, [baseApps, usageData]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#EF4923]/10 text-[#EF4923]">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Properties</h1>
            </div>
            <p className="text-muted-foreground">
              Access property data, listings, and market insights for the Austin Metro Area.
            </p>
          </div>
        </div>

        {/* Combined Market Pulse + Austin Metro Listings */}
        <MarketPulseWithListings />

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold tracking-tight">Property Apps & Tools</h2>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {propertyApps.map((app) => {
              const handleAppClick = () => {
                trackUsage.mutate(app.id);
                if (app.noIframe && app.url) {
                  window.open(app.url, '_blank', 'noopener,noreferrer');
                }
              };

              const cardContent = (
                <Card className="group relative overflow-hidden border-border hover:border-[#EF4923]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-property-app-${app.id}`}>
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {app.url ? <ExternalLink className="h-5 w-5 text-muted-foreground" /> : <ArrowUpRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                      <app.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-display text-lg">{app.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1.5">
                      {app.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal bg-secondary/80">
                        {app.categories?.[0] || 'Properties'}
                      </Badge>
                      {app.url && (
                        <Badge variant="outline" className="text-xs font-normal border-[#EF4923]/30 text-[#EF4923]">
                          Live
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              return (
                <motion.div key={app.id} variants={item}>
                  {app.noIframe && app.url ? (
                    <div onClick={handleAppClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleAppClick()}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link href={`/app/${app.id}`} onClick={() => trackUsage.mutate(app.id)}>
                      {cardContent}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
