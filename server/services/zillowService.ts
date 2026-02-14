/**
 * Zillow ZHVI & ZORI Data Pipeline
 * 
 * Downloads Zillow research CSV files and upserts into pulse_zillow_data.
 * Data source: https://files.zillowstatic.com/research/public_v2/zhvi/
 * 
 * Key datasets:
 * - ZHVI All Homes (SFR+Condo, 35th-65th percentile, smoothed, seasonally adjusted)
 * - ZHVI Single Family
 * - ZHVI Condo
 * - ZORI (Zillow Observed Rent Index)
 */

import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { db } from '../db';
import { pulseZillowData } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { AUSTIN_MSA_ZIP_SET } from '../config/austinMsaZips';

const ZILLOW_BASE = 'https://files.zillowstatic.com/research/public_csvs';

const ZILLOW_FILES = {
  allHomes: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv`,
  singleFamily: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv`,
  condo: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv`,
  rental: `${ZILLOW_BASE}/zori/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv`,
};

interface ZillowRow {
  RegionID: string;
  SizeRank: string;
  RegionName: string;  // This is the zip code
  RegionType: string;
  StateName: string;
  State: string;
  City: string;
  Metro: string;
  CountyName: string;
  [dateColumn: string]: string; // Date columns like "2000-01-31"
}

/**
 * Download and parse a Zillow CSV file.
 * Returns rows filtered to Austin MSA zip codes.
 */
async function downloadAndParseZillowCsv(url: string): Promise<{ headers: string[]; rows: ZillowRow[] }> {
  console.log(`[Zillow] Downloading: ${url.split('/').pop()}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    const rows: ZillowRow[] = [];
    let headers: string[] = [];
    
    const parser = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
    
    parser.on('headers', (h: string[]) => {
      headers = h;
    });
    
    parser.on('readable', () => {
      let record: ZillowRow;
      while ((record = parser.read()) !== null) {
        const zip = record.RegionName?.padStart(5, '0');
        if (zip && AUSTIN_MSA_ZIP_SET.has(zip)) {
          rows.push(record);
        }
      }
    });
    
    parser.on('error', reject);
    parser.on('end', () => {
      // Get headers from the first row keys if not captured
      if (headers.length === 0 && rows.length > 0) {
        headers = Object.keys(rows[0]);
      }
      console.log(`[Zillow] Found ${rows.length} Austin MSA rows`);
      resolve({ headers, rows });
    });
  });
}

/**
 * Extract date columns from the CSV headers.
 * Date columns look like "2000-01-31", "2000-02-29", etc.
 */
function extractDateColumns(row: ZillowRow): string[] {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return Object.keys(row).filter(key => dateRegex.test(key));
}

/**
 * Main pipeline: download all Zillow datasets and merge into pulse_zillow_data
 */
