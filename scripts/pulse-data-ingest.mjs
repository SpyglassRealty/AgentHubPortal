#!/usr/bin/env node
/**
 * Pulse V2 Data Ingestion Script
 * 
 * Standalone script to populate Pulse V2 database tables with REAL data from:
 * 1. Zillow ZHVI/ZORI — home values + rental data
 * 2. US Census ACS — demographics
 * 3. Redfin Market Tracker — sales, DOM, inventory
 * 4. Calculated Metrics — overvalued %, mortgage payment, scores, etc.
 * 
 * Run: node scripts/pulse-data-ingest.mjs [--zillow] [--census] [--redfin] [--metrics] [--all]
 * 
 * Created: 2026-02-14 (Nightly Autonomous Work Session)
 */

import pg from 'pg';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';

const { Pool } = pg;

// ─── Config ────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_YqE8BFmMs4iZ@ep-bold-tree-aegn66fy.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DATABASE_URL });

// ─── Austin MSA Zip Codes ──────────────────────────────────
const AUSTIN_MSA_ZIPS = new Set([
  // Travis County
  '73301','73344','78610','78613','78617','78621','78641','78645','78652','78653',
  '78660','78664','78681','78701','78702','78703','78704','78705','78712','78717',
  '78719','78721','78722','78723','78724','78725','78726','78727','78728','78729',
  '78730','78731','78732','78733','78734','78735','78736','78737','78738','78739',
  '78741','78742','78744','78745','78746','78747','78748','78749','78750','78751',
  '78752','78753','78754','78756','78757','78758','78759',
  // Williamson County
  '76527','76537','76574','76578','78615','78626','78628','78630','78633','78634',
  '78642','78646','78665',
  // Hays County
  '78619','78620','78623','78640','78656','78666','78676',
  // Bastrop County
  '78602','78612','78650','78659','78662',
  // Caldwell County
  '78616','78632','78638','78644','78648','78655','78661',
]);

// ─── Zillow Pipeline ──────────────────────────────────────
const ZILLOW_BASE = 'https://files.zillowstatic.com/research/public_csvs';
const ZILLOW_FILES = {
  allHomes: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv`,
  singleFamily: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv`,
  condo: `${ZILLOW_BASE}/zhvi/Zip_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv`,
  rental: `${ZILLOW_BASE}/zori/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv`,
};

function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  
  return { headers, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchZillowCSV(url) {
  const filename = url.split('/').pop();
  console.log(`  Downloading ${filename}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed: ${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  const { headers, rows } = parseCSV(text);
  
  // Filter to Austin MSA
  const filtered = rows.filter(r => {
    const zip = (r.RegionName || '').padStart(5, '0');
    return AUSTIN_MSA_ZIPS.has(zip);
  });
  
  console.log(`  Found ${filtered.length} Austin MSA rows (of ${rows.length} total)`);
  return { headers, rows: filtered };
}

function getDateColumns(row) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return Object.keys(row).filter(k => dateRegex.test(k));
}

async function ingestZillow() {
  console.log('\n═══ ZILLOW ZHVI/ZORI DATA ═══');
  const startTime = Date.now();
  
  const datasets = {};
  for (const [key, url] of Object.entries(ZILLOW_FILES)) {
    try {
      datasets[key] = await fetchZillowCSV(url);
    } catch (e) {
      console.error(`  ✗ ${key}: ${e.message}`);
    }
  }
  
  // Build zip lookup
  const zipLookup = new Map();
  for (const [key, data] of Object.entries(datasets)) {
    if (!data) continue;
    for (const row of data.rows) {
      const zip = row.RegionName.padStart(5, '0');
      if (!zipLookup.has(zip)) zipLookup.set(zip, {});
      zipLookup.get(zip)[key] = row;
    }
  }
  
  // Collect all date columns
  const allDates = new Set();
  for (const data of Object.values(datasets)) {
    if (!data || data.rows.length === 0) continue;
    getDateColumns(data.rows[0]).forEach(d => allDates.add(d));
  }
  
  // Only last 10 years
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 10);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentDates = Array.from(allDates).sort().filter(d => d >= cutoffStr);
  
  console.log(`\n  Processing ${zipLookup.size} zips × ${recentDates.length} dates`);
  
  // Build records
  const records = [];
  for (const [zip, data] of zipLookup) {
    for (const dateCol of recentDates) {
      const hv = data.allHomes?.[dateCol] || null;
      const sf = data.singleFamily?.[dateCol] || null;
      const cd = data.condo?.[dateCol] || null;
      const rv = data.rental?.[dateCol] || null;
      if (!hv && !sf && !cd && !rv) continue;
      records.push([zip, dateCol, hv || null, sf || null, cd || null, rv || null]);
    }
  }
  
  console.log(`  Upserting ${records.length} records...`);
  
  const client = await pool.connect();
  try {
    let inserted = 0;
    const BATCH = 200;
    
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const values = [];
      const params = [];
      
      batch.forEach((r, idx) => {
        const offset = idx * 6;
        values.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6})`);
        params.push(...r);
      });
      
      await client.query(`
        INSERT INTO pulse_zillow_data (zip, date, home_value, single_family_value, condo_value, rent_value)
        VALUES ${values.join(',')}
        ON CONFLICT (zip, date) DO UPDATE SET
          home_value = EXCLUDED.home_value,
          single_family_value = EXCLUDED.single_family_value,
          condo_value = EXCLUDED.condo_value,
          rent_value = EXCLUDED.rent_value,
          updated_at = NOW()
      `, params);
      
      inserted += batch.length;
      if (inserted % 2000 === 0 || i + BATCH >= records.length) {
        process.stdout.write(`\r  Progress: ${inserted}/${records.length} (${Math.round(inserted/records.length*100)}%)`);
      }
    }
    
    console.log(`\n  ✓ Zillow complete: ${inserted} rows in ${((Date.now() - startTime)/1000).toFixed(1)}s`);
    return inserted;
  } finally {
    client.release();
  }
}

