/**
 * Repliers API Client (Mission Control)
 * 
 * Repliers is the single source of truth for MLS data.
 * All listing data flows through this API.
 * 
 * API: https://api.repliers.io
 * 
 * Adapted from spyglass-idx/src/lib/repliers-api.ts for use in Mission Control
 */

const REPLIERS_API_URL = process.env.REPLIERS_API_URL || 'https://api.repliers.io';
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY || process.env.IDX_GRID_API_KEY || '';

/** Timeout for Repliers API calls (ms). */
const REPLIERS_TIMEOUT_MS = 8_000;

interface RepliersRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

// Actual Repliers API listing format
interface RepliersListing {
  mlsNumber: string;
  resource: string;
  status: string;
  class: string;
  type: string;
  listPrice: number;
  listDate: string;
  lastStatus: string;
  soldPrice: number | null;
  soldDate: string | null;
  originalPrice: number;
  address: {
    area: string;
    city: string;
    country: string;
    district: string | null;
    neighborhood: string;
    streetDirection: string | null;
    streetName: string;
    streetNumber: string;
    streetSuffix: string;
    unitNumber: string | null;
    zip: string;
    state: string;
    unparsedAddress?: string;
  };
  map: {
    latitude: number;
    longitude: number;
    point: string;
  };
  permissions: {
    displayAddressOnInternet: string;
    displayPublic: string;
    displayInternetEntireListing: string;
  };
  images: string[];
  photoCount: number;
  details: {
    airConditioning: string | null;
    basement1: string | null;
    basement2: string | null;
    description: string;
    numBedrooms?: number;
    numBathrooms?: number;
    numBedroomsPlus?: number;
    numBedroomsTotal?: number;
    numBathroomsFull?: number;
    sqft?: number;
    livingArea?: number;
    yearBuilt?: number;
    propertyType?: string;
    style?: string;
    lotSize?: string;
    [key: string]: any;
  };
  daysOnMarket?: number;
  lastUpdate?: string;
}

interface RepliersResponse {
  apiVersion: number;
  page: number;
  numPages: number;
  pageSize: number;
  count: number;
  statistics: {
    listPrice: {
      min: number;
      max: number;
    };
  };
  listings: RepliersListing[];
}

export interface Listing {
  id: string;
  mlsNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
    neighborhood?: string;
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType: 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family' | 'Land';
  status: 'Active' | 'Pending' | 'Sold' | 'Coming Soon';
  daysOnMarket: number;
  photos: string[];
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  listDate: string;
  updatedAt: string;
}

