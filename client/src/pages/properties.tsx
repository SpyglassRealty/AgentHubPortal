import { useState, useRef } from "react";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ExternalLink, Building2, ChevronLeft, ChevronRight, 
  Bed, Bath, Square, RefreshCw, Loader2 
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
  office: string;
}

function ListingCard({ listing, isDark }: { listing: Listing; isDark: boolean }) {
  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  const statusColors: Record<string, string> = {
    'active': 'bg-green-500',
    'Active': 'bg-green-500',
    'pending': 'bg-yellow-500',
    'Pending': 'bg-yellow-500',
    'closed': 'bg-gray-500',
    'Closed': 'bg-gray-500',
    'active under contract': 'bg-blue-500',
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
      {/* Photo */}
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
        
        {/* Status Badge */}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold uppercase
          ${statusColors[listing.status] || 'bg-gray-500'} text-white`}>
          {listing.status}
        </span>
        
        {/* Photo Count */}
        {listing.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
            1/{listing.photos.length}
          </span>
        )}
      </div>

      {/* Info */}
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

function CompanyListings() {
  const { isDark } = useTheme();
  const [listingFilter, setListingFilter] = useState<'active' | 'pending' | 'closed' | 'all'>('active');
  const scrollRef = useRef<HTMLDivElement>(null);

  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  const { data: listingsData, isLoading, refetch, isFetching } = useQuery<ListingsResponse>({
    queryKey: ['company-listings', listingFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        officeCode: '5220',
        status: listingFilter === 'all' ? '' : listingFilter,
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

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const isRefreshing = isFetching;

  return (
    <Card className={`${cardBg} border ${borderColor}`} data-testid="card-company-listings">
      <CardHeader className="pb-3 px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4923]/10">
              <Building2 className="w-5 h-5 text-[#EF4923]" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Company Listings</CardTitle>
              <p className={`text-xs sm:text-sm ${textSecondary}`}>
                Spyglass Realty Austin Office (5220) • {listings.length} listings
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

        {/* Filter Tabs */}
        <div className={`flex gap-1 sm:gap-2 mt-3 p-1 rounded-lg inline-flex ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
          {(['active', 'pending', 'closed', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setListingFilter(status)}
              className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium capitalize transition-all min-h-[44px] touch-target
                ${listingFilter === status
                  ? 'bg-[#EF4923] text-white'
                  : isDark 
                    ? 'text-gray-400 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
              data-testid={`filter-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#EF4923]" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && listings.length === 0 && (
          <div className={`text-center py-8 rounded-lg border-2 border-dashed ${borderColor}`}>
            <Building2 className={`w-10 h-10 mx-auto mb-2 ${textSecondary}`} />
            <p className={`font-medium ${textPrimary}`}>No {listingFilter} listings</p>
            <p className={`text-sm ${textSecondary}`}>Check back later or try a different filter</p>
          </div>
        )}

        {/* Listings Horizontal Scroll */}
        {!isLoading && listings.length > 0 && (
          <div className="relative">
            {/* Scroll Left Button */}
            <button
              onClick={scrollLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg
                ${isDark ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}
                hidden md:flex items-center justify-center touch-target`}
              data-testid="button-scroll-left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Listings Container */}
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 px-1 scroll-smooth scrollbar-hide"
              style={{ 
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {listings.map((listing) => (
                <div 
                  key={listing.id} 
                  className="flex-shrink-0 w-64 sm:w-72"
                >
                  <ListingCard
                    listing={listing}
                    isDark={isDark}
                  />
                </div>
              ))}
            </div>

            {/* Scroll Right Button */}
            <button
              onClick={scrollRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg
                ${isDark ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white' : 'bg-white hover:bg-gray-50 text-gray-700'}
                hidden md:flex items-center justify-center touch-target`}
              data-testid="button-scroll-right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Scroll Hint Mobile */}
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

        {/* Market Pulse - clickable bars enabled, but no hint since we're already on Properties */}
        <MarketPulse isClickable={false} />

        {/* Company Listings Widget */}
        <CompanyListings />

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
