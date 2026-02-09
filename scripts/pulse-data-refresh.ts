#!/usr/bin/env node
/**
 * Pulse V2 Data Refresh Script
 * 
 * Runs all data pipelines in sequence:
 * 1. Zillow ZHVI/ZORI → pulse_zillow_data
 * 2. Census ACS → pulse_census_data
 * 3. Redfin market tracker → pulse_redfin_data
 * 4. Calculated metrics → pulse_metrics
 * 
 * Usage:
 *   npx tsx scripts/pulse-data-refresh.mjs
 *   
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string (required)
 * 
 * Designed to run as a cron job (weekly recommended):
 *   0 2 * * 0  cd /path/to/mission-control && npx tsx scripts/pulse-data-refresh.mjs >> /var/log/pulse-refresh.log 2>&1
 */

// We import from the compiled services — this script is run with tsx
import { refreshZillowData } from '../server/services/zillowService.ts';
import { refreshCensusData } from '../server/services/censusService.ts';
import { refreshRedfinData } from '../server/services/redfinService.ts';
import { refreshPulseMetrics } from '../server/services/pulseMetricsService.ts';

const DIVIDER = '='.repeat(60);

async function main() {
  const startTime = Date.now();
  console.log(DIVIDER);
  console.log(`Pulse V2 Data Refresh — ${new Date().toISOString()}`);
  console.log(DIVIDER);
  
  const results = {
    zillow: { rowsProcessed: 0, errors: [] as string[], duration: 0 },
    census: { rowsProcessed: 0, errors: [] as string[], duration: 0 },
    redfin: { rowsProcessed: 0, errors: [] as string[], duration: 0 },
    metrics: { rowsProcessed: 0, errors: [] as string[], duration: 0 },
  };
  
  // --- 1. Zillow ZHVI/ZORI ---
  console.log(`\n${DIVIDER}`);
  console.log('Step 1/4: Zillow ZHVI + ZORI');
  console.log(DIVIDER);
  {
    const t = Date.now();
    try {
      const r = await refreshZillowData();
      results.zillow = { ...r, duration: Date.now() - t };
    } catch (e) {
      results.zillow.errors.push(`Fatal: ${e}`);
      results.zillow.duration = Date.now() - t;
      console.error('[FATAL] Zillow pipeline crashed:', e);
    }
  }
  
  // --- 2. Census ACS ---
  console.log(`\n${DIVIDER}`);
  console.log('Step 2/4: Census ACS');
  console.log(DIVIDER);
  {
    const t = Date.now();
    try {
      const r = await refreshCensusData();
      results.census = { ...r, duration: Date.now() - t };
    } catch (e) {
      results.census.errors.push(`Fatal: ${e}`);
      results.census.duration = Date.now() - t;
      console.error('[FATAL] Census pipeline crashed:', e);
    }
  }
  
  // --- 3. Redfin ---
  console.log(`\n${DIVIDER}`);
  console.log('Step 3/4: Redfin Market Tracker');
  console.log(DIVIDER);
  {
    const t = Date.now();
    try {
      const r = await refreshRedfinData();
      results.redfin = { ...r, duration: Date.now() - t };
    } catch (e) {
      results.redfin.errors.push(`Fatal: ${e}`);
      results.redfin.duration = Date.now() - t;
      console.error('[FATAL] Redfin pipeline crashed:', e);
    }
  }
  
  // --- 4. Calculated Metrics ---
  console.log(`\n${DIVIDER}`);
  console.log('Step 4/4: Calculated Metrics');
  console.log(DIVIDER);
  {
    const t = Date.now();
    try {
      const r = await refreshPulseMetrics();
      results.metrics = { ...r, duration: Date.now() - t };
    } catch (e) {
      results.metrics.errors.push(`Fatal: ${e}`);
      results.metrics.duration = Date.now() - t;
      console.error('[FATAL] Metrics pipeline crashed:', e);
    }
  }
  
  // --- Summary ---
  const totalDuration = Date.now() - startTime;
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);
  const totalRows = Object.values(results).reduce((sum, r) => sum + r.rowsProcessed, 0);
  
  console.log(`\n${DIVIDER}`);
  console.log('SUMMARY');
  console.log(DIVIDER);
  console.log(`Total duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
  console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log('');
  
  for (const [name, result] of Object.entries(results)) {
    const status = result.errors.length === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${name.padEnd(10)} — ${result.rowsProcessed.toLocaleString()} rows, ${(result.duration / 1000).toFixed(1)}s${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`);
  }
  
  if (totalErrors > 0) {
    console.log(`\n--- ERRORS ---`);
    for (const [name, result] of Object.entries(results)) {
      for (const err of result.errors) {
        console.log(`  [${name}] ${err}`);
      }
    }
  }
  
  console.log(`\n${DIVIDER}`);
  console.log(`Finished at ${new Date().toISOString()}`);
  console.log(DIVIDER);
  
  // Exit with error code if any pipeline had errors
  if (totalErrors > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch((e) => {
  console.error('Unhandled error in pulse-data-refresh:', e);
  process.exit(2);
});
