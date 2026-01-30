import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  TrendingUp, Building2, Home, FileText, Clock, CheckCircle, 
  ChevronLeft, ChevronRight, Bed, Bath, Square, X, RefreshCw
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface MarketPulseData {
  totalProperties: number;
  active: number;
  activeUnderContract: number;
  pending: number;
  closed: number;
  lastUpdatedAt: string;
}

interface CompanyListing {
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
  sqft: number;
  livingArea?: number;
  photos: string[];
  listAgentName?: string;
}

interface CompanyListingsResponse {
  total: number;
  listings: CompanyListing[];
  officeCode: string;
  officeName: string;
  officeAddress: string;
}

export function MarketPulseWithSpyglassListings() {
  const [, setLocation] = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedListing, setSelectedListing] = useState<CompanyListing | null>(null);
  const queryClient = useQueryClient();

  // Fetch Market Pulse data
  const { data: marketData, isLoading: marketLoading, isFetching: marketFetching } = useQuery<MarketPulseData>({
    queryKey: ['/api/market-pulse'],
    queryFn: async () => {
      const res = await fetch('/api/market-pulse');
      if (!res.ok) throw new Error('Failed to fetch market data');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch Spyglass Realty listings (Austin office - uses officeId=ACT1518371)
  const { data: listingsData, isLoading: listingsLoading, isFetching: listingsFetching } = useQuery<CompanyListingsResponse>({
    queryKey: ['company-listings-office', 'austin'],
    queryFn: async () => {
      const response = await fetch('/api/company-listings/office?office=austin&status=Active&limit=20', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch company listings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Combined refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const [marketRes] = await Promise.all([
        fetch('/api/market-pulse?refresh=true'),
      ]);
      if (!marketRes.ok) throw new Error('Failed to refresh market data');
      return marketRes.json();
    },
    onSuccess: (freshData) => {
      queryClient.setQueryData(['/api/market-pulse'], freshData);
      queryClient.invalidateQueries({ queryKey: ['company-listings-office', 'austin'] });
    },
  });

  const isRefreshing = marketFetching || listingsFetching || refreshMutation.isPending;
  const isLoading = marketLoading || listingsLoading;

  const stats = {
    active: marketData?.active || 0,
    activeUnderContract: marketData?.activeUnderContract || 0,
    pending: marketData?.pending || 0,
    closed: marketData?.closed || 0,
    totalActive: (marketData?.active || 0) + (marketData?.activeUnderContract || 0) + (marketData?.pending || 0),
  };

  const spyglassListings = listingsData?.listings || [];
  const maxValue = Math.max(stats.active, stats.activeUnderContract, stats.pending, stats.closed, 1);

  // Navigate to Properties with status filter
  const handleStatusClick = (status: string) => {
    setLocation(`/properties?status=${encodeURIComponent(status)}`);
  };

  // Scroll functions
  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' });

  // Theme classes
  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  // Status config
  const statusConfig = [
    { key: 'Active', label: 'Active', sublabel: 'On Market', value: stats.active, color: '#22C55E', textColor: 'text-green-600', bgColor: isDark ? 'bg-green-900/20' : 'bg-green-50', borderClr: isDark ? 'border-green-800' : 'border-green-200', icon: Home },
    { key: 'Active Under Contract', label: 'Under Contract', sublabel: '', value: stats.activeUnderContract, color: '#3B82F6', textColor: 'text-blue-600', bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-50', borderClr: isDark ? 'border-blue-800' : 'border-blue-200', icon: FileText },
    { key: 'Pending', label: 'Pending', sublabel: 'Closing Soon', value: stats.pending, color: '#EAB308', textColor: 'text-yellow-600', bgColor: isDark ? 'bg-yellow-900/20' : 'bg-yellow-50', borderClr: isDark ? 'border-yellow-800' : 'border-yellow-200', icon: Clock },
    { key: 'Closed', label: 'Closed (30d)', sublabel: 'Sales', value: stats.closed, color: '#9CA3AF', textColor: isDark ? 'text-gray-400' : 'text-gray-600', bgColor: isDark ? 'bg-gray-700/50' : 'bg-gray-50', borderClr: isDark ? 'border-gray-600' : 'border-gray-300', icon: CheckCircle },
  ];

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const formatPriceFull = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className={`w-full ${cardBg} border ${borderColor}`} data-testid="card-market-pulse-spyglass">
      <CardContent className="p-4 md:p-6">
        {/* ======== MARKET PULSE SECTION ======== */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#EF4923]" />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>Market Pulse</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={isRefreshing}
            className="gap-1.5 h-8 px-2 sm:px-3 text-xs sm:text-sm"
            data-testid="button-refresh-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <p className={`text-sm ${textSecondary} mb-4`}>Austin Metro Area</p>

        {marketLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-[#EF4923] border-t-transparent rounded-full animate-spin" />
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
                  {statusConfig.map((item) => {
                    const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                    
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
                        onClick={() => handleStatusClick(item.key)}
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
                Click any bar to view listings
              </p>
            </div>

            {/* Stat Cards - Clickable */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {statusConfig.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleStatusClick(item.key)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-200
                      hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                      ${item.bgColor} ${item.borderClr}
                    `}
                    data-testid={`stat-${item.key.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${item.textColor}`} />
                      <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
                    </div>
                    {item.sublabel && (
                      <p className={`text-[10px] ${textSecondary}`}>{item.sublabel}</p>
                    )}
                    <p className={`text-lg font-bold ${item.textColor} text-right`}>
                      {item.value.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total Inventory */}
            <div className={`text-center mb-6`}>
              <span className={`text-sm ${textSecondary}`}>Total Inventory: </span>
              <span className={`font-bold ${textPrimary}`}>{stats.totalActive.toLocaleString()}</span>
            </div>
          </>
        )}

        {/* ======== DIVIDER ======== */}
        <hr className={`${borderColor} mb-6`} />

        {/* ======== SPYGLASS REALTY LISTINGS SECTION ======== */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#EF4923]" />
            <div>
              <p className={`text-sm font-semibold ${textPrimary}`}>Spyglass Realty Listings</p>
              <p className={`text-[11px] ${textSecondary}`}>
                Office 5220 • {listingsData?.total || spyglassListings.length} Active
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocation('/properties')}
            className="text-xs text-[#EF4923] hover:underline font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
            data-testid="link-view-all-spyglass"
          >
            View All →
          </button>
        </div>

        {/* Loading */}
        {listingsLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#EF4923]"></div>
          </div>
        )}

        {/* Empty State */}
        {!listingsLoading && spyglassListings.length === 0 && (
          <div className={`text-center py-6 rounded-lg border-2 border-dashed ${borderColor}`}>
            <Building2 className={`w-8 h-8 mx-auto mb-2 ${textSecondary}`} />
            <p className={`text-sm font-medium ${textPrimary}`}>No active listings</p>
            <p className={`text-xs ${textSecondary}`}>Check back later</p>
          </div>
        )}

        {/* Listings Horizontal Scroll */}
        {!listingsLoading && spyglassListings.length > 0 && (
          <div className="relative">
            {/* Scroll Buttons */}
            {spyglassListings.length > 3 && (
              <>
                <button
                  onClick={scrollLeft}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-lg min-w-[44px] min-h-[44px]
                    ${isDark ? 'bg-[#333333] hover:bg-[#444444] text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border'}
                    hidden sm:flex items-center justify-center`}
                  data-testid="button-scroll-left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollRight}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-lg min-w-[44px] min-h-[44px]
                    ${isDark ? 'bg-[#333333] hover:bg-[#444444] text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border'}
                    hidden sm:flex items-center justify-center`}
                  data-testid="button-scroll-right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Cards Container */}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto pb-2 scroll-smooth px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {spyglassListings.map((listing) => (
                <SpyglassListingCard
                  key={listing.id}
                  listing={listing}
                  isDark={isDark}
                  onClick={() => setSelectedListing(listing)}
                  formatPrice={formatPrice}
                />
              ))}
            </div>

            {/* Mobile Swipe Hint */}
            <p className={`text-[10px] text-center mt-1 sm:hidden ${textSecondary}`}>
              ← Swipe to see more →
            </p>
          </div>
        )}

        {/* Listing Detail Modal */}
        {selectedListing && (
          <SpyglassListingModal
            listing={selectedListing}
            isDark={isDark}
            onClose={() => setSelectedListing(null)}
            formatPrice={formatPriceFull}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// SPYGLASS LISTING CARD (Compact)
// ============================================

interface SpyglassListingCardProps {
  listing: CompanyListing;
  isDark: boolean;
  onClick: () => void;
  formatPrice: (price: number) => string;
}

function SpyglassListingCard({ listing, isDark, onClick, formatPrice }: SpyglassListingCardProps) {
  const cardBg = isDark ? 'bg-[#333333]' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#444444]' : 'border-gray-200';

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ') || listing.address?.full?.split(',')[0];

  const sqft = listing.sqft || listing.livingArea || 0;

  return (
    <div
      onClick={onClick}
      className={`flex-shrink-0 w-44 sm:w-48 ${cardBg} rounded-lg border ${borderColor} overflow-hidden cursor-pointer 
        transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
      data-testid={`spyglass-listing-card-${listing.id}`}
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-[#222222]">
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={streetAddress}
            className="w-full h-full object-cover"
            loading="lazy"
            data-testid={`spyglass-img-${listing.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
        )}
        
        {/* Days on Market */}
        {listing.daysOnMarket > 0 && (
          <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium
            ${isDark ? 'bg-gray-900/80' : 'bg-white/90'} ${textPrimary}`}>
            {listing.daysOnMarket}d
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className={`text-sm font-bold text-[#EF4923]`} data-testid={`spyglass-price-${listing.id}`}>
          {formatPrice(listing.listPrice)}
        </p>
        <p className={`text-[10px] ${textPrimary} truncate`} data-testid={`spyglass-address-${listing.id}`}>
          {streetAddress}
        </p>
        <p className={`text-[9px] ${textSecondary} truncate mb-1`}>
          {listing.address?.city}, {listing.address?.state || 'TX'}
        </p>
        <div className="flex items-center gap-2 text-[9px]">
          {listing.beds > 0 && (
            <span className={`flex items-center gap-0.5 ${textSecondary}`}>
              <Bed className="w-3 h-3" /> {listing.beds}
            </span>
          )}
          {listing.baths > 0 && (
            <span className={`flex items-center gap-0.5 ${textSecondary}`}>
              <Bath className="w-3 h-3" /> {listing.baths}
            </span>
          )}
          {sqft > 0 && (
            <span className={`flex items-center gap-0.5 ${textSecondary}`}>
              <Square className="w-3 h-3" /> {sqft.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SPYGLASS LISTING MODAL
// ============================================

interface SpyglassListingModalProps {
  listing: CompanyListing;
  isDark: boolean;
  onClose: () => void;
  formatPrice: (price: number) => string;
}

function SpyglassListingModal({ listing, isDark, onClose, formatPrice }: SpyglassListingModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const modalBg = isDark ? 'bg-[#222222]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#333333]' : 'border-gray-200';

  const photos = listing.photos || [];
  const sqft = listing.sqft || listing.livingArea || 0;
  const pricePerSqft = sqft ? Math.round(listing.listPrice / sqft) : null;

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Photo navigation
  const nextPhoto = () => setCurrentPhotoIndex((p) => (p + 1) % photos.length);
  const prevPhoto = () => setCurrentPhotoIndex((p) => (p - 1 + photos.length) % photos.length);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && photos.length > 1) prevPhoto();
      if (e.key === 'ArrowRight' && photos.length > 1) nextPhoto();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photos.length]);

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ') || listing.address?.full?.split(',')[0];

  const cityStateZip = `${listing.address?.city || ''}, ${listing.address?.state || 'TX'} ${listing.address?.postalCode || ''}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      data-testid="spyglass-modal-overlay"
    >
      <div
        className={`${modalBg} rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        data-testid="spyglass-modal-content"
      >
        {/* Header with close button */}
        <div className={`sticky top-0 z-10 ${modalBg} p-4 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-green-500 text-white">
              {listing.status}
            </span>
            <span className={`text-sm ${textSecondary}`}>MLS# {listing.mlsNumber}</span>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors
              ${isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
            data-testid="spyglass-button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
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
                      data-testid="spyglass-button-prev-photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      data-testid="spyglass-button-next-photo"
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
              <p className={`text-2xl font-bold ${textPrimary}`} data-testid="spyglass-modal-price">
                {formatPrice(listing.listPrice)}
              </p>
              <p className={`text-lg ${textPrimary} mt-1`} data-testid="spyglass-modal-address">
                {streetAddress}
              </p>
              <p className={`text-sm ${textSecondary}`}>
                {cityStateZip}
              </p>
            </div>

            {/* Key Stats */}
            <div className={`grid grid-cols-4 gap-3 p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
              <div className="text-center">
                <p className={`text-lg font-bold ${textPrimary}`}>{listing.beds}</p>
                <p className={`text-xs ${textSecondary}`}>Beds</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${textPrimary}`}>{listing.baths}</p>
                <p className={`text-xs ${textSecondary}`}>Baths</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${textPrimary}`}>{sqft.toLocaleString()}</p>
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
                <Clock className={`w-4 h-4 ${textSecondary}`} />
                <div>
                  <p className={`text-xs ${textSecondary}`}>Days on Market</p>
                  <p className={`text-sm font-medium ${textPrimary}`}>{listing.daysOnMarket} days</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${textSecondary}`} />
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
