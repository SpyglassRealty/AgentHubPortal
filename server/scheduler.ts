import cron from 'node-cron';
import { refreshAndCacheMarketPulse, ensureFreshMarketPulseData } from './marketPulseService';
import { refreshZillowData } from './services/zillowService';
import { refreshRedfinData } from './services/redfinService';
import { refreshCensusData } from './services/censusService';
import { refreshPulseMetrics } from './services/pulseMetricsService';
import { createDailyMarketPulseSnapshot } from './services/marketPulseHistoryService';

export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduled tasks...');
  
  // ═══════════════════════════════════════════════════════════════════
  // V1 Market Pulse (MLS-based) - Keep existing schedule
  // ═══════════════════════════════════════════════════════════════════
  
  // Daily refresh at 6:00 AM Central Time
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Running daily Market Pulse refresh (6:00 AM Central)...');
    try {
      await refreshAndCacheMarketPulse();
      console.log('[Scheduler] Daily Market Pulse refresh completed successfully');
    } catch (error) {
      console.error('[Scheduler] Daily Market Pulse refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Hourly refresh for reasonably fresh data
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running hourly Market Pulse refresh...');
    try {
      await refreshAndCacheMarketPulse();
      console.log('[Scheduler] Hourly Market Pulse refresh completed successfully');
    } catch (error) {
      console.error('[Scheduler] Hourly Market Pulse refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // ═══════════════════════════════════════════════════════════════════
  // V2 Enhanced Analytics - New comprehensive data pipeline
  // ═══════════════════════════════════════════════════════════════════
  
  // Zillow ZHVI/ZORI data - Weekly (Sundays at 2 AM Central)
  // Zillow updates their data monthly, so weekly checks are sufficient
  cron.schedule('0 2 * * 0', async () => {
    console.log('[Scheduler] Running weekly Zillow ZHVI/ZORI data refresh...');
    try {
      const result = await refreshZillowData();
      console.log(`[Scheduler] Zillow refresh completed: ${result.rowsProcessed} rows processed, ${result.errors.length} errors`);
    } catch (error) {
      console.error('[Scheduler] Zillow data refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Redfin Market Tracker data - Weekly (Sundays at 3 AM Central)
  // Redfin updates monthly, weekly checks are sufficient
  cron.schedule('0 3 * * 0', async () => {
    console.log('[Scheduler] Running weekly Redfin Market Tracker data refresh...');
    try {
      const result = await refreshRedfinData();
      console.log(`[Scheduler] Redfin refresh completed: ${result.rowsProcessed} rows processed, ${result.errors.length} errors`);
    } catch (error) {
      console.error('[Scheduler] Redfin data refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Census ACS data - Monthly (1st day at 4 AM Central)
  // Census data updates annually, but monthly checks ensure we catch new releases
  cron.schedule('0 4 1 * *', async () => {
    console.log('[Scheduler] Running monthly Census ACS data refresh...');
    try {
      const result = await refreshCensusData();
      console.log(`[Scheduler] Census refresh completed: ${result.rowsProcessed} rows processed, ${result.errors.length} errors`);
    } catch (error) {
      console.error('[Scheduler] Census data refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Calculated Pulse Metrics - Daily (5 AM Central, after fresh data collection)
  // Runs daily to incorporate any new data from Zillow, Redfin, or Census
  cron.schedule('0 5 * * *', async () => {
    console.log('[Scheduler] Running daily Pulse Metrics calculation...');
    try {
      const result = await refreshPulseMetrics();
      console.log(`[Scheduler] Pulse Metrics calculation completed: ${result.rowsProcessed} zips processed, ${result.errors.length} errors`);
    } catch (error) {
      console.error('[Scheduler] Pulse Metrics calculation failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Market Pulse History Snapshots - Daily (7 AM Central, after all calculations)
  // Creates daily historical snapshots for trending analysis
  cron.schedule('0 7 * * *', async () => {
    console.log('[Scheduler] Creating daily Market Pulse history snapshot...');
    try {
      const result = await createDailyMarketPulseSnapshot();
      console.log(`[Scheduler] Market Pulse snapshot completed: ${result.snapshotsCreated} snapshots created, ${result.errors.length} errors`);
    } catch (error) {
      console.error('[Scheduler] Market Pulse snapshot failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  console.log('[Scheduler] All tasks scheduled:');
  console.log('  - Market Pulse V1: Hourly + Daily at 6:00 AM');
  console.log('  - Zillow ZHVI/ZORI: Weekly (Sundays 2:00 AM)');
  console.log('  - Redfin Market Tracker: Weekly (Sundays 3:00 AM)');
  console.log('  - Census ACS: Monthly (1st day 4:00 AM)');
  console.log('  - Calculated Metrics: Daily (5:00 AM)');
  console.log('  - Market Pulse History: Daily (7:00 AM)');
}

export async function runStartupTasks(): Promise<void> {
  console.log('[Scheduler] Running startup tasks...');
  
  // V1 Market Pulse startup check
  try {
    await ensureFreshMarketPulseData(24);
  } catch (error) {
    console.error('[Scheduler] Startup Market Pulse check failed:', error);
  }
  
  // V2 Enhanced Analytics startup check
  // Check if we have recent calculated metrics, if not, run the pipeline
  try {
    console.log('[Scheduler] Checking V2 analytics data freshness...');
    
    // If this is the first run or data is very stale, run a quick metrics calculation
    // The individual data services (Zillow, Redfin, Census) will be triggered by their schedules
    // or can be run manually if needed
    
    const result = await refreshPulseMetrics();
    console.log(`[Scheduler] Startup metrics calculation: ${result.rowsProcessed} zips processed, ${result.errors.length} errors`);
  } catch (error) {
    console.error('[Scheduler] Startup V2 analytics check failed:', error);
  }
}
