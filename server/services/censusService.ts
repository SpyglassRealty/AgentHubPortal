/**
 * Census ACS 5-Year Data Pipeline
 * 
 * Fetches demographic data from the US Census Bureau API by ZCTA.
 * API: https://api.census.gov/data/{year}/acs/acs5
 * No API key required (but rate-limited without one).
 * 
 * Variables fetched:
 * - B01003_001E: Total population
 * - B19013_001E: Median household income
 * - B01002_001E: Median age
 * - B25003_001E: Total tenure (owner + renter)
 * - B25003_002E: Owner-occupied
 * - B17001_001E: Poverty status total
 * - B17001_002E: Below poverty
 * - B15003_001E: Education total (25+)
 * - B15003_022E: Bachelor's degree
 * - B15003_023E: Master's degree
 * - B15003_024E: Professional degree
 * - B15003_025E: Doctorate
 * - B08006_001E: Commuting total
 * - B08006_017E: Worked from home
 * - B25001_001E: Housing units
 * - B11001_001E: Total households
 * - B11001_002E: Family households
 * - B25007_003E+004E+005E: Owners 25-34
 * - B25007_006E+007E: Owners 35-44
 * - B25007_012E+013E: Owners 75+
 */

import { db } from '../db';
import { pulseCensusData } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { AUSTIN_MSA_ZIPS, AUSTIN_MSA_ZIP_SET } from '../config/austinMsaZips';

// Census API variables we need
const CENSUS_VARIABLES = [
  'B01003_001E', // population
  'B19013_001E', // median income
  'B01002_001E', // median age
  'B25003_001E', // total tenure
  'B25003_002E', // owner-occupied
  'B17001_001E', // poverty total
  'B17001_002E', // below poverty
  'B15003_001E', // education total 25+
  'B15003_022E', // bachelor's
  'B15003_023E', // master's
  'B15003_024E', // professional
  'B15003_025E', // doctorate
  'B08006_001E', // commuting total
  'B08006_017E', // work from home
  'B25001_001E', // housing units
  'B11001_001E', // total households
  'B11001_002E', // family households
  'B25007_003E', // owner 25-29
  'B25007_004E', // owner 30-34
  'B25007_005E', // owner 35-39 (actually this is 35-44 category start)
  'B25007_006E', // owner 35-44 
  'B25007_007E', // owner 45-54
  'B25007_012E', // owner 75-84
  'B25007_013E', // owner 85+
  'B25007_002E', // owner occupied total (by age)
];

const CENSUS_API_BASE = 'https://api.census.gov/data';

interface CensusApiResponse {
  [index: number]: string[];
}

/**
 * Fetch Census ACS data for all Austin MSA ZCTAs.
 * The Census API allows fetching by ZCTA (zip code tabulation area).
 * We request all ZCTAs and filter client-side.
 */
async function fetchCensusData(year: number): Promise<Map<string, Record<string, number | null>>> {
  const variableList = CENSUS_VARIABLES.join(',');
  
  // Fetch all ZCTAs at once — Census API supports `zip code tabulation area:*`
  // Then filter to Austin MSA zips
  const url = `${CENSUS_API_BASE}/${year}/acs/acs5?get=NAME,${variableList}&for=zip%20code%20tabulation%20area:*`;
  
  console.log(`[Census] Fetching ACS ${year} data...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Census API error (${year}): ${response.status} — ${text.substring(0, 200)}`);
  }
  
  const data: string[][] = await response.json();
  
  if (!data || data.length < 2) {
    throw new Error(`Census API returned no data for year ${year}`);
  }
  
  // First row is headers
  const headers = data[0];
  const rows = data.slice(1);
  
  // Find the ZCTA column
  const zctaCol = headers.findIndex(h => 
    h.toLowerCase().includes('zip code tabulation area') || 
    h === 'zip code tabulation area'
  );
  
  if (zctaCol === -1) {
    throw new Error('Could not find ZCTA column in Census response');
  }
  
  // Build variable index map
  const varIndices: Record<string, number> = {};
  for (const v of CENSUS_VARIABLES) {
    const idx = headers.indexOf(v);
    if (idx !== -1) varIndices[v] = idx;
  }
  
  const result = new Map<string, Record<string, number | null>>();
  
  for (const row of rows) {
    const zcta = row[zctaCol]?.padStart(5, '0');
    if (!zcta || !AUSTIN_MSA_ZIP_SET.has(zcta)) continue;
    
    const values: Record<string, number | null> = {};
    for (const [varName, idx] of Object.entries(varIndices)) {
      const raw = row[idx];
      values[varName] = (raw && raw !== '' && raw !== '-666666666' && raw !== '-888888888' && raw !== '-999999999')
        ? parseFloat(raw)
        : null;
    }
    
    result.set(zcta, values);
  }
  
  console.log(`[Census] Found data for ${result.size} Austin MSA ZCTAs`);
  return result;
}

