import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { getRezenClient, type RezenTransaction, type RezenTransactionsResponse } from "./rezenClient";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// ── In-memory cache ──────────────────────────────────
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Helper: get DB user ──────────────────────────────
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

// ── Helper: require super admin ──────────────────────
async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

// ── Helper: fetch ALL pages of transactions ──────────
async function fetchAllTransactions(
  yentaId: string,
  status: "OPEN" | "CLOSED" | "TERMINATED"
): Promise<RezenTransaction[]> {
  const cacheKey = `all_txns_${yentaId}_${status}`;
  const cached = getCached<RezenTransaction[]>(cacheKey);
  if (cached) {
    console.log(`[ReZen Dashboard] Cache hit for ${status} transactions (${cached.length} records)`);
    return cached;
  }

  const client = getRezenClient();
  if (!client) throw new Error("ReZen client not configured");

  const allTransactions: RezenTransaction[] = [];
  let pageNumber = 0;
  const pageSize = 200;
  let hasNext = true;

  while (hasNext) {
    console.log(`[ReZen Dashboard] Fetching ${status} transactions page ${pageNumber}...`);
    const result = await client.getTransactions(yentaId, status, {
      pageNumber,
      pageSize,
      sortDirection: "DESC",
    });
    allTransactions.push(...(result.transactions || []));
    hasNext = result.hasNext;
    pageNumber++;

    // Safety valve — don't fetch more than 50 pages
    if (pageNumber > 50) {
      console.warn(`[ReZen Dashboard] Safety limit reached at page ${pageNumber}`);
      break;
    }
  }

  console.log(`[ReZen Dashboard] Fetched ${allTransactions.length} total ${status} transactions`);
  setCache(cacheKey, allTransactions);
  return allTransactions;
}

// ── Helper: extract agent name from participants ─────
function getAgentName(t: RezenTransaction): string {
  if (!t.participants) return "Unknown Agent";
  // Look for AGENT, TEAM_LEADER, or similar participant roles
  const agent = t.participants.find(
    (p) =>
      p.participantRole === "AGENT" ||
      p.participantRole === "TEAM_LEADER" ||
      p.participantRole === "TEAM_MEMBER"
  );
  if (agent) {
    return [agent.firstName, agent.lastName].filter(Boolean).join(" ") || "Unknown Agent";
  }
  // Fallback: first participant with a name
  const named = t.participants.find((p) => p.firstName || p.lastName);
  if (named) {
    return [named.firstName, named.lastName].filter(Boolean).join(" ") || "Unknown Agent";
  }
  return "Unknown Agent";
}

// ── Helper: get closedAt as ms ───────────────────────
function getClosedAtMs(t: RezenTransaction): number {
  if (!t.closedAt) return 0;
  if (typeof t.closedAt === "number") return t.closedAt;
  return new Date(t.closedAt as any).getTime();
}

