import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, Search, X, ChevronLeft, ChevronRight, ChevronDown,
  Grid3X3, List, Table, Bed, Bath, Square, Calendar, SlidersHorizontal,
  RotateCcw, MapPin, ExternalLink
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type ViewMode = 'grid' | 'list' | 'table';

interface Filters {
  status: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  minSqft: string;
  maxSqft: string;
  city: string;
  propertyType: string;
  maxDom: string;
  search: string;
  minSoldDate: string;
}

const DEFAULT_FILTERS: Filters = {
  status: 'Active',
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  maxBeds: '',
  minBaths: '',
  minSqft: '',
  maxSqft: '',
  city: '',
  propertyType: '',
  maxDom: '',
  search: '',
  minSoldDate: '',
};

interface AustinMetroListingsProps {
  initialStatus?: string;
  controlledStatus?: string;
  onStatusChange?: (status: string) => void;
  controlledMinSoldDate?: string;
}

export function AustinMetroListings({ initialStatus = 'Active', controlledStatus, onStatusChange, controlledMinSoldDate }: AustinMetroListingsProps) {
  const { isDark } = useTheme();
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    status: controlledStatus || initialStatus,
    minSoldDate: controlledMinSoldDate || '',
  });

  useEffect(() => {
    if (controlledStatus && controlledStatus !== filters.status) {
      setFilters(prev => ({ ...prev, status: controlledStatus }));
      setPage(1);
    }
  }, [controlledStatus]);

  useEffect(() => {
    if (controlledMinSoldDate !== undefined && controlledMinSoldDate !== filters.minSoldDate) {
      setFilters(prev => ({ ...prev, minSoldDate: controlledMinSoldDate }));
      setPage(1);
    }
  }, [controlledMinSoldDate]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  const [sortBy, setSortBy] = useState('listDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  const [selectedListing, setSelectedListing] = useState<any>(null);

  const buildQueryParams = () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: itemsPerPage.toString(),
      sortBy,
      sortOrder,
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });

    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['austin-metro-listings', page, itemsPerPage, filters, sortBy, sortOrder],
    queryFn: async () => {
      const response = await fetch(`/api/company-listings?${buildQueryParams()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const listings = data?.listings || [];
  const pagination = data?.pagination || {
    total: 0,
    totalPages: 0,
    startIndex: 0,
    endIndex: 0,
    hasNextPage: false,
    hasPrevPage: false,
  };

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, sortOrder, itemsPerPage]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'status' && onStatusChange) {
      onStatusChange(value);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search', searchInput);
  };

  const resetFilters = () => {
    const resetStatus = controlledStatus || DEFAULT_FILTERS.status;
    setFilters({ ...DEFAULT_FILTERS, status: resetStatus });
    setSearchInput('');
    setPage(1);
    if (onStatusChange && resetStatus !== controlledStatus) {
      onStatusChange(resetStatus);
    }
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value && value !== DEFAULT_FILTERS[key as keyof Filters]
  );

  const cardBg = isDark ? 'bg-[#2a2a2a]' : 'bg-white';
  const inputBg = isDark ? 'bg-[#333333]' : 'bg-gray-50';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#3a3a3a]' : 'border-gray-200';

  const sortOptions = [
    { label: 'Newest Listed', sortBy: 'listDate', sortOrder: 'desc' },
    { label: 'Oldest Listed', sortBy: 'listDate', sortOrder: 'asc' },
    { label: 'Price: High to Low', sortBy: 'listPrice', sortOrder: 'desc' },
    { label: 'Price: Low to High', sortBy: 'listPrice', sortOrder: 'asc' },
    { label: 'Beds: Most', sortBy: 'beds', sortOrder: 'desc' },
    { label: 'Beds: Least', sortBy: 'beds', sortOrder: 'asc' },
    { label: 'SqFt: Largest', sortBy: 'livingArea', sortOrder: 'desc' },
    { label: 'SqFt: Smallest', sortBy: 'livingArea', sortOrder: 'asc' },
    { label: 'Days on Market: Most', sortBy: 'daysOnMarket', sortOrder: 'desc' },
    { label: 'Days on Market: Least', sortBy: 'daysOnMarket', sortOrder: 'asc' },
  ];

  const currentSortLabel = sortOptions.find(
    opt => opt.sortBy === sortBy && opt.sortOrder === sortOrder
  )?.label || 'Newest Listed';

  const statusTabs = [
    { key: 'Active', label: 'Active' },
    { key: 'Active Under Contract', label: 'Under Contract' },
    { key: 'Pending', label: 'Pending' },
    { key: 'Closed', label: 'Closed' },
    { key: 'all', label: 'All' },
  ];

  const austinCities = [
    'Austin', 'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville',
    'Leander', 'Kyle', 'Buda', 'Dripping Springs', 'Lakeway', 'Bee Cave',
    'Manor', 'Hutto', 'Taylor', 'Liberty Hill', 'Bastrop', 'Elgin',
    'San Marcos', 'New Braunfels', 'Wimberley'
  ];

  const propertyTypes = [
    'Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={`${cardBg} rounded-xl border ${borderColor} p-4 md:p-6`} data-testid="austin-metro-listings">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#EF4923]" />
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Spyglass Realty Listings
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              {pagination.total.toLocaleString()} {filters.status !== 'all' ? filters.status.toLowerCase() : ''} listings • Office 5220
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          data-testid="button-toggle-filters"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]
            ${showFilters 
              ? 'bg-[#EF4923] text-white' 
              : isDark ? 'bg-[#333333] text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={`p-4 rounded-lg border ${borderColor} ${isDark ? 'bg-[#222222]' : 'bg-gray-50'} mb-4`} data-testid="filters-panel">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search address, MLS#, or keyword..."
                data-testid="input-search"
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${borderColor} ${inputBg} ${textPrimary}
                  placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EF4923]/50 min-h-[44px]`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); handleFilterChange('search', ''); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary} hover:text-white p-1`}
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Filter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {/* Price Min */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Min Price</label>
              <select
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                data-testid="select-min-price"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">No Min</option>
                <option value="100000">$100K</option>
                <option value="200000">$200K</option>
                <option value="300000">$300K</option>
                <option value="400000">$400K</option>
                <option value="500000">$500K</option>
                <option value="750000">$750K</option>
                <option value="1000000">$1M</option>
                <option value="1500000">$1.5M</option>
                <option value="2000000">$2M</option>
                <option value="3000000">$3M</option>
                <option value="5000000">$5M</option>
              </select>
            </div>

            {/* Price Max */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Max Price</label>
              <select
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                data-testid="select-max-price"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">No Max</option>
                <option value="200000">$200K</option>
                <option value="300000">$300K</option>
                <option value="400000">$400K</option>
                <option value="500000">$500K</option>
                <option value="750000">$750K</option>
                <option value="1000000">$1M</option>
                <option value="1500000">$1.5M</option>
                <option value="2000000">$2M</option>
                <option value="3000000">$3M</option>
                <option value="5000000">$5M</option>
                <option value="10000000">$10M+</option>
              </select>
            </div>

            {/* Beds */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Beds</label>
              <select
                value={filters.minBeds}
                onChange={(e) => handleFilterChange('minBeds', e.target.value)}
                data-testid="select-beds"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>

            {/* Baths */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Baths</label>
              <select
                value={filters.minBaths}
                onChange={(e) => handleFilterChange('minBaths', e.target.value)}
                data-testid="select-baths"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>City</label>
              <select
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                data-testid="select-city"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">All Cities</option>
                {austinCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Days on Market */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Days on Market</label>
              <select
                value={filters.maxDom}
                onChange={(e) => handleFilterChange('maxDom', e.target.value)}
                data-testid="select-dom"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">Any</option>
                <option value="1">1 day</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

          {/* Second Row - More Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {/* Min SqFt */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Min SqFt</label>
              <select
                value={filters.minSqft}
                onChange={(e) => handleFilterChange('minSqft', e.target.value)}
                data-testid="select-min-sqft"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">No Min</option>
                <option value="500">500</option>
                <option value="1000">1,000</option>
                <option value="1500">1,500</option>
                <option value="2000">2,000</option>
                <option value="2500">2,500</option>
                <option value="3000">3,000</option>
                <option value="4000">4,000</option>
                <option value="5000">5,000+</option>
              </select>
            </div>

            {/* Max SqFt */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Max SqFt</label>
              <select
                value={filters.maxSqft}
                onChange={(e) => handleFilterChange('maxSqft', e.target.value)}
                data-testid="select-max-sqft"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">No Max</option>
                <option value="1000">1,000</option>
                <option value="1500">1,500</option>
                <option value="2000">2,000</option>
                <option value="2500">2,500</option>
                <option value="3000">3,000</option>
                <option value="4000">4,000</option>
                <option value="5000">5,000</option>
                <option value="10000">10,000+</option>
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                data-testid="select-property-type"
                className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${inputBg} ${textPrimary} text-sm min-h-[44px]`}
              >
                <option value="">All Types</option>
                {propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                data-testid="button-reset-filters"
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]
                  ${hasActiveFilters 
                    ? isDark ? 'bg-[#333333] text-gray-300 hover:bg-[#444444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : isDark ? 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className={`flex gap-1 p-1 rounded-lg overflow-x-auto ${isDark ? 'bg-[#333333]' : 'bg-gray-200'}`}>
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange('status', tab.key)}
                data-testid={`tab-status-${tab.key.toLowerCase().replace(/\s+/g, '-')}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all min-h-[40px]
                  ${filters.status === tab.key
                    ? 'bg-[#EF4923] text-white'
                    : isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* Results Count */}
        <p className={`text-sm ${textSecondary}`} data-testid="text-results-count">
          Showing <span className={`font-medium ${textPrimary}`}>{pagination.startIndex}-{pagination.endIndex}</span> of{' '}
          <span className={`font-medium ${textPrimary}`}>{pagination.total.toLocaleString()}</span> results
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
              className={`p-2 rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${viewMode === 'grid' ? 'bg-[#EF4923] text-white' : textSecondary}`}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
              className={`p-2 rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${viewMode === 'list' ? 'bg-[#EF4923] text-white' : textSecondary}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              data-testid="button-view-table"
              className={`p-2 rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${viewMode === 'table' ? 'bg-[#EF4923] text-white' : textSecondary}`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              data-testid="button-sort-dropdown"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${borderColor} min-h-[44px]
                ${isDark ? 'bg-[#333333] text-white' : 'bg-white text-gray-700'}`}
            >
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <span className="sm:hidden">Sort</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                <div className={`absolute right-0 top-full mt-1 z-50 w-48 rounded-lg shadow-lg border ${cardBg} ${borderColor}`}>
                  {sortOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        setSortBy(option.sortBy);
                        setSortOrder(option.sortOrder as 'asc' | 'desc');
                        setShowSortDropdown(false);
                      }}
                      data-testid={`sort-option-${option.label.toLowerCase().replace(/[:\s]+/g, '-')}`}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg
                        ${sortBy === option.sortBy && sortOrder === option.sortOrder
                          ? 'bg-[#EF4923] text-white'
                          : isDark ? 'text-gray-300 hover:bg-[#333333]' : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Items Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
            data-testid="select-items-per-page"
            className={`px-3 py-2 rounded-lg text-sm border ${borderColor} ${inputBg} ${textPrimary} min-h-[44px]`}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EF4923]"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && listings.length === 0 && (
        <div className={`text-center py-12 rounded-lg border-2 border-dashed ${borderColor}`} data-testid="empty-state">
          <Building2 className={`w-12 h-12 mx-auto mb-3 ${textSecondary}`} />
          <p className={`font-medium ${textPrimary} mb-1`}>No listings found</p>
          <p className={`text-sm ${textSecondary} mb-4`}>Try adjusting your filters</p>
          <button
            onClick={resetFilters}
            data-testid="button-reset-empty"
            className="px-4 py-2 bg-[#EF4923] text-white rounded-lg text-sm font-medium hover:bg-[#d63d1a] min-h-[44px]"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Grid View */}
      {!isLoading && listings.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="listings-grid">
          {listings.map((listing: any) => (
            <GridListingCard
              key={listing.id}
              listing={listing}
              isDark={isDark}
              onClick={() => setSelectedListing(listing)}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && listings.length > 0 && viewMode === 'list' && (
        <div className="space-y-3" data-testid="listings-list">
          {listings.map((listing: any) => (
            <ListListingCard
              key={listing.id}
              listing={listing}
              isDark={isDark}
              onClick={() => setSelectedListing(listing)}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && listings.length > 0 && viewMode === 'table' && (
        <div className="overflow-x-auto" data-testid="listings-table">
          <table className={`w-full text-sm ${textPrimary}`}>
            <thead className={`${isDark ? 'bg-[#333333]' : 'bg-gray-100'}`}>
              <tr>
                <th className="text-left p-3 font-medium">Photo</th>
                <th className="text-left p-3 font-medium">Address</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-center p-3 font-medium">Beds</th>
                <th className="text-center p-3 font-medium">Baths</th>
                <th className="text-right p-3 font-medium">SqFt</th>
                <th className="text-center p-3 font-medium">DOM</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing: any, index: number) => (
                <tr 
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  data-testid={`table-row-${listing.id}`}
                  className={`cursor-pointer transition-colors
                    ${isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}
                    ${index % 2 === 0 ? '' : isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}
                >
                  <td className="p-2">
                    <div className="w-16 h-12 rounded overflow-hidden bg-gray-800">
                      {listing.photos?.[0] ? (
                        <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium truncate max-w-[200px]">
                      {[listing.address?.streetNumber, listing.address?.streetName, listing.address?.streetSuffix].filter(Boolean).join(' ')}
                    </p>
                    <p className={`text-xs ${textSecondary}`}>
                      {listing.address?.city}, {listing.address?.state} {listing.address?.postalCode}
                    </p>
                  </td>
                  <td className="p-3 text-right font-medium">{formatPrice(listing.listPrice)}</td>
                  <td className="p-3 text-center">{listing.beds}</td>
                  <td className="p-3 text-center">{listing.baths}</td>
                  <td className="p-3 text-right">{(listing.livingArea || listing.sqft)?.toLocaleString() || '-'}</td>
                  <td className="p-3 text-center">{listing.daysOnMarket}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                      ${listing.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 
                        listing.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' : 
                        listing.status === 'Closed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                      {listing.status === 'Active Under Contract' ? 'Under Contract' : listing.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && listings.length > 0 && pagination.totalPages > 1 && (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t ${borderColor}`} data-testid="pagination">
          <p className={`text-sm ${textSecondary}`}>
            Page {page} of {pagination.totalPages.toLocaleString()}
          </p>

          <div className="flex items-center gap-2">
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              data-testid="button-prev-page"
              className={`p-2 rounded-lg border ${borderColor} min-w-[44px] min-h-[44px] flex items-center justify-center
                ${pagination.hasPrevPage 
                  ? isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'
                  : 'opacity-50 cursor-not-allowed'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {/* First page */}
              {page > 3 && (
                <>
                  <button
                    onClick={() => setPage(1)}
                    data-testid="button-page-1"
                    className={`px-3 py-2 rounded-lg text-sm min-w-[40px] min-h-[40px] ${page === 1 ? 'bg-[#EF4923] text-white' : isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
                  >
                    1
                  </button>
                  {page > 4 && <span className={textSecondary}>...</span>}
                </>
              )}

              {/* Nearby pages */}
              {Array.from({ length: 5 }, (_, i) => page - 2 + i)
                .filter(p => p > 0 && p <= pagination.totalPages)
                .map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    data-testid={`button-page-${p}`}
                    className={`px-3 py-2 rounded-lg text-sm min-w-[40px] min-h-[40px]
                      ${p === page 
                        ? 'bg-[#EF4923] text-white' 
                        : isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}

              {/* Last page */}
              {page < pagination.totalPages - 2 && (
                <>
                  {page < pagination.totalPages - 3 && <span className={textSecondary}>...</span>}
                  <button
                    onClick={() => setPage(pagination.totalPages)}
                    data-testid={`button-page-${pagination.totalPages}`}
                    className={`px-3 py-2 rounded-lg text-sm min-w-[40px] min-h-[40px]
                      ${page === pagination.totalPages ? 'bg-[#EF4923] text-white' : isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
              data-testid="button-next-page"
              className={`p-2 rounded-lg border ${borderColor} min-w-[44px] min-h-[44px] flex items-center justify-center
                ${pagination.hasNextPage 
                  ? isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'
                  : 'opacity-50 cursor-not-allowed'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isDark={isDark}
          onClose={() => setSelectedListing(null)}
          formatPrice={formatPrice}
        />
      )}
    </div>
  );
}

function GridListingCard({ listing, isDark, onClick, formatPrice }: any) {
  const cardBg = isDark ? 'bg-[#333333]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#3a3a3a]' : 'border-gray-200';

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ');

  const statusColors: Record<string, string> = {
    'Active': 'bg-green-500',
    'Active Under Contract': 'bg-blue-500',
    'Pending': 'bg-yellow-500',
    'Closed': 'bg-gray-500',
  };

  return (
    <div
      onClick={onClick}
      data-testid={`listing-card-${listing.id}`}
      className={`${cardBg} rounded-xl border ${borderColor} overflow-hidden cursor-pointer 
        transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="relative aspect-[4/3] bg-gray-800">
        {listing.photos?.[0] ? (
          <img src={listing.photos[0]} alt={streetAddress} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-600" />
          </div>
        )}
        
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white
          ${statusColors[listing.status] || 'bg-gray-500'}`}>
          {listing.status === 'Active Under Contract' ? 'UNDER CONTRACT' : listing.status?.toUpperCase()}
        </span>
        
        {listing.photos?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
            1/{listing.photos.length}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className={`text-lg font-bold ${textPrimary}`}>{formatPrice(listing.listPrice)}</p>
        <p className={`text-sm ${textPrimary} truncate`}>{streetAddress}</p>
        <p className={`text-xs ${textSecondary} truncate mb-2`}>
          {listing.address?.city}, {listing.address?.state} {listing.address?.postalCode}
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Bed className="w-4 h-4" /> {listing.beds}
          </span>
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Bath className="w-4 h-4" /> {listing.baths}
          </span>
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Square className="w-4 h-4" /> {(listing.livingArea || listing.sqft)?.toLocaleString() || '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ListListingCard({ listing, isDark, onClick, formatPrice }: any) {
  const cardBg = isDark ? 'bg-[#333333]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#3a3a3a]' : 'border-gray-200';

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      data-testid={`listing-list-${listing.id}`}
      className={`${cardBg} rounded-xl border ${borderColor} p-3 flex gap-4 cursor-pointer 
        transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]`}
    >
      <div className="w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
        {listing.photos?.[0] ? (
          <img src={listing.photos[0]} alt={streetAddress} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-lg font-bold ${textPrimary}`}>{formatPrice(listing.listPrice)}</p>
            <p className={`text-sm ${textPrimary} truncate`}>{streetAddress}</p>
            <p className={`text-xs ${textSecondary}`}>
              {listing.address?.city}, {listing.address?.state} {listing.address?.postalCode}
            </p>
          </div>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium
            ${listing.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 
              listing.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' : 
              listing.status === 'Closed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>
            {listing.status === 'Active Under Contract' ? 'Under Contract' : listing.status}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Bed className="w-4 h-4" /> {listing.beds} Beds
          </span>
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Bath className="w-4 h-4" /> {listing.baths} Baths
          </span>
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Square className="w-4 h-4" /> {(listing.livingArea || listing.sqft)?.toLocaleString() || '-'} sqft
          </span>
          <span className={`flex items-center gap-1 ${textSecondary}`}>
            <Calendar className="w-4 h-4" /> {listing.daysOnMarket} days
          </span>
        </div>

        <p className={`text-xs ${textSecondary} mt-1`}>MLS# {listing.mlsNumber}</p>
      </div>
    </div>
  );
}

// Interactive Mapbox Map Component
function PropertyMapPreview({ latitude, longitude, isDark }: { latitude: number; longitude: number; isDark: boolean; }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !latitude || !longitude) return;

    // Fetch Mapbox token
    fetch('/api/mapbox-token')
      .then(res => res.json())
      .then(data => {
        if (!data.token) return;
        
        mapboxgl.accessToken = data.token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 15,
          interactive: false,
          attributionControl: false,
        });

        // Create custom Spyglass marker
        const marker = document.createElement('div');
        marker.style.width = '24px';
        marker.style.height = '24px';
        marker.style.borderRadius = '50%';
        marker.style.backgroundColor = '#EF4923';
        marker.style.border = '3px solid white';
        marker.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        new mapboxgl.Marker({ element: marker })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      })
      .catch(err => console.error('Failed to load Mapbox token:', err));

    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude, isDark]);

  return <div ref={mapContainer} className="w-full h-48 rounded-lg overflow-hidden" />;
}

// Status badge color helper
const getStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s.includes('active') && !s.includes('under')) return 'bg-green-500';
  if (s.includes('active under') || s.includes('under contract')) return 'bg-orange-500';
  if (s.includes('closed') || s.includes('sold')) return 'bg-red-500';
  if (s.includes('pending')) return 'bg-gray-500';
  return 'bg-gray-400';
};