/**
 * Compute derived rates from raw Census data
 */
function computeDerivedMetrics(raw: Record<string, number | null>): {
  homeownershipRate: number | null;
  povertyRate: number | null;
  collegeDegreeRate: number | null;
  remoteWorkPct: number | null;
  familyHouseholdsPct: number | null;
  homeowners25to44Pct: number | null;
  homeowners75plusPct: number | null;
} {
  const safeDiv = (num: number | null, den: number | null): number | null => {
    if (num === null || den === null || den === 0) return null;
    return (num / den) * 100;
  };
  
  // Homeownership rate
  const homeownershipRate = safeDiv(raw['B25003_002E'], raw['B25003_001E']);
  
  // Poverty rate
  const povertyRate = safeDiv(raw['B17001_002E'], raw['B17001_001E']);
  
  // College degree rate (bachelor's+)
  const collegeDegrees = [raw['B15003_022E'], raw['B15003_023E'], raw['B15003_024E'], raw['B15003_025E']]
    .filter(v => v !== null)
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  const collegeDegreeRate = raw['B15003_001E'] && raw['B15003_001E'] > 0
    ? ((collegeDegrees ?? 0) / raw['B15003_001E']) * 100
    : null;
  
  // Remote work %
  const remoteWorkPct = safeDiv(raw['B08006_017E'], raw['B08006_001E']);
  
  // Family households %
  const familyHouseholdsPct = safeDiv(raw['B11001_002E'], raw['B11001_001E']);
  
  // Homeowners 25-44 %
  const owners25to44 = [raw['B25007_003E'], raw['B25007_004E'], raw['B25007_005E'], raw['B25007_006E']]
    .filter(v => v !== null)
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  const homeowners25to44Pct = raw['B25007_002E'] && raw['B25007_002E'] > 0
    ? ((owners25to44 ?? 0) / raw['B25007_002E']) * 100
    : null;
  
  // Homeowners 75+ %
  const owners75plus = [raw['B25007_012E'], raw['B25007_013E']]
    .filter(v => v !== null)
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  const homeowners75plusPct = raw['B25007_002E'] && raw['B25007_002E'] > 0
    ? ((owners75plus ?? 0) / raw['B25007_002E']) * 100
    : null;
  
  return {
    homeownershipRate,
    povertyRate,
    collegeDegreeRate,
    remoteWorkPct,
    familyHouseholdsPct,
    homeowners25to44Pct,
    homeowners75plusPct,
  };
}

/**
 * Main pipeline: fetch Census ACS data and upsert into pulse_census_data
 */
