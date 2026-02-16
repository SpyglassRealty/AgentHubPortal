import { useState, useMemo, useEffect } from 'react';
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
        </div>
        <p className="text-xs text-gray-600 mt-2 flex items-center gap-1" data-testid={`property-dom-${property.id}`}>
          <Clock className="w-3 h-3" /> {property.daysOnMarket} days on market
        </p>
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
          <span>{property.daysOnMarket} DOM</span>
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
              <td className="text-right p-3" data-testid={`table-dom-${index}`}>{property.daysOnMarket}</td>
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
function SideBySideComparison({ comparables, subjectProperty }: { comparables: CmaProperty[]; subjectProperty?: CmaProperty }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Responsive columns based on screen width
  const [visibleColumns, setVisibleColumns] = useState(4);
  
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      const totalComps = comparables.length;
      // Show all comparables if 5 or fewer, otherwise use responsive breakpoints
      if (totalComps <= 5 && width >= 1200) {
        setVisibleColumns(totalComps);
      } else if (width >= 1400) {
        setVisibleColumns(5);
      } else if (width >= 1200) {
        setVisibleColumns(4);
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
                {subjectProperty?.latitude && subjectProperty?.longitude && mapboxToken ? (
                  <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-2">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e74c3c(${subjectProperty.longitude},${subjectProperty.latitude})/${subjectProperty.longitude},${subjectProperty.latitude},14,0/300x200@2x?access_token=${mapboxToken}`}
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
                )}
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
            const soldPrice = comp.soldPrice;
            const soldPct = (listPrice && soldPrice) ? (soldPrice / listPrice) * 100 : null;
            const soldPctColor = soldPct ? (soldPct >= 100 ? 'text-green-600' : soldPct >= 95 ? 'text-gray-900' : 'text-red-600') : '';
            
            return (
              <div key={comp.id} className="w-56 flex-shrink-0 border-r border-gray-200">
                <div className="p-4 space-y-4">
                  {/* Comp Header */}
                  <div className="text-center">
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-2">
                      {comp.photos && comp.photos.length > 0 ? (
                        <img 
                          src={comp.photos[0]} 
                          alt={comp.address}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                          onClick={() => {
                            // TODO: Navigate to property detail
                            console.log('Navigate to property detail:', comp.id);
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
                    {comp.originalPrice && (
                      <div>Orig: ${comp.originalPrice.toLocaleString()}</div>
                    )}
                    {listPrice && (
                      <div>List: ${listPrice.toLocaleString()}</div>
                    )}
                    {soldPct && (
                      <div className={soldPctColor}>
                        Sold: {soldPct.toFixed(1)}%
                      </div>
                    )}
                    {compPrice && compSqft && (
                      <div>$/Sqft: ${Math.round(compPrice / compSqft)}</div>
                    )}
                    {comp.soldDate && (
                      <div>Sold: {new Date(comp.soldDate).toLocaleDateString()}</div>
                    )}
                    {comp.daysOnMarket && (
                      <div>DOM: {comp.daysOnMarket}</div>
                    )}
                  </div>
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
  const [selectedProperty, setSelectedProperty] = useState<CmaProperty | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token on mount
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const response = await fetch('/api/mapbox-token');
        if (response.ok) {
          const { token } = await response.json();
          console.log('[CompsWidget] Mapbox token received, length:', token?.length);
          setMapboxToken(token);
        } else {
          console.warn('[CompsWidget] Failed to fetch Mapbox token:', response.status, response.statusText);
        }
      } catch (error) {
        console.warn('[CompsWidget] Error fetching Mapbox token:', error);
      }
    };
    fetchMapboxToken();
  }, []);

  const filteredComparables = useMemo(() => {
    if (statusFilter === 'all') return comparables;
    return comparables.filter(comp => normalizeStatus(comp.status) === statusFilter);
  }, [comparables, statusFilter]);

  const statistics = useMemo(() => calculateStatistics(filteredComparables), [filteredComparables]);

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
        
        {statistics && (() => {
          // Calculate subject property values for "vs market" comparison
          const extractedPrice = subjectProperty ? extractPrice(subjectProperty) : null;
          // Use suggestedListPrice as fallback if subject property has no price data
          const subjectPrice = extractedPrice || suggestedListPrice || null;
          const subjectSqft = subjectProperty ? extractSqft(subjectProperty) : null;
          const subjectPricePerSqft = (subjectPrice && subjectSqft && subjectSqft > 0) 
            ? subjectPrice / subjectSqft 
            : null;
          
          // Calculate % difference vs market average
          const priceVsMarket = (statistics.price.average > 0 && subjectPrice && subjectPrice > 0)
            ? ((subjectPrice - statistics.price.average) / statistics.price.average) * 100
            : null;
          
          const pricePerSqftVsMarket = (statistics.pricePerSqFt.average > 0 && subjectPricePerSqft && subjectPricePerSqft > 0)
            ? ((subjectPricePerSqft - statistics.pricePerSqFt.average) / statistics.pricePerSqFt.average) * 100
            : null;
          
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4 p-2 sm:p-4 bg-gray-50 rounded-lg" data-testid="stats-summary">
              <StatItem 
                label="LOW PRICE" 
                value={formatCurrency(statistics.price.range.min)} 
              />
              <StatItem 
                label="HIGH PRICE" 
                value={formatCurrency(statistics.price.range.max)} 
              />
              <StatItem 
                label="AVG PRICE" 
                value={formatCurrency(statistics.price.average)}
                vsMarketPercent={priceVsMarket}
                yourValue={subjectPrice ? formatCurrency(subjectPrice) : undefined}
              />
              <StatItem 
                label="MEDIAN" 
                value={formatCurrency(statistics.price.median)} 
              />
              <StatItem 
                label="AVG $/SQFT" 
                value={`$${Math.round(statistics.pricePerSqFt.average)}`}
                vsMarketPercent={pricePerSqftVsMarket}
                yourValue={subjectPricePerSqft ? `$${Math.round(subjectPricePerSqft)}` : undefined}
              />
              <StatItem 
                label="AVG DOM" 
                value={`${Math.round(statistics.daysOnMarket.average)} days`} 
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
          />
        )}

        {mainView === 'map' && (
          <CompsMapView 
            comparables={filteredComparables}
            subjectProperty={subjectProperty}
          />
        )}

        {mainView === 'stats' && statistics && (
          <div className="space-y-6" data-testid="stats-view">
            <Card className="p-6" data-testid="stats-price-card">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Price Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-testid="stats-price-avg">
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.price.average)}</p>
                </div>
                <div data-testid="stats-price-median">
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.price.median)}</p>
                </div>
                <div data-testid="stats-price-range">
                  <p className="text-sm text-gray-600">Range</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatCurrency(statistics.price.range.min)} - {formatCurrency(statistics.price.range.max)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6" data-testid="stats-ppsf-card">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Price Per Square Foot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-testid="stats-ppsf-avg">
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-gray-900">${Math.round(statistics.pricePerSqFt.average)}/sqft</p>
                </div>
                <div data-testid="stats-ppsf-median">
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-2xl font-bold text-gray-900">${Math.round(statistics.pricePerSqFt.median)}/sqft</p>
                </div>
                <div data-testid="stats-ppsf-range">
                  <p className="text-sm text-gray-600">Range</p>
                  <p className="text-lg font-medium text-gray-900">
                    ${Math.round(statistics.pricePerSqFt.range.min)} - ${Math.round(statistics.pricePerSqFt.range.max)}/sqft
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6" data-testid="stats-dom-card">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Days on Market</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div data-testid="stats-dom-avg">
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(statistics.daysOnMarket.average)} days</p>
                </div>
                <div data-testid="stats-dom-median">
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(statistics.daysOnMarket.median)} days</p>
                </div>
                <div data-testid="stats-dom-range">
                  <p className="text-sm text-gray-600">Range</p>
                  <p className="text-lg font-medium text-gray-900">
                    {Math.round(statistics.daysOnMarket.range.min)} - {Math.round(statistics.daysOnMarket.range.max)} days
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}