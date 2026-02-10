/**
 * Market Pulse History Service
 * 
 * Creates daily snapshots of key market metrics for historical trending.
 * Combines data from Repliers MLS API, Zillow, and Redfin to create
 * comprehensive daily market pulse records by zip code.
 * 
 * This populates the `market_pulse_history` table for dashboard trending.
 */

import { pool } from '../db';
import { fetchMarketPulseFromAPI } from '../marketPulseService';
import { AUSTIN_MSA_ZIPS } from '../config/austinMsaZips';

interface DailySnapshot {
  date: string;
  zip: string;
  medianHomeValue?: number;
  medianSalePrice?: number;
  medianListPrice?: number;
  pricePerSqft?: number;
  homesSold?: number;
  activeListings?: number;
  newListings?: number;
  pendingListings?: number;
  medianDom?: number;
  avgDom?: number;
  monthsOfSupply?: number;
  saleToListRatio?: number;
  priceDropsPct?: number;
  inventoryGrowthMom?: number;
  salesGrowthMom?: number;
  priceGrowthMom?: number;
  priceGrowthYoy?: number;
  marketTemperature?: string;
  marketScore?: number;
  dataSource: string;
}

/**
 * Calculate market temperature based on key metrics
 */
function calculateMarketTemperature(metrics: {
  dom?: number;
  saleToListRatio?: number;
  monthsOfSupply?: number;
  inventoryGrowth?: number;
}): { temperature: string; score: number } {
  const scores: number[] = [];
  
  // DOM scoring (lower = hotter)
  if (metrics.dom !== undefined) {
    if (metrics.dom < 15) scores.push(100);
    else if (metrics.dom < 30) scores.push(80);
    else if (metrics.dom < 45) scores.push(60);
    else if (metrics.dom < 60) scores.push(40);
    else scores.push(20);
  }
  
  // Sale-to-list ratio scoring (higher = hotter)
  if (metrics.saleToListRatio !== undefined) {
    if (metrics.saleToListRatio > 1.05) scores.push(100);
    else if (metrics.saleToListRatio > 1.0) scores.push(80);
    else if (metrics.saleToListRatio > 0.98) scores.push(60);
    else if (metrics.saleToListRatio > 0.95) scores.push(40);
    else scores.push(20);
  }
  
  // Months of supply scoring (lower = hotter)
  if (metrics.monthsOfSupply !== undefined) {
    if (metrics.monthsOfSupply < 2) scores.push(100);
    else if (metrics.monthsOfSupply < 4) scores.push(80);
    else if (metrics.monthsOfSupply < 6) scores.push(60);
    else if (metrics.monthsOfSupply < 8) scores.push(40);
    else scores.push(20);
  }
  
  // Inventory growth scoring (negative growth = hotter)
  if (metrics.inventoryGrowth !== undefined) {
    if (metrics.inventoryGrowth < -10) scores.push(100);
    else if (metrics.inventoryGrowth < 0) scores.push(80);
    else if (metrics.inventoryGrowth < 10) scores.push(60);
    else if (metrics.inventoryGrowth < 25) scores.push(40);
    else scores.push(20);
  }
  
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 50;
  
  let temperature: string;
  if (averageScore >= 85) temperature = 'Hot';
  else if (averageScore >= 70) temperature = 'Warm';
  else if (averageScore >= 50) temperature = 'Balanced';
  else if (averageScore >= 35) temperature = 'Cool';
  else temperature = 'Cold';
  
  return { temperature, score: averageScore };
}

/**
 * Fetch current MLS data and create daily snapshots
 */
