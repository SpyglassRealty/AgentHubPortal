import cron from 'node-cron';
import { refreshAndCacheMarketPulse, ensureFreshMarketPulseData } from './marketPulseService';

export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduled tasks...');
  
  // Daily refresh at 6:00 AM Central Time (as requested)
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
  
  // Hourly refresh for reasonably fresh data (reduced from 15 min to avoid API limits)
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
  
  console.log('[Scheduler] Market Pulse refresh scheduled: hourly + daily at 6:00 AM Central');
}

export async function runStartupTasks(): Promise<void> {
  console.log('[Scheduler] Running startup tasks...');
  
  try {
    await ensureFreshMarketPulseData(24);
  } catch (error) {
    console.error('[Scheduler] Startup Market Pulse check failed:', error);
  }
}