// ─── Census Pipeline ──────────────────────────────────────
async function ingestCensus() {
  console.log('\n═══ CENSUS ACS DATA ═══');
  const startTime = Date.now();
  
  // Variables we need
  const variables = [
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
  ];
  
  const varList = variables.join(',');
  
  // Try years in descending order until we find available data
  let censusData = null;
  let usedYear = null;
  
  for (const year of [2023, 2022, 2021]) {
    const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,${varList}&for=zip%20code%20tabulation%20area:*`;
    console.log(`  Trying ACS ${year}...`);
    
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.log(`  → ${year} not available (${resp.status})`);
        continue;
      }
      censusData = await resp.json();
      usedYear = year;
      console.log(`  ✓ Got ACS ${year} data (${censusData.length - 1} total ZCTAs)`);
      break;
    } catch (e) {
      console.log(`  → ${year} failed: ${e.message}`);
    }
  }
  
  if (!censusData || censusData.length < 2) {
    console.error('  ✗ No Census data available');
    return 0;
  }
  
  const headers = censusData[0];
  const rows = censusData.slice(1);
  
  // Find ZCTA column
  const zctaCol = headers.findIndex(h => 
    h.toLowerCase().includes('zip code tabulation area')
  );
  if (zctaCol === -1) {
    console.error('  ✗ No ZCTA column found');
    return 0;
  }
  
  // Variable index map
  const vi = {};
  variables.forEach(v => {
    const idx = headers.indexOf(v);
    if (idx !== -1) vi[v] = idx;
  });
  
  // Process Austin MSA rows
  const records = [];
  for (const row of rows) {
    const zcta = (row[zctaCol] || '').padStart(5, '0');
    if (!AUSTIN_MSA_ZIPS.has(zcta)) continue;
    
    const get = (v) => {
      const idx = vi[v];
      if (idx === undefined) return null;
      const val = row[idx];
      if (!val || val === '' || val === '-666666666' || val === '-888888888' || val === '-999999999') return null;
      return parseFloat(val);
    };
    
    const safeDiv = (num, den) => (num !== null && den !== null && den > 0) ? (num / den) * 100 : null;
    
    const population = get('B01003_001E');
    const medianIncome = get('B19013_001E');
    const medianAge = get('B01002_001E');
    const tenure = get('B25003_001E');
    const ownerOccupied = get('B25003_002E');
    const povertyTotal = get('B17001_001E');
    const belowPoverty = get('B17001_002E');
    const eduTotal = get('B15003_001E');
    const bachelors = get('B15003_022E');
    const masters = get('B15003_023E');
    const professional = get('B15003_024E');
    const doctorate = get('B15003_025E');
    const commTotal = get('B08006_001E');
    const wfh = get('B08006_017E');
    const housingUnits = get('B25001_001E');
    const totalHouseholds = get('B11001_001E');
    const familyHouseholds = get('B11001_002E');
    
    const homeownershipRate = safeDiv(ownerOccupied, tenure);
    const povertyRate = safeDiv(belowPoverty, povertyTotal);
    
    let collegeDegreeRate = null;
    if (eduTotal && eduTotal > 0) {
      const degrees = [bachelors, masters, professional, doctorate].filter(v => v !== null).reduce((a, b) => a + b, 0);
      collegeDegreeRate = (degrees / eduTotal) * 100;
    }
    
    const remoteWorkPct = safeDiv(wfh, commTotal);
    const familyHouseholdsPct = safeDiv(familyHouseholds, totalHouseholds);
    
    records.push([
      zcta, usedYear,
      population !== null ? Math.round(population) : null,
      medianIncome?.toFixed(2) ?? null,
      medianAge?.toFixed(2) ?? null,
      homeownershipRate?.toFixed(2) ?? null,
      povertyRate?.toFixed(2) ?? null,
      collegeDegreeRate?.toFixed(2) ?? null,
      remoteWorkPct?.toFixed(2) ?? null,
      housingUnits !== null ? Math.round(housingUnits) : null,
      familyHouseholdsPct?.toFixed(2) ?? null,
    ]);
  }
  
  console.log(`  Found ${records.length} Austin MSA ZCTAs`);
  
  const client = await pool.connect();
  try {
    let inserted = 0;
    const BATCH = 50;
    
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const values = [];
      const params = [];
      
      batch.forEach((r, idx) => {
        const offset = idx * 11;
        values.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9}, $${offset+10}, $${offset+11})`);
        params.push(...r);
      });
      
      await client.query(`
        INSERT INTO pulse_census_data (zip, year, population, median_income, median_age, homeownership_rate, poverty_rate, college_degree_rate, remote_work_pct, housing_units, family_households_pct)
        VALUES ${values.join(',')}
        ON CONFLICT (zip, year) DO UPDATE SET
          population = EXCLUDED.population,
          median_income = EXCLUDED.median_income,
          median_age = EXCLUDED.median_age,
          homeownership_rate = EXCLUDED.homeownership_rate,
          poverty_rate = EXCLUDED.poverty_rate,
          college_degree_rate = EXCLUDED.college_degree_rate,
          remote_work_pct = EXCLUDED.remote_work_pct,
          housing_units = EXCLUDED.housing_units,
          family_households_pct = EXCLUDED.family_households_pct,
          updated_at = NOW()
      `, params);
      
      inserted += batch.length;
    }
    
    console.log(`  ✓ Census complete: ${inserted} rows in ${((Date.now() - startTime)/1000).toFixed(1)}s`);
    return inserted;
  } finally {
    client.release();
  }
}

