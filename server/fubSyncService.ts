import { db } from "./db";
import { agentDirectoryProfiles } from "@shared/schema";
import { getFubClientAsync, type FubAgent } from "./fubClient";

export interface SyncResult {
  inserted: number;
  skipped: number;
  fubAgentsTotal: number;
  insertedAgents: Array<{ id: string; fubAgentId: number; name: string; fubEmail: string }>;
  errors: Array<{ fubAgentId?: number; name?: string; message: string }>;
  triggeredBy: 'admin' | 'cron';
  startedAt: string;
  finishedAt: string;
}

/**
 * Split a full name into firstName / lastName.
 * - Single-word names → lastName = ''
 * - Empty/blank names → falls back to email-local-part as firstName (caller passes fubEmail)
 */
function splitName(rawName: string | undefined | null, fallbackEmail: string | undefined | null): { firstName: string; lastName: string } {
  const name = (rawName || '').trim();
  if (!name) {
    const local = (fallbackEmail || '').split('@')[0]?.trim() || 'Unknown';
    return { firstName: local, lastName: '' };
  }
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  // First token = firstName, remainder joined = lastName (handles middle names / suffixes)
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Sync FUB agents into the agent_directory_profiles table.
 *
 * Behavior:
 *  - Fetches all FUB users via fubClient.getAllAgents()
 *  - Empty array from FUB is treated as a likely API failure — abort with error, do NOT delete
 *  - Inserts new rows only (onConflictDoNothing on fub_agent_id) — never updates existing
 *  - Per-agent try/catch — one failure does not abort the whole sync
 *  - Audit logs every action with [FubSync] prefix
 */
export async function syncFubAgentsToDirectory(
  options: { triggeredBy: 'admin' | 'cron'; adminUserId?: string }
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const { triggeredBy, adminUserId } = options;

  console.log('[FubSync] start', JSON.stringify({ triggeredBy, adminUserId, startedAt }));

  const result: SyncResult = {
    inserted: 0,
    skipped: 0,
    fubAgentsTotal: 0,
    insertedAgents: [],
    errors: [],
    triggeredBy,
    startedAt,
    finishedAt: '', // filled at end
  };

  // 1. Acquire FUB client
  let client;
  try {
    client = await getFubClientAsync();
  } catch (err: any) {
    const message = `Failed to initialize FUB client: ${err?.message || String(err)}`;
    console.warn('[FubSync] abort', JSON.stringify({ message }));
    result.errors.push({ message });
    result.finishedAt = new Date().toISOString();
    return result;
  }

  if (!client) {
    const message = 'FUB client not configured (missing API key)';
    console.warn('[FubSync] abort', JSON.stringify({ message }));
    result.errors.push({ message });
    result.finishedAt = new Date().toISOString();
    return result;
  }

  // 2. Fetch all agents from FUB
  let fubAgents: FubAgent[] = [];
  try {
    fubAgents = await client.getAllAgents();
  } catch (err: any) {
    const message = `getAllAgents() threw: ${err?.message || String(err)}`;
    console.warn('[FubSync] abort', JSON.stringify({ message }));
    result.errors.push({ message });
    result.finishedAt = new Date().toISOString();
    return result;
  }

  result.fubAgentsTotal = fubAgents.length;

  // 3. Empty-array guard — treat as API failure, NOT as "all agents deleted"
  if (fubAgents.length === 0) {
    const message = 'FUB returned 0 agents — likely API failure, aborting sync';
    console.warn('[FubSync] abort', JSON.stringify({ message, triggeredBy }));
    result.errors.push({ message });
    result.finishedAt = new Date().toISOString();
    return result;
  }

  // 4. Iterate and insert
  for (const agent of fubAgents) {
    const { firstName, lastName } = splitName(agent.name, agent.email);
    const fubCreatedAt = agent.created ? new Date(agent.created) : null;

    try {
      const inserted = await db
        .insert(agentDirectoryProfiles)
        .values({
          fubAgentId: agent.id,
          fubCreatedAt,
          firstName,
          lastName,
          email: '', // empty string — Workspace email to be filled by admin
          fubEmail: agent.email,
          // officeLocation: nullable after migration — null means "no office assigned yet"
          officeLocation: null,
          headshotUrl: agent.pictureUrl || null,
          isVisible: false, // explicit, not relying on column default
          sortOrder: 0,
          // Safe defaults for jsonb-array columns (schema defines defaults but we set explicitly to be safe)
          languages: [],
          specialties: [],
          // SEO indexing default — schema defaults to 'index,follow' but explicit is safer
          indexingDirective: 'index,follow',
        })
        .onConflictDoNothing({ target: agentDirectoryProfiles.fubAgentId })
        .returning({ id: agentDirectoryProfiles.id });

      if (inserted.length > 0) {
        result.inserted += 1;
        result.insertedAgents.push({
          id: inserted[0].id,
          fubAgentId: agent.id,
          name: agent.name,
          fubEmail: agent.email,
        });
        console.log('[FubSync]', JSON.stringify({
          triggeredBy,
          fubAgentId: agent.id,
          name: agent.name,
          action: 'inserted',
        }));
      } else {
        result.skipped += 1;
        console.log('[FubSync]', JSON.stringify({
          triggeredBy,
          fubAgentId: agent.id,
          name: agent.name,
          action: 'skipped',
        }));
      }
    } catch (err: any) {
      const message = err?.message || String(err);
      result.errors.push({
        fubAgentId: agent.id,
        name: agent.name,
        message,
      });
      console.error('[FubSync] insert error', JSON.stringify({
        triggeredBy,
        fubAgentId: agent.id,
        name: agent.name,
        message,
      }));
      // Continue — do NOT abort the entire sync on one row failure
    }
  }

  result.finishedAt = new Date().toISOString();

  console.log('[FubSync] end', JSON.stringify({
    triggeredBy,
    fubAgentsTotal: result.fubAgentsTotal,
    inserted: result.inserted,
    skipped: result.skipped,
    errors: result.errors.length,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  }));

  return result;
}