// ══════════════════════════════════════════════════════
// Register routes
// ══════════════════════════════════════════════════════
export function registerRezenDashboardRoutes(app: Express): void {
  // ── Revenue Dashboard Endpoint ─────────────────────
  app.get(
    "/api/admin/rezen-dashboard/revenue",
    isAuthenticated,
    requireSuperAdmin as any,
    async (req: any, res) => {
      try {
        const user = req.dbUser as User;
        const yentaId = user.rezenYentaId;
        if (!yentaId) {
          return res.status(400).json({ message: "ReZen account not linked. Add your Yenta ID in settings." });
        }

        const cacheKey = `revenue_dashboard_${yentaId}`;
        const cached = getCached<any>(cacheKey);
        if (cached) {
          return res.json(cached);
        }

        const closedTransactions = await fetchAllTransactions(yentaId, "CLOSED");

        // KPI calculations
        const closedVolume = closedTransactions.reduce(
          (sum, t) => sum + (t.price?.amount || 0),
          0
        );
        const grossGCI = closedTransactions.reduce(
          (sum, t) => sum + (t.grossCommission?.amount || 0),
          0
        );
        const netIncome = closedTransactions.reduce(
          (sum, t) => sum + (t.myNetPayout?.amount || 0),
          0
        );
        const commissionCount = closedTransactions.length;
        const avgCommission = commissionCount > 0 ? grossGCI / commissionCount : 0;
        const feesDeductions = grossGCI - netIncome;

        // Monthly trend data (last 24 months to have good range, frontend will slice)
        const monthlyMap: Record<
          string,
          { month: string; key: string; grossGCI: number; netIncome: number; volume: number; count: number }
        > = {};

        closedTransactions.forEach((t) => {
          const closedMs = getClosedAtMs(t);
          if (!closedMs) return;
          const d = new Date(closedMs);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!monthlyMap[key]) {
            monthlyMap[key] = {
              month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
              key,
              grossGCI: 0,
              netIncome: 0,
              volume: 0,
              count: 0,
            };
          }
          monthlyMap[key].grossGCI += t.grossCommission?.amount || 0;
          monthlyMap[key].netIncome += t.myNetPayout?.amount || 0;
          monthlyMap[key].volume += t.price?.amount || 0;
          monthlyMap[key].count++;
        });

        const monthlyTrend = Object.values(monthlyMap)
          .sort((a, b) => a.key.localeCompare(b.key))
          .slice(-12);

        const result = {
          kpis: {
            closedVolume,
            grossGCI,
            netIncome,
            avgCommission,
            commissionCount,
            feesDeductions,
          },
          monthlyTrend,
        };

        setCache(cacheKey, result);
        res.json(result);
      } catch (error: any) {
        console.error("[ReZen Dashboard] Revenue error:", error);
        res.status(500).json({ message: "Failed to fetch revenue data", error: error.message });
      }
    }
  );

  // ── Transaction Analytics Endpoint ─────────────────
  app.get(
    "/api/admin/rezen-dashboard/analytics",
    isAuthenticated,
    requireSuperAdmin as any,
    async (req: any, res) => {
      try {
        const user = req.dbUser as User;
        const yentaId = user.rezenYentaId;
        if (!yentaId) {
          return res.status(400).json({ message: "ReZen account not linked." });
        }

        const cacheKey = `analytics_dashboard_${yentaId}`;
        const cached = getCached<any>(cacheKey);
        if (cached) {
          return res.json(cached);
        }

        const closedTransactions = await fetchAllTransactions(yentaId, "CLOSED");

        // By Transaction Type
        const typeBreakdown: Record<string, { count: number; volume: number; gci: number }> = {};
        closedTransactions.forEach((t) => {
          const type = t.transactionType || "OTHER";
          if (!typeBreakdown[type]) {
            typeBreakdown[type] = { count: 0, volume: 0, gci: 0 };
          }
          typeBreakdown[type].count++;
          typeBreakdown[type].volume += t.price?.amount || 0;
          typeBreakdown[type].gci += t.grossCommission?.amount || 0;
        });

        const byType = Object.entries(typeBreakdown).map(([type, data]) => ({
          name: type === "SALE" ? "Sales" : type === "LEASE" ? "Leases" : type === "REFERRAL" ? "Referrals" : type,
          ...data,
        }));

        // By Agent — aggregate from participants
        const agentMap: Record<string, { name: string; volume: number; gci: number; count: number }> = {};
        closedTransactions.forEach((t) => {
          const agentName = getAgentName(t);
          if (!agentMap[agentName]) {
            agentMap[agentName] = { name: agentName, volume: 0, gci: 0, count: 0 };
          }
          agentMap[agentName].volume += t.price?.amount || 0;
          agentMap[agentName].gci += t.grossCommission?.amount || 0;
          agentMap[agentName].count++;
        });

        const byAgent = Object.values(agentMap)
          .sort((a, b) => b.volume - a.volume);

        // Top 10 agents for production chart
        const topAgents = byAgent.slice(0, 15);

        // Agent distribution for donut chart (top 10 + Other)
        const top10 = byAgent.slice(0, 10);
        const otherVolume = byAgent.slice(10).reduce((sum, a) => sum + a.volume, 0);
        const otherGCI = byAgent.slice(10).reduce((sum, a) => sum + a.gci, 0);
        const otherCount = byAgent.slice(10).reduce((sum, a) => sum + a.count, 0);
        const agentDistribution = [
          ...top10.map((a) => ({ name: a.name, value: a.volume, gci: a.gci, count: a.count })),
          ...(otherVolume > 0
            ? [{ name: "Other", value: otherVolume, gci: otherGCI, count: otherCount }]
            : []),
        ];

        // By Property Type (as proxy for lead source)
        const propTypeMap: Record<string, { count: number; volume: number; gci: number }> = {};
        closedTransactions.forEach((t) => {
          const ptype = t.propertyType || "Unknown";
          if (!propTypeMap[ptype]) {
            propTypeMap[ptype] = { count: 0, volume: 0, gci: 0 };
          }
          propTypeMap[ptype].count++;
          propTypeMap[ptype].volume += t.price?.amount || 0;
          propTypeMap[ptype].gci += t.grossCommission?.amount || 0;
        });

        const byPropertyType = Object.entries(propTypeMap)
          .map(([type, data]) => ({ name: type, ...data }))
          .sort((a, b) => b.volume - a.volume);

        // By Lead Source
        const leadSourceMap: Record<string, { count: number; volume: number; gci: number }> = {};
        closedTransactions.forEach((t) => {
          const source = (t as any).leadSource?.name || "Unknown";
          if (!leadSourceMap[source]) {
            leadSourceMap[source] = { count: 0, volume: 0, gci: 0 };
          }
          leadSourceMap[source].count++;
          leadSourceMap[source].volume += t.price?.amount || 0;
          leadSourceMap[source].gci += t.grossCommission?.amount || 0;
        });

        const byLeadSource = Object.entries(leadSourceMap)
          .map(([source, data]) => ({
            name: source,
            ...data,
            avgCommissionPct: data.volume > 0 ? ((data.gci / data.volume) * 100) : 0,
          }))
          .sort((a, b) => b.volume - a.volume);

        const result = {
          byType,
          topAgents,
          agentDistribution,
          byPropertyType,
          byLeadSource,
          totalTransactions: closedTransactions.length,
        };

        setCache(cacheKey, result);
        res.json(result);
      } catch (error: any) {
        console.error("[ReZen Dashboard] Analytics error:", error);
        res.status(500).json({ message: "Failed to fetch analytics data", error: error.message });
      }
    }
  );

  // ── Transactions Table Endpoint ────────────────────
  app.get(
    "/api/admin/rezen-dashboard/transactions",
    isAuthenticated,
    requireSuperAdmin as any,
    async (req: any, res) => {
      try {
        const user = req.dbUser as User;
        const yentaId = user.rezenYentaId;
        if (!yentaId) {
          return res.status(400).json({ message: "ReZen account not linked." });
        }

        const status = (req.query.status as string) || "CLOSED";
        const validStatuses = ["OPEN", "CLOSED", "TERMINATED"];
        const txStatus = validStatuses.includes(status.toUpperCase())
          ? (status.toUpperCase() as "OPEN" | "CLOSED" | "TERMINATED")
          : "CLOSED";

        const allTransactions = await fetchAllTransactions(yentaId, txStatus);

        // Transform for table consumption
        const transactions = allTransactions.map((t) => {
          const closedMs = getClosedAtMs(t);
          return {
            id: t.id,
            date: closedMs ? new Date(closedMs).toISOString() : t.closingDateEstimated || null,
            address: t.address?.oneLine || t.address?.street || "Address not available",
            city: t.address?.city || "",
            state: t.address?.state || "",
            agent: getAgentName(t),
            type: t.transactionType || "SALE",
            side: t.listing ? "Listing" : "Buyer",
            price: t.price?.amount || 0,
            grossCommission: t.grossCommission?.amount || 0,
            netPayout: t.myNetPayout?.amount || 0,
            status: t.lifecycleState?.state || txStatus,
            propertyType: t.propertyType || "",
            code: t.code || "",
          };
        });

        res.json({
          transactions,
          totalCount: transactions.length,
        });
      } catch (error: any) {
        console.error("[ReZen Dashboard] Transactions table error:", error);
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
      }
    }
  );

  // ── Cache invalidation endpoint ────────────────────
  app.post(
    "/api/admin/rezen-dashboard/refresh",
    isAuthenticated,
    requireSuperAdmin as any,
    async (_req: any, res) => {
      cache.clear();
      console.log("[ReZen Dashboard] Cache cleared");
      res.json({ success: true, message: "Dashboard cache cleared" });
    }
  );
}
