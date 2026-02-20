/**
 * CMA SEARCH PATCH - Targeted Fix for Existing Endpoint
 * 
 * This patches the existing /api/cma/search-properties endpoint with:
 * 1. Enhanced address parsing for exact property matches
 * 2. Default to include sold comps for proper CMA analysis
 * 3. Improved result relevance and limiting
 */

// Add this import to the top of server/routes.ts
import { parseAddress, createAddressSearchFallbacks } from "./lib/address-parser";

// === PATCH 1: Enhanced Address Search Logic ===
// Replace the simple address search section (around line 2840) with:

// Enhanced address search logic
if (search && search.trim()) {
  console.log(`[CMA Search ENHANCED] Address search: "${search}"`);
  
  // Try to parse as a full address first
  const parsed = parseAddress(search);
  console.log(`[CMA Search ENHANCED] Parsed address:`, parsed);
  
  // Strategy 1: Use parsed fields if we have street number + name + zip
  if (parsed.streetNumber && parsed.streetName && parsed.zip) {
    // Remove the basic search param
    params.delete('search');
    
    // Add individual Repliers fields for more precise matching
    params.append('streetNumber', parsed.streetNumber);
    params.append('streetName', parsed.streetName);
    if (parsed.streetSuffix) {
      params.append('streetSuffix', parsed.streetSuffix);
    }
    params.append('zip', parsed.zip);
    
    console.log(`[CMA Search ENHANCED] Using parsed fields: ${parsed.streetNumber} ${parsed.streetName} ${parsed.streetSuffix || ''}, ZIP ${parsed.zip}`);
  } else {
    // Fallback to original search parameter
    params.append('search', search);
    console.log(`[CMA Search ENHANCED] Using fallback search: "${search}"`);
  }
}

// === PATCH 2: Default to Include Sold Comps ===
// Replace the statusArray default (around line 3064) with:

// Default to including sold comps for CMA analysis
const statusArray: string[] = statuses && statuses.length > 0 
  ? statuses 
  : (search ? ['Active', 'Closed'] : ['Active']); // Include sold comps for address searches

console.log(`[CMA Search ENHANCED] Search statuses:`, statusArray);

// === PATCH 3: Limit Results for Relevance ===  
// Update the resultsPerPage calculation (around line 2831) with:

// For CMA searches, limit to reasonable number of relevant results
let resultsPerPage = Math.min(Math.max(1, parseInt(limit || '25', 10)), 50);

// For address searches, default to 25 most relevant properties
if (search && !limit) {
  resultsPerPage = 25;
  console.log(`[CMA Search ENHANCED] Limited address search to ${resultsPerPage} results`);
}

// === PATCH 4: Enhanced Result Processing ===
// After the main API response processing, add distance calculation:

// Enhanced result processing for address searches
if (search && parsed?.streetNumber && parsed?.streetName) {
  console.log(`[CMA Search ENHANCED] Processing ${listings.length} results for relevance`);
  
  // Try to find the subject property in results for distance calculation
  const subjectProperty = listings.find((listing: any) => {
    const listingStreet = `${listing.streetNumber || ''} ${listing.streetName || ''}`.trim().toLowerCase();
    const searchStreet = `${parsed.streetNumber} ${parsed.streetName}`.toLowerCase();
    return listingStreet.includes(searchStreet) || searchStreet.includes(listingStreet);
  });
  
  if (subjectProperty && subjectProperty.latitude && subjectProperty.longitude) {
    console.log(`[CMA Search ENHANCED] Found subject property for distance calculation:`, subjectProperty.address);
    
    // Calculate distance and add relevance scores
    listings.forEach((listing: any) => {
      if (listing.latitude && listing.longitude) {
        const distance = calculateDistance(
          subjectProperty.latitude, subjectProperty.longitude,
          listing.latitude, listing.longitude
        );
        listing.distanceFromSubject = distance;
        
        // Simple relevance score
        let relevance = 100;
        if (distance <= 0.5) relevance += 50;
        else if (distance <= 1) relevance += 30;
        else if (distance <= 2) relevance += 10;
        
        // Bonus for sold properties (better for CMA)
        if (listing.status === 'Closed' || listing.soldPrice) {
          relevance += 20;
        }
        
        listing.relevanceScore = relevance;
      }
    });
    
    // Sort by relevance and limit results
    listings.sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    listings = listings.slice(0, resultsPerPage);
    
    console.log(`[CMA Search ENHANCED] Sorted by relevance, returning top ${listings.length} results`);
  }
}

// Helper function - add this to the top of routes.ts after imports:
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}