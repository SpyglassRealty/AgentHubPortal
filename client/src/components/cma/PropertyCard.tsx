/**
 * ENHANCED PROPERTY CARD COMPONENT
 * Fixes all the UI issues identified in CMA search:
 * 1. Consistent card layout with fixed dimensions
 * 2. Proper image fallback handling  
 * 3. Price formatting with commas
 * 4. Mobile optimization with touch targets
 * 5. Consistent button alignment
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  BedDouble, 
  Bath, 
  Ruler, 
  Calendar, 
  Building2,
  Home
} from "lucide-react";

interface PropertyData {
  mlsNumber: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  listPrice: number;
  soldPrice?: number | null;
  originalPrice?: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeAcres?: number | null;
  yearBuilt?: number | null;
  propertyType: string;
  status: string;
  listDate?: string;
  soldDate?: string | null;
  daysOnMarket?: number;
  photos?: string[];
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
}

interface PropertyCardProps {
  property: PropertyData;
  isAdded: boolean;
  onAdd: (property: PropertyData) => void;
  variant?: 'search-result' | 'compact' | 'dropdown';
}

// Utility: Format price with commas
function formatPrice(price: number | null | undefined): string {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD", 
    maximumFractionDigits: 0 
  }).format(price);
}

// Utility: Format number with commas  
function formatNumber(num: number | null | undefined): string {
  if (!num) return "—";
  return new Intl.NumberFormat("en-US").format(num);
}

// Utility: Format DOM with fallback
function formatDaysOnMarket(dom: number | undefined): string {
  if (dom === undefined || dom === null) return "— DOM";
  if (dom === 0) return "0 DOM";
  return `${dom} DOM`;
}

// Image component with proper fallback
function PropertyImage({ 
  photos, 
  address, 
  className 
}: { 
  photos?: string[], 
  address: string, 
  className: string 
}) {
  const [imageError, setImageError] = useState(false);
  
  const hasPhotos = photos && photos.length > 0 && photos[0];
  
  if (!hasPhotos || imageError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <Home className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <img
      src={photos[0]}
      alt={address}
      className={`${className} object-cover`}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
}

export function PropertyCard({ property, isAdded, onAdd, variant = 'search-result' }: PropertyCardProps) {
  const price = property.soldPrice || property.listPrice;
  const displayPrice = property.status === 'Closed' || property.status === 'Sold' ? property.soldPrice : property.listPrice;
  
  if (variant === 'dropdown') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          {/* Line 1: MLS# (bold) */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-foreground">
              MLS# {property.mlsNumber}
            </p>
            <Badge 
              variant="outline" 
              className={`text-xs ml-2 ${
                property.status === 'Closed' || property.status === 'Sold' 
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : property.status === 'Pending' || property.status === 'Active Under Contract'
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  : 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}
            >
              {property.status === 'Closed' ? 'Sold' : property.status}
            </Badge>
          </div>
          
          {/* Line 2: Full address */}
          <p className="text-sm text-foreground truncate mb-1" title={property.address}>
            {property.address}
          </p>
          
          {/* Line 3: Price | Beds/Baths | Sqft */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-semibold text-[#EF4923]">
              {formatPrice(displayPrice)}
            </span>
            <span>|</span>
            <span>{property.beds}bd/{property.baths}ba</span>
            <span>|</span>
            <span>{formatNumber(property.sqft)} sqft</span>
          </div>
        </div>
        
        <Button
          size="sm"
          variant={isAdded ? "secondary" : "default"}
          className={isAdded ? "" : "bg-[#EF4923] hover:bg-[#d4401f] text-white"}
          disabled={isAdded}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(property);
          }}
        >
          {isAdded ? "✓ Added" : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <PropertyImage 
          photos={property.photos}
          address={property.address}
          className="w-16 h-12 rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{property.address}</p>
          {property.mlsNumber && (
            <p className="text-xs text-muted-foreground">MLS# {property.mlsNumber}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{formatPrice(price)}</span>
            <span>{property.beds}bd/{property.baths}ba</span>
            <span>{formatNumber(property.sqft)} sqft</span>
          </div>
        </div>
        <Button
          size="sm"
          variant={isAdded ? "secondary" : "default"}
          className={isAdded ? "" : "bg-[#EF4923] hover:bg-[#d4401f] text-white"}
          disabled={isAdded}
          onClick={() => onAdd(property)}
        >
          {isAdded ? "✓ Added" : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  // Full search result card layout
  return (
    <div className={`
      flex flex-col sm:flex-row items-start gap-3 p-4 rounded-lg border transition-colors
      ${isAdded 
        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" 
        : "bg-card hover:bg-muted/50"
      }
    `}>
      {/* Left: Image + Main Info */}
      <div className="flex items-start gap-3 w-full sm:flex-1">
        {/* Fixed-size thumbnail */}
        <PropertyImage 
          photos={property.photos}
          address={property.address}
          className="w-[120px] h-[80px] rounded flex-shrink-0"
        />
        
        {/* Property details */}
        <div className="flex-1 min-w-0">
          {/* Address + MLS */}
          <div className="mb-2">
            <h3 className="text-sm font-semibold truncate pr-2" title={property.address}>
              {property.address}
            </h3>
            {property.mlsNumber && (
              <p className="text-xs text-muted-foreground mt-0.5">
                MLS# {property.mlsNumber}
              </p>
            )}
          </div>
          
          {/* Price - prominent */}
          <div className="mb-3">
            <span className="text-lg font-bold text-[#EF4923]">
              {formatPrice(price)}
            </span>
          </div>
          
          {/* Property stats - consistent layout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              <span>{property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              <span>{property.baths} bath{property.baths !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              <span>{formatNumber(property.sqft)} sqft</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDaysOnMarket(property.daysOnMarket)}</span>
            </div>
          </div>
          
          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
            {property.yearBuilt && (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>Built {property.yearBuilt}</span>
              </div>
            )}
            {property.lotSizeAcres && (
              <div className="flex items-center gap-1">
                <span>{property.lotSizeAcres.toFixed(2)} acres</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right: Status Badge + Action Button */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-3 sm:gap-2">
        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={`text-xs ${
            property.status === 'Closed' || property.status === 'Sold' 
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : property.status === 'Active Under Contract'
              ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
              : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
          }`}
        >
          {property.status}
        </Badge>
        
        {/* Action button - consistent positioning and touch targets */}
        <Button
          size="sm"
          variant={isAdded ? "secondary" : "default"}
          className={`
            ${isAdded 
              ? "text-green-700 bg-green-100 border-green-200 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/30" 
              : "bg-[#EF4923] hover:bg-[#d4401f] text-white"
            } 
            min-h-[44px] sm:min-h-[36px] min-w-[120px] sm:min-w-[140px]
          `}
          disabled={isAdded}
          onClick={() => onAdd(property)}
        >
          {isAdded ? (
            <>
              <span className="mr-1">✓</span>
              Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add as Comparable
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default PropertyCard;