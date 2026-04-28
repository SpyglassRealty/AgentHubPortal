import type { Express } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import { db } from './db';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { emailTriageScores } from '@shared/schema';
import type { User } from '@shared/schema';
import { scoreEmailsForUser } from './emailTriageScorer';

async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) user = await storage.getUserByEmail(email);
  return user;
}

// Per-user rescan rate limit: 5 minutes between manual rescans
const rescanLastRun = new Map<string, number>();
const RESCAN_COOLDOWN_MS = 5 * 60 * 1000;

export function registerEmailTriageRoutes(app: Express): void {

  // GET /api/email/triage?threshold=70
  // Returns scored, non-dismissed emails for the current user above the threshold.
  app.get('/api/email/triage', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const threshold = Math.min(100, Math.max(0, parseInt(req.query.threshold as string) || 70));

      const scores = await db
        .select()
        .from(emailTriageScores)
        .where(
          and(
            eq(emailTriageScores.userId, user.id),
            eq(emailTriageScores.dismissed, false),
            gte(emailTriageScores.score, threshold)
          )
        )
        .orderBy(desc(emailTriageScores.score), desc(emailTriageScores.scoredAt));

      res.json({ emails: scores, count: scores.length });
    } catch (err) {
      console.error('[EmailTriageRoutes] GET /triage error:', err);
      res.status(500).json({ message: 'Failed to fetch triage scores' });
    }
  });

  // POST /api/email/triage/rescan
  // Manually triggers a triage run for the current user (rate-limited 5 min).
  app.post('/api/email/triage/rescan', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!user.email) return res.status(400).json({ message: 'No email linked to account' });

      const lastRun = rescanLastRun.get(user.id) ?? 0;
      const msSinceLast = Date.now() - lastRun;

      if (msSinceLast < RESCAN_COOLDOWN_MS) {
        const secondsRemaining = Math.ceil((RESCAN_COOLDOWN_MS - msSinceLast) / 1000);
        return res.status(429).json({
          message: `Rescan rate-limited. Try again in ${secondsRemaining}s`,
          retryAfterSeconds: secondsRemaining,
        });
      }

      rescanLastRun.set(user.id, Date.now());

      const scored = await scoreEmailsForUser(user);
      res.json({ scored, message: `Scored ${scored} new emails` });
    } catch (err) {
      console.error('[EmailTriageRoutes] POST /triage/rescan error:', err);
      res.status(500).json({ message: 'Rescan failed' });
    }
  });

  // POST /api/email/triage/dismiss
  // Marks a specific email as dismissed so it no longer appears in the Needs Reply tab.
  // Body: { gmailMsgId: string }
  app.post('/api/email/triage/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { gmailMsgId } = req.body as { gmailMsgId?: string };
      if (!gmailMsgId || typeof gmailMsgId !== 'string') {
        return res.status(400).json({ message: 'gmailMsgId is required' });
      }

      const result = await db
        .update(emailTriageScores)
        .set({ dismissed: true })
        .where(and(eq(emailTriageScores.userId, user.id), eq(emailTriageScores.gmailMsgId, gmailMsgId)));

      res.json({ success: true });
    } catch (err) {
      console.error('[EmailTriageRoutes] POST /triage/dismiss error:', err);
      res.status(500).json({ message: 'Dismiss failed' });
    }
  });

  // GET /api/email/triage/stats — quick count for badge/status (no auth change needed)
  app.get('/api/email/triage/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const threshold = 70;
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailTriageScores)
        .where(
          and(
            eq(emailTriageScores.userId, user.id),
            eq(emailTriageScores.dismissed, false),
            gte(emailTriageScores.score, threshold)
          )
        );

      res.json({ needsReplyCount: count });
    } catch (err) {
      console.error('[EmailTriageRoutes] GET /triage/stats error:', err);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });
}
