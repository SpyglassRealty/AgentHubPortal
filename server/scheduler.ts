import cron from 'node-cron';
import { refreshAndCacheMarketPulse, ensureFreshMarketPulseData } from './marketPulseService';

export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduled tasks...');
  
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
  
  console.log('[Scheduler] Daily Market Pulse refresh scheduled for 12:00 AM Central Time');
}

export async function runStartupTasks(): Promise<void> {
  console.log('[Scheduler] Running startup tasks...');
  
  try {
    await ensureFreshMarketPulseData(24);
  } catch (error) {
    console.error('[Scheduler] Startup Market Pulse check failed:', error);
  }
}
