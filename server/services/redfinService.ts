/**
 * Redfin Market Tracker Data Pipeline
 * 
 * Downloads the zip-code-level market tracker TSV from Redfin's public S3 bucket.
 * File: zip_code_market_tracker.tsv000.gz (~300MB compressed)
 * 
 * Redfin publishes monthly market stats per zip:
 * - Median sale price, homes sold, DOM, inventory, price drops, sale-to-list ratio
 * 
 * The file is gzipped TSV. We stream-decompress and parse, filtering to Austin MSA.
 */

import { createGunzip } from 'zlib';
import { parse } from 'csv-parse';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { db } from '../db';
import { pulseRedfinData } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { AUSTIN_MSA_ZIP_SET } from '../config/austinMsaZips';

const pipelineAsync = promisify(pipeline);

const REDFIN_URL = 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz';

// Redfin TSV column mapping
// Columns vary slightly but typically include:
// period_begin, period_end, period_duration, region_type, region_type_id,
// table_id, is_seasonally_adjusted, region, city, state, state_code,
// property_type, median_sale_price, median_list_price, median_ppsf,
// median_list_ppsf, homes_sold, inventory, months_of_supply,
// median_dom, avg_sale_to_list, sold_above_list, price_drops,
// off_market_in_two_weeks, ...

// Redfin CSV headers are UPPERCASE and quoted.
// csv-parse strips quotes but preserves case.
// We define both variants for safety.
interface RedfinRow {
  // Uppercase keys (actual format as of 2026)
  PERIOD_BEGIN?: string;
  PERIOD_END?: string;
  PERIOD_DURATION?: string;
  REGION_TYPE?: string;
  REGION_TYPE_ID?: string;
  REGION?: string;
  CITY?: string;
  STATE?: string;
  STATE_CODE?: string;
  PROPERTY_TYPE?: string;
  PROPERTY_TYPE_ID?: string;
  MEDIAN_SALE_PRICE?: string;
  HOMES_SOLD?: string;
  MEDIAN_DOM?: string;
  INVENTORY?: string;
  PRICE_DROPS?: string;
  AVG_SALE_TO_LIST?: string;
  NEW_LISTINGS?: string;
  // Lowercase fallbacks (old format)
  period_begin?: string;
  period_end?: string;
  period_duration?: string;
  region_type?: string;
  region_type_id?: string;
  region?: string;
  city?: string;
  state?: string;
  state_code?: string;
  property_type?: string;
  property_type_id?: string;
  median_sale_price?: string;
  homes_sold?: string;
  median_dom?: string;
  inventory?: string;
  price_drops?: string;
  avg_sale_to_list?: string;
  new_listings?: string;
  [key: string]: string | undefined;
}

/** Get a field value case-insensitively */
function getField(row: RedfinRow, field: string): string {
  return (row[field.toUpperCase()] || row[field.toLowerCase()] || row[field] || '') as string;
}

/** Extract bare zip code from Redfin's REGION field.
 *  Redfin formats it as "Zip Code: 78704" — we need just "78704" */
function extractZipFromRegion(region: string): string {
  if (!region) return '';
  // Remove "Zip Code: " prefix if present
  const match = region.match(/(\d{5})/);
  return match ? match[1] : region.replace(/\D/g, '').slice(0, 5);
}

/**
 * Download and parse the Redfin gzipped TSV, filtering to Austin MSA.
 * 
 * NOTE: The file is very large (~300MB compressed, >1GB uncompressed).
 * We stream it to avoid memory issues.
 */
