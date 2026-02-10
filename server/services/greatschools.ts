/**
 * GreatSchools NearbySchools API v2 Service
 * 
 * Fetches school data from GreatSchools API and caches results in PostgreSQL.
 * API docs: https://documenter.getpostman.com/view/27756678/2sA3s7hoDd
 * 
 * Attribution requirements:
 *  - GreatSchools logo linked to greatschools.org (rel="nofollow")
 *  - Copyright: "Data provided by GreatSchools.org © 2025. All rights reserved."
 *  - School names link to GreatSchools profile pages
 *  - Rating band display (Below average / Average / Above average)
 */

import { db } from '../db';
import { pulseSchoolsCache } from '@shared/schema';
import { and, eq, gte } from 'drizzle-orm';

const GS_API_BASE = 'https://gs-api.greatschools.org/v2';
const GS_API_KEY = process.env.GREATSCHOOLS_API_KEY || '7CEAP4qq0YaoXawqXHPSf7rJArEwHpWG45EA5QVF';

// Cache TTL: 7 days (school data doesn't change often)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GreatSchool {
  universalId: string;
  ncesId: string | null;
  name: string;
  schoolSummary: string | null;
  type: string; // 'public', 'private', 'charter', 'oosle'
  levelCodes: string; // 'e', 'm', 'h', 'p' (elementary, middle, high, preschool)
  level: string; // grade levels e.g. "PK,KG,1,2,3,4,5"
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  county: string | null;
  lat: number;
  lon: number;
  districtName: string | null;
  districtId: number | null;
  webSite: string | null;
  overviewUrl: string; // GreatSchools profile page
  ratingBand: string | null; // 'Above average', 'Average', 'Below average', or null
  distance: number; // miles from search point
}

interface GSApiResponse {
  schools: Array<{
    'universal-id': string;
    'nces-id': string | null;
    name: string;
    'school-summary': string | null;
    type: string;
    'level-codes': string;
    level: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string | null;
    county: string | null;
    lat: number;
    lon: number;
    'district-name': string | null;
    'district-id': number | null;
    'web-site': string | null;
    'overview-url': string;
    rating_band: string | null;
    distance: number;
  }>;
  total_count: number;
  cur_page: number;
  max_page_num: number;
}

/**
 * Transform the raw GS API response to our clean interface
 */
function transformSchool(raw: GSApiResponse['schools'][0]): GreatSchool {
  return {
    universalId: raw['universal-id'],
    ncesId: raw['nces-id'],
    name: raw.name,
    schoolSummary: raw['school-summary'],
    type: raw.type,
    levelCodes: raw['level-codes'],
    level: raw.level,
    street: raw.street,
    city: raw.city,
    state: raw.state,
    zip: raw.zip,
    phone: raw.phone,
    county: raw.county,
    lat: raw.lat,
    lon: raw.lon,
    districtName: raw['district-name'],
    districtId: raw['district-id'],
    webSite: raw['web-site'],
    overviewUrl: raw['overview-url'],
    ratingBand: raw.rating_band === 'null' ? null : raw.rating_band,
    distance: raw.distance,
  };
}

/**
 * Generate a cache key from lat/lon/radius (rounded to ~0.01 degree grid)
 */
function cacheKey(lat: number, lon: number, radius: number): string {
  // Round to 2 decimal places (~1km precision) for cache grouping
  const latKey = lat.toFixed(2);
  const lonKey = lon.toFixed(2);
  return `${latKey},${lonKey},${radius}`;
}

/**
 * Fetch nearby schools from GreatSchools API
 */
async function fetchFromApi(
  lat: number,
  lon: number,
  radius: number = 5,
  limit: number = 25,
): Promise<GreatSchool[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    limit: limit.toString(),
  });

  const url = `${GS_API_BASE}/nearby-schools?${params.toString()}`;
  
  console.log(`[GreatSchools] Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': GS_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GreatSchools API error: ${response.status} — ${text.substring(0, 200)}`);
  }

  const data: GSApiResponse = await response.json();
  
  console.log(`[GreatSchools] Found ${data.total_count} schools, returning ${data.schools.length}`);
  
  return data.schools.map(transformSchool);
}

/**
 * Get nearby schools with caching.
 * Checks DB cache first, falls back to API, then caches the result.
 */
export async function getNearbySchools(
  lat: number,
  lon: number,
  radius: number = 5,
  limit: number = 25,
): Promise<GreatSchool[]> {
  const key = cacheKey(lat, lon, radius);
  const cacheExpiry = new Date(Date.now() - CACHE_TTL_MS);

  // Try cache first
  try {
    const cached = await db
      .select()
      .from(pulseSchoolsCache)
      .where(
        and(
          eq(pulseSchoolsCache.cacheKey, key),
          gte(pulseSchoolsCache.fetchedAt, cacheExpiry),
        )
      )
      .limit(1);

    if (cached.length > 0 && cached[0].data) {
      console.log(`[GreatSchools] Cache hit for ${key}`);
      const schools = cached[0].data as unknown as GreatSchool[];
      return schools.slice(0, limit);
    }
  } catch (e) {
    // Cache miss or table doesn't exist — fetch from API
    console.log(`[GreatSchools] Cache miss/error for ${key}`);
  }

  // Fetch from API
  const schools = await fetchFromApi(lat, lon, radius, limit);

  // Cache the result
  try {
    await db
      .insert(pulseSchoolsCache)
      .values({
        cacheKey: key,
        lat: lat.toString(),
        lon: lon.toString(),
        radius,
        data: schools as any,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pulseSchoolsCache.cacheKey,
        set: {
          data: schools as any,
          fetchedAt: new Date(),
        },
      });
    console.log(`[GreatSchools] Cached ${schools.length} schools for ${key}`);
  } catch (e: any) {
    console.warn(`[GreatSchools] Failed to cache: ${e.message}`);
  }

  return schools;
}
