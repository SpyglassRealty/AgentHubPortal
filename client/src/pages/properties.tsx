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
  Bed, Bath, Square, RefreshCw, Loader2, ChevronDown, TrendingUp,
  Home, FileCheck, Clock, CheckCircle2, X, MapPin, Calendar
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";

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
    streetSuffix?: string;
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
  listAgentName?: string;
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
];

// Status configuration for Market Pulse
const STATUS_CONFIG = [
  { key: 'Active', label: 'Active', sublabel: 'On Market', color: '#22C55E', textColor: 'text-green-600', bgLight: 'bg-green-50', bgDark: 'bg-green-900/20', borderColor: 'border-green-200', icon: Home },
  { key: 'Active Under Contract', label: 'Under Contract', sublabel: '', color: '#3B82F6', textColor: 'text-blue-600', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20', borderColor: 'border-blue-200', icon: FileCheck },
  { key: 'Pending', label: 'Pending', sublabel: 'Closing Soon', color: '#EAB308', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', bgDark: 'bg-yellow-900/20', borderColor: 'border-yellow-200', icon: Clock },
  { key: 'Closed', label: 'Closed (30d)', sublabel: 'Sales', color: '#9CA3AF', textColor: 'text-gray-600', bgLight: 'bg-gray-50', bgDark: 'bg-gray-700/50', borderColor: 'border-gray-300', icon: CheckCircle2 },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

// Listing Card Component
function ListingCard({ 
  listing, 
  isDark,
  onClick 
}: { 
  listing: Listing; 
  isDark: boolean;
  onClick: () => void;
}) {
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

  const photoUrl = listing.photos?.[0] || null;

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ');

  const cityStateZip = `${listing.address?.city || ''}, ${listing.address?.state || 'TX'} ${listing.address?.postalCode || ''}`;

  return (
    <div
      onClick={onClick}
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
            data-testid={`img-listing-${listing.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-gray-500" />
          </div>
        )}
        
        <span 
          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold uppercase
            ${statusColors[listing.status] || 'bg-gray-500'} text-white`}
          data-testid={`badge-status-${listing.id}`}
        >
          {listing.status === 'Active Under Contract' ? 'Under Contract' : listing.status}
        </span>
        
        {listing.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
            1/{listing.photos.length}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className={`text-lg font-bold ${textPrimary}`} data-testid={`text-price-${listing.id}`}>
          {formatPrice(listing.listPrice)}
        </p>
        <p className={`text-sm ${textPrimary} truncate`} data-testid={`text-address-${listing.id}`}>
          {streetAddress || listing.address?.full}
        </p>
        <p className={`text-xs ${textSecondary} truncate mb-2`}>
          {cityStateZip}
        </p>
        <div className="flex items-center gap-3 text-sm">
          {listing.beds > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`} data-testid={`text-beds-${listing.id}`}>
              <Bed className="w-4 h-4" /> {listing.beds}
            </span>
          )}
          {listing.baths > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`} data-testid={`text-baths-${listing.id}`}>
              <Bath className="w-4 h-4" /> {listing.baths}
            </span>
          )}
          {listing.livingArea > 0 && (
            <span className={`flex items-center gap-1 ${textSecondary}`} data-testid={`text-sqft-${listing.id}`}>
              <Square className="w-4 h-4" /> {listing.livingArea?.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Listing Detail Modal Component
function ListingDetailModal({ 
  listing, 
  isDark, 
  onClose 
}: { 
  listing: Listing; 
  isDark: boolean; 
  onClose: () => void;
}) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const modalBg = isDark ? 'bg-[#222222]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  const photos = listing.photos || [];
  const sqft = listing.livingArea || 0;
  const pricePerSqft = sqft ? Math.round(listing.listPrice / sqft) : null;
  const daysOnMarket = listing.daysOnMarket || 0;

  const statusColors: Record<string, string> = {
    'Active': 'bg-green-500',
    'Pending': 'bg-yellow-500',
    'Closed': 'bg-gray-500',
    'Active Under Contract': 'bg-blue-500',
  };

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ');

  const cityStateZip = `${listing.address?.city || ''}, ${listing.address?.state || 'TX'} ${listing.address?.postalCode || ''}`;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Photo navigation
  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      data-testid="modal-listing-detail"
    >
      <div 
        className={`${modalBg} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className={`sticky top-0 z-10 ${modalBg} p-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
              ${statusColors[listing.status] || 'bg-gray-500'} text-white`}>
              {listing.status === 'Active Under Contract' ? 'Under Contract' : listing.status}
            </span>
            <span className={`text-sm ${textSecondary}`}>MLS# {listing.mlsNumber}</span>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors
              ${isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="relative aspect-[16/10] bg-[#222222]">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[currentPhotoIndex]}
                alt={`${streetAddress} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    data-testid="button-prev-photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    data-testid="button-next-photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-gray-500" />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="p-4 space-y-4">
          {/* Price and Address */}
          <div>
            <p className={`text-2xl font-bold ${textPrimary}`} data-testid="modal-text-price">
              {formatPrice(listing.listPrice)}
            </p>
            <p className={`text-lg ${textPrimary} mt-1`} data-testid="modal-text-address">
              {streetAddress || listing.address?.full}
            </p>
            <p className={`text-sm ${textSecondary}`}>
              {cityStateZip}
            </p>
          </div>

          {/* Key Stats */}
          <div className={`grid grid-cols-4 gap-3 p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`} data-testid="modal-stats-grid">
            <div className="text-center">
              <p className={`text-lg font-bold ${textPrimary}`} data-testid="modal-text-beds">{listing.beds}</p>
              <p className={`text-xs ${textSecondary}`}>Beds</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${textPrimary}`} data-testid="modal-text-baths">{listing.baths}</p>
              <p className={`text-xs ${textSecondary}`}>Baths</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${textPrimary}`} data-testid="modal-text-sqft">{sqft.toLocaleString()}</p>
              <p className={`text-xs ${textSecondary}`}>Sq Ft</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${textPrimary}`}>{pricePerSqft ? `$${pricePerSqft}` : '-'}</p>
              <p className={`text-xs ${textSecondary}`}>$/Sq Ft</p>
            </div>
          </div>

          {/* Additional Info */}
          <div className={`grid grid-cols-2 gap-4`}>
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${textSecondary}`} />
              <div>
                <p className={`text-xs ${textSecondary}`}>Days on Market</p>
                <p className={`text-sm font-medium ${textPrimary}`}>{daysOnMarket} days</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className={`w-4 h-4 ${textSecondary}`} />
              <div>
                <p className={`text-xs ${textSecondary}`}>Listed</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {listing.listDate ? format(new Date(listing.listDate), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Agent Info */}
          {listing.listAgentName && (
            <div className={`p-3 rounded-lg border ${borderColor}`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Listing Agent</p>
              <p className={`text-sm font-medium ${textPrimary}`}>{listing.listAgentName}</p>
              {listing.listOfficeName && (
                <p className={`text-xs ${textSecondary}`}>{listing.listOfficeName}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Combined Market Pulse + Listings Component
function MarketPulseWithListings() {
  const { isDark } = useTheme();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Parse URL search params
  const urlParams = new URLSearchParams(searchString);
  const urlStatus = urlParams.get('status') || 'Active';
  
  // State
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [sortBy, setSortBy] = useState<string>('listDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

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

  // Fetch Listings data
  const { 
    data: listingsData, 
    isLoading: listingsLoading, 
    refetch: refetchListings,
    isFetching: listingsFetching 
  } = useQuery<ListingsResponse>({
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
  const isRefreshing = marketFetching || listingsFetching;

  // Combined refresh function
  const handleRefresh = async () => {
    await Promise.all([refetchMarket(), refetchListings()]);
  };

  // Update URL when filter changes
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    if (status === 'all' || status === 'Active') {
      setLocation('/properties');
    } else {
      setLocation(`/properties?status=${encodeURIComponent(status)}`);
    }
  };

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

              {/* Total Active */}
              <div className="mb-6 text-center">
                <span className={textSecondary}>Total Active: </span>
                <span className={`font-bold ${textPrimary}`}>
                  {(marketData?.totalProperties || 0).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* Divider */}
          <hr className={`${borderColor} mb-6`} />

          {/* Austin Metro Listings Section */}
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#EF4923]" />
            <div>
              <h2 className={`text-lg font-semibold ${textPrimary}`}>Austin Metro Listings</h2>
              <p className={`text-sm ${textSecondary}`}>
                {total.toLocaleString()} {statusFilter === 'all' ? 'active' : statusFilter.toLowerCase()} listings
              </p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            {/* Status Filter Tabs */}
            <div className={`flex gap-1 p-1 rounded-lg overflow-x-auto ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
              {RESO_STATUSES.map((status) => (
                <button
                  key={status.key}
                  onClick={() => handleStatusChange(status.key)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all min-h-[44px]
                    ${statusFilter === status.key
                      ? 'bg-[#EF4923] text-white'
                      : isDark 
                        ? 'text-gray-400 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-h-[44px] text-sm
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
                        className={`w-full text-left px-4 py-3 text-sm min-h-[44px] transition-colors
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

          {/* Loading State */}
          {listingsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#EF4923]" />
            </div>
          )}

          {/* Empty State */}
          {!listingsLoading && listings.length === 0 && (
            <div className={`text-center py-8 rounded-lg border-2 border-dashed ${borderColor}`}>
              <Building2 className={`w-10 h-10 mx-auto mb-2 ${textSecondary}`} />
              <p className={`font-medium ${textPrimary}`}>No {statusFilter === 'all' ? 'active' : statusFilter.toLowerCase()} listings found</p>
              <p className={`text-sm ${textSecondary}`}>Try adjusting your filters</p>
            </div>
          )}

          {/* Listings Horizontal Scroll */}
          {!listingsLoading && listings.length > 0 && (
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
                    <ListingCard 
                      listing={listing} 
                      isDark={isDark} 
                      onClick={() => setSelectedListing(listing)}
                    />
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

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isDark={isDark}
          onClose={() => setSelectedListing(null)}
        />
      )}
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