// ─── Redfin Pipeline ──────────────────────────────────────
// Redfin's file is HUGE (~300MB gzipped). We'll parse it as a TSV stream.
async function ingestRedfin() {
  console.log('\n═══ REDFIN MARKET DATA ═══');
  const startTime = Date.now();
  
  const REDFIN_URL = 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/zip_code_market_tracker.tsv000.gz';
  
  console.log('  Downloading gzipped TSV (this takes a few minutes)...');
  
  const resp = await fetch(REDFIN_URL);
  if (!resp.ok) throw new Error(`Redfin download failed: ${resp.status}`);
  
  const body = resp.body;
  if (!body) throw new Error('No response body');
  
  // Stream → gunzip → line-by-line parse
  const nodeStream = Readable.fromWeb(body);
  const gunzip = createGunzip();
  const decompressed = nodeStream.pipe(gunzip);
  
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const cutoffDate = fiveYearsAgo.toISOString().split('T')[0];
  
  const records = [];
  let headers = null;
  let totalLines = 0;
  let buffer = '';
  
  await new Promise((resolve, reject) => {
    decompressed.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete last line
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const fields = line.split('\t');
        
        if (!headers) {
          headers = fields.map(h => h.trim().replace(/^"|"$/g, ''));
          continue;
        }
        
        totalLines++;
        if (totalLines % 1000000 === 0) {
          process.stdout.write(`\r  Scanned ${(totalLines/1000000).toFixed(1)}M rows, ${records.length} Austin MSA matches...`);
        }
        
        // Build row object — strip quotes from all field values
        const row = {};
        headers.forEach((h, i) => { row[h] = (fields[i] || '').trim().replace(/^"|"$/g, ''); });
        
        // Filter: zip level only (REGION_TYPE_ID=2 means zip code)
        const regionType = (row.REGION_TYPE || row.region_type || '').toLowerCase();
        const regionTypeId = (row.REGION_TYPE_ID || row.region_type_id || '');
        if (regionType !== 'zip code' && regionType !== 'zip_code' && regionTypeId !== '2') return;
        
        // All Residential only (PROPERTY_TYPE_ID: -1 = All Residential, 1 = Single Family)
        const ptId = row.PROPERTY_TYPE_ID || row.property_type_id || '';
        if (ptId && ptId !== '1' && ptId !== '-1') return;
        
        // Extract zip
        const rawRegion = row.REGION || row.region || '';
        const zipMatch = rawRegion.match(/(\d{5})/);
        if (!zipMatch) return;
        const zip = zipMatch[1];
        if (!AUSTIN_MSA_ZIPS.has(zip)) return;
        
        // Recent data only
        const periodStart = row.PERIOD_BEGIN || row.period_begin || '';
        if (periodStart < cutoffDate) return;
        
        const parseNum = (v) => {
          if (!v || v === '' || v === 'N/A' || v === 'nan') return null;
          const n = parseFloat(v.replace(/[$,]/g, ''));
          return isNaN(n) ? null : n;
        };
        const parseInt2 = (v) => {
          if (!v || v === '' || v === 'N/A' || v === 'nan') return null;
          const n = parseInt(v.replace(/[$,]/g, ''), 10);
          return isNaN(n) ? null : n;
        };
        
        records.push([
          zip,
          periodStart,
          parseNum(row.MEDIAN_SALE_PRICE || row.median_sale_price)?.toString() ?? null,
          parseInt2(row.HOMES_SOLD || row.homes_sold),
          parseInt2(row.MEDIAN_DOM || row.median_dom),
          parseInt2(row.INVENTORY || row.inventory),
          parseNum(row.PRICE_DROPS || row.price_drops)?.toString() ?? null,
          parseNum(row.AVG_SALE_TO_LIST || row.avg_sale_to_list)?.toString() ?? null,
          parseInt2(row.NEW_LISTINGS || row.new_listings),
        ]);
      }
    });
    
    decompressed.on('end', () => {
      // Process remaining buffer
      if (buffer.trim() && headers) {
        totalLines++;
        // Process last line if needed (same logic as above)
      }
      resolve();
    });
    
    decompressed.on('error', reject);
    nodeStream.on('error', reject);
    gunzip.on('error', reject);
  });
  
  console.log(`\n  Scanned ${(totalLines/1000000).toFixed(1)}M total rows, ${records.length} Austin MSA matches`);
  console.log(`  Upserting ${records.length} records...`);
  
  const client = await pool.connect();
  try {
    let inserted = 0;
    const BATCH = 200;
    
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const values = [];
      const params = [];
      
      batch.forEach((r, idx) => {
        const offset = idx * 9;
        values.push(`($${offset+1}, $${offset+2}, $${offset+3}, $${offset+4}, $${offset+5}, $${offset+6}, $${offset+7}, $${offset+8}, $${offset+9})`);
        params.push(...r);
      });
      
      await client.query(`
        INSERT INTO pulse_redfin_data (zip, period_start, median_sale_price, homes_sold, median_dom, inventory, price_drops_pct, sale_to_list_ratio, new_listings)
        VALUES ${values.join(',')}
        ON CONFLICT (zip, period_start) DO UPDATE SET
          median_sale_price = EXCLUDED.median_sale_price,
          homes_sold = EXCLUDED.homes_sold,
          median_dom = EXCLUDED.median_dom,
          inventory = EXCLUDED.inventory,
          price_drops_pct = EXCLUDED.price_drops_pct,
          sale_to_list_ratio = EXCLUDED.sale_to_list_ratio,
          new_listings = EXCLUDED.new_listings,
          updated_at = NOW()
      `, params);
      
      inserted += batch.length;
      if (inserted % 1000 === 0 || i + BATCH >= records.length) {
        process.stdout.write(`\r  Progress: ${inserted}/${records.length} (${Math.round(inserted/records.length*100)}%)`);
      }
    }
    
    console.log(`\n  ✓ Redfin complete: ${inserted} rows in ${((Date.now() - startTime)/1000).toFixed(1)}s`);
    return inserted;
  } finally {
    client.release();
  }
}

