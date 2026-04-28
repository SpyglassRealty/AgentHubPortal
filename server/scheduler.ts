import cron from 'node-cron';
import { refreshAndCacheMarketPulse, ensureFreshMarketPulseData } from './marketPulseService';
import { renewExpiringCalendarWatches } from './callDutyRoutes';
import { runEmailTriageForAllUsers } from './emailTriageScorer';

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
  
  // Daily renewal of expiring Google Calendar watches at 5:00 AM Central
  cron.schedule('0 5 * * *', async () => {
    console.log('[Scheduler] Running daily Calendar watch renewal (5:00 AM Central)...');
    try {
      await renewExpiringCalendarWatches();
      console.log('[Scheduler] Daily Calendar watch renewal completed successfully');
    } catch (error) {
      console.error('[Scheduler] Daily Calendar watch renewal failed:', error);
    }
  }, {
    timezone: 'America/Chicago'
  });
  
  // Email triage scoring: every 15 minutes, batched across all Gmail-connected users
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Running 15-min email triage scan...');
    try {
      await runEmailTriageForAllUsers();
    } catch (err) {
      console.error('[Scheduler] Email triage run failed:', err);
    }
  }, {
    timezone: 'America/Chicago'
  });

  console.log('[Scheduler] Market Pulse refresh scheduled: hourly + daily at 6:00 AM Central');
  console.log('[Scheduler] Calendar watch renewal scheduled: daily at 5:00 AM Central');
  console.log('[Scheduler] Email triage scoring scheduled: every 15 minutes');
}

export async function runStartupTasks(): Promise<void> {
  console.log('[Scheduler] Running startup tasks...');
  
  try {
    await ensureFreshMarketPulseData(24);
  } catch (error) {
    console.error('[Scheduler] Startup Market Pulse check failed:', error);
  }
}
