import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeImage } from '@/components/ui/safe-image';
import { BarChart3, Map as MapIcon, TrendingUp, List, LayoutGrid, Table2, Bed, Bath, Square, Clock, MapPin, Home, AlertTriangle, ArrowUpRight, ArrowDownRight, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { CMAMap } from '@/components/cma-map';
import { PropertyDetailModal } from './PropertyDetailModal';
import { extractPrice, extractSqft, extractDOM, calculatePricePerSqft, getCityState } from '@/lib/cma-data-utils';
import type { CmaProperty } from '../types';
import type { Property } from '@shared/schema';

interface CompsWidgetProps {
  comparables: CmaProperty[];
  subjectProperty?: CmaProperty;
  suggestedListPrice?: number;
}

interface CmaStatMetric {
  range: { min: number; max: number };
  average: number;
  median: number;
}

interface PropertyStatistics {
  price: CmaStatMetric;
  pricePerSqFt: CmaStatMetric;
  daysOnMarket: CmaStatMetric;
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'closed', label: 'Closed' },
  { id: 'activeUnderContract', label: 'Active Under Contract' },
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'leasing', label: 'Leasing' },
] as const;

// Safe helper to get display price using utility functions
function getDisplayPrice(property: CmaProperty): number {
  // Use the robust extractPrice utility that checks multiple field names
  const price = extractPrice(property);
  return price ?? 0;
}

// Safe helper to calculate price per sqft avoiding NaN
// Returns formatted string without trailing "/sqft" - caller adds it
function getSafePricePerSqft(property: CmaProperty): string {
  // First check if pricePerSqft is valid
  if (property.pricePerSqft && !isNaN(property.pricePerSqft) && property.pricePerSqft > 0) {
    return `$${Math.round(property.pricePerSqft)}`;
  }
  // Use the robust utility that checks multiple field names
  const pricePerSqft = calculatePricePerSqft(property);
  if (pricePerSqft && pricePerSqft > 0) {
    return `$${Math.round(pricePerSqft)}`;
  }
  return '--';
}

function calculateStatistics(comparables: CmaProperty[]): PropertyStatistics | null {
  if (!comparables || comparables.length === 0) return null;
  
  const calculateMetric = (values: number[]): CmaStatMetric => {
    const filtered = values.filter(v => v != null && !isNaN(v) && v > 0);
    if (filtered.length === 0) {
      return { range: { min: 0, max: 0 }, average: 0, median: 0 };
    }
    const sorted = [...filtered].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    return {
      range: { min: sorted[0], max: sorted[sorted.length - 1] },
      average: sum / sorted.length,
      median
    };
  };
  
  // Filter for valid price/sqft values before calculation - use extractPrice for robust field matching
  const pricePerSqFts = comparables
    .map(c => {
      const sqft = extractSqft(c);
      const price = extractPrice(c);
      if (price && sqft && sqft > 0) return price / sqft;
      return NaN;
    })
    .filter(v => !isNaN(v));
  
  // Filter for valid prices and DOM values - use extractPrice for robust field matching
  const validPrices = comparables
    .map(c => extractPrice(c))
    .filter((p): p is number => p !== null && p > 0);
  const validDom = comparables
    .map(c => extractDOM(c) ?? c.daysOnMarket)
    .filter((d): d is number => d !== undefined && d !== null && !isNaN(d) && d >= 0);
  
  return {
    price: calculateMetric(validPrices),
    pricePerSqFt: calculateMetric(pricePerSqFts),
    daysOnMarket: calculateMetric(validDom),
  };
}