// ─── Calculated Metrics Pipeline ──────────────────────────
const MORTGAGE_RATE = 0.0689;
const DOWN_PAYMENT = 0.20;
const EXPENSE_RATIO = 0.60;
const AFFORDABILITY_RATIO = 0.28;

function calcMonthlyMortgage(homeValue) {
  const loan = homeValue * (1 - DOWN_PAYMENT);
  const r = MORTGAGE_RATE / 12;
  const n = 360;
  if (r === 0) return loan / n;
  return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function linearRegressionForecast(points) {
  if (points.length < 6) return null;
  const n = points.length;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  points.forEach(({ x, y }) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  const lastX = points[n - 1].x;
  const curr = slope * lastX + intercept;
  const future = slope * (lastX + 12) + intercept;
  if (curr === 0) return null;
  return ((future - curr) / curr) * 100;
}

async function computeMetrics() {
  console.log('\n═══ CALCULATED METRICS ═══');
  const startTime = Date.now();
  
  const client = await pool.connect();
  try {
    // Get all unique zips that have Zillow data
    const zipResult = await client.query('SELECT DISTINCT zip FROM pulse_zillow_data ORDER BY zip');
    const zips = zipResult.rows.map(r => r.zip);
    console.log(`  Computing metrics for ${zips.length} zips...`);
    
    const today = new Date().toISOString().split('T')[0];
    let processed = 0;
    let errors = 0;
    
    for (const zip of zips) {
      try {
        // Get latest Zillow data
        const zRes = await client.query(
          'SELECT * FROM pulse_zillow_data WHERE zip = $1 ORDER BY date DESC LIMIT 1',
          [zip]
        );
        if (!zRes.rows[0]?.home_value) continue;
        
        const homeValue = parseFloat(zRes.rows[0].home_value);
        
        // Get latest Census data
        const cRes = await client.query(
          'SELECT * FROM pulse_census_data WHERE zip = $1 ORDER BY year DESC LIMIT 1',
          [zip]
        );
        const medianIncome = cRes.rows[0]?.median_income ? parseFloat(cRes.rows[0].median_income) : null;
        const monthlyRent = zRes.rows[0].rental_value ? parseFloat(zRes.rows[0].rental_value) : null;
        
        // Get latest Redfin data
        const rRes = await client.query(
          'SELECT * FROM pulse_redfin_data WHERE zip = $1 ORDER BY period_start DESC LIMIT 1',
          [zip]
        );
        const latestRedfin = rRes.rows[0] || null;
        
        // Value-to-income ratio
        const valueIncomeRatio = medianIncome && medianIncome > 0 ? homeValue / medianIncome : null;
        
        // Historical average for overvalued calc
        let overvaluedPct = null;
        if (valueIncomeRatio !== null) {
          const histResult = await client.query(
            'SELECT home_value FROM pulse_zillow_data WHERE zip = $1 ORDER BY date',
            [zip]
          );
          if (histResult.rows.length > 0 && medianIncome) {
            const ratios = histResult.rows
              .filter(r => r.home_value)
              .map(r => parseFloat(r.home_value) / medianIncome);
            if (ratios.length > 0) {
              const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
              if (avgRatio > 0) {
                overvaluedPct = ((valueIncomeRatio / avgRatio) - 1) * 100;
              }
            }
          }
        }
        
        // Mortgage payment
        const mortgagePayment = calcMonthlyMortgage(homeValue);
        const mtgPctIncome = medianIncome && medianIncome > 0
          ? ((mortgagePayment * 12) / medianIncome) * 100
          : null;
        const salaryToAfford = (mortgagePayment * 12) / AFFORDABILITY_RATIO;
        
        // Cap rate & buy vs rent
        const capRate = monthlyRent ? ((monthlyRent * 12 * (1 - EXPENSE_RATIO)) / homeValue) * 100 : null;
        const buyVsRent = monthlyRent && monthlyRent > 0 ? mortgagePayment / monthlyRent : null;
        
        // Price forecast (12-month linear regression)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const cutoff = twelveMonthsAgo.toISOString().split('T')[0];
        
        const recentResult = await client.query(
          'SELECT date, home_value FROM pulse_zillow_data WHERE zip = $1 AND date >= $2 ORDER BY date',
          [zip, cutoff]
        );
        const forecastData = recentResult.rows
          .filter(r => r.home_value)
          .map((r, i) => ({ x: i, y: parseFloat(r.home_value) }));
        const priceForecast = linearRegressionForecast(forecastData);
        
        // Composite Scores (0-100)
        // Investor Score
        let investorScore = null;
        {
          const scores = [];
          if (capRate !== null) scores.push(Math.min(100, Math.max(0, capRate * 15)));
          if (buyVsRent !== null) scores.push(Math.min(100, Math.max(0, (2.5 - buyVsRent) * 50)));
          if (latestRedfin?.median_dom) scores.push(Math.min(100, Math.max(0, latestRedfin.median_dom * 2)));
          if (scores.length > 0) investorScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
        
        // Growth Score
        let growthScore = null;
        {
          const scores = [];
          if (priceForecast !== null) scores.push(Math.min(100, Math.max(0, 50 + priceForecast * 5)));
          if (forecastData.length >= 12) {
            const first = forecastData[0].y;
            const last = forecastData[forecastData.length - 1].y;
            if (first > 0) {
              const yoyGrowth = ((last - first) / first) * 100;
              scores.push(Math.min(100, Math.max(0, 50 + yoyGrowth * 5)));
            }
          }
          if (scores.length > 0) growthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
        
        // Market Health Score
        let marketHealthScore = null;
        {
          const scores = [];
          if (mtgPctIncome !== null) scores.push(Math.min(100, Math.max(0, 100 - mtgPctIncome * 2)));
          if (overvaluedPct !== null) scores.push(Math.min(100, Math.max(0, 75 - overvaluedPct)));
          if (latestRedfin?.sale_to_list_ratio) {
            const stl = parseFloat(latestRedfin.sale_to_list_ratio);
            scores.push(Math.min(100, Math.max(0, 100 - Math.abs(1.0 - stl) * 200)));
          }
          if (scores.length > 0) marketHealthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
        
        // Upsert
        await client.query(`
          INSERT INTO pulse_metrics (zip, date, overvalued_pct, value_income_ratio, mortgage_payment, mtg_pct_income, salary_to_afford, buy_vs_rent, cap_rate, price_forecast, investor_score, growth_score, market_health_score)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (zip, date) DO UPDATE SET
            overvalued_pct = EXCLUDED.overvalued_pct,
            value_income_ratio = EXCLUDED.value_income_ratio,
            mortgage_payment = EXCLUDED.mortgage_payment,
            mtg_pct_income = EXCLUDED.mtg_pct_income,
            salary_to_afford = EXCLUDED.salary_to_afford,
            buy_vs_rent = EXCLUDED.buy_vs_rent,
            cap_rate = EXCLUDED.cap_rate,
            price_forecast = EXCLUDED.price_forecast,
            investor_score = EXCLUDED.investor_score,
            growth_score = EXCLUDED.growth_score,
            market_health_score = EXCLUDED.market_health_score,
            updated_at = NOW()
        `, [
          zip, today,
          overvaluedPct?.toFixed(2) ?? null,
          valueIncomeRatio?.toFixed(2) ?? null,
          mortgagePayment.toFixed(2),
          mtgPctIncome?.toFixed(2) ?? null,
          salaryToAfford.toFixed(2),
          buyVsRent?.toFixed(2) ?? null,
          capRate?.toFixed(2) ?? null,
          priceForecast?.toFixed(2) ?? null,
          investorScore?.toString() ?? null,
          growthScore?.toString() ?? null,
          marketHealthScore?.toString() ?? null,
        ]);
        
        processed++;
        if (processed % 20 === 0) {
          process.stdout.write(`\r  Progress: ${processed}/${zips.length}`);
        }
      } catch (e) {
        errors++;
        console.error(`\n  ✗ ${zip}: ${e.message}`);
      }
    }
    
    console.log(`\n  ✓ Metrics complete: ${processed} zips in ${((Date.now() - startTime)/1000).toFixed(1)}s (${errors} errors)`);
    return processed;
  } finally {
    client.release();
  }
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all') || args.length === 0;
  
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Pulse V2 — Real Data Ingestion Pipeline      ║');
  console.log('║  Austin Metro Market Intelligence              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nDatabase: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const results = {};
  
  try {
    // Test DB connection
    const testResult = await pool.query('SELECT NOW()');
    console.log(`DB connected: ${testResult.rows[0].now}`);
    
    if (runAll || args.includes('--zillow')) {
      results.zillow = await ingestZillow();
    }
    
    if (runAll || args.includes('--census')) {
      results.census = await ingestCensus();
    }
    
    if (runAll || args.includes('--redfin')) {
      results.redfin = await ingestRedfin();
    }
    
    if (runAll || args.includes('--metrics')) {
      results.metrics = await computeMetrics();
    }
    
    console.log('\n════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('════════════════════════════════════════════');
    for (const [key, count] of Object.entries(results)) {
      console.log(`  ${key}: ${count} rows`);
    }
    console.log('════════════════════════════════════════════\n');
    
  } catch (e) {
    console.error('\n✗ Fatal error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
