import { db } from './db';
import { sql, eq, and, gte, inArray, isNotNull } from 'drizzle-orm';
import { users, emailTriageScores } from '@shared/schema';
import type { User } from '@shared/schema';
import { getGmailInbox } from './gmailClient';
import { getFubClient } from './fubClient';
import { scoreEmailForTriage, type EmailTriageContext } from './openaiTriageClient';

const SCORE_CAP_PER_DAY = 200;
const UNREAD_FETCH_MAX = 50;
const BATCH_SIZE = 10;

function parseSender(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim().toLowerCase(),
    };
  }
  return { name: from.trim(), email: from.trim().toLowerCase() };
}

export async function scoreEmailsForUser(user: User): Promise<number> {
  if (!user.email) return 0;

  const runStart = Date.now();

  try {
    // 1. Daily cap check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const capResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailTriageScores)
      .where(and(eq(emailTriageScores.userId, user.id), gte(emailTriageScores.scoredAt, todayStart)));

    const todayCount = capResult[0]?.count ?? 0;

    if (todayCount >= SCORE_CAP_PER_DAY) {
      console.warn(`[EmailTriage] Daily cap reached for ${user.email} (${todayCount} scored today)`);
      return 0;
    }

    const remainingCapacity = Math.min(UNREAD_FETCH_MAX, SCORE_CAP_PER_DAY - todayCount);

    // 2. Fetch unread primary emails from last 7 days
    let inboxResult;
    try {
      inboxResult = await getGmailInbox(
        user.email,
        remainingCapacity,
        undefined,
        'is:unread -category:promotions -category:social -category:forums newer_than:7d'
      );
    } catch (gmailErr: any) {
      if (
        gmailErr.code === 403 ||
        gmailErr.message?.includes('Not Authorized') ||
        gmailErr.message?.includes('Invalid Credentials')
      ) {
        console.log(`[EmailTriage] Gmail not authorized for ${user.email}, skipping`);
        return 0;
      }
      throw gmailErr;
    }

    const messages = inboxResult.messages;
    if (messages.length === 0) return 0;

    // 3. Filter already-scored messages
    const msgIds = messages.map((m) => m.id);
    const alreadyScored = await db
      .select({ gmailMsgId: emailTriageScores.gmailMsgId })
      .from(emailTriageScores)
      .where(and(eq(emailTriageScores.userId, user.id), inArray(emailTriageScores.gmailMsgId, msgIds)));

    const scoredSet = new Set(alreadyScored.map((r) => r.gmailMsgId));
    const toScore = messages.filter((m) => !scoredSet.has(m.id));

    if (toScore.length === 0) return 0;

    // 4. Fetch FUB context once per run (cached per-run, not per-email)
    let contactEmailSet = new Set<string>();
    let dealAddresses: string[] = [];

    try {
      const fubClient = getFubClient();
      if (fubClient && user.fubUserId) {
        const [contacts, deals] = await Promise.all([
          fubClient.getPeople(user.fubUserId),
          fubClient.getDeals(user.fubUserId),
        ]);

        contactEmailSet = new Set(
          contacts
            .map((c) => c.email?.toLowerCase())
            .filter((e): e is string => Boolean(e))
        );

        dealAddresses = deals
          .filter(
            (d) =>
              d.propertyAddress &&
              (d.status === 'pending' || d.status === 'under_contract')
          )
          .map((d) => d.propertyAddress!)
          .filter(Boolean);
      }
    } catch (fubErr) {
      console.warn(
        `[EmailTriage] FUB fetch failed for ${user.email}, proceeding without contact boost:`,
        fubErr
      );
    }

    // 5. Score each email and insert
    let scoredCount = 0;
    const contactEmailArray = Array.from(contactEmailSet);

    for (const msg of toScore) {
      try {
        const { email: fromEmail, name: fromName } = parseSender(msg.from || '');

        const ctx: EmailTriageContext = {
          fromEmail,
          fromName,
          subject: msg.subject || '',
          snippet: msg.snippet || '',
          contactEmails: contactEmailArray,
          dealAddresses,
        };

        const triageScore = await scoreEmailForTriage(ctx);

        let receivedAt: Date | undefined;
        if (msg.date) {
          const parsed = new Date(msg.date);
          if (!isNaN(parsed.getTime())) receivedAt = parsed;
        }

        await db
          .insert(emailTriageScores)
          .values({
            userId: user.id,
            gmailMsgId: msg.id,
            fromEmail,
            fromName,
            subject: msg.subject || '',
            receivedAt,
            score: triageScore.score,
            category: triageScore.category,
            reason: triageScore.reason,
            dismissed: false,
          })
          .onConflictDoNothing();

        scoredCount++;
      } catch (msgErr) {
        console.error(`[EmailTriage] Failed to score msg ${msg.id} for ${user.email}:`, msgErr);
      }
    }

    console.log(
      `[EmailTriage] ${user.email}: scored ${scoredCount}/${toScore.length} in ${Date.now() - runStart}ms`
    );
    return scoredCount;
  } catch (err) {
    console.error(`[EmailTriage] Unhandled error for user ${user.email}:`, err);
    return 0;
  }
}

export async function runEmailTriageForAllUsers(): Promise<void> {
  const runStart = Date.now();
  console.log('[EmailTriage] Starting 15-min triage run...');

  const allUsers = await db.select().from(users).where(isNotNull(users.email));

  console.log(`[EmailTriage] ${allUsers.length} users with email to process`);

  let totalScored = 0;

  for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
    const batch = allUsers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((u) => scoreEmailsForUser(u)));
    totalScored += results.reduce((sum, n) => sum + n, 0);
  }

  console.log(
    `[EmailTriage] Run complete: ${totalScored} emails scored across ${allUsers.length} users in ${Date.now() - runStart}ms`
  );
}