function formatCurrency(value: number): string {
  if (!value || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Contract Conduit Standard: Closed=RED, Active=GREEN, Under Contract=ORANGE, Pending=GRAY, Leasing=PURPLE
const getStatusColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  // Check leasing first (before other checks) - includes Repliers API code "lsd" (Leased)
  if (s === 'lsd' || s === 'leased' || s === 'lease' || s.includes('leasing') || s.includes('for rent') || s.includes('rental')) return 'bg-purple-500';  // PURPLE for Leasing
  if (s.includes('closed') || s.includes('sold')) return 'bg-red-500';  // RED for Closed/Sold
  if (s.includes('active under') || s.includes('under contract')) return 'bg-orange-500';  // ORANGE for Under Contract
  if (s.includes('active')) return 'bg-green-500';  // GREEN for Active
  if (s.includes('pending')) return 'bg-gray-500';  // GRAY for Pending
  return 'bg-gray-500';
};

const normalizeStatus = (status: string): string => {
  const s = status.toLowerCase();
  // Check leasing first (before other checks) - includes Repliers API code "lsd" (Leased)
  if (s === 'lsd' || s === 'leased' || s === 'lease' || s.includes('leasing') || s.includes('for rent') || s.includes('rental')) return 'leasing';
  if (s.includes('closed') || s.includes('sold')) return 'closed';
  if (s.includes('active under') || s.includes('under contract')) return 'activeUnderContract';
  if (s.includes('pending')) return 'pending';
  if (s.includes('active')) return 'active';
  return 'unknown';
};

function convertToProperty(cmaProperty: CmaProperty): Property {
  return {
    id: cmaProperty.id,
    unparsedAddress: cmaProperty.address,
    mlsNumber: cmaProperty.id,
    address: cmaProperty.address,
    city: cmaProperty.city,
    state: cmaProperty.state,
    postalCode: cmaProperty.zipCode,
    price: cmaProperty.price,
    soldPrice: cmaProperty.soldPrice,
    listPrice: cmaProperty.originalPrice || cmaProperty.price,
    bedrooms: cmaProperty.beds,
    bathrooms: cmaProperty.baths,
    sqft: cmaProperty.sqft,
    livingArea: cmaProperty.sqft,
    lotSize: cmaProperty.lotSize,
    yearBuilt: cmaProperty.yearBuilt,
    status: cmaProperty.status,
    standardStatus: cmaProperty.status,
    daysOnMarket: cmaProperty.daysOnMarket,
    photos: cmaProperty.photos,
    latitude: cmaProperty.latitude,
    longitude: cmaProperty.longitude,
  } as Property;
}

function StatItem({ 
  label, 
  value, 
  subtext, 
  subtextColor = 'text-gray-600',
  vsMarketPercent,
  yourValue
}: { 
  label: string; 
  value: string; 
  subtext?: string;
  subtextColor?: string;
  vsMarketPercent?: number | null;
  yourValue?: string;
}) {
  const testId = `stat-${label.toLowerCase().replace(/[\s/]+/g, '-')}`;
  return (
    <div className="text-center" data-testid={testId}>
      <p className="text-[10px] sm:text-xs text-gray-600 font-medium uppercase tracking-wider" data-testid={`${testId}-label`}>
        {label}
      </p>
      <p className="text-sm sm:text-lg font-bold text-gray-900" data-testid={`${testId}-value`}>{value}</p>
      {vsMarketPercent !== undefined && vsMarketPercent !== null && (
        <p className={`text-[10px] sm:text-xs flex items-center justify-center gap-0.5 ${vsMarketPercent > 0 ? 'text-red-500' : 'text-green-500'}`} data-testid={`${testId}-vs-market`}>
          {vsMarketPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(vsMarketPercent).toFixed(1)}%
        </p>
      )}
      {yourValue && (
        <p className="text-[10px] sm:text-xs text-gray-600 truncate" data-testid={`${testId}-your`}>
          Your: {yourValue}
        </p>
      )}
      {subtext && (
        <p className={`text-[10px] sm:text-xs ${subtextColor}`}>{subtext}</p>
      )}
    </div>
  );
}

function PropertyCard({ property, isSubject = false, onClick }: { property: CmaProperty; isSubject?: boolean; onClick?: () => void }) {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${isSubject ? 'border-[#EF4923] border-2' : ''}`}
      data-testid={`property-card-${property.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="relative aspect-[4/3]">
        {property.photos?.[0] ? (
          <div 
            className="cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <SafeImage 
              src={property.photos[0]} 
              alt={property.address}
              className="w-full h-full object-cover"
              data-testid={`property-image-${property.id}`}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-600 gap-1">
            <Home className="w-8 h-8" />
            <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              No Photo
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          <span 
            className={`px-2 py-1 text-xs font-medium text-white rounded ${isSubject ? 'bg-[#EF4923]' : getStatusColor(property.status)}`}
            data-testid={`property-status-${property.id}`}
          >
            {isSubject ? 'Subject' : property.status}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <p className="font-medium text-sm truncate text-gray-900" data-testid={`property-address-${property.id}`}>{property.address}</p>
        {getCityState(property) && (
          <p className="text-xs text-gray-600 truncate">
            {getCityState(property)}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-2 mt-2 flex-wrap">
          <p className="text-lg font-bold text-gray-900" data-testid={`property-price-${property.id}`}>
            {formatCurrency(getDisplayPrice(property))}
          </p>
          <p className="text-sm text-gray-600" data-testid={`property-ppsf-${property.id}`}>
            {getSafePricePerSqft(property)}/sqft
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 flex-wrap">
          <span className="flex items-center gap-1" data-testid={`property-beds-${property.id}`}>
            <Bed className="w-3 h-3" /> {property.beds}
          </span>
          <span className="flex items-center gap-1" data-testid={`property-baths-${property.id}`}>
            <Bath className="w-3 h-3" /> {property.baths}
          </span>
          <span className="flex items-center gap-1" data-testid={`property-sqft-${property.id}`}>
            <Square className="w-3 h-3" /> {property.sqft.toLocaleString()}
          </span>
          {property.yearBuilt ? (
            <span className="flex items-center gap-1" data-testid={`property-yearbuilt-${property.id}`}>
              <Home className="w-3 h-3" /> {property.yearBuilt}
            </span>
          ) : null}
          {(property.lotSizeAcres && property.lotSizeAcres > 0) ? (
            <span className="flex items-center gap-1" data-testid={`property-lotsize-${property.id}`}>
              <MapPin className="w-3 h-3" /> {property.lotSizeAcres.toFixed(2)} ac
            </span>
          ) : null}
          {(property.garageSpaces && property.garageSpaces > 0) ? (
            <span data-testid={`property-garage-${property.id}`}>
              {property.garageSpaces} gar
            </span>
          ) : null}
        </div>

        {/* Listing Details */}
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-0.5 text-xs text-gray-700">
          <div className="font-medium text-gray-900 mb-1">Listing Details</div>
          {property.originalPrice ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Orig. Price</span>
              <span>{formatCurrency(property.originalPrice)}</span>
            </div>
          ) : null}
          {property.listPrice ? (
            <div className="flex justify-between">
              <span className="text-gray-500">List Price</span>
              <span>{formatCurrency(property.listPrice)}</span>
            </div>
          ) : null}
          {property.soldPrice ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Sold Price</span>
              <span>
                {formatCurrency(property.soldPrice)}
                {property.listPrice ? (
                  <span className="ml-1 text-gray-500">
                    ({((property.soldPrice / property.listPrice) * 100).toFixed(1)}%)
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}
          {(property.pricePerSqft && property.pricePerSqft > 0) ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Price/Sq. Ft.</span>
              <span>${property.pricePerSqft.toLocaleString()}</span>
            </div>
          ) : null}
          {property.soldDate ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Sold Date</span>
              <span>{(() => {
                const d = new Date(property.soldDate!);
                if (isNaN(d.getTime())) return '—';
                return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
              })()}</span>
            </div>
          ) : null}
          <div className="flex justify-between" data-testid={`property-dom-${property.id}`}>
            <span className="text-gray-500">Days on Market</span>
            <span>{extractDOM(property) ?? 0}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PropertyListItem({ property, isSubject = false, onClick }: { property: CmaProperty; isSubject?: boolean; onClick?: () => void }) {
  return (
    <Card 
      className={`p-4 flex gap-4 flex-wrap cursor-pointer hover:shadow-lg transition-shadow ${isSubject ? 'border-[#EF4923] border-2' : ''}`}
      data-testid={`property-list-${property.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="w-32 h-24 flex-shrink-0 rounded overflow-hidden">
        {property.photos?.[0] ? (
          <SafeImage 
            src={property.photos[0]} 
            alt={property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-600 gap-1">
            <Home className="w-6 h-6" />
            <span className="text-[10px] text-yellow-600 font-medium flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              No Photo
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge className={`${isSubject ? 'bg-[#EF4923]' : getStatusColor(property.status)} text-white text-xs`}>
            {isSubject ? 'Subject' : property.status}
          </Badge>
        </div>
        <p className="font-medium text-sm truncate text-gray-900" data-testid={`property-list-address-${property.id}`}>{property.address}</p>
        <p className="text-lg font-bold mt-1 text-gray-900" data-testid={`property-list-price-${property.id}`}>
          {formatCurrency(getDisplayPrice(property))}
          <span className="text-sm font-normal text-gray-600 ml-2">
            {getSafePricePerSqft(property)}/sqft
          </span>
        </p>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 flex-wrap">
          <span>{property.beds} beds</span>
          <span>{property.baths} baths</span>
          <span>{property.sqft.toLocaleString()} sqft</span>
          <span>{extractDOM(property) || 0} DOM</span>
        </div>
      </div>
    </Card>
  );
}

function PropertyTable({ comparables, subjectProperty, onPropertyClick }: { comparables: CmaProperty[]; subjectProperty?: CmaProperty; onPropertyClick?: (property: CmaProperty) => void }) {
  const allProperties = subjectProperty ? [subjectProperty, ...comparables] : comparables;
  
  return (
    <div className="overflow-x-auto" data-testid="property-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium">Address</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Price</th>
            <th className="text-right p-3 font-medium">$/SqFt</th>
            <th className="text-center p-3 font-medium">Beds</th>
            <th className="text-center p-3 font-medium">Baths</th>
            <th className="text-right p-3 font-medium">SqFt</th>
            <th className="text-right p-3 font-medium">DOM</th>
          </tr>
        </thead>
        <tbody>
          {allProperties.map((property, index) => (
            <tr 
              key={property.id} 
              className={`border-b hover:bg-gray-50 cursor-pointer ${property.isSubject ? 'bg-[#EF4923]/10' : ''}`}
              data-testid={`property-row-${property.id}`}
              onClick={() => onPropertyClick?.(property)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPropertyClick?.(property);
                }
              }}
            >
              <td className="p-3 max-w-[200px] truncate" data-testid={`table-address-${index}`}>{property.address}</td>
              <td className="p-3" data-testid={`table-status-${index}`}>
                <Badge className={`${property.isSubject ? 'bg-[#EF4923]' : getStatusColor(property.status)} text-white text-xs`}>
                  {property.isSubject ? 'Subject' : property.status}
                </Badge>
              </td>
              <td className="text-right p-3 font-medium" data-testid={`table-price-${index}`}>{formatCurrency(getDisplayPrice(property))}</td>
              <td className="text-right p-3" data-testid={`table-ppsf-${index}`}>{getSafePricePerSqft(property)}/sqft</td>
              <td className="text-center p-3" data-testid={`table-beds-${index}`}>{property.beds}</td>
              <td className="text-center p-3" data-testid={`table-baths-${index}`}>{property.baths}</td>
              <td className="text-right p-3" data-testid={`table-sqft-${index}`}>{property.sqft.toLocaleString()}</td>
              <td className="text-right p-3" data-testid={`table-dom-${index}`}>{extractDOM(property) || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to calculate comparison indicators
function getComparisonIndicator(compValue: number | null, subjectValue: number | null, field: 'sqft' | 'lot' | 'count') {
  if (compValue === null || subjectValue === null || subjectValue === 0) return null;
  
  if (field === 'count') {
    // For beds, baths, garage - show absolute difference
    const diff = compValue - subjectValue;
    if (diff === 0) return null;
    return {
      arrow: diff > 0 ? ArrowUpRight : ArrowDownRight,
      text: `${diff > 0 ? '↑' : '↓'}${Math.abs(diff)}`,
      color: diff > 0 ? 'text-green-500' : 'text-red-500'
    };
  } else {
    // For sqft, lot - show percentage difference
    const pctDiff = ((compValue - subjectValue) / subjectValue) * 100;
    if (Math.abs(pctDiff) < 0.5) return null; // Don't show very small differences
    return {
      arrow: pctDiff > 0 ? ArrowUpRight : ArrowDownRight,
      text: `${pctDiff > 0 ? '↑' : '↓'}${Math.abs(pctDiff).toFixed(1)}%`,
      color: pctDiff > 0 ? 'text-green-500' : 'text-red-500'
    };
  }
}

// Status legend for subject column
function StatusLegend() {
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium">Listing Status</div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Active (For Sale) are current competition</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Sold determine recent market value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Pending signal market direction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600">Withdrawn/Expired indicate overpriced</span>
        </div>
      </div>
    </div>
  );
}

// Side-by-side comparison view component
function SideBySideComparison({ comparables, subjectProperty, geocodedCoords, mapboxToken, handlePropertyClick }: { comparables: CmaProperty[]; subjectProperty?: CmaProperty; geocodedCoords?: {latitude: number; longitude: number} | null; mapboxToken?: string; handlePropertyClick?: (comp: CmaProperty) => Promise<void> }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Responsive columns based on screen width
  const [visibleColumns, setVisibleColumns] = useState(4);
  
  useEffect(() => {
    const updateColumns = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const totalComps = comparables.length;
      
      // Calculate optimal columns based on available width (each column needs ~240px including subject)
      const availableWidth = width - 240; // Subject column width
      const maxPossibleColumns = Math.floor(availableWidth / 240);
      
      // Show all comparables if they fit on screen, otherwise use responsive breakpoints
      if (totalComps <= maxPossibleColumns && width >= 1000) {
        setVisibleColumns(totalComps);
      } else if (width >= 1600) {
        setVisibleColumns(Math.min(6, totalComps));
      } else if (width >= 1400) {
        setVisibleColumns(Math.min(5, totalComps));
      } else if (width >= 1200) {
        setVisibleColumns(Math.min(4, totalComps));
      } else if (width >= 1000) {
        setVisibleColumns(Math.min(3, totalComps));
      } else if (width >= 768) {
        setVisibleColumns(2);
      } else {
        setVisibleColumns(1);
      }
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [comparables.length]);
  
  const visibleComparables = comparables.slice(currentIndex, currentIndex + visibleColumns);
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + visibleColumns < comparables.length;
  
  const scrollLeft = () => {
    setCurrentIndex(Math.max(0, currentIndex - visibleColumns));
  };
  
  const scrollRight = () => {
    setCurrentIndex(Math.min(comparables.length - visibleColumns, currentIndex + visibleColumns));
  };
  
  if (!subjectProperty && !comparables?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Home className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Subject property required for comparison view</p>
        </div>
      </div>
    );
  }
  
  const subjectSqft = extractSqft(subjectProperty);
  const subjectLotSize = subjectProperty.lotSize || subjectProperty.lotSizeAcres || null;
  
  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full">
          {/* Fixed Subject Column */}
          <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-blue-50">
            <div className="p-4 space-y-4">
              {/* Subject Header */}
              <div className="text-center">
                {(() => {
                  const subLat = subjectProperty?.latitude || geocodedCoords?.latitude;
                  const subLng = subjectProperty?.longitude || geocodedCoords?.longitude;
                  return (subLat && subLng && mapboxToken) ? (
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-2">
                      <img
                        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e74c3c(${subLng},${subLat})/${subLng},${subLat},14,0/300x200@2x?access_token=${mapboxToken}`}
                      alt={`Map of ${subjectProperty.address}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to address text if map fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gray-100 rounded-lg flex-col items-center justify-center text-gray-600 gap-1 p-2" style={{ display: 'none' }}>
                      <MapPin className="w-6 h-6" />
                      <span className="text-xs text-center leading-tight">Map unavailable</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-600 gap-1 p-2 mb-2">
                      <MapPin className="w-6 h-6" />
                      <span className="text-xs text-center leading-tight font-medium">No map coordinates</span>
                    </div>
                  );
                })()}
                <div className="font-medium text-sm">{subjectProperty.address}</div>
                <div className="text-xs text-gray-600">Subject Property</div>
              </div>
              
              {/* Subject Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Beds:</span>
                  <span>{subjectProperty.beds || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Baths:</span>
                  <span>{subjectProperty.baths || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sq.Ft:</span>
                  <span>{subjectSqft ? subjectSqft.toLocaleString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lot:</span>
                  <span>{subjectLotSize ? subjectLotSize.toLocaleString() : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Garage:</span>
                  <span>{subjectProperty.garageSpaces || subjectProperty.garage || '0'}</span>
                </div>
              </div>
              
              {/* Your Comp Guide */}
              <div className="pt-4 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="w-4 h-4" />
                  <span className="font-medium text-sm">Your Comp Guide</span>
                </div>
                <StatusLegend />
              </div>
            </div>
          </div>
          
          {/* Scrollable Comparable Columns */}
          {visibleComparables.map((comp, index) => {
            const compSqft = extractSqft(comp);
            const compPrice = extractPrice(comp);
            const compLotSize = comp.lotSize || comp.lotSizeAcres || null;
            
            // Calculate indicators
            const sqftIndicator = getComparisonIndicator(compSqft, subjectSqft, 'sqft');
            const lotIndicator = getComparisonIndicator(compLotSize, subjectLotSize, 'lot');
            const bedsIndicator = getComparisonIndicator(comp.beds, subjectProperty.beds, 'count');
            const bathsIndicator = getComparisonIndicator(comp.baths, subjectProperty.baths, 'count');
            const garageIndicator = getComparisonIndicator(
              comp.garageSpaces || comp.garage || 0, 
              subjectProperty.garageSpaces || subjectProperty.garage || 0, 
              'count'
            );
            
            // Sold price percentage
            const listPrice = comp.listPrice || comp.price;
            const soldPrice = comp.soldPrice || (comp as any).closePrice || null;
            const soldPct = (listPrice && soldPrice) ? (soldPrice / listPrice) * 100 : null;
            const soldPctColor = soldPct ? (soldPct >= 100 ? 'text-green-600' : soldPct >= 95 ? 'text-gray-900' : 'text-red-600') : '';
            
            return (
              <div key={comp.id} className="w-56 flex-shrink-0 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handlePropertyClick?.(comp)}>
                <div className="p-4 space-y-4">
                  {/* Comp Header */}
                  <div className="text-center">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-2">
                      {comp.photos && comp.photos.length > 0 ? (
                        <img 
                          src={comp.photos[0]} 
                          alt={comp.address}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePropertyClick?.(comp);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="font-medium text-sm text-gray-900">{comp.address}</div>
                    <div className="text-sm font-semibold text-green-600">
                      {compPrice ? `$${compPrice.toLocaleString()}` : '-'}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {comp.status || 'Unknown'}
                    </div>
                  </div>
                  
                  {/* Comp Stats with Indicators */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Beds:</span>
                      <div className="flex items-center gap-1">
                        <span>{comp.beds || '-'}</span>
                        {bedsIndicator && (
                          <span className={`text-xs ${bedsIndicator.color}`}>
                            {bedsIndicator.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Baths:</span>
                      <div className="flex items-center gap-1">
                        <span>{comp.baths || '-'}</span>
                        {bathsIndicator && (
                          <span className={`text-xs ${bathsIndicator.color}`}>
                            {bathsIndicator.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Sq.Ft:</span>
                      <div className="flex items-center gap-1">
                        <span>{compSqft ? compSqft.toLocaleString() : '-'}</span>
                        {sqftIndicator && (
                          <span className={`text-xs ${sqftIndicator.color}`}>
                            {sqftIndicator.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Lot:</span>
                      <div className="flex items-center gap-1">
                        <span>{compLotSize ? compLotSize.toLocaleString() : '-'}</span>
                        {lotIndicator && (
                          <span className={`text-xs ${lotIndicator.color}`}>
                            {lotIndicator.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Garage:</span>
                      <div className="flex items-center gap-1">
                        <span>{comp.garageSpaces || comp.garage || '0'}</span>
                        {garageIndicator && (
                          <span className={`text-xs ${garageIndicator.color}`}>
                            {garageIndicator.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Listing Details */}
                  <div className="pt-4 border-t border-gray-200 space-y-1 text-xs">
                    <div className="font-medium">Listing Details</div>

                    {comp.originalPrice ? (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Orig. Price</span>
                        <span>${comp.originalPrice.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {listPrice ? (
                      <div className="flex justify-between">
                        <span className="text-gray-500">List Price</span>
                        <span>${listPrice.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {soldPrice ? (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sold Price</span>
                        <span>
                          ${soldPrice.toLocaleString()}
                          {soldPct !== null ? (
                            <span className={`ml-1 ${soldPctColor}`}>({soldPct.toFixed(1)}%)</span>
                          ) : null}
                        </span>
                      </div>
                    ) : null}

                    {(compSqft && compSqft > 0 && (comp.soldPrice || listPrice)) ? (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price/Sq. Ft.</span>
                        <span>${Math.round((comp.soldPrice || listPrice!) / compSqft)}</span>
                      </div>
                    ) : null}

                    {(comp.soldDate || (comp as any).closeDate) ? (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sold Date</span>
                        <span>{(() => {
                          const raw = comp.soldDate || (comp as any).closeDate;
                          const date = new Date(raw);
                          if (isNaN(date.getTime())) return '—';
                          return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
                        })()}</span>
                      </div>
                    ) : null}

                    {(() => {
                      const dom = extractDOM(comp);
                      return dom !== null ? (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Days on Market</span>
                          <span>{dom}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* "About This Home" section removed per Daryl's request */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Controls */}
      {comparables.length > visibleColumns && (
        <div className="flex justify-center items-center gap-4 mt-4 pb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="rounded-full w-12 h-12"
            data-testid="scroll-left"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-sm text-gray-600">
            {currentIndex + 1}-{Math.min(currentIndex + visibleColumns, comparables.length)} of {comparables.length} comparables
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="rounded-full w-12 h-12"
            data-testid="scroll-right"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CompsMapView({ comparables, subjectProperty }: { comparables: CmaProperty[]; subjectProperty?: CmaProperty }) {
  const normalizedSubject: Property | null = subjectProperty ? convertToProperty(subjectProperty) : null;
  const normalizedComparables: Property[] = comparables.map(convertToProperty);

  const hasSubjectCoords = normalizedSubject?.latitude && normalizedSubject?.longitude;
  const validComparables = normalizedComparables.filter(c => c.latitude && c.longitude);

  if (!hasSubjectCoords && validComparables.length === 0) {
    return (
      <div className="h-full min-h-[400px] flex items-center justify-center rounded-lg border bg-gray-50" data-testid="map-no-coords">
        <div className="text-center text-gray-600">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-lg font-medium">Map Unavailable</p>
          <p className="text-sm">No coordinates found for properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[400px]" data-testid="comps-map-view">
      <CMAMap
        properties={normalizedComparables}
        subjectProperty={normalizedSubject}
        showPolygon={false}
      />
    </div>
  );
}

export function CompsWidget({ comparables, subjectProperty, suggestedListPrice }: CompsWidgetProps) {
  // DEBUG: Log actual data structure
  console.log('🔍 CompsWidget DEBUG - Data received:', {
    comparablesCount: comparables?.length || 0,
    sampleComp: comparables?.[0] ? {
      id: comparables[0].id,
      address: comparables[0].address,
      originalPrice: comparables[0].originalPrice,
      listDate: comparables[0].listDate,
      simpleDaysOnMarket: comparables[0].simpleDaysOnMarket,
      daysOnMarket: comparables[0].daysOnMarket,
      allFields: Object.keys(comparables[0])
    } : null
  });
  
  // Handle empty comparables
  if (!comparables || comparables.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white" data-testid="comps-widget">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">No Comparable Properties</h3>
            <p className="text-gray-600">
              No comparable properties were found for this CMA. Please check the CMA data or refresh the presentation.
            </p>
          </div>
        </div>
      </div>
    );
  }
  const [mainView, setMainView] = useState<'compare' | 'map' | 'stats'>('compare');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => new Set(comparables.map(c => c.id)));
  const toggleComp = (id: string) => setEnabledIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [selectedProperty, setSelectedProperty] = useState<CmaProperty | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [geocodedCoords, setGeocodedCoords] = useState<{latitude: number; longitude: number}|null>(null);

  // Fresh MLS fetch handler - ensures complete property data for modal
  const handlePropertyClick = async (comp: CmaProperty) => {
    try {
      console.log(`🔍 FRESH MLS FETCH - ${comp.address} (${comp.mlsNumber})`);
      
      // Fetch fresh MLS data instead of using stored data
      const response = await fetch(`/api/cma/search-properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mlsNumbers: [comp.mlsNumber]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.listings && data.listings.length > 0) {
          const freshProperty = data.listings[0];
          console.log('🔍 FRESH MLS SUCCESS - Complete property data:', {
            hasDescription: !!freshProperty.description,
            descriptionPreview: freshProperty.description?.substring(0, 100),
            hasListDate: !!freshProperty.listDate,
            listDate: freshProperty.listDate,
            hasOriginalPrice: !!freshProperty.originalPrice,
            originalPrice: freshProperty.originalPrice,
          });
          setSelectedProperty(freshProperty);
          return;
        }
      }
      
      console.log('🔍 FRESH MLS FALLBACK - Using stored data');
      setSelectedProperty(comp);
    } catch (error) {
      console.error('🔍 FRESH MLS ERROR - Using stored data fallback:', error);
      setSelectedProperty(comp);
    }
  };

  // Fetch Mapbox token on mount
  useEffect(() => {
    fetch('/api/mapbox-token')
      .then(res => res.json())
      .then(data => setMapboxToken(data.token))
      .catch(() => console.warn('Failed to load Mapbox token'));
  }, []);

  useEffect(() => {
    if (mapboxToken && subjectProperty?.address && !subjectProperty?.latitude && !subjectProperty?.longitude) {
      const addr = `${subjectProperty.address}, ${subjectProperty.city || ''}, ${subjectProperty.state || ''} ${subjectProperty.zipCode || ''}`.trim();
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${mapboxToken}&limit=1`)
        .then(r => r.json())
        .then(data => {
          if (data.features?.[0]?.center) {
            const [lng, lat] = data.features[0].center;
            setGeocodedCoords({ latitude: lat, longitude: lng });
          }
        })
        .catch(err => console.warn('Geocoding failed:', err));
    }
  }, [mapboxToken, subjectProperty]);

  const filteredComparables = useMemo(() => {
    if (statusFilter === 'all') return comparables;
    return comparables.filter(comp => normalizeStatus(comp.status) === statusFilter);
  }, [comparables, statusFilter]);

  const statistics = useMemo(() => calculateStatistics(filteredComparables), [filteredComparables]);

  useEffect(() => { setEnabledIds(new Set(filteredComparables.map(c => c.id))); }, [statusFilter]);

  const enabledComps = mainView === 'stats' ? filteredComparables.filter(c => enabledIds.has(c.id)) : filteredComparables;
  const liveStatistics = useMemo(() => calculateStatistics(enabledComps), [enabledComps]);

  return (
    <div className="flex flex-col h-full bg-white" data-testid="comps-widget">
      <div className="p-4 border-b space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900" data-testid="comps-title">
              Comparable Properties
            </h2>
            <span className="text-sm text-gray-600" data-testid="comps-count">
              {filteredComparables.length} properties
            </span>
            <Badge variant="outline" className="text-xs" data-testid="badge-mls">
              MLS
            </Badge>
          </div>
          
          <Tabs value={mainView} onValueChange={(v) => setMainView(v as typeof mainView)} data-testid="main-view-tabs">
            <TabsList>
              <TabsTrigger value="compare" className="text-xs gap-1" data-testid="tab-compare">
                <BarChart3 className="w-3 h-3" /> Compare
              </TabsTrigger>
              <TabsTrigger value="map" className="text-xs gap-1" data-testid="tab-map">
                <MapIcon className="w-3 h-3" /> Map
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs gap-1" data-testid="tab-stats">
                <TrendingUp className="w-3 h-3" /> Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4" data-testid="status-filters">
          {STATUS_FILTERS.map(filter => (
            <Button
              key={filter.id}
              variant={statusFilter === filter.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.id)}
              className="flex-shrink-0 text-[10px] sm:text-xs px-2 sm:px-3"
              data-testid={`filter-${filter.id}`}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        
        {statistics && liveStatistics && (() => {
          // Calculate subject property values for "vs market" comparison
          const extractedPrice = subjectProperty ? extractPrice(subjectProperty) : null;
          // Use suggestedListPrice as fallback if subject property has no price data
          const subjectPrice = extractedPrice || suggestedListPrice || null;
          const subjectSqft = subjectProperty ? extractSqft(subjectProperty) : null;
          const subjectPricePerSqft = (subjectPrice && subjectSqft && subjectSqft > 0)
            ? subjectPrice / subjectSqft
            : null;

          // Calculate % difference vs market average (live — updates as comps are toggled)
          const priceVsMarket = (liveStatistics.price.average > 0 && subjectPrice && subjectPrice > 0)
            ? ((subjectPrice - liveStatistics.price.average) / liveStatistics.price.average) * 100
            : null;

          const pricePerSqftVsMarket = (liveStatistics.pricePerSqFt.average > 0 && subjectPricePerSqft && subjectPricePerSqft > 0)
            ? ((subjectPricePerSqft - liveStatistics.pricePerSqFt.average) / liveStatistics.pricePerSqFt.average) * 100
            : null;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 rounded-lg" data-testid="stats-summary">
              <StatItem
                label="LOW PRICE"
                value={formatCurrency(liveStatistics.price.range.min)}
              />
              <StatItem
                label="HIGH PRICE"
                value={formatCurrency(liveStatistics.price.range.max)}
              />
              <StatItem
                label="AVG PRICE"
                value={formatCurrency(liveStatistics.price.average)}
                vsMarketPercent={priceVsMarket}
                yourValue={subjectPrice ? formatCurrency(subjectPrice) : undefined}
              />
              <StatItem
                label="MEDIAN"
                value={formatCurrency(liveStatistics.price.median)}
              />
              <StatItem
                label="AVG $/SQFT"
                value={`$${Math.round(liveStatistics.pricePerSqFt.average)}`}
                vsMarketPercent={pricePerSqftVsMarket}
                yourValue={subjectPricePerSqft ? `$${Math.round(subjectPricePerSqft)}` : undefined}
              />
              <StatItem
                label="AVG DOM"
                value={`${Math.round(liveStatistics.daysOnMarket.average)} days`}
              />
            </div>
          );
        })()}
        
        {/* Removed old compare view toggles - now using side-by-side comparison */}
      </div>
      
      <div className="flex-1 overflow-auto p-4" data-testid="content-area">
        {mainView === 'compare' && (
          <SideBySideComparison 
            comparables={filteredComparables}
            subjectProperty={subjectProperty}
            geocodedCoords={geocodedCoords}
            mapboxToken={mapboxToken}
            handlePropertyClick={handlePropertyClick}
          />
        )}

        {mainView === 'map' && (
          <CompsMapView 
            comparables={filteredComparables}
            subjectProperty={subjectProperty}
          />
        )}

        {mainView === 'stats' && (
          <div className="overflow-auto" data-testid="stats-view">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-zinc-50 text-left sticky top-0">
                  <th className="py-1.5 px-2 w-6"></th>
                  <th className="py-1.5 px-2 text-[10px] font-semibold text-zinc-500">#</th>
                  <th className="py-1.5 px-2 text-[10px] font-semibold text-zinc-500">Address</th>
                  <th className="py-1.5 px-2 text-[10px] font-semibold text-zinc-500">Status</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">List Price</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">Sold Price</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">Sold Date</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">$/SqFt</th>
                  <th className="py-1.5 px-2 text-center text-[10px] font-semibold text-zinc-500">DOM</th>
                  <th className="py-1.5 px-2 text-center text-[10px] font-semibold text-zinc-500">Beds</th>
                  <th className="py-1.5 px-2 text-center text-[10px] font-semibold text-zinc-500">Baths</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">SqFt</th>
                  <th className="py-1.5 px-2 text-right text-[10px] font-semibold text-zinc-500">% List</th>
                </tr>
              </thead>
              <tbody>
                {subjectProperty && (
                  <tr className="border-b border-blue-100 bg-blue-50">
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 text-zinc-400">S</td>
                    <td className="py-1.5 px-2 truncate max-w-[120px]">
                      <span className="mr-1 px-1 rounded bg-blue-600 text-white text-[9px] font-bold">Subject</span>
                      {subjectProperty.address || 'Subject Property'}
                    </td>
                    <td className="py-1.5 px-2">—</td>
                    <td className="py-1.5 px-2 text-right">{subjectProperty.listPrice ? `$${subjectProperty.listPrice.toLocaleString()}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right">{subjectProperty.listPrice && subjectProperty.sqft > 0 ? `$${Math.round(subjectProperty.listPrice / subjectProperty.sqft)}` : '—'}</td>
                    <td className="py-1.5 px-2 text-center">—</td>
                    <td className="py-1.5 px-2 text-center">{subjectProperty.beds ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center">{subjectProperty.baths ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right">{subjectProperty.sqft > 0 ? subjectProperty.sqft.toLocaleString() : '—'}</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                  </tr>
                )}
                {filteredComparables.map((comp, i) => {
                  const isEnabled = enabledIds.has(comp.id);
                  const price = extractPrice(comp) || 0;
                  const sqft = extractSqft(comp) || 0;
                  const dom = extractDOM(comp) || 0;
                  const listPrice = comp.listPrice || 0;
                  const soldPrice = comp.soldPrice || 0;
                  const psf = comp.pricePerSqft || (sqft > 0 ? price / sqft : 0);
                  const pctOfList = listPrice > 0 && soldPrice > 0 ? (soldPrice / listPrice * 100) : null;
                  const statusColor = getStatusColor(normalizeStatus(comp.status));
                  const soldDate = comp.soldDate ? new Date(comp.soldDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '—';
                  return (
                    <tr
                      key={comp.id}
                      className={`border-b border-zinc-100 transition-opacity ${!isEnabled ? 'opacity-40' : ''}`}
                    >
                      <td className="py-1.5 px-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleComp(comp.id)}
                          className="w-3.5 h-3.5 cursor-pointer accent-[#EF4923]"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-zinc-400">{i + 1}</td>
                      <td className="py-1.5 px-2 truncate max-w-[120px]">{comp.address || 'Unknown'}</td>
                      <td className="py-1.5 px-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: statusColor + '20', color: statusColor }}
                        >
                          {normalizeStatus(comp.status)}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right">{listPrice ? `$${listPrice.toLocaleString()}` : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-semibold" style={{ color: soldPrice ? '#16a34a' : undefined }}>
                        {soldPrice ? `$${soldPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right">{soldDate}</td>
                      <td className="py-1.5 px-2 text-right">{psf > 0 ? `$${Math.round(psf)}` : '—'}</td>
                      <td className="py-1.5 px-2 text-center">{dom > 0 ? dom : '—'}</td>
                      <td className="py-1.5 px-2 text-center">{comp.beds ?? '—'}</td>
                      <td className="py-1.5 px-2 text-center">{comp.baths ?? '—'}</td>
                      <td className="py-1.5 px-2 text-right">{sqft > 0 ? sqft.toLocaleString() : '—'}</td>
                      <td className="py-1.5 px-2 text-right">{pctOfList ? `${pctOfList.toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {selectedProperty && typeof window !== 'undefined' && createPortal(
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          mapboxToken={mapboxToken}
        />,
        document.body
      )}
    </div>
  );
}