// Price per sqft helper
const calculatePricePerSqft = (price: number, sqft: number) => {
  if (!price || !sqft) return null;
  return Math.round(price / sqft);
};

// Standard date formatter - RESO compliant MM/DD/YYYY format
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

function ListingDetailModal({ listing, isDark, onClose, formatPrice }: any) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Debug logging for data pipeline
  console.log('[Properties Modal] Full listing data:', {
    mlsNumber: listing.mlsNumber,
    type: listing.type, // Should be "Sale" (transaction)
    propertyType: listing.propertyType, // Should be "Single Family Residence" etc
    class: listing.class,
    hasDescription: !!listing.description,
    hasDetailsDescription: !!(listing.details?.description),
    hasRemarks: !!listing.remarks,
    descriptionSource: listing.details?.description ? 'details.description' : listing.description ? 'description' : listing.remarks ? 'remarks' : 'NONE',
    hasMapCoords: !!(listing.map?.latitude),
    latitude: listing.map?.latitude || listing.latitude,
    longitude: listing.map?.longitude || listing.longitude,
    hasOriginalPrice: !!listing.originalPrice,
    hasListingDate: !!listing.listingDate,
    hasYearBuilt: !!(listing.details?.yearBuilt || listing.yearBuilt),
    hasSqft: !!listing.livingArea,
  });
  
  const cardBg = isDark ? 'bg-[#222222]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-[#3a3a3a]' : 'border-gray-200';

  const streetAddress = [
    listing.address?.streetNumber,
    listing.address?.streetName,
    listing.address?.streetSuffix
  ].filter(Boolean).join(' ');

  const photos = listing.photos || [];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      data-testid="modal-listing-detail"
    >
      <div 
        className={`${cardBg} rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Full Address with MLS# */}
        <div className={`flex items-start justify-between p-4 border-b ${borderColor}`}>
          <div className="flex-1">
            <div className="flex items-baseline gap-4">
              <h3 className={`text-2xl font-bold ${textPrimary}`}>{formatPrice(listing.listPrice)}</h3>
              {calculatePricePerSqft(listing.listPrice, listing.livingArea) && (
                <span className={`text-lg font-semibold ${textPrimary}`}>
                  ${calculatePricePerSqft(listing.listPrice, listing.livingArea)}/sqft
                </span>
              )}
            </div>
            <h4 className={`text-lg font-medium ${textPrimary} mb-1`}>
              {listing.address?.full || `${streetAddress}, ${listing.address?.city}`}
            </h4>
            <p className={`text-sm ${textSecondary}`}>MLS# {listing.mlsNumber}</p>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-modal"
            className={`p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center
              ${isDark ? 'hover:bg-[#333333]' : 'hover:bg-gray-100'}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Photo Gallery */}
          <div className="relative aspect-video bg-gray-900">
            {photos.length > 0 ? (
              <>
                <img 
                  src={photos[currentPhotoIndex]} 
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-contain"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => i === 0 ? photos.length - 1 : i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => i === photos.length - 1 ? 0 : i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bed className={`w-4 h-4 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Bedrooms</span>
                </div>
                <p className={`text-lg font-bold ${textPrimary}`}>{listing.beds}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bath className={`w-4 h-4 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Bathrooms</span>
                </div>
                <p className={`text-lg font-bold ${textPrimary}`}>{listing.baths}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Square className={`w-4 h-4 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Living Area</span>
                </div>
                <p className={`text-lg font-bold ${textPrimary}`}>{(listing.livingArea || listing.sqft)?.toLocaleString() || '-'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className={`w-4 h-4 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Days on Market</span>
                </div>
                <p className={`text-lg font-bold ${textPrimary}`}>{listing.daysOnMarket}</p>
              </div>
            </div>

            {/* Price History & Dates */}
            <div className={`p-4 rounded-lg border ${borderColor}`}>
              <h4 className={`font-semibold ${textPrimary} mb-3`}>Price History & Dates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={textSecondary}>Original Price:</span>
                  <span className={`ml-2 ${textPrimary} font-medium`}>
                    {listing.originalPrice ? formatPrice(listing.originalPrice) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className={textSecondary}>Listing Date:</span>
                  <span className={`ml-2 ${textPrimary} font-medium`}>
                    {formatDate(listing.listDate)}
                  </span>
                </div>
                <div>
                  <span className={textSecondary}>List Price:</span>
                  <span className={`ml-2 ${textPrimary} font-medium`}>{formatPrice(listing.listPrice)}</span>
                </div>
                <div>
                  <span className={textSecondary}>Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium text-white rounded-full ml-2 ${getStatusColor(listing.status)}`}>
                    {listing.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Property Details - Two Column Layout */}
            <div className={`p-4 rounded-lg border ${borderColor}`}>
              <h4 className={`font-semibold ${textPrimary} mb-4`}>Property Details</h4>
              
              {/* Two-column layout: Map on left, Specs on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left Column - Location */}
                <div>
                  <h5 className={`text-sm font-medium ${textSecondary} mb-3`}>Location</h5>
                  {(listing.map?.latitude || listing.latitude) && (listing.map?.longitude || listing.longitude) ? (
                    <PropertyMapPreview 
                      latitude={listing.map?.latitude || listing.latitude} 
                      longitude={listing.map?.longitude || listing.longitude} 
                      isDark={isDark} 
                    />
                  ) : (
                    <div className="w-full h-48 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Location not available</span>
                    </div>
                  )}
                </div>

                {/* Right Column - Specifications */}
                <div>
                  <h5 className={`text-sm font-medium ${textSecondary} mb-3`}>Specifications</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        <Bed className="w-3 h-3" />
                        Bedrooms:
                      </span>
                      <span className={textPrimary}>{listing.beds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        <Bath className="w-3 h-3" />
                        Bathrooms:
                      </span>
                      <span className={textPrimary}>{listing.baths}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        <Square className="w-3 h-3" />
                        Living Area:
                      </span>
                      <span className={textPrimary}>{(listing.livingArea || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        <Calendar className="w-3 h-3" />
                        Days on Market:
                      </span>
                      <span className={textPrimary}>{listing.daysOnMarket}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        Status:
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(listing.status)}`}>
                        {listing.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={textSecondary}>Year Built:</span>
                      <span className={textPrimary}>{listing.yearBuilt || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={textSecondary}>Property Type:</span>
                      <span className={textPrimary}>{listing.propertyType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={textSecondary}>MLS#:</span>
                      <span className={textPrimary}>{listing.mlsNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Description - ALWAYS VISIBLE */}
            <div className={`p-4 rounded-lg border ${borderColor} mt-4`}>
              <h4 className={`font-semibold ${textPrimary} mb-3 pb-2 border-b-2 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                Property Description
              </h4>
              <div className={`text-sm ${textSecondary} leading-relaxed text-justify space-y-4`}>
                {(listing.description || listing.details?.description || listing.remarks || listing.publicRemarks)
                  ? (listing.description || listing.details?.description || listing.remarks || listing.publicRemarks)
                      .split(/\n\n|\r\n\r\n/)
                      .filter(p => p.trim())
                      .map((p, i) => <p key={i}>{p.trim()}</p>)
                  : <p className="italic">No description available</p>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
