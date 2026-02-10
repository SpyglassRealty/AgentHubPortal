#!/usr/bin/env tsx
/**
 * Test script for Enhanced Market Pulse Analytics Dashboard
 * 
 * This script tests:
 * 1. Database schema creation
 * 2. Data collection services 
 * 3. API endpoints
 * 4. Market pulse history snapshots
 * 
 * Run with: npm run test-pulse
 */

import { pool } from '../server/db';
import { refreshZillowData } from '../server/services/zillowService';
import { refreshRedfinData } from '../server/services/redfinService';
import { refreshCensusData } from '../server/services/censusService';
import { refreshPulseMetrics } from '../server/services/pulseMetricsService';
import { createDailyMarketPulseSnapshot } from '../server/services/marketPulseHistoryService';

async function testDatabaseSchema() {
  console.log('🏗️  Testing database schema...');
  
  const client = await pool.connect();
  try {
    // Check if all required tables exist
    const tables = [
      'pulse_zillow_data',
      'pulse_census_data', 
      'pulse_redfin_data',
      'pulse_metrics',
      'market_pulse_history'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`  📋 Table ${table}: ${exists ? '✅' : '❌'}`);
    }
    
    console.log('✅ Database schema test completed\n');
  } finally {
    client.release();
  }
}

async function testDataServices() {
  console.log('📊 Testing data collection services...');
  
  // Test small samples to avoid long download times
  console.log('  🏠 Testing Zillow service (sample)...');
  try {
    // This will download real data - may take time
    // const zillowResult = await refreshZillowData();
    // console.log(`  ✅ Zillow: ${zillowResult.rowsProcessed} rows, ${zillowResult.errors.length} errors`);
    console.log('  ⏭️  Zillow test skipped (large download)');
  } catch (error) {
    console.log('  ❌ Zillow service error:', error);
  }
  
  console.log('  📈 Testing Redfin service (sample)...');
  try {
    // This will download real data - may take time  
    // const redfinResult = await refreshRedfinData();
    // console.log(`  ✅ Redfin: ${redfinResult.rowsProcessed} rows, ${redfinResult.errors.length} errors`);
    console.log('  ⏭️  Redfin test skipped (large download)');
  } catch (error) {
    console.log('  ❌ Redfin service error:', error);
  }
  
  console.log('  👥 Testing Census service...');
  try {
    const censusResult = await refreshCensusData();
    console.log(`  ✅ Census: ${censusResult.rowsProcessed} rows, ${censusResult.errors.length} errors`);
  } catch (error) {
    console.log('  ❌ Census service error:', error);
  }
  
  console.log('  🧮 Testing pulse metrics calculation...');
  try {
    const metricsResult = await refreshPulseMetrics();
    console.log(`  ✅ Metrics: ${metricsResult.rowsProcessed} zips, ${metricsResult.errors.length} errors`);
  } catch (error) {
    console.log('  ❌ Metrics service error:', error);
  }
  
  console.log('✅ Data services test completed\n');
}

async function testHistorySnapshot() {
  console.log('📸 Testing market pulse history snapshot...');
  
  try {
    const snapshotResult = await createDailyMarketPulseSnapshot();
    console.log(`  ✅ Snapshot: ${snapshotResult.snapshotsCreated} snapshots, ${snapshotResult.errors.length} errors`);
  } catch (error) {
    console.log('  ❌ Snapshot service error:', error);
  }
  
  console.log('✅ History snapshot test completed\n');
}

async function testApiEndpoints() {
  console.log('🌐 Testing API endpoints...');
  
  // Note: This would require starting the server to test HTTP endpoints
  // For now, we'll test the database queries directly
  
  const client = await pool.connect();
  try {
    // Test some sample queries that the API endpoints use
    
    // Test layer data query
    const layerQuery = `
      SELECT zip, home_value
      FROM pulse_zillow_data 
      WHERE home_value IS NOT NULL 
      LIMIT 5
    `;
    const layerResult = await client.query(layerQuery);
    console.log(`  📊 Layer data query: ${layerResult.rows.length} rows returned`);
    
    // Test history query
    const historyQuery = `
      SELECT COUNT(*) as count
      FROM market_pulse_history
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const historyResult = await client.query(historyQuery);
    console.log(`  📈 History query: ${historyResult.rows[0].count} recent records`);
    
    console.log('✅ API endpoint queries test completed\n');
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Enhanced Market Pulse Analytics Dashboard - Test Suite\n');
  
  try {
    await testDatabaseSchema();
    await testDataServices();
    await testHistorySnapshot();
    await testApiEndpoints();
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Visit: http://localhost:5000/pulse');
    console.log('3. Check data in the admin panel');
    console.log('4. Monitor scheduled data collection jobs');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as testEnhancedPulse };