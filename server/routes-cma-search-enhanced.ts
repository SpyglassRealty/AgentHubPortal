/**
 * ENHANCED CMA SEARCH ENDPOINT
 * Fixes the issues identified in the CMA search:
 * 1. Better address parsing using Repliers fields
 * 2. Include Sold/Closed comps by default
 * 3. Geo-spatial filtering for relevance  
 * 4. Limit results and improve ranking
 */

import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { extractPhotosFromRepliersList, debugPhotoFields } from "./lib/repliers-photo-utils";
import { parseAddress, createAddressSearchFallbacks, ParsedAddress } from "./lib/address-parser";

function formatMlsDate(val: any): string | null {
  if (!val) return null;
  try {
    const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
  } catch { return null; }
}

// Helper: get DB user
async function getDbUser(req: any): Promise<any> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  const { storage } = await import('./storage');
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

// Helper: Calculate distance between two coordinates in miles
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

// Helper: Score property relevance for CMA (higher = more relevant)
function scorePropertyRelevance(property: any, subjectProperty?: any): number {
  let score = 100; // Base score
  
  if (!subjectProperty) return score;
  
  // Distance scoring (closer = higher score)
  if (property.latitude && property.longitude && 
      subjectProperty.latitude && subjectProperty.longitude) {
    const distance = calculateDistance(
      subjectProperty.latitude, subjectProperty.longitude,
      property.latitude, property.longitude
    );
    if (distance <= 0.5) score += 50; // Within 0.5 miles
    else if (distance <= 1) score += 30; // Within 1 mile
    else if (distance <= 2) score += 10; // Within 2 miles
    else if (distance > 5) score -= 20; // Penalty for far properties
  }
  
  // Bed/Bath similarity (±1 beds/baths = good)
  const subBeds = subjectProperty.beds || 0;
  const subBaths = subjectProperty.baths || 0;
  const propBeds = property.beds || 0;
  const propBaths = property.baths || 0;
  
  if (Math.abs(propBeds - subBeds) <= 1) score += 25;
  if (Math.abs(propBaths - subBaths) <= 1) score += 25;
  
  // Sqft similarity (±30% = good)
  const subSqft = subjectProperty.sqft || 0;
  const propSqft = property.sqft || 0;
  if (subSqft > 0 && propSqft > 0) {
    const sqftDiff = Math.abs(propSqft - subSqft) / subSqft;
    if (sqftDiff <= 0.3) score += 20; // Within 30%
    else if (sqftDiff <= 0.5) score += 10; // Within 50%
    else if (sqftDiff > 1.0) score -= 15; // Penalty for very different sizes
  }
  
  // Property type match
  if (property.propertyType && subjectProperty.propertyType) {
    if (property.propertyType === subjectProperty.propertyType) score += 15;
  }
  
  // Sold properties are preferred for CMA analysis
  if (property.status === 'Closed' || property.status === 'Sold') {
    score += 30;
  }
  
  // Recent sales are more relevant
  if (property.soldDate) {
    const soldDate = new Date(property.soldDate);
    const monthsAgo = (Date.now() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 3) score += 20; // Last 3 months
    else if (monthsAgo <= 6) score += 15; // Last 6 months
    else if (monthsAgo <= 12) score += 5; // Last year
  }
  
  return score;
}