export interface SearchFilters {
  page?: number;
  pageSize?: number;
  type?: 'Sale' | 'Rent' | 'Sold';
  status?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  city?: string;
  area?: string;
  zip?: string;
  sort?: 'price-asc' | 'price-desc' | 'date-desc' | 'sqft-desc';
  polygon?: Array<{ lat: number; lng: number }> | Array<[number, number]>;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface SearchResults {
  listings: Listing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Simple fetch with timeout and retry
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = REPLIERS_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Make authenticated request to Repliers API
 */
async function repliersRequest<T>({ 
  endpoint, 
  method = 'GET', 
  body, 
  params 
}: RepliersRequestOptions): Promise<T> {
  const url = new URL(endpoint, REPLIERS_API_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'REPLIERS-API-KEY': REPLIERS_API_KEY,
  };

  const response = await fetchWithTimeout(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: REPLIERS_TIMEOUT_MS,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Repliers API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get Repliers image URL
 */
export function getImageUrl(imagePath: string): string {
  // Repliers images are served from their CDN
  return `https://cdn.repliers.io/${imagePath}`;
}

/**
 * Transform Repliers listing to our Listing format
 */
function transformListing(raw: RepliersListing): Listing {
  const address = raw.address;
  const street = raw.address.unparsedAddress || `${address.streetNumber} ${address.streetName} ${address.streetSuffix || ''}`.trim();
  const unit = address.unitNumber ? ` #${address.unitNumber}` : '';
  
  // sqft can be a string or number
  const sqft = typeof raw.details.sqft === 'string' 
    ? parseInt(raw.details.sqft, 10) || 0 
    : raw.details.sqft || raw.details.livingArea || 0;
  
  // yearBuilt can be a string
  const yearBuilt = typeof raw.details.yearBuilt === 'string'
    ? parseInt(raw.details.yearBuilt, 10) || undefined
    : raw.details.yearBuilt;

  // Prioritize total bedrooms over regular bedrooms
  const bedrooms = raw.details.numBedroomsTotal || raw.details.numBedrooms || 0;
  
  // Prioritize full bathrooms over regular bathrooms
  const bathrooms = raw.details.numBathroomsFull || raw.details.numBathrooms || 0;
  
  return {
    id: raw.mlsNumber,
    mlsNumber: raw.mlsNumber,
    address: {
      street: street + unit,
      city: address.city,
      state: address.state,
      zip: address.zip,
      full: `${street}${unit}, ${address.city}, ${address.state} ${address.zip}`,
      neighborhood: address.neighborhood || undefined,
    },
    price: raw.listPrice,
    bedrooms,
    bathrooms,
    sqft,
    lotSize: raw.details.lotSize ? parseFloat(raw.details.lotSize) : undefined,
    yearBuilt,
    propertyType: mapPropertyType(raw.details.propertyType || raw.details.style || raw.class),
    status: mapStatus(raw.status),
    daysOnMarket: raw.daysOnMarket || 0,
    photos: raw.images.map(getImageUrl),
    description: raw.details.description,
    coordinates: {
      lat: raw.map.latitude,
      lng: raw.map.longitude,
    },
    listDate: raw.listDate,
    updatedAt: raw.lastUpdate || raw.listDate,
  };
}

function mapPropertyType(type: string): Listing['propertyType'] {
  if (!type) return 'Single Family';
  const normalized = type.toLowerCase();
  
  if (normalized.includes('condo')) return 'Condo';
  if (normalized.includes('town')) return 'Townhouse';
  if (normalized.includes('multi') || normalized.includes('duplex') || normalized.includes('plex')) return 'Multi-Family';
  if (normalized.includes('land') || normalized.includes('lot')) return 'Land';
  
  return 'Single Family';
}

function mapStatus(status: string): Listing['status'] {
  const mapping: Record<string, Listing['status']> = {
    'A': 'Active',
    'Active': 'Active',
    'P': 'Pending',
    'Pending': 'Pending',
    'S': 'Sold',
    'Sold': 'Sold',
    'CS': 'Coming Soon',
    'Coming Soon': 'Coming Soon',
  };
  return mapping[status] || 'Active';
}

/**
 * Search listings with filters
 * Uses Repliers /listings endpoint with query params
 */
export async function searchListings(filters: SearchFilters): Promise<SearchResults> {
  const params: Record<string, string | number | boolean | undefined> = {
    listings: 'true',
    pageNum: filters.page || 1,
    resultsPerPage: filters.pageSize || 24,
  };

  // Type filter - default to sales only (exclude rentals)
  params.type = filters.type || 'Sale';

  // Status filter - Repliers uses single letters
  if (filters.status?.length) {
    const statusMap: Record<string, string> = {
      'Active': 'A',
      'Pending': 'P',
      'Sold': 'S',
    };
    params.status = filters.status.map(s => statusMap[s] || s).join(',');
  } else {
    params.status = 'A'; // Default to active
  }

  // Price filters
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;

  // Beds/baths
  if (filters.minBeds) params.minBeds = filters.minBeds;
  if (filters.maxBeds) params.maxBeds = filters.maxBeds;
  if (filters.minBaths) params.minBaths = filters.minBaths;

  // Location filters — only one source at a time
  if (filters.zip) {
    params['raw.PostalCode'] = filters.zip;
    // zip takes priority — remove conflicting location params
    delete params.city;
    delete params.area;
  } else if (filters.city) {
    params.city = filters.city;
  } else if (filters.area) {
    params.area = filters.area;
  }

  // Sort - Repliers uses camelCase values
  if (filters.sort) {
    const sortMapping: Record<string, string> = {
      'price-asc': 'listPriceAsc',
      'price-desc': 'listPriceDesc',
      'date-desc': 'createdOnDesc',
      'sqft-desc': 'sqftDesc',
    };
    params.sortBy = sortMapping[filters.sort] || 'createdOnDesc';
  } else {
    params.sortBy = 'createdOnDesc';
  }

  // Polygon filter - requires POST with "map" in body
  // Format: [[[lng, lat], [lng, lat], ...]]
  if (filters.polygon && filters.polygon.length > 0) {
    // Convert to Repliers format: [[[lng, lat], ...]]
    const ring = filters.polygon.map(p => 
      Array.isArray(p) ? [p[1], p[0]] : [p.lng, p.lat]
    );
    // Close the ring if not closed
    if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) {
      ring.push(ring[0]);
    }
    
    const response = await repliersRequest<RepliersResponse>({
      endpoint: '/listings',
      method: 'POST',
      params,
      body: { map: [ring] },
    });
    
    return {
      listings: response.listings.map(transformListing),
      total: response.count,
      page: response.page,
      pageSize: response.pageSize,
      hasMore: response.page < response.numPages,
    };
  }

  // Bounding box (map view) - uses GET with lat/lng params
  if (filters.bounds) {
    params.minLatitude = filters.bounds.south;
    params.maxLatitude = filters.bounds.north;
    params.minLongitude = filters.bounds.west;
    params.maxLongitude = filters.bounds.east;
  }

  const response = await repliersRequest<RepliersResponse>({
    endpoint: '/listings',
    params,
  });

  return {
    listings: response.listings.map(transformListing),
    total: response.count,
    page: response.page,
    pageSize: response.pageSize,
    hasMore: response.page < response.numPages,
  };
}

/**
 * Get single listing by MLS number
 */
export async function getListing(mlsNumber: string): Promise<Listing | null> {
  try {
    const response = await repliersRequest<RepliersResponse>({
      endpoint: '/listings',
      params: { mlsNumber },
    });
    
    if (response.listings.length === 0) return null;
    return transformListing(response.listings[0]);
  } catch (error) {
    console.error(`Failed to fetch listing ${mlsNumber}:`, error);
    return null;
  }
}

/**
 * Search listings within a community polygon using Repliers geo-spatial API
 */
export async function searchByPolygon(
  polygon: Array<[number, number]>, // [lng, lat] format
  additionalFilters?: Partial<SearchFilters>
): Promise<SearchResults> {
  return searchListings({
    ...additionalFilters,
    polygon: polygon.map(([lng, lat]) => ({ lat, lng })),
  });
}