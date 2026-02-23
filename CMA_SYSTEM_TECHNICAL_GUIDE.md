# CMA System - Technical Implementation Guide

## Overview

The CMA (Comparative Market Analysis) system is the core feature of Agent Hub Portal, allowing real estate agents to create detailed property analyses using MLS data from Repliers API.

---

## Data Flow Architecture

### 1. Property Search Pipeline
```
User Input → Address Parsing → Repliers API → Data Transformation → Storage → Presentation
```

**Steps**:
1. **Address Parsing**: `parseAddress()` function breaks down full addresses
2. **API Search**: Multiple search strategies (address, MLS number, polygon)
3. **Data Filtering**: Post-API filtering for subdivision, schools, property features
4. **Photo Processing**: `extractPhotosFromRepliersList()` standardizes image arrays
5. **JSONB Storage**: Comparable properties stored as JSONB in PostgreSQL

### 2. CMA Creation Workflow
```javascript
// Main CMA search endpoint: POST /api/cma/search-properties
{
  search: "2402 Rockingham Cir, Austin, TX 78704",
  statuses: ["Active", "Closed"],
  minBeds: 3,
  maxPrice: 500000,
  limit: 25
}
```

**Search Strategies**:
- **Parsed Address**: Street number + name + suffix + ZIP
- **Fallback Search**: Full address string to Repliers
- **Geographic**: Polygon/bounds-based mapping
- **MLS Lookup**: Direct MLS number search

---

## Repliers API Integration

### Configuration
```javascript
// Environment variable required
IDX_GRID_API_KEY=your_repliers_api_key

// Base URL
const baseUrl = 'https://api.repliers.io/listings';
```

### Critical API Parameters
```javascript
const params = new URLSearchParams({
  listings: 'true',                    // Return full listings
  type: 'Sale',                       // Sales data only
  resultsPerPage: '25',               // Reasonable limit for CMA
  sortBy: 'createdOnDesc',            // Latest first
  
  // CRITICAL: Explicit fields request
  fields: [
    'mlsNumber', 'listingId', 'address', 'map', 'details', 
    'images', 'photos', 'listPrice', 'soldPrice', 'originalPrice',
    'remarks', 'publicRemarks', 'description',
    'listDate', 'soldDate', 'closeDate',
    'daysOnMarket', 'simpleDaysOnMarket',
    'standardStatus', 'status', 'lastStatus'
  ].join(',')
});
```

### Status Handling
- **Active**: `standardStatus=Active`
- **Under Contract**: `standardStatus=Active Under Contract`  
- **Closed/Sold**: `status=U&lastStatus=Sld` with date range
- **Mixed Searches**: Separate API calls merged client-side

---

## Data Transformation Layer

### Property Mapping
```typescript
// server/routes.ts transformation
return {
  mlsNumber: listing.mlsNumber || listing.listingId || '',
  address: fullAddress,
  listPrice: listing.listPrice || 0,
  soldPrice: listing.soldPrice || listing.closePrice || null,
  originalPrice: listing.originalPrice || listing.listPrice || null,
  beds: listing.details?.numBedrooms || listing.bedroomsTotal || 0,
  baths: listing.details?.numBathrooms || listing.bathroomsTotal || 0,
  sqft: listing.details?.sqft || listing.livingArea || 0,
  yearBuilt: listing.details?.yearBuilt || null,
  propertyType: listing.details?.style || listing.details?.propertyType || '',
  status: listing.standardStatus || listing.status || '',
  listDate: listing.listDate || '',
  soldDate: listing.soldDate || listing.closeDate || null,
  daysOnMarket: listing.simpleDaysOnMarket || listing.daysOnMarket || 0,
  photos: extractPhotosFromRepliersList(listing),
  description: listing.remarks || listing.publicRemarks || null,
  latitude: listing.map?.latitude || null,
  longitude: listing.map?.longitude || null
};
```

### CMA Transformer (Critical Component)
```typescript
// client/src/lib/cma-transformer.ts
export function transformPropertyToComparable(property: Property): CMAComparable {
  return {
    // ... standard fields
    description: property.description || property.publicRemarks || '',
    originalPrice: property.originalPrice || property.listPrice || 0,
    listDate: property.listDate || '',
    soldDate: property.soldDate || property.closeDate || '',
    // ... rest of mapping
  };
}
```

---

## Frontend CMA Components

### Key React Components
1. **CMABuilder** (`pages/cma-builder.tsx`): Main CMA creation interface
2. **PropertyCard** (`components/cma/PropertyCard.tsx`): Property display cards  
3. **PropertyDetailModal** (`components/cma/PropertyDetailModal.tsx`): Detailed property view
4. **CMAPresentation** (`components/cma-presentation/`): Report generation

### Search Interface
```typescript
interface SearchFilters {
  quickSearch: string;          // Address search
  city: string;
  subdivision: string;
  zip: string;
  minBeds: string;
  minBaths: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
  statuses: string[];           // ['Active', 'Closed', etc.]
  dateSoldDays: string;         // For closed properties
}
```

### Property Modal Features
- **Price History Section**: Shows original price, list price, sold price
- **"About This Home"**: Displays MLS remarks/description
- **Photo Gallery**: Mapbox integration, fallback handling
- **Property Stats**: Beds, baths, sqft, DOM, listing date
- **Map Integration**: Property location with Mapbox

