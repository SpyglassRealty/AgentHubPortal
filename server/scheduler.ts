import cron from 'node-cron';
import { refreshAndCacheMarketPulse, ensureFreshMarketPulseData } from './marketPulseService';

export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduled tasks...');
  
  // Daily refresh at midnight Central Time
  cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Running daily Market Pulse refresh (12 AM Central)...');
    try {
      await refreshAndCacheMarketPulse();
      console.log('[Scheduler] Daily Market Pulse refresh completed successfully');
    } catch (error) {
      console.error('[Scheduler] Daily Market Pulse refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Refresh every 15 minutes for near real-time data
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Running 15-minute Market Pulse refresh...');
    try {
      await refreshAndCacheMarketPulse();
      console.log('[Scheduler] 15-minute Market Pulse refresh completed successfully');
    } catch (error) {
      console.error('[Scheduler] 15-minute Market Pulse refresh failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  console.log('[Scheduler] Market Pulse refresh scheduled: every 15 minutes + daily at 12:00 AM Central');
}

export async function runStartupTasks(): Promise<void> {
  console.log('[Scheduler] Running startup tasks...');
  
  try {
    await ensureFreshMarketPulseData(24);
  } catch (error) {
    console.error('[Scheduler] Startup Market Pulse check failed:', error);
  }
}