export async function refreshZillowData(): Promise<{ rowsProcessed: number; errors: string[] }> {
  console.log('[Zillow] Starting Zillow ZHVI/ZORI data refresh...');
  const errors: string[] = [];
  let rowsProcessed = 0;
  
  // Download all datasets
  const datasets: {
    allHomes?: ZillowRow[];
    singleFamily?: ZillowRow[];
    condo?: ZillowRow[];
    rental?: ZillowRow[];
  } = {};
  
  try {
    const result = await downloadAndParseZillowCsv(ZILLOW_FILES.allHomes);
    datasets.allHomes = result.rows;
  } catch (e: any) {
    errors.push(`All Homes: ${e.message}`);
    console.error('[Zillow] Failed to download All Homes:', e.message);
  }
  
  try {
    const result = await downloadAndParseZillowCsv(ZILLOW_FILES.singleFamily);
    datasets.singleFamily = result.rows;
  } catch (e: any) {
    errors.push(`Single Family: ${e.message}`);
    console.error('[Zillow] Failed to download Single Family:', e.message);
  }
  
  try {
    const result = await downloadAndParseZillowCsv(ZILLOW_FILES.condo);
    datasets.condo = result.rows;
  } catch (e: any) {
    errors.push(`Condo: ${e.message}`);
    console.error('[Zillow] Failed to download Condo:', e.message);
  }
  
  try {
    const result = await downloadAndParseZillowCsv(ZILLOW_FILES.rental);
    datasets.rental = result.rows;
  } catch (e: any) {
    errors.push(`Rental: ${e.message}`);
    console.error('[Zillow] Failed to download Rental:', e.message);
  }
  
  // Build a lookup: zip -> { allHomes row, singleFamily row, condo row, rental row }
  const zipLookup = new Map<string, {
    allHomes?: ZillowRow;
    singleFamily?: ZillowRow;
    condo?: ZillowRow;
    rental?: ZillowRow;
  }>();
  
  for (const [key, rows] of Object.entries(datasets)) {
    if (!rows) continue;
    for (const row of rows) {
      const zip = row.RegionName.padStart(5, '0');
      if (!zipLookup.has(zip)) zipLookup.set(zip, {});
      (zipLookup.get(zip) as any)[key] = row;
    }
  }
  
  // Collect all unique date columns across all datasets
  const allDates = new Set<string>();
  for (const data of Object.values(datasets)) {
    if (!data || data.length === 0) continue;
    const dates = extractDateColumns(data[0]);
    dates.forEach(d => allDates.add(d));
  }
  
  const sortedDates = Array.from(allDates).sort();
  
  // Only process last 10 years of data to keep table manageable
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  const cutoffDate = tenYearsAgo.toISOString().split('T')[0];
  const recentDates = sortedDates.filter(d => d >= cutoffDate);
  
  console.log(`[Zillow] Processing ${zipLookup.size} zips × ${recentDates.length} dates (${recentDates[0]} to ${recentDates[recentDates.length - 1]})`);
  
  // Batch upsert in chunks
  const BATCH_SIZE = 500;
  const allRecords: Array<{
    zip: string;
    date: string;
    homeValue: string | null;
    singleFamilyValue: string | null;
    condoValue: string | null;
    rentValue: string | null;
  }> = [];
  
  for (const [zip, data] of Array.from(zipLookup)) {
    for (const dateCol of recentDates) {
      const homeValue = data.allHomes?.[dateCol] || null;
      const singleFamilyValue = data.singleFamily?.[dateCol] || null;
      const condoValue = data.condo?.[dateCol] || null;
      const rentValue = data.rental?.[dateCol] || null;
      
      // Skip rows where all values are null/empty
      if (!homeValue && !singleFamilyValue && !condoValue && !rentValue) continue;
      
      allRecords.push({
        zip,
        date: dateCol,
        homeValue: homeValue || null,
        singleFamilyValue: singleFamilyValue || null,
        condoValue: condoValue || null,
        rentValue: rentValue || null,
      });
    }
  }
  
  console.log(`[Zillow] Upserting ${allRecords.length} records in batches of ${BATCH_SIZE}...`);
  
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    
    try {
      await db
        .insert(pulseZillowData)
        .values(batch.map(r => ({
          zip: r.zip,
          date: r.date,
          homeValue: r.homeValue,
          singleFamilyValue: r.singleFamilyValue,
          condoValue: r.condoValue,
          rentValue: r.rentValue,
          updatedAt: new Date(),
        })))
        .onConflictDoUpdate({
          target: [pulseZillowData.zip, pulseZillowData.date],
          set: {
            homeValue: sql`EXCLUDED.home_value`,
            singleFamilyValue: sql`EXCLUDED.single_family_value`,
            condoValue: sql`EXCLUDED.condo_value`,
            rentValue: sql`EXCLUDED.rent_value`,
            updatedAt: new Date(),
          },
        });
      
      rowsProcessed += batch.length;
    } catch (e: any) {
      errors.push(`Batch at offset ${i}: ${e.message}`);
      console.error(`[Zillow] Batch upsert error at offset ${i}:`, e.message);
    }
  }
  
  console.log(`[Zillow] Complete. ${rowsProcessed} rows upserted, ${errors.length} errors.`);
  return { rowsProcessed, errors };
}