export async function createDailyMarketPulseSnapshot(): Promise<{ snapshotsCreated: number; errors: string[] }> {
  console.log('[Market Pulse History] Creating daily market pulse snapshot...');
  const errors: string[] = [];
  let snapshotsCreated = 0;
  
  const today = new Date().toISOString().split('T')[0];
  const client = await pool.connect();
  
  try {
    // Get current market pulse data from MLS
    const mlsData = await fetchMarketPulseFromAPI();
    
    // Query recent historical data for growth calculations
    const historicalQuery = `
      SELECT 
        date,
        median_home_value,
        median_sale_price, 
        homes_sold,
        active_listings
      FROM market_pulse_history 
      WHERE date >= $1 AND date < $2
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const historicalData = await client.query(historicalQuery, [
      thirtyDaysAgo.toISOString().split('T')[0],
      today
    ]);
    
    // Get Zillow data for home values
    const zillowQuery = `
      SELECT 
        zip,
        home_value,
        date
      FROM pulse_zillow_data 
      WHERE date = (
        SELECT MAX(date) 
        FROM pulse_zillow_data 
        WHERE home_value IS NOT NULL
      )
    `;
    const zillowData = await client.query(zillowQuery);
    const zillowLookup = new Map<string, number>();
    for (const row of zillowData.rows) {
      zillowLookup.set(row.zip, parseFloat(row.home_value));
    }
    
    // Get Redfin data for market metrics
    const redfinQuery = `
      SELECT DISTINCT ON (zip) 
        zip,
        median_sale_price,
        homes_sold,
        median_dom,
        inventory,
        sale_to_list_ratio,
        price_drops_pct,
        new_listings
      FROM pulse_redfin_data 
      ORDER BY zip, period_start DESC
    `;
    const redfinData = await client.query(redfinQuery);
    const redfinLookup = new Map<string, any>();
    for (const row of redfinData.rows) {
      redfinLookup.set(row.zip, row);
    }
    
    // Create snapshots for Austin MSA zip codes
    for (const zip of AUSTIN_MSA_ZIPS) {
      try {
        const zillow = zillowLookup.get(zip);
        const redfin = redfinLookup.get(zip);
        
        // Calculate growth metrics
        const lastMonth = historicalData.rows.find(r => 
          Math.abs(new Date(r.date).getTime() - (Date.now() - 30*24*60*60*1000)) < 3*24*60*60*1000
        );
        
        const lastYear = historicalData.rows.find(r => 
          Math.abs(new Date(r.date).getTime() - (Date.now() - 365*24*60*60*1000)) < 7*24*60*60*1000
        );
        
        const priceGrowthMom = lastMonth?.median_home_value 
          ? ((zillow || 0) - parseFloat(lastMonth.median_home_value)) / parseFloat(lastMonth.median_home_value) * 100
          : null;
          
        const priceGrowthYoy = lastYear?.median_home_value 
          ? ((zillow || 0) - parseFloat(lastYear.median_home_value)) / parseFloat(lastYear.median_home_value) * 100
          : null;
        
        const inventoryGrowthMom = lastMonth?.active_listings && redfin?.inventory
          ? ((redfin.inventory - lastMonth.active_listings) / lastMonth.active_listings) * 100
          : null;
        
        const salesGrowthMom = lastMonth?.homes_sold && redfin?.homes_sold
          ? ((redfin.homes_sold - lastMonth.homes_sold) / lastMonth.homes_sold) * 100
          : null;
        
        // Calculate market temperature
        const tempMetrics = {
          dom: redfin?.median_dom,
          saleToListRatio: redfin?.sale_to_list_ratio ? parseFloat(redfin.sale_to_list_ratio) : undefined,
          monthsOfSupply: redfin?.inventory && redfin?.homes_sold 
            ? (redfin.inventory / (redfin.homes_sold || 1))
            : undefined,
          inventoryGrowth: inventoryGrowthMom
        };
        
        const { temperature, score } = calculateMarketTemperature(tempMetrics);
        
        const snapshot: DailySnapshot = {
          date: today,
          zip,
          medianHomeValue: zillow,
          medianSalePrice: redfin?.median_sale_price ? parseFloat(redfin.median_sale_price) : undefined,
          medianListPrice: undefined, // Could be added from MLS API
          pricePerSqft: undefined, // Could be calculated
          homesSold: redfin?.homes_sold,
          activeListings: redfin?.inventory,
          newListings: redfin?.new_listings,
          pendingListings: undefined, // From MLS API if available
          medianDom: redfin?.median_dom,
          avgDom: redfin?.median_dom, // Redfin provides median, using as proxy for avg
          monthsOfSupply: tempMetrics.monthsOfSupply,
          saleToListRatio: redfin?.sale_to_list_ratio ? parseFloat(redfin.sale_to_list_ratio) : undefined,
          priceDropsPct: redfin?.price_drops_pct ? parseFloat(redfin.price_drops_pct) : undefined,
          inventoryGrowthMom,
          salesGrowthMom,
          priceGrowthMom,
          priceGrowthYoy,
          marketTemperature: temperature,
          marketScore: score,
          dataSource: 'combined_zillow_redfin_mls'
        };
        
        // Insert snapshot (with conflict handling)
        const insertQuery = `
          INSERT INTO market_pulse_history (
            date, zip, median_home_value, median_sale_price, median_list_price,
            price_per_sqft, homes_sold, active_listings, new_listings, pending_listings,
            median_dom, avg_dom, months_of_supply, sale_to_list_ratio, price_drops_pct,
            inventory_growth_mom, sales_growth_mom, price_growth_mom, price_growth_yoy,
            market_temperature, market_score, data_source, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
          )
          ON CONFLICT (date, zip) DO UPDATE SET
            median_home_value = EXCLUDED.median_home_value,
            median_sale_price = EXCLUDED.median_sale_price,
            homes_sold = EXCLUDED.homes_sold,
            active_listings = EXCLUDED.active_listings,
            new_listings = EXCLUDED.new_listings,
            median_dom = EXCLUDED.median_dom,
            avg_dom = EXCLUDED.avg_dom,
            months_of_supply = EXCLUDED.months_of_supply,
            sale_to_list_ratio = EXCLUDED.sale_to_list_ratio,
            price_drops_pct = EXCLUDED.price_drops_pct,
            inventory_growth_mom = EXCLUDED.inventory_growth_mom,
            sales_growth_mom = EXCLUDED.sales_growth_mom,
            price_growth_mom = EXCLUDED.price_growth_mom,
            price_growth_yoy = EXCLUDED.price_growth_yoy,
            market_temperature = EXCLUDED.market_temperature,
            market_score = EXCLUDED.market_score,
            data_source = EXCLUDED.data_source,
            updated_at = NOW()
        `;
        
        await client.query(insertQuery, [
          snapshot.date,
          snapshot.zip,
          snapshot.medianHomeValue,
          snapshot.medianSalePrice,
          snapshot.medianListPrice,
          snapshot.pricePerSqft,
          snapshot.homesSold,
          snapshot.activeListings,
          snapshot.newListings,
          snapshot.pendingListings,
          snapshot.medianDom,
          snapshot.avgDom,
          snapshot.monthsOfSupply,
          snapshot.saleToListRatio,
          snapshot.priceDropsPct,
          snapshot.inventoryGrowthMom,
          snapshot.salesGrowthMom,
          snapshot.priceGrowthMom,
          snapshot.priceGrowthYoy,
          snapshot.marketTemperature,
          snapshot.marketScore,
          snapshot.dataSource
        ]);
        
        snapshotsCreated++;
      } catch (e: any) {
        errors.push(`Snapshot for ${zip}: ${e.message}`);
        console.error(`[Market Pulse History] Error creating snapshot for ${zip}:`, e.message);
      }
    }
    
  } catch (e: any) {
    errors.push(`Service error: ${e.message}`);
    console.error('[Market Pulse History] Service error:', e.message);
  } finally {
    client.release();
  }
  
  console.log(`[Market Pulse History] Complete. ${snapshotsCreated} snapshots created, ${errors.length} errors.`);
  return { snapshotsCreated, errors };
}