async function downloadAndParseRedfin(): Promise<RedfinRow[]> {
  console.log('[Redfin] Downloading market tracker data (this may take a few minutes)...');
  
  const response = await fetch(REDFIN_URL);
  if (!response.ok) {
    throw new Error(`Redfin download failed: ${response.status} ${response.statusText}`);
  }
  
  const rows: RedfinRow[] = [];
  let totalProcessed = 0;
  
  return new Promise(async (resolve, reject) => {
    try {
      const gunzip = createGunzip();
      const parser = parse({
        columns: true,
        delimiter: '\t',
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
      });
      
      // Collect Austin MSA rows — only monthly data, all property types
      parser.on('readable', () => {
        let record: RedfinRow;
        while ((record = parser.read()) !== null) {
          totalProcessed++;
          
          // Only zip-level data (case-insensitive)
          const regionType = getField(record, 'region_type').toLowerCase();
          const regionTypeId = getField(record, 'region_type_id');
          if (regionType !== 'zip code' && regionType !== 'zip_code' && regionTypeId !== '2') continue;
          
          // Only "All Residential" property type (id=1 or -1)
          const propTypeId = getField(record, 'property_type_id');
          if (propTypeId && propTypeId !== '1' && propTypeId !== '-1') continue;
          
          // Filter to Austin MSA
          const rawRegion = getField(record, 'region');
          const zip = extractZipFromRegion(rawRegion);
          if (!zip || !AUSTIN_MSA_ZIP_SET.has(zip)) continue;
          
          rows.push(record);
          
          if (totalProcessed % 500000 === 0) {
            console.log(`[Redfin] Processed ${(totalProcessed / 1000000).toFixed(1)}M rows, ${rows.length} Austin MSA matches...`);
          }
        }
      });
      
      parser.on('error', (err) => {
        console.error('[Redfin] Parse error:', err.message);
        reject(err);
      });
      
      parser.on('end', () => {
        console.log(`[Redfin] Parsed ${totalProcessed} total rows, ${rows.length} Austin MSA matches`);
        resolve(rows);
      });
      
      // Stream: response body → gunzip → TSV parser
      const body = response.body;
      if (!body) throw new Error('No response body');
      
      // Convert web ReadableStream to Node stream
      const nodeStream = Readable.fromWeb(body as any);
      nodeStream.pipe(gunzip).pipe(parser);
      
      nodeStream.on('error', reject);
      gunzip.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

function parseNum(val: string | undefined | null): number | null {
  if (!val || val === '' || val === 'N/A' || val === 'nan') return null;
  const cleaned = val.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInt2(val: string | undefined | null): number | null {
  if (!val || val === '' || val === 'N/A' || val === 'nan') return null;
  const cleaned = val.replace(/[$,]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Main pipeline: download Redfin data and upsert into pulse_redfin_data
 */
export async function refreshRedfinData(): Promise<{ rowsProcessed: number; errors: string[] }> {
  console.log('[Redfin] Starting Redfin market data refresh...');
  const errors: string[] = [];
  let rowsProcessed = 0;
  
  let rows: RedfinRow[];
  try {
    rows = await downloadAndParseRedfin();
  } catch (e: any) {
    errors.push(`Download failed: ${e.message}`);
    return { rowsProcessed: 0, errors };
  }
  
  if (rows.length === 0) {
    console.log('[Redfin] No Austin MSA data found');
    return { rowsProcessed: 0, errors: ['No Austin MSA rows in Redfin data'] };
  }
  
  // Only keep data from last 5 years
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const cutoffDate = fiveYearsAgo.toISOString().split('T')[0];
  
  const recentRows = rows.filter(r => getField(r, 'period_begin') >= cutoffDate);
  console.log(`[Redfin] ${recentRows.length} rows in last 5 years (of ${rows.length} total)`);
  
  const records = recentRows.map(r => ({
    zip: extractZipFromRegion(getField(r, 'region')),
    periodStart: getField(r, 'period_begin'),
    medianSalePrice: parseNum(getField(r, 'median_sale_price'))?.toString() ?? null,
    homesSold: parseInt2(getField(r, 'homes_sold')),
    medianDom: parseInt2(getField(r, 'median_dom')),
    inventory: parseInt2(getField(r, 'inventory')),
    priceDropsPct: parseNum(getField(r, 'price_drops'))?.toString() ?? null,
    saleToListRatio: parseNum(getField(r, 'avg_sale_to_list'))?.toString() ?? null,
    newListings: parseInt2(getField(r, 'new_listings')),
    avgSaleToList: parseNum(getField(r, 'avg_sale_to_list'))?.toString() ?? null,
  }));
  
  console.log(`[Redfin] Upserting ${records.length} records...`);
  
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    try {
      await db
        .insert(pulseRedfinData)
        .values(batch.map(r => ({
          ...r,
          updatedAt: new Date(),
        })))
        .onConflictDoUpdate({
          target: [pulseRedfinData.zip, pulseRedfinData.periodStart],
          set: {
            medianSalePrice: sql`EXCLUDED.median_sale_price`,
            homesSold: sql`EXCLUDED.homes_sold`,
            medianDom: sql`EXCLUDED.median_dom`,
            inventory: sql`EXCLUDED.inventory`,
            priceDropsPct: sql`EXCLUDED.price_drops_pct`,
            saleToListRatio: sql`EXCLUDED.sale_to_list_ratio`,
            newListings: sql`EXCLUDED.new_listings`,
            avgSaleToList: sql`EXCLUDED.avg_sale_to_list`,
            updatedAt: new Date(),
          },
        });
      
      rowsProcessed += batch.length;
    } catch (e: any) {
      errors.push(`Redfin batch at offset ${i}: ${e.message}`);
      console.error(`[Redfin] Batch upsert error at offset ${i}:`, e.message);
    }
  }
  
  console.log(`[Redfin] Complete. ${rowsProcessed} rows upserted, ${errors.length} errors.`);
  return { rowsProcessed, errors };
}
