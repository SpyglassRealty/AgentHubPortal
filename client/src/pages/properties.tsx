import { useState, useRef, useEffect } from "react";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ExternalLink, Building2, ChevronLeft, ChevronRight, 
  Bed, Bath, Square, RefreshCw, Loader2, ChevronDown 
} from "lucide-react";
import MarketPulse from "@/components/market-pulse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";

interface AppUsage {
  appId: string;
  clickCount: number;
}

interface Listing {
  id: string;
  mlsNumber: string;
  status: string;
  listPrice: number;
  listDate: string;
  daysOnMarket: number;
  address: {
    full: string;
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  beds: number;
  baths: number;
  livingArea: number;
  photos: string[];
  subdivision?: string;
  propertyType?: string;
  listOfficeName?: string;
}

interface ListingsResponse {
  listings: Listing[];
  total: number;
  city: string;
  status: string;
  sortBy: string;
  sortOrder: string;
}

// RESO Status configuration
const RESO_STATUSES = [
  { key: 'Active', label: 'Active' },
  { key: 'Active Under Contract', label: 'Under Contract' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

// Sorting options
const SORT_OPTIONS = [
  { label: 'Newest Listed', value: 'listDate', order: 'desc' },
  { label: 'Oldest Listed', value: 'listDate', order: 'asc' },
  { label: 'Price: High to Low', value: 'listPrice', order: 'desc' },
  { label: 'Price: Low to High', value: 'listPrice', order: 'asc' },
  { label: 'Days on Market: Most', value: 'daysOnMarket', order: 'desc' },
  { label: 'Days on Market: Least', value: 'daysOnMarket', order: 'asc' },
  { label: 'Beds: Most', value: 'bedroomsTotal', order: 'desc' },
  { label: 'SqFt: Largest', value: 'livingArea', order: 'desc' },
];

function ListingCard({ listing, isDark }: { listing: Listing; isDark: boolean }) {
  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  const statusColors: Record<string, string> = {
    'Active': 'bg-green-500',
    'Pending': 'bg-yellow-500',
    'Closed': 'bg-gray-500',
    'Active Under Contract': 'bg-blue-500',
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const photoUrl = listing.photos?.[0] || null;

  return (
    <div
      className={`${cardBg} rounded-xl border ${borderColor} overflow-hidden cursor-pointer 
        transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="relative aspect-[4/3] bg-[#222222]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.address?.full}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-gray-500" />
          </div>
        )}
        
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold uppercase
          ${statusColors[listing.status] || 'bg-gray-500'} text-white`}>
          {listing.status === 'Active Under Contract' ? 'Under Contract' : listing.status}
        </span>
        
        {listing.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
            1/{listing.photos.length}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className={`text-lg font-bold ${textPrimary}`}>
          {formatPrice(listing.listPrice)}
        </p>
        <p className={`text-sm ${textSecondary} truncate mb-2`}>
          {listing.address?.full}
        </p>
        <div className="flex items-center gap-3 text-sm">
          {listing.beds > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`}>
              <Bed className="w-4 h-4" /> {listing.beds}
            </span>
          )}
          {listing.baths > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`}>
              <Bath className="w-4 h-4" /> {listing.baths}
            </span>
          )}
          {listing.livingArea > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`}>
              <Square className="w-4 h-4" /> {listing.livingArea?.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AustinMetroListings() {
  const { isDark } = useTheme();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Parse URL search params
  const urlParams = new URLSearchParams(searchString);
  const urlStatus = urlParams.get('status') || 'Active';
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [sortBy, setSortBy] = useState<string>('listDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

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
    }
  }, [searchString]);

  // Update URL when filter changes
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    if (status === 'all' || status === 'Active') {
      setLocation('/properties');
    } else {
      setLocation(`/properties?status=${encodeURIComponent(status)}`);
    }
  };

  const { data: listingsData, isLoading, refetch, isFetching } = useQuery<ListingsResponse>({
    queryKey: ['austin-metro-listings', statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        city: 'Austin',
        status: statusFilter === 'all' ? '' : statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
        limit: '50'
      });
      const response = await fetch(`/api/company-listings?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const listings = listingsData?.listings || [];
  const total = listingsData?.total || 0;

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const handleSortChange = (value: string, order: 'asc' | 'desc') => {
    setSortBy(value);
    setSortOrder(order);
    setShowSortDropdown(false);
  };

  const currentSortLabel = SORT_OPTIONS.find(
    opt => opt.value === sortBy && opt.order === sortOrder
  )?.label || 'Newest Listed';

  const isRefreshing = isFetching;

  return (
    <Card className={`${cardBg} border ${borderColor}`} data-testid="card-austin-metro-listings">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4923]/10">
              <Building2 className="w-5 h-5 text-[#EF4923]" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Austin Metro Listings</CardTitle>
              <p className={`text-xs sm:text-sm ${textSecondary}`}>
                {total.toLocaleString()} {statusFilter !== 'all' ? statusFilter.toLowerCase() : ''} listings
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefreshing}
            className="gap-1.5 h-8 px-2 sm:px-3 text-xs sm:text-sm self-start sm:self-auto"
            data-testid="button-refresh-listings"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
          {/* Status Filter Tabs */}
          <div className={`flex gap-1 p-1 rounded-lg overflow-x-auto ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
            {RESO_STATUSES.map((status) => (
              <button
                key={status.key}
                onClick={() => handleStatusChange(status.key)}
                className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[44px] touch-target
                  ${statusFilter === status.key
                    ? 'bg-[#EF4923] text-white'
                    : isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                data-testid={`filter-${status.key.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-h-[44px] touch-target text-sm
                ${isDark ? 'bg-[#333333] border-[#444444] text-white' : 'bg-white border-gray-200 text-gray-700'}
                hover:border-[#EF4923] transition-colors`}
              data-testid="button-sort-dropdown"
            >
              <span className="whitespace-nowrap">{currentSortLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSortDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className={`absolute right-0 sm:left-0 top-full mt-1 z-50 rounded-lg shadow-lg border min-w-[200px]
                  ${isDark ? 'bg-[#2a2a2a] border-[#444444]' : 'bg-white border-gray-200'}`}
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={`${option.value}-${option.order}`}
                      onClick={() => handleSortChange(option.value, option.order as 'asc' | 'desc')}
                      className={`w-full text-left px-4 py-3 text-sm min-h-[44px] touch-target transition-colors
                        ${sortBy === option.value && sortOrder === option.order
                          ? 'bg-[#EF4923]/10 text-[#EF4923] font-medium'
                          : isDark 
                            ? 'text-gray-300 hover:bg-[#333333]' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }
                        first:rounded-t-lg last:rounded-b-lg`}
                      data-testid={`sort-${option.value}-${option.order}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#EF4923]" />
          </div>
        )}

        {!isLoading && listings.length === 0 && (
          <div className={`text-center py-8 rounded-lg border-2 border-dashed ${borderColor}`}>
            <Building2 className={`w-10 h-10 mx-auto mb-2 ${textSecondary}`} />
            <p className={`font-medium ${textPrimary}`}>No {statusFilter !== 'all' ? statusFilter.toLowerCase() : ''} listings found</p>
            <p className={`text-sm ${textSecondary}`}>Try adjusting your filters</p>
          </div>
        )}

        {!isLoading && listings.length > 0 && (
          <div className="relative">
            <button
              onClick={scrollLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg
                ${isDark ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}
                hidden md:flex items-center justify-center min-w-[44px] min-h-[44px]`}
              data-testid="button-scroll-left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 px-1 scroll-smooth scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {listings.map((listing) => (
                <div key={listing.id} className="flex-shrink-0 w-64 sm:w-72">
                  <ListingCard listing={listing} isDark={isDark} />
                </div>
              ))}
            </div>

            <button
              onClick={scrollRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg
                ${isDark ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}
                hidden md:flex items-center justify-center min-w-[44px] min-h-[44px]`}
              data-testid="button-scroll-right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <p className={`text-xs text-center mt-2 md:hidden ${textSecondary}`}>
              ← Swipe to see more →
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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

        {/* Market Pulse - not clickable on Properties page since we're already here */}
        <MarketPulse isClickable={false} />

        {/* Austin Metro Listings Widget */}
        <AustinMetroListings />

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