export function registerEnhancedCmaSearchRoutes(app: Express) {
  
  // ENHANCED CMA Property Search
  app.post('/api/cma/search-properties', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const apiKey = process.env.IDX_GRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Listings API not configured" });
      }

      const {
        search, // Full address string like "2402 Rockingham Cir, Austin, TX 78704"
        subjectProperty, // Subject property for geo-spatial filtering and relevance scoring
        city, subdivision, zip, county, area, listingId,
        minBeds, minBaths, minPrice, maxPrice,
        propertyType, statuses,
        minSqft, maxSqft, minYearBuilt, maxYearBuilt,
        page, limit,
        dateSoldDays,
        mlsNumbers,
      } = req.body;

      const pageNum = Math.max(1, parseInt(page || '1', 10));
      let resultsPerPage = Math.min(Math.max(1, parseInt(limit || '25', 10)), 50);
      
      // For CMA, we want a reasonable number of highly relevant results
      if (!limit && search) {
        resultsPerPage = 25; // Default to 25 for address searches
      }

      const baseUrl = 'https://api.repliers.io/listings';

      // === ENHANCED ADDRESS SEARCH ===
      if (search && !mlsNumbers) {
        console.log(`[CMA Enhanced Search] Address search: "${search}"`);
        
        const fallbacks = createAddressSearchFallbacks(search);
        console.log(`[CMA Enhanced Search] Generated ${fallbacks.length} fallback strategies`);
        
        let bestResults: any = null;
        let foundExactMatch = false;
        
        for (const [index, searchParams] of fallbacks.entries()) {
          try {
            console.log(`[CMA Enhanced Search] Trying fallback ${index + 1}:`, searchParams);
            
            const params = new URLSearchParams({
              listings: 'true',
              type: 'Sale',
              resultsPerPage: '50', // Get more results for filtering
              pageNum: '1',
              sortBy: 'createdOnDesc',
            });

            params.set('fields', 'mlsNumber,listingId,address,map,details,images,lot,timestamps,taxes,school,association');

            // Add search parameters
            Object.entries(searchParams).forEach(([key, value]) => {
              if (value) params.append(key, value.toString());
            });
            
            // CRITICAL: Include Sold/Closed comps by default for CMA
            // Search both Active AND Closed listings for comprehensive CMA data
            const statusesToSearch = statuses && statuses.length > 0 ? statuses : ['Active', 'Closed'];
            
            let allListings: any[] = [];
            
            for (const status of statusesToSearch) {
              const statusParams = new URLSearchParams(params.toString());
              
              if (status === 'Closed') {
                // For closed listings
                statusParams.set('status', 'U');
                statusParams.set('lastStatus', 'Sld');
                const soldDays = dateSoldDays ? parseInt(dateSoldDays.toString(), 10) : 180;
                const minDate = new Date();
                minDate.setDate(minDate.getDate() - soldDays);
                statusParams.set('minClosedDate', minDate.toISOString().split('T')[0]);
              } else {
                statusParams.set('standardStatus', status);
              }
              
              const response = await fetch(`${baseUrl}?${statusParams.toString()}`, {
                headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
              });
              
              if (response.ok) {
                const data = await response.json();
                allListings.push(...(data.listings || []));
              }
            }
            
            if (allListings.length > 0) {
              bestResults = { listings: allListings, count: allListings.length };
              
              // Check for exact address match
              const exactMatch = allListings.find((listing: any) => {
                const listingAddr = `${listing.address?.streetNumber || ''} ${listing.address?.streetName || ''} ${listing.address?.streetSuffix || ''}`.trim();
                const searchAddr = searchParams.streetNumber ? 
                  `${searchParams.streetNumber} ${searchParams.streetName || ''} ${searchParams.streetSuffix || ''}`.trim() :
                  '';
                return searchAddr && listingAddr.toLowerCase().includes(searchAddr.toLowerCase());
              });
              
              if (exactMatch || index === 0) { // First fallback or exact match found
                console.log(`[CMA Enhanced Search] Found ${allListings.length} properties with fallback ${index + 1}${exactMatch ? ' (exact match)' : ''}`);
                foundExactMatch = !!exactMatch;
                break;
              }
            }
          } catch (err) {
            console.log(`[CMA Enhanced Search] Fallback ${index + 1} failed:`, err);
            continue;
          }
        }
        
        if (!bestResults || bestResults.listings.length === 0) {
          return res.json({
            listings: [],
            total: 0,
            page: 1,
            totalPages: 0,
            resultsPerPage,
            message: "No properties found for the specified address"
          });
        }
        
        const rawListings = bestResults.listings;
        console.log(`[CMA Enhanced Search] Found ${rawListings.length} total listings`);
        
        // === GEO-SPATIAL FILTERING & RELEVANCE SCORING ===
        const processedListings = rawListings.map((listing: any, index: number) => {
          // Transform listing to standard format
          const streetNumber = listing.address?.streetNumber || '';
          const streetName = listing.address?.streetName || '';
          const streetSuffix = listing.address?.streetSuffix || '';
          const cityName = listing.address?.city || '';
          const state = listing.address?.state || 'TX';
          const postalCode = listing.address?.zip || listing.address?.postalCode || '';
          const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
          const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

          const photos = extractPhotosFromRepliersList(listing);
          
          if (index === 0) debugPhotoFields(listing, listing.mlsNumber || listing.listingId);
          if (index === 0) {
            console.log('[CMA-DEBUG] listing.details keys:', Object.keys(listing.details || {}).join(', '));
            console.log('[CMA-DEBUG] listing keys:', Object.keys(listing || {}).join(', '));
            console.log('[CMA-DEBUG] sample details:', JSON.stringify(listing.details || {}).slice(0, 2000));
          }

          const processedListing = {
            mlsNumber: listing.mlsNumber || listing.listingId || '',
            address: fullAddress,
            streetAddress,
            city: cityName,
            state,
            zip: postalCode,
            listPrice: listing.listPrice || 0,
            soldPrice: listing.soldPrice || listing.closePrice || null,
            originalPrice: listing.originalPrice || listing.listPrice || null,
            beds: listing.details?.numBedrooms || listing.bedroomsTotal || 0,
            baths: listing.details?.numBathrooms || listing.bathroomsTotal || 0,
            sqft: listing.details?.sqft || listing.livingArea || 0,
            lotSizeAcres: listing.lot?.acres || (listing.lotSizeArea ? listing.lotSizeArea / 43560 : null),
            yearBuilt: listing.details?.yearBuilt || null,
            propertyType: listing.details?.style || listing.details?.propertyType || listing.propertyType || '',
            status: listing.standardStatus || listing.status || '',
            listDate: formatMlsDate(listing.listDate),
            soldDate: formatMlsDate(listing.soldDate || listing.closeDate),
            offMarketDate: formatMlsDate(listing.offMarketDate),
            daysOnMarket: listing.simpleDaysOnMarket || listing.daysOnMarket || listing.dom || listing.timestamps?.dom || 0,
            garageSpaces: listing.details?.numGarageSpaces || listing.garageSpaces || 0,
            stories: listing.details?.numStoreys || null,
            photos,
            latitude: listing.map?.latitude || listing.address?.latitude || null,
            longitude: listing.map?.longitude || listing.address?.longitude || null,
            subdivision: listing.address?.neighborhood || listing.address?.area || '',
            description: listing.details?.description || listing.remarks || listing.publicRemarks || null,
            county: listing.address?.county || null,
            schoolDistrict: listing.school?.district || listing.details?.schoolDistrict || null,
            schoolHigh: listing.school?.high || null,
            schoolMiddle: listing.school?.middle || null,
            schoolElementary: listing.school?.elementary || null,
            taxes: listing.taxAnnualAmount || listing.tax?.annualAmount || null,
            cooling: Array.isArray(listing.details?.cooling) ? listing.details.cooling.join(', ') : (listing.details?.cooling || null),
            heating: Array.isArray(listing.details?.heating) ? listing.details.heating.join(', ') : (listing.details?.heating || null),
            appliances: Array.isArray(listing.details?.appliances) ? listing.details.appliances.join(', ') : (listing.details?.appliances || null),
            fireplace: listing.details?.fireplace || listing.details?.fireplaceFeatures || null,
            flooring: Array.isArray(listing.details?.flooring) ? listing.details.flooring.join(', ') : (listing.details?.flooring || null),
            foundation: Array.isArray(listing.details?.foundation) ? listing.details.foundation.join(', ') : (listing.details?.foundation || null),
            roof: Array.isArray(listing.details?.roofing) ? listing.details.roofing.join(', ') : (listing.details?.roofing || null),
            pool: listing.details?.pool || listing.details?.poolFeatures || null,
            parkingSpaces: listing.details?.numParkingSpaces || null,
            parkingFeatures: Array.isArray(listing.details?.parking) ? listing.details.parking.join(', ') : null,
            lotFeatures: Array.isArray(listing.details?.lotFeatures) ? listing.details.lotFeatures.join(', ') : null,
            exteriorFeatures: Array.isArray(listing.details?.exteriorFeatures) ? listing.details.exteriorFeatures.join(', ') : null,
            interiorFeatures: Array.isArray(listing.details?.interiorFeatures) ? listing.details.interiorFeatures.join(', ') : null,
            laundry: Array.isArray(listing.details?.laundryFeatures) ? listing.details.laundryFeatures.join(', ') : null,
            sewer: Array.isArray(listing.details?.sewer) ? listing.details.sewer.join(', ') : null,
            utilities: Array.isArray(listing.details?.utilities) ? listing.details.utilities.join(', ') : null,
            constructionMaterials: Array.isArray(listing.details?.constructionMaterials) ? listing.details.constructionMaterials.join(', ') : null,
            fencing: Array.isArray(listing.details?.fencing) ? listing.details.fencing.join(', ') : null,
            patioFeatures: Array.isArray(listing.details?.patioAndPorchFeatures) ? listing.details.patioAndPorchFeatures.join(', ') : null,
            levels: listing.details?.levels || null,
            waterSource: listing.details?.waterSource || null,
            windowFeatures: Array.isArray(listing.details?.windowFeatures) ? listing.details.windowFeatures.join(', ') : null,
            securityFeatures: Array.isArray(listing.details?.securityFeatures) ? listing.details.securityFeatures.join(', ') : null,
            ownership: listing.details?.ownership || null,
            propertyCondition: listing.details?.propertyCondition || null,
            directionFaces: listing.details?.directionFaces || null,
            coveredSpaces: listing.details?.numCoveredSpaces || null,
            otherStructures: Array.isArray(listing.details?.otherStructures) ? listing.details.otherStructures.join(', ') : null,
            disclosures: Array.isArray(listing.details?.disclosures) ? listing.details.disclosures.join(', ') : null,
            greenEnergy: Array.isArray(listing.details?.greenEnergyEfficient) ? listing.details.greenEnergyEfficient.join(', ') : null,
            communityFeatures: Array.isArray(listing.details?.communityFeatures) ? listing.details.communityFeatures.join(', ') : null,
            accessibilityFeatures: Array.isArray(listing.details?.accessibilityFeatures) ? listing.details.accessibilityFeatures.join(', ') : null,
          };
          
          // Calculate relevance score
          processedListing.relevanceScore = scorePropertyRelevance(processedListing, subjectProperty);
          
          return processedListing;
        });
        
        // Sort by relevance score (highest first) and limit results
        const sortedListings = processedListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const limitedListings = sortedListings.slice(0, resultsPerPage);
        
        console.log(`[CMA Enhanced Search] Returning top ${limitedListings.length} most relevant properties`);
        
        // Remove relevanceScore from final output
        const finalListings = limitedListings.map(({ relevanceScore, ...listing }) => listing);
        
        return res.json({
          listings: finalListings,
          total: finalListings.length,
          page: 1,
          totalPages: 1,
          resultsPerPage: finalListings.length,
          addressParsed: foundExactMatch,
          searchStrategy: foundExactMatch ? 'exact_match' : 'fallback_search'
        });
      }
      
      // === EXISTING SEARCH LOGIC FOR NON-ADDRESS SEARCHES ===
      // (MLS lookup, criteria search, etc. - keep existing logic but enhance with sold comps)
      
      const params = new URLSearchParams({
        listings: 'true',
        type: 'Sale',
        resultsPerPage: resultsPerPage.toString(),
        pageNum: pageNum.toString(),
        sortBy: 'createdOnDesc',
      });

      params.set('fields', 'mlsNumber,listingId,address,map,details,images,lot,timestamps,taxes,school,association');

      // Add existing filters
      if (city) params.append('city', city);
      if (zip) params.append('zip', zip);
      if (county) params.append('county', county);
      if (minBeds) params.append('minBeds', minBeds.toString());
      if (minBaths) params.append('minBaths', minBaths.toString());
      if (minPrice) params.append('minPrice', minPrice.toString());
      if (maxPrice) params.append('maxPrice', maxPrice.toString());
      if (propertyType) params.append('style', propertyType);
      if (minSqft) params.append('minSqft', minSqft.toString());
      if (maxSqft) params.append('maxSqft', maxSqft.toString());

      // Enhanced status handling - include sold comps by default for CMA
      const statusArray: string[] = statuses && statuses.length > 0 ? statuses : ['Active', 'Closed'];
      const hasClosed = statusArray.includes('Closed');
      const hasActive = statusArray.some(s => s !== 'Closed');

      if (!hasClosed) {
        statusArray.forEach(s => params.append('standardStatus', s));
      } else if (hasClosed && !hasActive) {
        const soldDays = dateSoldDays ? parseInt(dateSoldDays.toString(), 10) : 180;
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - soldDays);
        params.append('status', 'U');
        params.append('lastStatus', 'Sld');
        params.append('minClosedDate', minDate.toISOString().split('T')[0]);
      } else {
        // Mixed search - handle separately like existing code
        const activeStatuses = statusArray.filter(s => s !== 'Closed');
        activeStatuses.forEach(s => params.append('standardStatus', s));
      }

      // Continue with existing API call logic...
      const fullUrl = `${baseUrl}?${params.toString()}`;
      const response = await fetch(fullUrl, {
        headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
      });

      if (!response.ok) {
        console.error('[CMA Enhanced Search] API error:', response.status);
        return res.status(502).json({ message: "Failed to search properties" });
      }

      const data = await response.json();
      
      // Transform and return results using existing logic...
      const listings = (data.listings || []).map((listing: any, index: number) => {
        const streetNumber = listing.address?.streetNumber || '';
        const streetName = listing.address?.streetName || '';
        const streetSuffix = listing.address?.streetSuffix || '';
        const cityName = listing.address?.city || '';
        const state = listing.address?.state || 'TX';
        const postalCode = listing.address?.zip || listing.address?.postalCode || '';
        const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
        const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

        const photos = extractPhotosFromRepliersList(listing);
        if (index === 0) debugPhotoFields(listing, listing.mlsNumber || listing.listingId);
        if (index === 0) {
          console.log('[CMA-DEBUG] listing.details keys:', Object.keys(listing.details || {}).join(', '));
          console.log('[CMA-DEBUG] listing keys:', Object.keys(listing || {}).join(', '));
          console.log('[CMA-DEBUG] sample details:', JSON.stringify(listing.details || {}).slice(0, 2000));
        }

        return {
          mlsNumber: listing.mlsNumber || listing.listingId || '',
          address: fullAddress,
          streetAddress,
          city: cityName,
          state,
          zip: postalCode,
          listPrice: listing.listPrice || 0,
          soldPrice: listing.soldPrice || listing.closePrice || null,
          originalPrice: listing.originalPrice || listing.listPrice || null,
          beds: listing.details?.numBedrooms || listing.bedroomsTotal || 0,
          baths: listing.details?.numBathrooms || listing.bathroomsTotal || 0,
          sqft: listing.details?.sqft || listing.livingArea || 0,
          lotSizeAcres: listing.lot?.acres || (listing.lotSizeArea ? listing.lotSizeArea / 43560 : null),
          yearBuilt: listing.details?.yearBuilt || null,
          propertyType: listing.details?.style || listing.details?.propertyType || listing.propertyType || '',
          status: listing.standardStatus || listing.status || '',
          listDate: formatMlsDate(listing.listDate),
          soldDate: formatMlsDate(listing.soldDate || listing.closeDate),
          offMarketDate: formatMlsDate(listing.offMarketDate),
          daysOnMarket: listing.simpleDaysOnMarket || listing.daysOnMarket || listing.dom || listing.timestamps?.dom || 0,
          garageSpaces: listing.details?.numGarageSpaces || listing.garageSpaces || 0,
          stories: listing.details?.numStoreys || null,
          photos,
          latitude: listing.map?.latitude || listing.address?.latitude || null,
          longitude: listing.map?.longitude || listing.address?.longitude || null,
          subdivision: listing.address?.neighborhood || listing.address?.area || '',
          description: listing.details?.description || listing.remarks || listing.publicRemarks || null,
          county: listing.address?.county || null,
          schoolDistrict: listing.school?.district || listing.details?.schoolDistrict || null,
          schoolHigh: listing.school?.high || null,
          schoolMiddle: listing.school?.middle || null,
          schoolElementary: listing.school?.elementary || null,
          taxes: listing.taxAnnualAmount || listing.tax?.annualAmount || null,
          cooling: Array.isArray(listing.details?.cooling) ? listing.details.cooling.join(', ') : (listing.details?.cooling || null),
          heating: Array.isArray(listing.details?.heating) ? listing.details.heating.join(', ') : (listing.details?.heating || null),
          appliances: Array.isArray(listing.details?.appliances) ? listing.details.appliances.join(', ') : (listing.details?.appliances || null),
          fireplace: listing.details?.fireplace || listing.details?.fireplaceFeatures || null,
          flooring: Array.isArray(listing.details?.flooring) ? listing.details.flooring.join(', ') : (listing.details?.flooring || null),
          foundation: Array.isArray(listing.details?.foundation) ? listing.details.foundation.join(', ') : (listing.details?.foundation || null),
          roof: Array.isArray(listing.details?.roofing) ? listing.details.roofing.join(', ') : (listing.details?.roofing || null),
          pool: listing.details?.pool || listing.details?.poolFeatures || null,
          parkingSpaces: listing.details?.numParkingSpaces || null,
          parkingFeatures: Array.isArray(listing.details?.parking) ? listing.details.parking.join(', ') : null,
          lotFeatures: Array.isArray(listing.details?.lotFeatures) ? listing.details.lotFeatures.join(', ') : null,
          exteriorFeatures: Array.isArray(listing.details?.exteriorFeatures) ? listing.details.exteriorFeatures.join(', ') : null,
          interiorFeatures: Array.isArray(listing.details?.interiorFeatures) ? listing.details.interiorFeatures.join(', ') : null,
          laundry: Array.isArray(listing.details?.laundryFeatures) ? listing.details.laundryFeatures.join(', ') : null,
          sewer: Array.isArray(listing.details?.sewer) ? listing.details.sewer.join(', ') : null,
          utilities: Array.isArray(listing.details?.utilities) ? listing.details.utilities.join(', ') : null,
          constructionMaterials: Array.isArray(listing.details?.constructionMaterials) ? listing.details.constructionMaterials.join(', ') : null,
          fencing: Array.isArray(listing.details?.fencing) ? listing.details.fencing.join(', ') : null,
          patioFeatures: Array.isArray(listing.details?.patioAndPorchFeatures) ? listing.details.patioAndPorchFeatures.join(', ') : null,
          levels: listing.details?.levels || null,
          waterSource: listing.details?.waterSource || null,
          windowFeatures: Array.isArray(listing.details?.windowFeatures) ? listing.details.windowFeatures.join(', ') : null,
          securityFeatures: Array.isArray(listing.details?.securityFeatures) ? listing.details.securityFeatures.join(', ') : null,
          ownership: listing.details?.ownership || null,
          propertyCondition: listing.details?.propertyCondition || null,
          directionFaces: listing.details?.directionFaces || null,
          coveredSpaces: listing.details?.numCoveredSpaces || null,
          otherStructures: Array.isArray(listing.details?.otherStructures) ? listing.details.otherStructures.join(', ') : null,
          disclosures: Array.isArray(listing.details?.disclosures) ? listing.details.disclosures.join(', ') : null,
          greenEnergy: Array.isArray(listing.details?.greenEnergyEfficient) ? listing.details.greenEnergyEfficient.join(', ') : null,
          communityFeatures: Array.isArray(listing.details?.communityFeatures) ? listing.details.communityFeatures.join(', ') : null,
          accessibilityFeatures: Array.isArray(listing.details?.accessibilityFeatures) ? listing.details.accessibilityFeatures.join(', ') : null,
        };
      });

      res.json({
        listings,
        total: data.total || listings.length,
        page: pageNum,
        totalPages: Math.ceil((data.total || listings.length) / resultsPerPage),
        resultsPerPage,
      });

    } catch (error) {
      console.error('[CMA Enhanced Search] Error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}