---

## Database Schema

### CMA Table Structure
```sql
CREATE TABLE "cmas" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "name" varchar NOT NULL,
  "subject_property" jsonb,                    -- Subject property data
  "comparable_properties" jsonb DEFAULT '[]', -- Comparable properties array
  "properties_data" jsonb,                    -- Presentation data format
  "notes" text,
  "status" varchar DEFAULT 'draft',
  "presentation_config" jsonb,
  "latitude" numeric,                         -- Subject property coordinates
  "longitude" numeric,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### JSONB Property Structure
```javascript
// Example comparable property in JSONB
{
  "mlsNumber": "1234567",
  "address": "123 Main St, Austin, TX 78704",
  "listPrice": 450000,
  "soldPrice": 445000,
  "originalPrice": 460000,
  "beds": 3,
  "baths": 2,
  "sqft": 1800,
  "yearBuilt": 2015,
  "status": "Closed",
  "listDate": "2024-01-15",
  "soldDate": "2024-02-28",
  "daysOnMarket": 44,
  "description": "Beautiful home with...",
  "photos": ["https://photos.repliers.io/..."],
  "latitude": 30.2672,
  "longitude": -97.7431
}
```

---

## Recent Bug Fixes & Improvements

### Issues Resolved (Feb 19, 2026)
1. **Dropdown Labels**: Fixed minBeds/minBaths showing "Any" properly
2. **Missing Descriptions**: Fixed transformer not including `description` field
3. **List Date Display**: Enhanced PropertyDetailModal with price history section
4. **Price History**: Added originalPrice, listDate, soldDate to CMAComparable interface  
5. **DOM Accuracy**: Changed to use `simpleDaysOnMarket` for accuracy

### Critical Commits
- `9607a18`: Fixed CMA transformer missing description/price fields
- `04e5397`: Enhanced PropertyDetailModal with price history
- `9f68e0f`: Fixed dropdown labels, DOM accuracy, API fields parameter
- `bee8428`: Fixed property description field mapping and list date display

---

## Search Optimization Features

### Address Parsing
```javascript
function parseAddress(fullAddress) {
  // Handles formats like:
  // "2402 Rockingham Cir, Austin, TX 78704"
  // "123 Main Street"  
  // "456 Oak Ave, Apt B, City, ST 12345"
  
  return {
    streetNumber: "2402",
    streetName: "Rockingham", 
    streetSuffix: "Cir",
    city: "Austin",
    state: "TX",
    zip: "78704"
  };
}
```

### Geographic Search
- **Polygon Search**: User-drawn areas on Mapbox
- **Bounds Search**: Rectangular area selection
- **Radius Search**: Distance-based property filtering

### Advanced Filtering
- **Post-API Filtering**: Subdivision substring matching
- **School Districts**: Elementary, middle, high school filters
- **Property Features**: Pool, waterfront, HOA, primary bed on main
- **Date Ranges**: Sold within last 90/120/180/360 days

---

## Performance Optimizations

### Data Caching
- **React Query**: Frontend API response caching
- **Photo Processing**: Centralized photo extraction utility
- **Search Results**: Reasonable limits (25 properties for CMA relevance)

### API Efficiency  
- **Explicit Fields**: Request only needed fields from Repliers
- **Merged Searches**: Combine active + closed results efficiently
- **Rate Limiting**: Respectful API usage patterns

### Database Performance
- **JSONB Indexing**: Optimized for CMA property queries
- **Coordinate Backfill**: Automatic lat/lng population
- **Session Storage**: PostgreSQL-based session management

---

## Error Handling & Debugging

### Diagnostic Logging
```javascript
// Backend logging for API responses
console.log('[REPLIERS DEBUG] API Response Summary:', {
  totalCount: data.count || 0,
  listingsCount: (data.listings || []).length,
  sampleListingExists: !!(data.listings?.[0])
});

// Frontend property data logging  
console.log('[MODAL DEBUG] Property data received:', {
  hasDescription: !!property.description,
  hasListDate: !!property.listDate,
  allPropertyKeys: Object.keys(property)
});
```

### Common Issues & Solutions
1. **Missing Descriptions**: Ensure `remarks`/`publicRemarks` mapping
2. **Empty Photos**: Verify `extractPhotosFromRepliersList()` logic
3. **Incorrect DOM**: Use `simpleDaysOnMarket` over `daysOnMarket`
4. **Search Failures**: Check address parsing and API key configuration
5. **Missing Dates**: Verify `listDate` field availability in API response

---

## Testing & Validation

### Test Addresses
- **Austin**: "2402 Rockingham Cir, Austin, TX 78704"
- **Round Rock**: "13106 New Boston, Round Rock, TX"
- **Cedar Park**: Various subdivision searches

### Validation Points
- ✅ Property descriptions populate ("About This Home")
- ✅ Listing dates display above Days on Market
- ✅ Price history shows original vs current prices
- ✅ Image fallbacks work for properties without photos
- ✅ Dropdown labels show "Any" instead of blank

This technical guide provides comprehensive implementation details for maintaining and extending the CMA system.