export async function refreshCensusData(year?: number): Promise<{ rowsProcessed: number; errors: string[] }> {
  // Default to the most recent available ACS year
  // ACS 5-year data for year X is typically released ~Dec of year X+1
  // So 2023 data should be available by late 2024
  const targetYear = year || 2023;
  
  console.log(`[Census] Starting Census ACS ${targetYear} data refresh...`);
  const errors: string[] = [];
  let rowsProcessed = 0;
  
  let censusData: Map<string, Record<string, number | null>>;
  
  try {
    censusData = await fetchCensusData(targetYear);
  } catch (e: any) {
    // Fall back to previous year if current year not available yet
    console.warn(`[Census] Year ${targetYear} failed, trying ${targetYear - 1}...`);
    try {
      censusData = await fetchCensusData(targetYear - 1);
    } catch (e2: any) {
      errors.push(`Census fetch failed for ${targetYear} and ${targetYear - 1}: ${e2.message}`);
      return { rowsProcessed: 0, errors };
    }
  }
  
  const records: Array<{
    zip: string;
    year: number;
    population: number | null;
    medianIncome: string | null;
    medianAge: string | null;
    homeownershipRate: string | null;
    povertyRate: string | null;
    collegeDegreeRate: string | null;
    remoteWorkPct: string | null;
    housingUnits: number | null;
    familyHouseholdsPct: string | null;
    homeowners25to44Pct: string | null;
    homeowners75plusPct: string | null;
  }> = [];
  
  for (const [zip, raw] of Array.from(censusData)) {
    const derived = computeDerivedMetrics(raw);
    
    records.push({
      zip,
      year: targetYear,
      population: raw['B01003_001E'] !== null ? Math.round(raw['B01003_001E']!) : null,
      medianIncome: raw['B19013_001E']?.toString() ?? null,
      medianAge: raw['B01002_001E']?.toString() ?? null,
      homeownershipRate: derived.homeownershipRate?.toFixed(2) ?? null,
      povertyRate: derived.povertyRate?.toFixed(2) ?? null,
      collegeDegreeRate: derived.collegeDegreeRate?.toFixed(2) ?? null,
      remoteWorkPct: derived.remoteWorkPct?.toFixed(2) ?? null,
      housingUnits: raw['B25001_001E'] !== null ? Math.round(raw['B25001_001E']!) : null,
      familyHouseholdsPct: derived.familyHouseholdsPct?.toFixed(2) ?? null,
      homeowners25to44Pct: derived.homeowners25to44Pct?.toFixed(2) ?? null,
      homeowners75plusPct: derived.homeowners75plusPct?.toFixed(2) ?? null,
    });
  }
  
  console.log(`[Census] Upserting ${records.length} records...`);
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    try {
      await db
        .insert(pulseCensusData)
        .values(batch.map(r => ({
          ...r,
          updatedAt: new Date(),
        })))
        .onConflictDoUpdate({
          target: [pulseCensusData.zip, pulseCensusData.year],
          set: {
            population: sql`EXCLUDED.population`,
            medianIncome: sql`EXCLUDED.median_income`,
            medianAge: sql`EXCLUDED.median_age`,
            homeownershipRate: sql`EXCLUDED.homeownership_rate`,
            povertyRate: sql`EXCLUDED.poverty_rate`,
            collegeDegreeRate: sql`EXCLUDED.college_degree_rate`,
            remoteWorkPct: sql`EXCLUDED.remote_work_pct`,
            housingUnits: sql`EXCLUDED.housing_units`,
            familyHouseholdsPct: sql`EXCLUDED.family_households_pct`,
            homeowners25to44Pct: sql`EXCLUDED.homeowners_25_to_44_pct`,
            homeowners75plusPct: sql`EXCLUDED.homeowners_75_plus_pct`,
            updatedAt: new Date(),
          },
        });
      
      rowsProcessed += batch.length;
    } catch (e: any) {
      errors.push(`Census batch at offset ${i}: ${e.message}`);
      console.error(`[Census] Batch upsert error at offset ${i}:`, e.message);
    }
  }
  
  console.log(`[Census] Complete. ${rowsProcessed} rows upserted, ${errors.length} errors.`);
  return { rowsProcessed, errors };
}
