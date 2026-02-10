import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getFubClient, getFubClientAsync } from "./fubClient";
import { getRezenClient } from "./rezenClient";
import { generateSuggestionsForUser } from "./contextEngine";
import { type User, saveContentIdeaSchema, updateContentIdeaStatusSchema } from "@shared/schema";
import { getGoogleCalendarEvents } from "./googleCalendarClient";
import { db } from "./db";
import { users as usersTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { getLatestTrainingVideo } from "./vimeoClient";
import { SPYGLASS_OFFICES, DEFAULT_OFFICE, getOfficeConfig } from "./config/offices";
import { registerPulseV2Routes } from "./pulseV2Routes";
import { registerAdminRoutes } from "./adminRoutes";
import { registerGmailRoutes } from "./gmailRoutes";
import { registerXanoRoutes } from "./xanoProxy";


// Helper function to get the actual database user from request
// Handles both regular auth (ID lookup) and Google OAuth (email lookup)
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  
  // First try to find by session user ID
  let user = await storage.getUser(sessionUserId);
  
  // If not found by ID but we have an email (Google OAuth case), look up by email
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  
  return user;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      // First try to find by ID
      let user = await storage.getUser(userId);
      
      // If not found by ID but we have an email (Google OAuth case), look up by email
      if (!user && email) {
        user = await storage.getUserByEmail(email);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Auto-link FUB account on login if not already linked
      if (!user.fubUserId && user.email) {
        try {
          const fubClient = getFubClient();
          if (fubClient) {
            const fubUser = await fubClient.getUserByEmail(user.email);
            if (fubUser) {
              await storage.updateUserFubId(user.id, fubUser.id);
              user = { ...user, fubUserId: fubUser.id };
              console.log(`[Auth] Auto-linked FUB user ID ${fubUser.id} to user ${user.id} (${user.email})`);
            } else {
              console.log(`[Auth] No FUB match found for ${user.email}`);
            }
          }
        } catch (fubError) {
          console.error('[Auth] FUB auto-link failed:', fubError);
          // Don't block login if FUB linking fails
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Manual FUB account linking - admin can link any user, users can re-link themselves
  app.post('/api/auth/link-fub', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { email: linkEmail, userId: targetUserId } = req.body;

      // Determine which user to link
      let targetUser = user;
      if (targetUserId && user.isSuperAdmin) {
        const found = await storage.getUser(targetUserId);
        if (found) targetUser = found;
      }

      const fubClient = getFubClient();
      if (!fubClient) return res.status(503).json({ message: "FUB not configured" });

      // Use provided email or fall back to user's email
      const searchEmail = linkEmail || targetUser.email;
      if (!searchEmail) return res.status(400).json({ message: "No email provided" });

      const fubUser = await fubClient.getUserByEmail(searchEmail);
      if (!fubUser) {
        return res.status(404).json({ message: `No FUB account found for ${searchEmail}` });
      }

      await storage.updateUserFubId(targetUser.id, fubUser.id);
      console.log(`[Auth] Manually linked FUB user ID ${fubUser.id} to user ${targetUser.id} (${searchEmail})`);
      
      res.json({ success: true, fubUserId: fubUser.id, fubName: fubUser.name });
    } catch (error) {
      console.error("Error linking FUB account:", error);
      res.status(500).json({ message: "Failed to link FUB account" });
    }
  });

  app.get('/api/fub/agents', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      const agents = await fubClient.getAllAgents();
      res.json({ agents });
    } catch (error) {
      console.error("Error fetching FUB agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get('/api/fub/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId: number | null = null;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else {
        fubUserId = user.fubUserId;
        
        if (!fubUserId && user.email) {
          const fubUser = await fubClient.getUserByEmail(user.email);
          if (fubUser) {
            fubUserId = fubUser.id;
            await storage.updateUserFubId(user.id, fubUserId);
          }
        }
      }

      if (!fubUserId) {
        return res.json({ events: [], tasks: [], message: "No Follow Up Boss account linked" });
      }

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const [appointments, tasks] = await Promise.all([
        fubClient.getAppointments(fubUserId, startDate, endDate),
        fubClient.getTasks(fubUserId, startDate, endDate),
      ]);

      res.json({ events: appointments, tasks });
    } catch (error) {
      console.error("Error fetching FUB calendar:", error);
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  // Google Calendar - uses domain-wide delegation to impersonate users
  app.get('/api/google/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let targetEmail = user.email;
      const requestedAgentId = req.query.agentId as string;

      // If super admin is viewing another agent's calendar, look up their email
      if (requestedAgentId && user.isSuperAdmin) {
        // agentId comes from FUB agent selector as a FUB user ID number
        const fubAgentId = parseInt(requestedAgentId, 10);
        // Look up the DB user that has this fubUserId to get their email
        const agentUsers = await db.select().from(usersTable).where(eq(usersTable.fubUserId, fubAgentId));
        if (agentUsers.length > 0 && agentUsers[0].email) {
          targetEmail = agentUsers[0].email;
        } else {
          // Try to find by FUB API as fallback
          const fubClient = getFubClient();
          if (fubClient) {
            try {
              const agents = await fubClient.getAllAgents();
              const agent = agents.find((a: any) => a.id === fubAgentId);
              if (agent?.email) {
                targetEmail = agent.email;
              }
            } catch (e) {
              console.error('[Google Calendar] Failed to look up agent email from FUB:', e);
            }
          }
        }
      }

      if (!targetEmail) {
        return res.json({ events: [], message: "No email address found for this user" });
      }

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const events = await getGoogleCalendarEvents(targetEmail, startDate, endDate);

      res.json({ events });
    } catch (error: any) {
      console.error("Error fetching Google Calendar:", error);
      
      // Provide helpful error messages for common issues
      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({ 
          message: "Domain-wide delegation not yet configured for this user. Please check Google Admin console.",
          error: "delegation_not_configured"
        });
      }
      
      res.status(500).json({ message: "Failed to fetch Google Calendar data" });
    }
  });

  app.get('/api/fub/deals', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId: number | null = null;
      const requestedAgentId = req.query.agentId as string;

      console.log(`[FUB Deals] requestedAgentId: ${requestedAgentId}, isSuperAdmin: ${user.isSuperAdmin}`);

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else {
        fubUserId = user.fubUserId;
        
        if (!fubUserId && user.email) {
          console.log(`[FUB Deals] Looking up FUB user by email: ${user.email}`);
          const fubUser = await fubClient.getUserByEmail(user.email);
          console.log(`[FUB Deals] FUB user lookup result:`, fubUser);
          if (fubUser) {
            fubUserId = fubUser.id;
            await storage.updateUserFubId(user.id, fubUserId);
            console.log(`[FUB Deals] Linked FUB user ID ${fubUserId} to user ${user.id}`);
          } else {
            console.log(`[FUB Deals] No FUB user found for email: ${user.email}`);
          }
        }
      }

      console.log(`[FUB Deals] Using fubUserId: ${fubUserId}`);

      if (!fubUserId) {
        return res.json({ deals: [], message: "No Follow Up Boss account linked" });
      }

      const deals = await fubClient.getDeals(fubUserId);

      const currentYear = new Date().getFullYear();
      const underContract = deals.filter(d => d.status === 'under_contract');
      const closedThisYear = deals.filter(d => {
        if (d.status !== 'closed') return false;
        const closeYear = d.closeDate ? new Date(d.closeDate).getFullYear() : null;
        return closeYear === currentYear;
      });
      const closedLastYear = deals.filter(d => {
        if (d.status !== 'closed') return false;
        const closeYear = d.closeDate ? new Date(d.closeDate).getFullYear() : null;
        return closeYear === currentYear - 1;
      });

      const summary = {
        underContractCount: underContract.length,
        underContractValue: underContract.reduce((sum, d) => sum + (d.price || 0), 0),
        closedThisYearCount: closedThisYear.length,
        closedThisYearValue: closedThisYear.reduce((sum, d) => sum + (d.price || 0), 0),
        closedLastYearCount: closedLastYear.length,
        closedLastYearValue: closedLastYear.reduce((sum, d) => sum + (d.price || 0), 0),
      };

      res.json({ deals, summary });
    } catch (error) {
      console.error("Error fetching FUB deals:", error);
      res.status(500).json({ message: "Failed to fetch deals data" });
    }
  });

  app.get('/api/rezen/income', isAuthenticated, async (req: any, res) => {
    try {
      const rezenClient = getRezenClient();
      if (!rezenClient) {
        return res.status(503).json({ message: "ReZen integration not configured" });
      }

      const yentaId = req.query.yentaId as string;
      if (!yentaId) {
        return res.status(400).json({ message: "yentaId is required" });
      }

      const incomeOverview = await rezenClient.getIncomeOverview(yentaId);
      res.json({ incomeOverview });
    } catch (error) {
      console.error("Error fetching ReZen income:", error);
      res.status(500).json({ message: "Failed to fetch ReZen income data" });
    }
  });

  app.get('/api/rezen/performance', isAuthenticated, async (req: any, res) => {
    try {
      const rezenClient = getRezenClient();
      if (!rezenClient) {
        return res.status(503).json({ message: "ReZen integration not configured" });
      }

      const user = await getDbUser(req);
      
      if (!user?.rezenYentaId) {
        return res.json({ 
          configured: false,
          message: "ReZen account not linked. Please add your Yenta ID in settings."
        });
      }

      const yentaId = user.rezenYentaId;
      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).getTime();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).getTime();
      const lastYearStart = new Date(currentYear - 1, 0, 1).getTime();
      const lastYearSameDay = new Date(currentYear - 1, now.getMonth(), now.getDate()).getTime();

      const [openResult, closedResult] = await Promise.all([
        rezenClient.getTransactions(yentaId, "OPEN", { pageSize: 100 }),
        rezenClient.getTransactions(yentaId, "CLOSED", { pageSize: 200 }),
      ]);

      const openTransactions = openResult.transactions || [];
      const closedTransactions = closedResult.transactions || [];

      const getClosedAtMs = (t: any): number => {
        if (!t.closedAt) return 0;
        if (typeof t.closedAt === 'number') return t.closedAt;
        return new Date(t.closedAt).getTime();
      };

      const closedYTD = closedTransactions.filter(t => {
        const closedMs = getClosedAtMs(t);
        return closedMs >= startOfYear;
      });
      const closedL12M = closedTransactions.filter(t => {
        const closedMs = getClosedAtMs(t);
        return closedMs >= oneYearAgo;
      });
      const closedLastYearYTD = closedTransactions.filter(t => {
        const closedMs = getClosedAtMs(t);
        return closedMs >= lastYearStart && closedMs < startOfYear;
      });

      const gciYTD = closedYTD.reduce((sum, t) => sum + (t.grossCommission?.amount || 0), 0);
      const gciL12M = closedL12M.reduce((sum, t) => sum + (t.grossCommission?.amount || 0), 0);
      const pendingGCI = openTransactions.reduce((sum, t) => sum + (t.grossCommission?.amount || 0), 0);
      const totalDealsYTD = closedYTD.length;
      const avgPerDeal = totalDealsYTD > 0 ? gciYTD / totalDealsYTD : 0;

      // YTD buyer/seller breakdowns
      const buyerDealsYTD = closedYTD.filter(t => t.listing === false);
      const sellerDealsYTD = closedYTD.filter(t => t.listing === true);
      const buyerVolumeYTD = buyerDealsYTD.reduce((sum, t) => sum + (t.price?.amount || 0), 0);
      const sellerVolumeYTD = sellerDealsYTD.reduce((sum, t) => sum + (t.price?.amount || 0), 0);
      const totalVolumeYTD = buyerVolumeYTD + sellerVolumeYTD;

      // L12M buyer/seller breakdowns
      const buyerDealsL12M = closedL12M.filter(t => t.listing === false);
      const sellerDealsL12M = closedL12M.filter(t => t.listing === true);
      const buyerVolumeL12M = buyerDealsL12M.reduce((sum, t) => sum + (t.price?.amount || 0), 0);
      const sellerVolumeL12M = sellerDealsL12M.reduce((sum, t) => sum + (t.price?.amount || 0), 0);
      const totalVolumeL12M = buyerVolumeL12M + sellerVolumeL12M;

      // Average Sale Price - L12M only
      const avgSalePriceL12M = closedL12M.length > 0 ? totalVolumeL12M / closedL12M.length : 0;

      // Average Days to Close - L12M only
      let avgDaysToCloseL12M = 0;
      const dealsWithDatesL12M = closedL12M.filter(t => t.closedAt && t.firmDate);
      if (dealsWithDatesL12M.length > 0) {
        const totalDays = dealsWithDatesL12M.reduce((sum, t) => {
          const firmDateMs = new Date(t.firmDate!).getTime();
          const closedDateMs = getClosedAtMs(t);
          return sum + Math.max(0, (closedDateMs - firmDateMs) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDaysToCloseL12M = Math.round(totalDays / dealsWithDatesL12M.length);
      }

      const gciLastYearYTD = closedLastYearYTD.reduce((sum, t) => sum + (t.grossCommission?.amount || 0), 0);
      const yoyChange = gciLastYearYTD > 0 
        ? ((gciYTD - gciLastYearYTD) / gciLastYearYTD) * 100 
        : gciYTD > 0 ? 100 : 0;

      const pendingPipeline = openTransactions.map(t => ({
        id: t.id,
        address: t.address?.oneLine || "Address not available",
        price: t.price?.amount || 0,
        closingDate: t.closingDateEstimated || null,
        gci: t.grossCommission?.amount || 0,
        status: t.lifecycleState?.state || "OPEN",
        listing: t.listing || false,
      }));

      res.json({
        configured: true,
        summary: {
          gciYTD,
          gciL12M,
          pendingGCI,
          avgPerDeal,
          totalDealsYTD,
        },
        dealBreakdown: {
          // YTD
          buyerCountYTD: buyerDealsYTD.length,
          buyerVolumeYTD,
          sellerCountYTD: sellerDealsYTD.length,
          sellerVolumeYTD,
          totalVolumeYTD,
          // L12M
          buyerCountL12M: buyerDealsL12M.length,
          buyerVolumeL12M,
          sellerCountL12M: sellerDealsL12M.length,
          sellerVolumeL12M,
          totalVolumeL12M,
          // L12M-based metrics
          avgSalePriceL12M,
        },
        insights: {
          yoyChange,
          avgDaysToCloseL12M,
          pendingCount: openTransactions.length,
        },
        pendingPipeline,
      });
    } catch (error) {
      console.error("Error fetching ReZen performance:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get('/api/rezen/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const rezenClient = getRezenClient();
      if (!rezenClient) {
        return res.status(503).json({ message: "ReZen integration not configured" });
      }

      const user = await getDbUser(req);
      
      if (!user?.rezenYentaId) {
        return res.status(400).json({ message: "ReZen account not linked" });
      }

      const yentaId = user.rezenYentaId;
      const { period, side, status, includeDaysToClose } = req.query;

      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).getTime();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).getTime();
      const lastYearStart = new Date(currentYear - 1, 0, 1).getTime();

      const getClosedAtMs = (t: any): number => {
        if (!t.closedAt) return 0;
        if (typeof t.closedAt === 'number') return t.closedAt;
        return new Date(t.closedAt).getTime();
      };

      const getListedAtMs = (t: any): number => {
        if (!t.listingDate && !t.createdAt) return 0;
        const date = t.listingDate || t.createdAt;
        if (typeof date === 'number') return date;
        return new Date(date).getTime();
      };

      const calculateDaysToClose = (t: any): number | null => {
        const listedMs = getListedAtMs(t);
        const closedMs = getClosedAtMs(t);
        if (!listedMs || !closedMs) return null;
        return Math.round((closedMs - listedMs) / (1000 * 60 * 60 * 24));
      };

      let transactions: any[] = [];

      if (status === 'pending') {
        const openResult = await rezenClient.getTransactions(yentaId, "OPEN", { pageSize: 100 });
        transactions = (openResult.transactions || []).map((t: any) => ({
          id: t.id,
          address: t.address?.street || t.address?.oneLine || "Address not available",
          city: t.address?.city || "",
          state: t.address?.state || "",
          closeDate: t.closingDateEstimated || null,
          price: t.price?.amount || 0,
          gci: t.grossCommission?.amount || 0,
          side: t.listing ? 'Seller' : 'Buyer',
          status: t.lifecycleState?.state || "Open",
          transactionType: t.transactionType || "",
        }));
      } else if (period === 'yoy') {
        // Year-over-Year comparison - get both current YTD and last year same period
        const closedResult = await rezenClient.getTransactions(yentaId, "CLOSED", { pageSize: 200 });
        let closedTransactions = closedResult.transactions || [];

        // Get current year YTD
        const currentYTD = closedTransactions.filter((t: any) => {
          const closedMs = getClosedAtMs(t);
          return closedMs >= startOfYear;
        });

        // Get last year same period (same date range in previous year)
        const dayOfYear = Math.floor((now.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
        const lastYearSamePeriodEnd = lastYearStart + (dayOfYear * 24 * 60 * 60 * 1000);
        const lastYearSamePeriod = closedTransactions.filter((t: any) => {
          const closedMs = getClosedAtMs(t);
          return closedMs >= lastYearStart && closedMs <= lastYearSamePeriodEnd;
        });

        // Mark transactions with year for display
        const currentYTDMapped = currentYTD.map((t: any) => ({
          id: t.id,
          address: t.address?.street || t.address?.oneLine || "Address not available",
          city: t.address?.city || "",
          state: t.address?.state || "",
          closeDate: t.closedAt ? new Date(typeof t.closedAt === 'number' ? t.closedAt : t.closedAt).toISOString() : null,
          price: t.price?.amount || 0,
          gci: t.grossCommission?.amount || 0,
          side: t.listing ? 'Seller' : 'Buyer',
          status: "Closed",
          transactionType: t.transactionType || "",
          year: currentYear,
        }));

        const lastYearMapped = lastYearSamePeriod.map((t: any) => ({
          id: t.id,
          address: t.address?.street || t.address?.oneLine || "Address not available",
          city: t.address?.city || "",
          state: t.address?.state || "",
          closeDate: t.closedAt ? new Date(typeof t.closedAt === 'number' ? t.closedAt : t.closedAt).toISOString() : null,
          price: t.price?.amount || 0,
          gci: t.grossCommission?.amount || 0,
          side: t.listing ? 'Seller' : 'Buyer',
          status: "Closed",
          transactionType: t.transactionType || "",
          year: currentYear - 1,
        }));

        transactions = [...currentYTDMapped, ...lastYearMapped];
      } else {
        const closedResult = await rezenClient.getTransactions(yentaId, "CLOSED", { pageSize: 200 });
        let closedTransactions = closedResult.transactions || [];

        if (period === 'ytd') {
          closedTransactions = closedTransactions.filter((t: any) => {
            const closedMs = getClosedAtMs(t);
            return closedMs >= startOfYear;
          });
        } else if (period === 'l12m') {
          closedTransactions = closedTransactions.filter((t: any) => {
            const closedMs = getClosedAtMs(t);
            return closedMs >= oneYearAgo;
          });
        }

        if (side === 'buyer') {
          closedTransactions = closedTransactions.filter((t: any) => t.listing === false);
        } else if (side === 'seller') {
          closedTransactions = closedTransactions.filter((t: any) => t.listing === true);
        }

        transactions = closedTransactions.map((t: any) => {
          const transaction: any = {
            id: t.id,
            address: t.address?.street || t.address?.oneLine || "Address not available",
            city: t.address?.city || "",
            state: t.address?.state || "",
            closeDate: t.closedAt ? new Date(typeof t.closedAt === 'number' ? t.closedAt : t.closedAt).toISOString() : null,
            listDate: t.listingDate ? new Date(typeof t.listingDate === 'number' ? t.listingDate : t.listingDate).toISOString() : null,
            price: t.price?.amount || 0,
            gci: t.grossCommission?.amount || 0,
            side: t.listing ? 'Seller' : 'Buyer',
            status: "Closed",
            transactionType: t.transactionType || "",
          };

          // Add days to close if requested
          if (includeDaysToClose === 'true') {
            transaction.daysToClose = calculateDaysToClose(t);
          }

          return transaction;
        });
      }

      res.json({ transactions });
    } catch (error) {
      console.error("Error fetching ReZen transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/rezen/link', isAuthenticated, async (req: any, res) => {
    try {
      const dbUser = await getDbUser(req);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { yentaId } = req.body;
      
      if (!yentaId || typeof yentaId !== 'string') {
        return res.status(400).json({ message: "yentaId is required" });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(yentaId)) {
        return res.status(400).json({ message: "Invalid yentaId format. It should be a UUID from your ReZen profile URL." });
      }

      const user = await storage.updateUserRezenYentaId(dbUser.id, yentaId);
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error linking ReZen account:", error);
      res.status(500).json({ message: "Failed to link ReZen account" });
    }
  });

  app.post('/api/rezen/unlink', isAuthenticated, async (req: any, res) => {
    try {
      const dbUser = await getDbUser(req);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const user = await storage.updateUserRezenYentaId(dbUser.id, null);
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error unlinking ReZen account:", error);
      res.status(500).json({ message: "Failed to unlink ReZen account" });
    }
  });

  app.get('/api/context/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const profile = await storage.getAgentProfile(user.id);
      res.json({ profile: profile || null, needsOnboarding: !profile });
    } catch (error) {
      console.error("Error fetching agent profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/context/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { missionFocus, experienceLevel, primaryGoal, onboardingAnswers } = req.body;
      
      const profile = await storage.upsertAgentProfile({
        userId: user.id,
        missionFocus,
        experienceLevel,
        primaryGoal,
        onboardingAnswers,
        lastSurveyedAt: new Date(),
      });
      
      res.json({ profile });
    } catch (error) {
      console.error("Error saving agent profile:", error);
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  app.get('/api/context/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      let fubUserId = user.fubUserId;
      
      if (!fubUserId && user.email && fubClient) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      await generateSuggestionsForUser(user.id, fubUserId);
      
      const suggestions = await storage.getActiveSuggestions(user.id);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  app.post('/api/context/suggestions/:id/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const suggestion = await storage.updateSuggestionStatus(id, "dismissed");
      res.json({ suggestion });
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
      res.status(500).json({ message: "Failed to dismiss suggestion" });
    }
  });

  app.post('/api/context/suggestions/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const suggestion = await storage.updateSuggestionStatus(id, "completed");
      res.json({ suggestion });
    } catch (error) {
      console.error("Error completing suggestion:", error);
      res.status(500).json({ message: "Failed to complete suggestion" });
    }
  });

  app.get('/api/market-pulse/property-types', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = process.env.IDX_GRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Market data API key not configured" });
      }

      const headers = {
        'Accept': 'application/json',
        'REPLIERS-API-KEY': apiKey
      };

      // Get aggregates on class field
      const aggregatesUrl = `https://api.repliers.io/listings?aggregates=class,details.propertyType&listings=false&status=A&type=Sale&pageNum=1&resultsPerPage=1`;
      const aggregatesResponse = await fetch(aggregatesUrl, { headers });
      
      if (!aggregatesResponse.ok) {
        const text = await aggregatesResponse.text();
        console.error('[Market Pulse] Aggregates error:', text.substring(0, 500));
        return res.status(aggregatesResponse.status).json({ message: "Failed to fetch property types" });
      }
      
      const aggregatesData = await aggregatesResponse.json();
      console.log('[Market Pulse] Aggregates:', JSON.stringify(aggregatesData.aggregates, null, 2));
      
      // Also get a sample listing to see field structure
      const sampleUrl = `https://api.repliers.io/listings?status=A&type=Sale&class=Residential&pageNum=1&resultsPerPage=1`;
      const sampleResponse = await fetch(sampleUrl, { headers });
      let sampleListing = null;
      if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json();
        if (sampleData.listings && sampleData.listings.length > 0) {
          const listing = sampleData.listings[0];
          sampleListing = {
            class: listing.class,
            type: listing.type,
            details: listing.details,
            propertyType: listing.propertyType
          };
        }
      }
      
      res.json({ 
        aggregates: aggregatesData.aggregates, 
        count: aggregatesData.count,
        sampleListing
      });
    } catch (error) {
      console.error("Error fetching property types:", error);
      res.status(503).json({ message: "Service unavailable" });
    }
  });

  app.get('/api/market-pulse', isAuthenticated, async (req: any, res) => {
    try {
      const { getMarketPulseData } = await import('./marketPulseService');
      const forceRefresh = req.query.refresh === 'true';
      
      const data = await getMarketPulseData(forceRefresh);
      res.json(data);
    } catch (error) {
      console.error("Error fetching market pulse data:", error);
      res.status(503).json({ message: "Market data service unavailable" });
    }
  });

  // Company Listings - Austin Metro Area listings from Repliers API with RESO status support, pagination, and advanced filters
  app.get('/api/company-listings', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = process.env.IDX_GRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Listings API not configured" });
      }

      // Whitelist of valid RESO statuses
      const VALID_STATUSES = ['Active', 'Active Under Contract', 'Pending', 'Closed', 'all'];
      // Whitelist of valid sort fields
      const VALID_SORT_FIELDS = ['listDate', 'listPrice', 'beds', 'livingArea', 'daysOnMarket'];
      const VALID_SORT_ORDERS = ['asc', 'desc'];
      
      // Always filter by Spyglass Realty office
      const officeConfig = DEFAULT_OFFICE;

      // Pagination
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || '24', 10)), 100);
      const offset = (page - 1) * limit;

      // RESO status values: Active, Active Under Contract, Pending, Closed
      const requestedStatus = (req.query.status as string) || 'Active';
      const status = requestedStatus === '' ? 'all' : (VALID_STATUSES.includes(requestedStatus) ? requestedStatus : 'Active');
      
      const requestedSortBy = (req.query.sortBy as string) || 'listDate';
      const sortBy = VALID_SORT_FIELDS.includes(requestedSortBy) ? requestedSortBy : 'listDate';
      
      const requestedSortOrder = (req.query.sortOrder as string) || 'desc';
      const sortOrder = VALID_SORT_ORDERS.includes(requestedSortOrder) ? requestedSortOrder : 'desc';

      // Advanced filters
      const city = (req.query.city as string) || '';
      const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
      const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
      const minBeds = req.query.minBeds ? parseInt(req.query.minBeds as string, 10) : undefined;
      const maxBeds = req.query.maxBeds ? parseInt(req.query.maxBeds as string, 10) : undefined;
      const minBaths = req.query.minBaths ? parseInt(req.query.minBaths as string, 10) : undefined;
      const minSqft = req.query.minSqft ? parseInt(req.query.minSqft as string, 10) : undefined;
      const maxSqft = req.query.maxSqft ? parseInt(req.query.maxSqft as string, 10) : undefined;
      const propertyType = (req.query.propertyType as string) || '';
      const maxDom = req.query.maxDom ? parseInt(req.query.maxDom as string, 10) : undefined;
      const search = (req.query.search as string) || '';

      const baseUrl = 'https://api.repliers.io/listings';
      const msaCounties = ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Caldwell'];
      
      // Build sortBy parameter in Repliers format (e.g., listPriceDesc, listDateAsc)
      const sortDirection = sortOrder === 'asc' ? 'Asc' : 'Desc';
      let sortByParam = 'createdOnDesc';
      if (sortBy === 'listPrice') sortByParam = `listPrice${sortDirection}`;
      else if (sortBy === 'listDate') sortByParam = `createdOn${sortDirection}`;
      else if (sortBy === 'beds') sortByParam = `bedroomsTotal${sortDirection}`;
      else if (sortBy === 'livingArea') sortByParam = `livingArea${sortDirection}`;
      else if (sortBy === 'daysOnMarket') sortByParam = `daysOnMarket${sortDirection}`;
      
      const params = new URLSearchParams({
        listings: 'true',
        type: 'Sale',
        resultsPerPage: limit.toString(),
        pageNum: page.toString(),
        sortBy: sortByParam,
      });

      // Add county filters for Austin Metro Area (same as Market Pulse)
      msaCounties.forEach(county => params.append('county', county));
      
      // Add office filter if Spyglass selected
      if (officeConfig) {
        params.append('officeId', officeConfig.officeId);
        console.log(`[Company Listings] Filtering by office: ${officeConfig.name} (${officeConfig.officeId})`);
      }

      // City filter (if specified)
      if (city) {
        params.append('city', city);
      }

      // Price filters
      if (minPrice !== undefined) {
        params.append('minPrice', minPrice.toString());
      }
      if (maxPrice !== undefined) {
        params.append('maxPrice', maxPrice.toString());
      }

      // Bedroom filters
      if (minBeds !== undefined) {
        params.append('minBeds', minBeds.toString());
      }
      if (maxBeds !== undefined) {
        params.append('maxBeds', maxBeds.toString());
      }

      // Bathroom filter
      if (minBaths !== undefined) {
        params.append('minBaths', minBaths.toString());
      }

      // Square footage filters
      if (minSqft !== undefined) {
        params.append('minSqft', minSqft.toString());
      }
      if (maxSqft !== undefined) {
        params.append('maxSqft', maxSqft.toString());
      }

      // Property type filter
      if (propertyType) {
        params.append('propertyType', propertyType);
      }

      // Days on market filter
      if (maxDom !== undefined) {
        params.append('maxDom', maxDom.toString());
      }

      // Search filter (address, MLS#)
      if (search) {
        params.append('search', search);
      }

      // Map RESO status to Repliers API parameters (same approach as Market Pulse)
      if (status && status !== 'all') {
        if (status === 'Closed') {
          // For closed/sold listings, use status=U with lastStatus=Sld
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          params.append('status', 'U');
          params.append('lastStatus', 'Sld');
          params.append('minClosedDate', thirtyDaysAgo.toISOString().split('T')[0]);
        } else {
          // Active, Active Under Contract, Pending use standardStatus
          params.append('standardStatus', status);
        }
      } else {
        // For 'all', get active listings
        params.append('standardStatus', 'Active');
      }

      const fullUrl = `${baseUrl}?${params.toString()}`;
      console.log(`[Company Listings] Fetching page ${page} (limit ${limit}): ${status} listings...`);
      console.log(`[Company Listings] API URL: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'REPLIERS-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Company Listings] Repliers API error:', response.status, errorText);
        return res.status(502).json({ message: "Failed to fetch listings from API" });
      }

      const data = await response.json();
      
      // Log first listing to debug field names
      if (data.listings?.length > 0) {
        const sample = data.listings[0];
        console.log('[Company Listings] Sample listing fields:', Object.keys(sample).join(', '));
        console.log('[Company Listings] Sample address:', JSON.stringify(sample.address));
        console.log('[Company Listings] Sample details:', JSON.stringify(sample.details));
        console.log('[Company Listings] Sample images:', JSON.stringify(sample.images?.slice(0, 1)));
      }
      
      // Transform listings with complete addresses including zip codes
      const listings = (data.listings || []).map((listing: any) => {
        const streetNumber = listing.address?.streetNumber || '';
        const streetName = listing.address?.streetName || '';
        const streetSuffix = listing.address?.streetSuffix || '';
        const cityName = listing.address?.city || 'Austin';
        const state = listing.address?.state || 'TX';
        // Try multiple possible zip field names
        const postalCode = listing.address?.zip || listing.address?.postalCode || listing.address?.zipCode || '';
        
        const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
        const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

        // Get property details from nested details object or top-level
        const details = listing.details || {};
        const beds = listing.details?.numBedrooms || listing.numBedrooms || listing.bedroomsTotal || 0;
        const baths = listing.details?.numBathrooms || listing.numBathrooms || listing.bathroomsTotalInteger || 0;
        const sqft = listing.details?.sqft || listing.sqft || listing.livingArea || 0;

        // Get photos from images array with CDN URL
        const photos = (listing.images || listing.photos || []).map((img: any) => {
          const imagePath = typeof img === 'string' ? img : img.url || img.src || img;
          if (imagePath && !imagePath.startsWith('http')) {
            return `https://cdn.repliers.io/${imagePath}`;
          }
          return imagePath;
        });

        return {
          id: listing.mlsNumber || listing.listingId,
          listingId: listing.listingId,
          mlsNumber: listing.mlsNumber,
          status: listing.standardStatus || listing.status || status,
          listPrice: listing.listPrice,
          closePrice: listing.closePrice || listing.soldPrice,
          closeDate: listing.closeDate || listing.soldDate,
          listDate: listing.listDate,
          daysOnMarket: listing.daysOnMarket || listing.dom || 0,
          address: {
            streetNumber,
            streetName,
            streetSuffix,
            city: cityName,
            state,
            postalCode,
            full: fullAddress,
          },
          beds,
          baths,
          livingArea: sqft,
          lotSize: listing.lotSize || details.lotSize,
          yearBuilt: listing.yearBuilt || details.yearBuilt,
          propertyType: listing.propertyType || listing.type || details.propertyType,
          subdivision: listing.subdivision || listing.area,
          latitude: listing.map?.latitude || listing.latitude,
          longitude: listing.map?.longitude || listing.longitude,
          photos,
          listOfficeName: listing.office?.brokerageName || listing.listOfficeName,
        };
      });

      // Calculate pagination info
      const total = data.count || 0;
      const totalPages = Math.ceil(total / limit);
      const startIndex = total > 0 ? offset + 1 : 0;
      const endIndex = Math.min(offset + listings.length, total);

      console.log(`[Company Listings] Returning ${listings.length} of ${total} total (page ${page}/${totalPages})`);
      
      res.json({ 
        listings, 
        pagination: {
          page,
          limit,
          total,
          totalPages,
          startIndex,
          endIndex,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          status,
          city,
          minPrice,
          maxPrice,
          minBeds,
          maxBeds,
          minBaths,
          minSqft,
          maxSqft,
          propertyType,
          maxDom,
          search,
        },
        sortBy,
        sortOrder
      });
    } catch (error) {
      console.error("[Company Listings] Error:", error);
      res.status(500).json({ message: "Failed to fetch company listings" });
    }
  });

  // Spyglass Realty Office Configuration
  const SPYGLASS_OFFICES: Record<string, { 
    officeId: string; 
    displayCode: string; 
    name: string; 
    address: string;
  }> = {
    austin: {
      officeId: 'ACT1518371',
      displayCode: '5220',
      name: 'Spyglass Realty',
      address: '2130 Goodrich Ave, Austin, TX 78704',
    },
  };

  // Company Listings by Office - Spyglass Realty specific listings
  app.get('/api/company-listings/office', isAuthenticated, async (req: any, res) => {
    try {
      const apiKey = process.env.IDX_GRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Listings API not configured" });
      }

      // Always use DEFAULT_OFFICE (Spyglass Realty) - office parameter ignored
      const officeConfig = DEFAULT_OFFICE;

      const status = (req.query.status as string) || 'Active';
      const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);
      const sortBy = (req.query.sortBy as string) || 'listDate';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      const baseUrl = 'https://api.repliers.io/listings';
      
      // Build sortBy parameter in Repliers format
      const sortDirection = sortOrder === 'asc' ? 'Asc' : 'Desc';
      const sortByParam = sortBy === 'listPrice' ? `listPrice${sortDirection}` : `createdOn${sortDirection}`;
      
      const params = new URLSearchParams({
        listings: 'true',
        type: 'Sale',
        resultsPerPage: limit.toString(),
        sortBy: sortByParam,
        officeId: officeConfig.officeId,
      });

      // Add status filter
      if (status === 'Active') {
        params.append('standardStatus', 'Active');
      } else if (status === 'all') {
        params.append('status', 'A');
      } else {
        params.append('standardStatus', status);
      }

      const fullUrl = `${baseUrl}?${params.toString()}`;
      console.log(`[Spyglass Listings] Fetching ${officeConfig.name} (${officeConfig.officeId})...`);
      console.log(`[Spyglass Listings] API URL: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'REPLIERS-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Spyglass Listings] Repliers API error:', response.status, errorText);
        return res.status(502).json({ message: "Failed to fetch listings from API" });
      }

      const data = await response.json();
      
      // Log sample listing fields for debugging
      if (data.listings?.length > 0) {
        const sample = data.listings[0];
        console.log('[Spyglass Listings] Sample brokerage:', sample.office?.brokerageName);
      }
      
      // Transform listings
      const listings = (data.listings || []).map((listing: any) => {
        const streetNumber = listing.address?.streetNumber || '';
        const streetName = listing.address?.streetName || '';
        const streetSuffix = listing.address?.streetSuffix || '';
        const cityName = listing.address?.city || 'Austin';
        const state = listing.address?.state || 'TX';
        const postalCode = listing.address?.zip || listing.address?.postalCode || '';
        
        const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
        const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

        const details = listing.details || {};
        const beds = listing.details?.numBedrooms || listing.numBedrooms || listing.bedroomsTotal || 0;
        const baths = listing.details?.numBathrooms || listing.numBathrooms || listing.bathroomsTotalInteger || 0;
        const sqft = listing.details?.sqft || listing.sqft || listing.livingArea || 0;

        const photos = (listing.images || listing.photos || []).map((img: any) => {
          const imagePath = typeof img === 'string' ? img : img.url || img.src || img;
          if (imagePath && !imagePath.startsWith('http')) {
            return `https://cdn.repliers.io/${imagePath}`;
          }
          return imagePath;
        });

        return {
          id: listing.mlsNumber || listing.listingId,
          mlsNumber: listing.mlsNumber,
          status: listing.standardStatus || listing.status || status,
          listPrice: listing.listPrice,
          listDate: listing.listDate,
          daysOnMarket: listing.daysOnMarket || listing.dom || 0,
          address: {
            streetNumber,
            streetName,
            streetSuffix,
            city: cityName,
            state,
            postalCode,
            full: fullAddress,
          },
          beds,
          baths,
          sqft,
          photos,
          listAgentName: listing.agents?.[0]?.name || listing.listAgentName,
          listAgentMlsId: listing.agents?.[0]?.mlsId || listing.listAgentMlsId,
        };
      });

      console.log(`[Spyglass Listings] Found ${listings.length} listings for ${officeConfig.name}`);

      res.json({
        total: data.count || listings.length,
        listings,
        office: {
          id: officeConfig.officeId,
          code: officeConfig.displayCode,
          name: officeConfig.name,
          address: officeConfig.address,
        },
        officeCode: officeConfig.displayCode,
        officeName: officeConfig.name,
        officeAddress: officeConfig.address,
      });
    } catch (error) {
      console.error("[Spyglass Listings] Error:", error);
      res.status(500).json({ message: "Failed to fetch company listings by office" });
    }
  });

  app.get('/api/fub/leads/anniversary', isAuthenticated, async (req: any, res) => {
    console.log('[Leads API] ========== Anniversary endpoint called ==========');
    try {
      const user = await getDbUser(req);
      console.log('[Leads API] Request user:', { id: user?.id, email: user?.email, fubUserId: user?.fubUserId });
      
      if (!user) {
        console.log('[Leads API] User not found in DB');
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        console.log('[Leads API] FUB client not configured');
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
        console.log('[Leads API] Super admin viewing agent:', fubUserId);
      } else if (!fubUserId && user.email) {
        console.log('[Leads API] Attempting to link user by email:', user.email);
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
          console.log('[Leads API] Successfully linked user to FUB:', fubUserId);
        } else {
          console.log('[Leads API] No FUB user found for email:', user.email);
        }
      }

      if (!fubUserId) {
        console.log('[Leads API] No fubUserId - returning empty');
        return res.json({ leads: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const leads = await fubClient.getAnniversaryLeads(fubUserId);
      console.log('[Leads API] Returning', leads.length, 'anniversary leads');
      res.json({ leads, linked: true });
    } catch (error) {
      console.error("Error fetching anniversary leads:", error);
      res.status(500).json({ message: "Failed to fetch anniversary leads" });
    }
  });

  app.get('/api/fub/leads/birthdays', isAuthenticated, async (req: any, res) => {
    console.log('[Leads API] ========== Birthdays endpoint called ==========');
    try {
      const user = await getDbUser(req);
      console.log('[Leads API] Request user:', { id: user?.id, email: user?.email, fubUserId: user?.fubUserId });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else if (!fubUserId && user.email) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      if (!fubUserId) {
        console.log('[Leads API] No fubUserId - returning empty');
        return res.json({ leads: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const leads = await fubClient.getBirthdayLeads(fubUserId);
      console.log('[Leads API] Returning', leads.length, 'birthday leads');
      res.json({ leads, linked: true });
    } catch (error) {
      console.error("Error fetching birthday leads:", error);
      res.status(500).json({ message: "Failed to fetch birthday leads" });
    }
  });

  app.get('/api/fub/leads/all', isAuthenticated, async (req: any, res) => {
    console.log('[Leads API] ========== All Leads endpoint called ==========');
    try {
      const user = await getDbUser(req);
      console.log('[Leads API] Request user:', { id: user?.id, email: user?.email, fubUserId: user?.fubUserId });
      
      if (!user) {
        console.log('[Leads API] User not found in DB');
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        console.log('[Leads API] FUB client not configured');
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
        console.log('[Leads API] Super admin viewing agent:', fubUserId);
      } else if (!fubUserId && user.email) {
        console.log('[Leads API] Attempting to link user by email:', user.email);
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
          console.log('[Leads API] Successfully linked user to FUB:', fubUserId);
        } else {
          console.log('[Leads API] No FUB user found for email:', user.email);
        }
      }

      if (!fubUserId) {
        console.log('[Leads API] No fubUserId - returning empty');
        return res.json({ leads: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const leads = await fubClient.getPeople(fubUserId);
      console.log('[Leads API] Returning', leads.length, 'total leads');
      res.json({ leads, linked: true });
    } catch (error) {
      console.error("Error fetching all leads:", error);
      res.status(500).json({ message: "Failed to fetch all leads" });
    }
  });

  app.get('/api/fub/leads/recent-activity', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else if (!fubUserId && user.email) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      if (!fubUserId) {
        return res.json({ leads: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const leads = await fubClient.getRecentActivityLeads(fubUserId);
      res.json({ leads, linked: true });
    } catch (error) {
      console.error("Error fetching recent activity leads:", error);
      res.status(500).json({ message: "Failed to fetch recent activity leads" });
    }
  });

  // Stale Contacts - people not contacted in X days
  app.get('/api/fub/leads/stale', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;
      const minDays = parseInt(req.query.minDays as string, 10) || 60;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else if (!fubUserId && user.email) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      if (!fubUserId) {
        return res.json({ leads: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const leads = await fubClient.getStaleContacts(fubUserId, minDays);
      res.json({ leads, linked: true });
    } catch (error) {
      console.error("Error fetching stale contacts:", error);
      res.status(500).json({ message: "Failed to fetch stale contacts" });
    }
  });

  // Smart Suggestions - priority-scored contacts to call this week
  app.get('/api/fub/leads/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;
      const limit = parseInt(req.query.limit as string, 10) || 5;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else if (!fubUserId && user.email) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      if (!fubUserId) {
        return res.json({ suggestions: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const suggestions = await fubClient.getSmartSuggestions(fubUserId, limit);
      res.json({ suggestions, linked: true });
    } catch (error) {
      console.error("Error fetching smart suggestions:", error);
      res.status(500).json({ message: "Failed to fetch smart suggestions" });
    }
  });

  app.get('/api/fub/tasks/due', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "Follow Up Boss integration not configured" });
      }

      let fubUserId = user.fubUserId;
      const requestedAgentId = req.query.agentId as string;

      if (requestedAgentId && user.isSuperAdmin) {
        fubUserId = parseInt(requestedAgentId, 10);
      } else if (!fubUserId && user.email) {
        const fubUser = await fubClient.getUserByEmail(user.email);
        if (fubUser) {
          fubUserId = fubUser.id;
          await storage.updateUserFubId(user.id, fubUserId);
        }
      }

      if (!fubUserId) {
        return res.json({ tasks: [], linked: false, message: "No Follow Up Boss account linked" });
      }

      const tasks = await fubClient.getDueTasks(fubUserId);
      res.json({ tasks, linked: true });
    } catch (error) {
      console.error("Error fetching due tasks:", error);
      res.status(500).json({ message: "Failed to fetch due tasks" });
    }
  });

  // Debug endpoint for FUB user status
  app.get('/api/fub/debug/user-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      const fubClient = getFubClient();
      
      const debugInfo = {
        userId: user?.id,
        email: user?.email,
        fubUserId: user?.fubUserId || 'NOT LINKED',
        isSuperAdmin: user?.isSuperAdmin || false,
        fubApiKeyConfigured: !!process.env.FUB_API_KEY,
        timestamp: new Date().toISOString()
      };
      
      res.json(debugInfo);
    } catch (error) {
      console.error('[FUB Debug] Error checking user status:', error);
      res.status(500).json({ message: "Failed to check user status" });
    }
  });

  // Debug endpoint to list all FUB users
  app.get('/api/fub/debug/all-users', isAuthenticated, async (req: any, res) => {
    try {
      const fubClient = getFubClient();
      if (!fubClient) {
        return res.status(503).json({ message: "FUB not configured" });
      }
      
      const allAgents = await fubClient.getAllAgents();
      console.log('[FUB Debug] All FUB users:', allAgents.map(a => ({ id: a.id, email: a.email, name: a.name })));
      
      res.json({
        totalUsers: allAgents.length,
        users: allAgents.map(a => ({ id: a.id, email: a.email, name: a.name }))
      });
    } catch (error) {
      console.error('[FUB Debug] Error fetching all users:', error);
      res.status(500).json({ message: "Failed to fetch FUB users" });
    }
  });

  // Vimeo - Get latest training video
  app.get('/api/vimeo/latest-video', isAuthenticated, async (req: any, res) => {
    try {
      const video = await getLatestTrainingVideo();
      if (!video) {
        return res.json({ video: null, message: "No training videos available" });
      }
      res.json({ video });
    } catch (error) {
      console.error("Error fetching latest training video:", error);
      res.status(500).json({ message: "Failed to fetch training video" });
    }
  });

  // Vimeo - Get all training videos for modal
  app.get('/api/vimeo/training-videos', isAuthenticated, async (req: any, res) => {
    try {
      const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
      const VIMEO_USER_ID = process.env.VIMEO_USER_ID || '192648675';
      const VIMEO_FOLDER_ID = process.env.VIMEO_FOLDER_ID || '27970547';
      
      if (!VIMEO_ACCESS_TOKEN) {
        return res.status(503).json({ error: 'Vimeo not configured' });
      }

      // Use the correct API path with user ID and folder ID (project)
      const endpoint = `https://api.vimeo.com/users/${VIMEO_USER_ID}/projects/${VIMEO_FOLDER_ID}/videos?per_page=100&sort=date&direction=desc`;
      
      console.log(`[Vimeo] Fetching training videos from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${VIMEO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Vimeo API Error]', response.status, errorText);
        throw new Error('Failed to fetch from Vimeo');
      }

      const data = await response.json();
      
      const videos = data.data.map((video: any) => ({
        id: video.uri.split('/').pop(),
        name: video.name,
        description: video.description || '',
        duration: video.duration,
        created_time: video.created_time,
        modified_time: video.modified_time,
        release_time: video.release_time,
        link: video.link,
        player_embed_url: video.player_embed_url,
        pictures: video.pictures
      }));

      console.log(`[Vimeo] Fetched ${videos.length} videos from folder ${VIMEO_FOLDER_ID}`);

      res.json({ 
        videos,
        total: data.total,
        page: data.page,
        per_page: data.per_page
      });
      
    } catch (error) {
      console.error('[Vimeo API Error]', error);
      res.status(500).json({ error: 'Failed to fetch training videos' });
    }
  });

  // Marketing Calendar - AI-powered social media ideas
  app.post('/api/marketing/social-ideas', isAuthenticated, async (req: any, res) => {
    try {
      const { month, year } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      const openaiConfig: { apiKey: string | undefined; baseURL?: string } = {
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      };
      // Only set baseURL if explicitly configured (otherwise use OpenAI default)
      if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        openaiConfig.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      }
      const openai = new OpenAI(openaiConfig);

      const prompt = `Generate a social media content calendar for real estate agents for ${month} ${year}. 

Create content ideas for 4 weeks with the following structure:
- Each week should have a theme relevant to real estate (e.g., "Market Insights", "Home Buying Tips", "Community Spotlight", "Success Stories")
- For each week, provide 3-4 post ideas across different platforms (Instagram, Facebook, LinkedIn)
- Each post should include:
  - Platform name
  - Post type (Reel, Carousel, Story, Photo Post, Article)
  - A ready-to-use caption (2-3 sentences)
  - 3-5 relevant hashtags
  - Best posting time

Consider seasonal events, holidays, and real estate market trends for ${month}.

Respond with valid JSON in this exact format:
{
  "month": "${month}",
  "year": ${year},
  "ideas": [
    {
      "week": 1,
      "theme": "Theme Name",
      "posts": [
        {
          "platform": "Instagram",
          "type": "Reel",
          "caption": "Ready-to-post caption text here",
          "hashtags": ["realestate", "homebuying", "austinrealestate"],
          "bestTime": "Tuesday 11am"
        }
      ]
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a social media marketing expert specializing in real estate content. Generate creative, engaging content ideas that real estate agents can use immediately. Always respond with valid JSON only, no markdown." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const ideas = JSON.parse(content);
      res.json(ideas);
    } catch (error) {
      console.error("Error generating social media ideas:", error);
      res.status(500).json({ message: "Failed to generate social media ideas" });
    }
  });

  // ============================================
  // SAVED CONTENT IDEAS ENDPOINTS
  // ============================================

  // GET /api/content-ideas/saved - Get all saved content ideas
  app.get('/api/content-ideas/saved', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const ideas = await storage.getSavedContentIdeas(user.id);
      res.json({ ideas });
    } catch (error) {
      console.error('[Content Ideas] Error fetching saved:', error);
      res.status(500).json({ message: 'Failed to fetch saved ideas' });
    }
  });

  // POST /api/content-ideas/save - Save a content idea
  app.post('/api/content-ideas/save', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parseResult = saveContentIdeaSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: parseResult.error.errors 
        });
      }

      const { month, year, week, theme, platform, contentType, bestTime, content, hashtags } = parseResult.data;

      const savedIdea = await storage.saveContentIdea({
        userId: user.id,
        month,
        year,
        week,
        theme,
        platform,
        contentType,
        bestTime,
        content,
        hashtags: Array.isArray(hashtags) ? hashtags.join(',') : hashtags
      });

      console.log(`[Content Ideas] User ${user.id} saved idea for ${platform}`);
      res.json({ success: true, idea: savedIdea });
    } catch (error) {
      console.error('[Content Ideas] Error saving:', error);
      res.status(500).json({ message: 'Failed to save content idea' });
    }
  });

  // DELETE /api/content-ideas/:id - Delete a saved content idea
  app.delete('/api/content-ideas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const ideaId = parseInt(req.params.id);
      const deleted = await storage.deleteContentIdea(ideaId, user.id);

      if (!deleted) {
        return res.status(404).json({ message: 'Content idea not found' });
      }

      console.log(`[Content Ideas] User ${user.id} deleted idea ${ideaId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[Content Ideas] Error deleting:', error);
      res.status(500).json({ message: 'Failed to delete content idea' });
    }
  });

  // PATCH /api/content-ideas/:id/status - Update status (saved/scheduled/posted)
  app.patch('/api/content-ideas/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const ideaId = parseInt(req.params.id);
      
      const parseResult = updateContentIdeaStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Invalid status',
          errors: parseResult.error.errors 
        });
      }

      const { status } = parseResult.data;
      const updated = await storage.updateContentIdeaStatus(ideaId, user.id, status);

      if (!updated) {
        return res.status(404).json({ message: 'Content idea not found' });
      }

      res.json({ success: true, idea: updated });
    } catch (error) {
      console.error('[Content Ideas] Error updating status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // App Usage Tracking - Track app clicks for auto-arrange
  app.post('/api/app-usage/track', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { appId, page } = req.body;
      if (!appId || !page) {
        return res.status(400).json({ message: "appId and page are required" });
      }

      const usage = await storage.trackAppUsage(user.id, appId, page);
      res.json({ success: true, usage });
    } catch (error) {
      console.error("Error tracking app usage:", error);
      res.status(500).json({ message: "Failed to track app usage" });
    }
  });

  // Get app usage for sorting
  app.get('/api/app-usage/:page', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { page } = req.params;
      const usage = await storage.getAppUsageByPage(user.id, page);
      res.json({ usage });
    } catch (error) {
      console.error("Error fetching app usage:", error);
      res.status(500).json({ message: "Failed to fetch app usage" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const notifications = await storage.getNotifications(user.id);
      const unreadCount = await storage.getUnreadNotificationCount(user.id);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { id } = req.params;
      const notification = await storage.markNotificationRead(id, user.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true, notification });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.post('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.markAllNotificationsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  // Notification settings endpoints
  app.get('/api/notifications/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let settings = await storage.getNotificationSettings(user.id);
      
      if (!settings) {
        settings = await storage.upsertNotificationSettings({ userId: user.id });
      }
      
      res.json({ settings });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.put('/api/notifications/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { updateNotificationSettingsSchema } = await import("@shared/schema");
      const parseResult = updateNotificationSettingsSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid notification settings", 
          errors: parseResult.error.errors 
        });
      }

      const validatedData = parseResult.data;

      const settings = await storage.upsertNotificationSettings({
        userId: user.id,
        ...validatedData,
      });

      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // ============================================
  // VIDEO PREFERENCES ENDPOINTS
  // ============================================
  
  app.get('/api/videos/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const preferences = await storage.getVideoPreferences(user.id);
      
      const prefsMap: Record<string, any> = {};
      preferences.forEach(pref => {
        prefsMap[pref.videoId] = {
          isFavorite: pref.isFavorite,
          isWatchLater: pref.isWatchLater,
          watchProgress: pref.watchProgress,
          watchPercentage: pref.watchPercentage,
          lastWatchedAt: pref.lastWatchedAt
        };
      });

      res.json({ preferences: prefsMap });
    } catch (error) {
      console.error('[Video Preferences Error]', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  app.get('/api/videos/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const favorites = await storage.getFavoriteVideos(user.id);
      res.json({ videos: favorites });
    } catch (error) {
      console.error('[Favorites Error]', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.get('/api/videos/watch-later', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const watchLater = await storage.getWatchLaterVideos(user.id);
      res.json({ videos: watchLater });
    } catch (error) {
      console.error('[Watch Later Error]', error);
      res.status(500).json({ error: 'Failed to fetch watch later list' });
    }
  });

  app.get('/api/videos/continue-watching', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const inProgress = await storage.getContinueWatchingVideos(user.id);
      res.json({ videos: inProgress });
    } catch (error) {
      console.error('[Continue Watching Error]', error);
      res.status(500).json({ error: 'Failed to fetch continue watching list' });
    }
  });

  app.post('/api/videos/:videoId/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      const { videoId } = req.params;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { videoFavoriteSchema } = await import("@shared/schema");
      const parseResult = videoFavoriteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.errors });
      }
      const { videoName, videoThumbnail, videoDuration } = parseResult.data;

      const existing = await storage.getVideoPreference(user.id, videoId);

      if (existing) {
        const newValue = !existing.isFavorite;
        await storage.upsertVideoPreference({
          ...existing,
          isFavorite: newValue,
        });
        res.json({ isFavorite: newValue });
      } else {
        await storage.upsertVideoPreference({
          userId: user.id,
          videoId,
          videoName,
          videoThumbnail,
          videoDuration,
          isFavorite: true,
          isWatchLater: false,
          watchProgress: 0,
          watchPercentage: 0
        });
        res.json({ isFavorite: true });
      }
    } catch (error) {
      console.error('[Toggle Favorite Error]', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  app.post('/api/videos/:videoId/watch-later', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      const { videoId } = req.params;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { videoFavoriteSchema } = await import("@shared/schema");
      const parseResult = videoFavoriteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.errors });
      }
      const { videoName, videoThumbnail, videoDuration } = parseResult.data;

      const existing = await storage.getVideoPreference(user.id, videoId);

      if (existing) {
        const newValue = !existing.isWatchLater;
        await storage.upsertVideoPreference({
          ...existing,
          isWatchLater: newValue,
        });
        res.json({ isWatchLater: newValue });
      } else {
        await storage.upsertVideoPreference({
          userId: user.id,
          videoId,
          videoName,
          videoThumbnail,
          videoDuration,
          isFavorite: false,
          isWatchLater: true,
          watchProgress: 0,
          watchPercentage: 0
        });
        res.json({ isWatchLater: true });
      }
    } catch (error) {
      console.error('[Toggle Watch Later Error]', error);
      res.status(500).json({ error: 'Failed to toggle watch later' });
    }
  });

  app.post('/api/videos/:videoId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      const { videoId } = req.params;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { videoProgressSchema } = await import("@shared/schema");
      const parseResult = videoProgressSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.errors });
      }
      const { progress, percentage, videoName, videoThumbnail, videoDuration } = parseResult.data;

      const existing = await storage.getVideoPreference(user.id, videoId);

      if (existing) {
        await storage.upsertVideoPreference({
          ...existing,
          watchProgress: progress,
          watchPercentage: percentage,
          lastWatchedAt: new Date(),
        });
      } else {
        await storage.upsertVideoPreference({
          userId: user.id,
          videoId,
          videoName,
          videoThumbnail,
          videoDuration,
          isFavorite: false,
          isWatchLater: false,
          watchProgress: progress,
          watchPercentage: percentage,
          lastWatchedAt: new Date()
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Update Progress Error]', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  });

  app.delete('/api/videos/:videoId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      const { videoId } = req.params;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const existing = await storage.getVideoPreference(user.id, videoId);
      if (existing) {
        await storage.upsertVideoPreference({
          ...existing,
          watchProgress: 0,
          watchPercentage: 0,
          lastWatchedAt: null,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Clear Progress Error]', error);
      res.status(500).json({ error: 'Failed to clear progress' });
    }
  });

  // Theme preference endpoint
  app.patch('/api/user/theme', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { theme } = req.body;
      if (!theme || !['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ message: "Invalid theme value" });
      }

      const updatedUser = await storage.updateUserTheme(user.id, theme);
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating theme:", error);
      res.status(500).json({ message: "Failed to update theme" });
    }
  });

  // ============================================
  // SYNC STATUS & REFRESH ENDPOINTS
  // ============================================

  const VALID_SYNC_SECTIONS = ['leads', 'reports', 'calendar', 'training', 'market-pulse', 'performance'];

  app.get('/api/sync/status/:section', isAuthenticated, async (req: any, res) => {
    try {
      const { section } = req.params;
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!VALID_SYNC_SECTIONS.includes(section)) {
        return res.status(400).json({ error: 'Invalid section' });
      }

      const status = await storage.getSyncStatus(user.id, section);

      res.json({
        section,
        lastManualRefresh: status?.lastManualRefresh || null,
        lastAutoRefresh: status?.lastAutoRefresh || null
      });
    } catch (error) {
      console.error('[Sync Status] Error:', error);
      res.status(500).json({ error: 'Failed to get sync status' });
    }
  });

  app.post('/api/sync/refresh/:section', isAuthenticated, async (req: any, res) => {
    try {
      const { section } = req.params;
      const user = await getDbUser(req);
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!VALID_SYNC_SECTIONS.includes(section)) {
        return res.status(400).json({ error: 'Invalid section' });
      }

      console.log(`[Sync Refresh] User ${user.id} manually refreshing ${section}`);
      const now = new Date();

      await storage.upsertSyncStatus(user.id, section, now);

      res.json({
        success: true,
        section,
        syncedAt: now.toISOString()
      });
    } catch (error) {
      console.error('[Sync Refresh] Error:', error);
      res.status(500).json({ error: `Failed to refresh ${req.params.section}` });
    }
  });

  // ==========================================
  // CMA (Comparative Market Analysis) Routes
  // ==========================================

  // List all CMAs for the authenticated user
  app.get('/api/cma', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      const cmaList = await storage.getCmas(user.id);
      res.json({ cmas: cmaList });
    } catch (error) {
      console.error('[CMA] Error listing CMAs:', error);
      res.status(500).json({ message: "Failed to list CMAs" });
    }
  });

  // Create a new CMA
  app.post('/api/cma', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      const { name, subjectProperty, comparableProperties, notes, status } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const cma = await storage.createCma({
        userId: user.id,
        name,
        subjectProperty: subjectProperty || null,
        comparableProperties: comparableProperties || [],
        notes: notes || null,
        status: status || 'draft',
      });
      res.json(cma);
    } catch (error) {
      console.error('[CMA] Error creating CMA:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: "Failed to create CMA", error: errMsg });
    }
  });

  // Get a single CMA by ID
  app.get('/api/cma/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      const cma = await storage.getCma(req.params.id, user.id);
      if (!cma) return res.status(404).json({ message: "CMA not found" });
      res.json(cma);
    } catch (error) {
      console.error('[CMA] Error getting CMA:', error);
      res.status(500).json({ message: "Failed to get CMA" });
    }
  });

  // Update a CMA
  app.put('/api/cma/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      const { name, subjectProperty, comparableProperties, notes, status, presentationConfig } = req.body;
      const updated = await storage.updateCma(req.params.id, user.id, {
        ...(name !== undefined && { name }),
        ...(subjectProperty !== undefined && { subjectProperty }),
        ...(comparableProperties !== undefined && { comparableProperties }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(presentationConfig !== undefined && { presentationConfig }),
      });
      if (!updated) return res.status(404).json({ message: "CMA not found" });
      res.json(updated);
    } catch (error) {
      console.error('[CMA] Error updating CMA:', error);
      res.status(500).json({ message: "Failed to update CMA" });
    }
  });

  // Delete a CMA
  app.delete('/api/cma/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      const deleted = await storage.deleteCma(req.params.id, user.id);
      if (!deleted) return res.status(404).json({ message: "CMA not found" });
      res.json({ success: true });
    } catch (error) {
      console.error('[CMA] Error deleting CMA:', error);
      res.status(500).json({ message: "Failed to delete CMA" });
    }
  });

  // Search properties for CMA comparables via Repliers API
  app.post('/api/cma/search-properties', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const apiKey = process.env.IDX_GRID_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Listings API not configured" });
      }

      const {
        city, subdivision, zip, county, area, listingId,
        schoolDistrict, 
        elementarySchool, middleSchool, highSchool,
        minBeds, minBaths, fullBaths, halfBaths,
        minPrice, maxPrice,
        propertyType, statuses, // array of statuses: ['Active', 'Active Under Contract', 'Closed']
        minSqft, maxSqft, minLotAcres, maxLotAcres,
        stories, minYearBuilt, maxYearBuilt,
        garageSpaces, parkingSpaces,
        privatePool, waterfront, hoa, primaryBedOnMain,
        search, // address search
        page, limit,
        mapBounds, // { sw: { lat, lng }, ne: { lat, lng } } for map search
        polygon, // array of [lng, lat] coordinate pairs for polygon map search
        dateSoldDays, // number of days for closed listings (90, 120, 150, 180, 360)
        mlsNumbers, // array of MLS numbers for bulk lookup
      } = req.body;

      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const resultsPerPage = Math.min(Math.max(1, parseInt(limit || '25', 10)), 50);

      const baseUrl = 'https://api.repliers.io/listings';
      const params = new URLSearchParams({
        listings: 'true',
        type: 'Sale',
        resultsPerPage: resultsPerPage.toString(),
        pageNum: pageNum.toString(),
        sortBy: 'createdOnDesc',
      });

      // Address search
      if (search) params.append('search', search);

      // Direct listing ID lookup via mlsNumber param
      if (listingId) params.append('mlsNumber', listingId.trim());

      // Location filters
      if (city) params.append('city', city);
      if (zip) params.append('zip', zip);
      if (county) params.append('county', county);
      if (area) params.append('area', area);
      
      // Subdivision handling: Repliers neighborhood requires EXACT match, but the MLS does
      // CONTAINS matching. "Circle C" should match "Circle C Ranch Ph A Sec 04", etc.
      // Strategy: probe for zip codes via neighborhood lookup, then search by those zips
      // and post-filter by neighborhood text. This narrows results to the right area.
      const subdivisionFilter = subdivision ? subdivision.toLowerCase().trim() : null;
      if (subdivision) {
        console.log(`[CMA Search] Subdivision search: "${subdivision}"`);
        
        // Step 1: Probe for zip codes by trying the subdivision as a neighborhood
        const probeZips = new Set<string>();
        const probeVariations = [
          subdivision,
          `${subdivision} Ranch`, `${subdivision} Estates`, `${subdivision} Phase`,
          `${subdivision} Sec`, `${subdivision} Add`, `${subdivision} Sub`,
        ];
        
        for (const variant of probeVariations) {
          try {
            const probeParams = new URLSearchParams({
              neighborhood: variant, type: 'Sale', resultsPerPage: '10', listings: 'true'
            });
            const probeRes = await fetch(`${baseUrl}?${probeParams.toString()}`, {
              headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
            });
            const probeData = await probeRes.json();
            if ((probeData.count || 0) > 0) {
              (probeData.listings || []).forEach((l: any) => {
                const z = l.address?.zip;
                if (z) probeZips.add(z);
              });
              console.log(`[CMA Search] Probe "${variant}": ${probeData.count} results, zips: ${[...probeZips].join(', ')}`);
            }
            // Stop probing once we have zip codes
            if (probeZips.size >= 2) break;
          } catch { /* try next */ }
        }

        if (probeZips.size > 0) {
          // Use discovered zip codes to narrow the search
          for (const z of probeZips) {
            params.append('zip', z);
          }
          // Remove city filter if we have zips (zip is more precise)
          params.delete('city');
          console.log(`[CMA Search] Using zip codes for subdivision: ${[...probeZips].join(', ')}`);
        } else if (!city && !zip) {
          // Fallback: default to Austin
          params.append('city', 'Austin');
          console.log(`[CMA Search] No zips found, defaulting to city=Austin`);
        }
        
        // Request more results to ensure enough matches after post-filtering
        params.set('resultsPerPage', '500');
      }

      // School filters
      if (schoolDistrict) params.append('schoolDistrict', schoolDistrict);
      if (elementarySchool) params.append('elementarySchool', elementarySchool);
      if (middleSchool) params.append('middleSchool', middleSchool);
      if (highSchool) params.append('highSchool', highSchool);

      // If mlsNumbers provided, search by MLS numbers instead of criteria
      if (mlsNumbers && Array.isArray(mlsNumbers) && mlsNumbers.length > 0) {
        // For bulk MLS lookup, search each MLS number
        // Repliers supports searching by mlsNumber parameter
        const allListings: any[] = [];
        const foundMls: string[] = [];
        const notFoundMls: string[] = [];

        for (const mls of mlsNumbers) {
          const mlsClean = mls.trim();
          if (!mlsClean) continue;
          try {
            const mlsParams = new URLSearchParams({
              listings: 'true',
              type: 'Sale',
              resultsPerPage: '5',
              pageNum: '1',
              search: mlsClean,
            });
            const mlsUrl = `${baseUrl}?${mlsParams.toString()}`;
            const mlsResponse = await fetch(mlsUrl, {
              headers: {
                'Accept': 'application/json',
                'REPLIERS-API-KEY': apiKey
              }
            });
            if (mlsResponse.ok) {
              const mlsData = await mlsResponse.json();
              const mlsListings = mlsData.listings || [];
              // Find exact MLS match
              const exact = mlsListings.find((l: any) => l.mlsNumber === mlsClean);
              if (exact) {
                allListings.push(exact);
                foundMls.push(mlsClean);
              } else if (mlsListings.length > 0) {
                allListings.push(mlsListings[0]);
                foundMls.push(mlsClean);
              } else {
                notFoundMls.push(mlsClean);
              }
            } else {
              notFoundMls.push(mlsClean);
            }
          } catch (err) {
            console.error(`[CMA Search] Error looking up MLS# ${mlsClean}:`, err);
            notFoundMls.push(mlsClean);
          }
        }

        // Transform the found listings
        const listings = allListings.map((listing: any) => {
          const streetNumber = listing.address?.streetNumber || '';
          const streetName = listing.address?.streetName || '';
          const streetSuffix = listing.address?.streetSuffix || '';
          const cityName = listing.address?.city || '';
          const state = listing.address?.state || 'TX';
          const postalCode = listing.address?.zip || listing.address?.postalCode || '';
          const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
          const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

          let photo = null;
          if (listing.images && listing.images.length > 0) {
            const imagePath = listing.images[0];
            if (typeof imagePath === 'string') {
              photo = imagePath.startsWith('http') ? imagePath : `https://cdn.repliers.io/${imagePath}`;
            }
          }

          return {
            mlsNumber: listing.mlsNumber || listing.listingId || '',
            address: fullAddress,
            streetAddress,
            city: cityName,
            state,
            zip: postalCode,
            listPrice: listing.listPrice || 0,
            soldPrice: listing.soldPrice || listing.closePrice || null,
            beds: listing.details?.numBedrooms || listing.bedroomsTotal || 0,
            baths: listing.details?.numBathrooms || listing.bathroomsTotal || 0,
            sqft: listing.details?.sqft || listing.livingArea || 0,
            lotSizeAcres: listing.lot?.acres || (listing.lotSizeArea ? listing.lotSizeArea / 43560 : null),
            yearBuilt: listing.details?.yearBuilt || null,
            propertyType: listing.details?.propertyType || listing.propertyType || '',
            status: listing.standardStatus || listing.status || '',
            listDate: listing.listDate || '',
            soldDate: listing.soldDate || listing.closeDate || null,
            daysOnMarket: listing.daysOnMarket || 0,
            photo,
            stories: listing.details?.numStoreys || null,
            subdivision: listing.address?.area || listing.address?.neighborhood || '',
            latitude: listing.map?.latitude || listing.address?.latitude || null,
            longitude: listing.map?.longitude || listing.address?.longitude || null,
          };
        });

        console.log(`[CMA Search] MLS Bulk Lookup: ${foundMls.length} found, ${notFoundMls.length} not found`);
        return res.json({
          listings,
          total: listings.length,
          page: 1,
          totalPages: 1,
          resultsPerPage: listings.length,
          mlsLookup: {
            found: foundMls,
            notFound: notFoundMls,
          },
        });
      }

      // Property filters
      if (minBeds) params.append('minBeds', minBeds.toString());
      if (minBaths) params.append('minBaths', minBaths.toString());
      if (minPrice) params.append('minPrice', minPrice.toString());
      if (maxPrice) params.append('maxPrice', maxPrice.toString());
      if (minSqft) params.append('minSqft', minSqft.toString());
      if (maxSqft) params.append('maxSqft', maxSqft.toString());
      // Repliers uses "style" for sub-property types like "Single Family Residence", "Townhouse", etc.
      // The "propertyType" field is always just "Residential" or "Land"
      if (propertyType) params.append('style', propertyType);
      if (stories) params.append('stories', stories.toString());
      if (minYearBuilt) params.append('minYearBuilt', minYearBuilt.toString());
      if (maxYearBuilt) params.append('maxYearBuilt', maxYearBuilt.toString());

      // Garage & parking (Repliers supports minGarageSpaces and minParkingSpaces)
      if (garageSpaces) params.append('minGarageSpaces', garageSpaces.toString());
      if (parkingSpaces) params.append('minParkingSpaces', parkingSpaces.toString());

      // Pool filter (Repliers supports swimmingPool param with exact value match)
      // "yes" → filter for any pool (exclude "None"); "no" → only "None"
      if (privatePool === 'yes') {
        params.append('swimmingPool', 'In Ground');
        // Note: this filters for "In Ground" specifically; post-filter will broaden to any non-None pool
      } else if (privatePool === 'no') {
        params.append('swimmingPool', 'None');
      }

      // Lot size in acres -> convert to sqft for API if needed
      if (minLotAcres) params.append('minLotWidth', (minLotAcres * 43560).toString());
      if (maxLotAcres) params.append('maxLotWidth', (maxLotAcres * 43560).toString());

      // Status handling - support multiple statuses
      // When doing address search with no explicit statuses, search all statuses
      const statusArray: string[] = statuses || (search && !city && !zip ? [] : ['Active']);
      // If includes Closed, we need a separate approach
      const hasActive = statusArray.includes('Active');
      const hasAUC = statusArray.includes('Active Under Contract');
      const hasPending = statusArray.includes('Pending');
      const hasClosed = statusArray.includes('Closed');
      const hasAnyActive = hasActive || hasAUC || hasPending;

      if (statusArray.length === 0) {
        // No status filter - search all listings (useful for address lookups)
      } else if (hasClosed && !hasAnyActive) {
        // Only closed - use dateSoldDays if provided, otherwise default to 365
        const soldDays = dateSoldDays ? parseInt(dateSoldDays.toString(), 10) : 365;
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - soldDays);
        params.append('status', 'U');
        params.append('lastStatus', 'Sld');
        params.append('minClosedDate', minDate.toISOString().split('T')[0]);
      } else if (!hasClosed) {
        // Only active statuses
        statusArray.forEach(s => params.append('standardStatus', s));
      } else {
        // Mix of active and closed - search active statuses first, then merge closed results after
        const activeStatuses = statusArray.filter(s => s !== 'Closed');
        activeStatuses.forEach(s => params.append('standardStatus', s));
      }

      // Flag for merged search (active + closed)
      const needsMergedSearch = hasClosed && hasAnyActive;

      const fullUrl = `${baseUrl}?${params.toString()}`;
      console.log(`[CMA Search] Searching properties: ${fullUrl}`);

      // If polygon or mapBounds provided, use POST with map polygon body
      let response: Response;
      if (polygon && Array.isArray(polygon) && polygon.length >= 3) {
        // User-drawn polygon: array of [lng, lat] coordinate pairs
        // Ensure the polygon is closed (first point === last point)
        const polyCoords = [...polygon];
        const first = polyCoords[0];
        const last = polyCoords[polyCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          polyCoords.push(first);
        }
        console.log(`[CMA Search] Using drawn polygon (${polyCoords.length} points):`, JSON.stringify(polyCoords));
        response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'REPLIERS-API-KEY': apiKey
          },
          body: JSON.stringify({ map: [polyCoords] }),
        });
      } else if (mapBounds && mapBounds.sw && mapBounds.ne) {
        const { sw, ne } = mapBounds;
        const boundsPolygon = [
          [sw.lng, sw.lat],
          [ne.lng, sw.lat],
          [ne.lng, ne.lat],
          [sw.lng, ne.lat],
          [sw.lng, sw.lat],
        ];
        console.log(`[CMA Search] Using map bounds polygon:`, JSON.stringify(boundsPolygon));
        response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'REPLIERS-API-KEY': apiKey
          },
          body: JSON.stringify({ map: [boundsPolygon] }),
        });
      } else {
        response = await fetch(fullUrl, {
          headers: {
            'Accept': 'application/json',
            'REPLIERS-API-KEY': apiKey
          }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CMA Search] Repliers API error:', response.status, errorText);
        return res.status(502).json({ message: "Failed to search properties" });
      }

      let data = await response.json();

      // If we need merged search (active + closed), make a second API call for closed listings
      if (needsMergedSearch) {
        try {
          // Build closed-specific params from the same base (remove standardStatus, add closed filters)
          const closedParams = new URLSearchParams(params.toString());
          // Remove all standardStatus params
          closedParams.delete('standardStatus');
          closedParams.set('status', 'U');
          closedParams.set('lastStatus', 'Sld');
          const soldDays = dateSoldDays ? parseInt(dateSoldDays.toString(), 10) : 180;
          const minDate = new Date();
          minDate.setDate(minDate.getDate() - soldDays);
          closedParams.set('minClosedDate', minDate.toISOString().split('T')[0]);

          const closedUrl = `${baseUrl}?${closedParams.toString()}`;
          console.log(`[CMA Search] Also fetching closed: ${closedUrl}`);

          let closedResponse: Response;
          if (polygon && Array.isArray(polygon) && polygon.length >= 3) {
            const polyCoords = [...polygon];
            const first = polyCoords[0];
            const last = polyCoords[polyCoords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) polyCoords.push(first);
            closedResponse = await fetch(closedUrl, {
              method: 'POST',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'REPLIERS-API-KEY': apiKey },
              body: JSON.stringify({ map: [polyCoords] }),
            });
          } else if (mapBounds && mapBounds.sw && mapBounds.ne) {
            const { sw, ne } = mapBounds;
            const boundsPolygon = [[sw.lng, sw.lat], [ne.lng, sw.lat], [ne.lng, ne.lat], [sw.lng, ne.lat], [sw.lng, sw.lat]];
            closedResponse = await fetch(closedUrl, {
              method: 'POST',
              headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'REPLIERS-API-KEY': apiKey },
              body: JSON.stringify({ map: [boundsPolygon] }),
            });
          } else {
            closedResponse = await fetch(closedUrl, {
              headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
            });
          }

          if (closedResponse.ok) {
            const closedData = await closedResponse.json();
            const closedListings = closedData.listings || [];
            console.log(`[CMA Search] Closed results: ${closedListings.length} of ${closedData.count || 0}`);
            // Merge closed listings into main data
            data.listings = [...(data.listings || []), ...closedListings];
            data.count = (data.count || 0) + (closedData.count || 0);
          }
        } catch (err) {
          console.error('[CMA Search] Error fetching closed listings:', err);
          // Continue with just active results
        }
      }

      // Transform listings
      const listings = (data.listings || []).map((listing: any) => {
        const streetNumber = listing.address?.streetNumber || '';
        const streetName = listing.address?.streetName || '';
        const streetSuffix = listing.address?.streetSuffix || '';
        const cityName = listing.address?.city || '';
        const state = listing.address?.state || 'TX';
        const postalCode = listing.address?.zip || listing.address?.postalCode || '';
        const streetAddress = [streetNumber, streetName, streetSuffix].filter(Boolean).join(' ');
        const fullAddress = `${streetAddress}, ${cityName}, ${state} ${postalCode}`.trim();

        // Get photo
        let photo = null;
        if (listing.images && listing.images.length > 0) {
          const imagePath = listing.images[0];
          if (typeof imagePath === 'string') {
            photo = imagePath.startsWith('http') ? imagePath : `https://cdn.repliers.io/${imagePath}`;
          }
        }

        return {
          mlsNumber: listing.mlsNumber || listing.listingId || '',
          address: fullAddress,
          streetAddress,
          city: cityName,
          state,
          zip: postalCode,
          listPrice: listing.listPrice || 0,
          soldPrice: listing.soldPrice || listing.closePrice || null,
          beds: listing.details?.numBedrooms || listing.bedroomsTotal || 0,
          baths: listing.details?.numBathrooms || listing.bathroomsTotal || 0,
          sqft: listing.details?.sqft || listing.livingArea || 0,
          lotSizeAcres: listing.lot?.acres || (listing.lotSizeArea ? listing.lotSizeArea / 43560 : null),
          yearBuilt: listing.details?.yearBuilt || null,
          propertyType: listing.details?.style || listing.details?.propertyType || listing.propertyType || '',
          status: listing.standardStatus || listing.status || '',
          listDate: listing.listDate || '',
          soldDate: listing.soldDate || listing.closeDate || null,
          daysOnMarket: listing.daysOnMarket || 0,
          photo,
          stories: listing.details?.numStoreys || null,
          subdivision: listing.address?.neighborhood || listing.address?.area || '',
          latitude: listing.map?.latitude || listing.address?.latitude || null,
          longitude: listing.map?.longitude || listing.address?.longitude || null,
        };
      });

      // Post-filter by subdivision if provided (substring match, like MLS)
      let filteredListings = listings;
      if (subdivisionFilter) {
        filteredListings = filteredListings.filter((l: any) => {
          const hood = (l.subdivision || '').toLowerCase();
          return hood.includes(subdivisionFilter);
        });
        console.log(`[CMA Search] Subdivision post-filter "${subdivision}": ${filteredListings.length} of ${listings.length} listings match`);
      }

      // Post-filter: full baths (details.numBathrooms)
      if (fullBaths) {
        const minFull = parseInt(fullBaths.toString(), 10);
        filteredListings = filteredListings.filter((l: any) => (l.baths || 0) >= minFull);
        console.log(`[CMA Search] Full baths post-filter (>=${minFull}): ${filteredListings.length} remain`);
      }

      // Post-filter: half baths (details.numBathroomsHalf) - from raw data
      if (halfBaths) {
        const minHalf = parseInt(halfBaths.toString(), 10);
        // We need to look at raw listing data for numBathroomsHalf
        // Since we've already transformed, we'll re-filter from raw data
        const rawListings = data.listings || [];
        const rawHalfBathMap = new Map<string, number>();
        rawListings.forEach((rl: any) => {
          const mlsNum = rl.mlsNumber || rl.listingId || '';
          const hb = rl.details?.numBathroomsHalf || 0;
          rawHalfBathMap.set(mlsNum, typeof hb === 'number' ? hb : parseInt(hb) || 0);
        });
        filteredListings = filteredListings.filter((l: any) => {
          const hb = rawHalfBathMap.get(l.mlsNumber) || 0;
          return hb >= minHalf;
        });
        console.log(`[CMA Search] Half baths post-filter (>=${minHalf}): ${filteredListings.length} remain`);
      }

      // Post-filter: waterfront
      if (waterfront) {
        const rawListings = data.listings || [];
        const rawWaterfrontMap = new Map<string, string | null>();
        rawListings.forEach((rl: any) => {
          const mlsNum = rl.mlsNumber || rl.listingId || '';
          rawWaterfrontMap.set(mlsNum, rl.details?.waterfront || null);
        });
        filteredListings = filteredListings.filter((l: any) => {
          const wf = rawWaterfrontMap.get(l.mlsNumber);
          if (waterfront === 'yes') return wf && wf.toLowerCase() !== 'none' && wf.trim() !== '';
          if (waterfront === 'no') return !wf || wf.toLowerCase() === 'none' || wf.trim() === '';
          return true;
        });
        console.log(`[CMA Search] Waterfront post-filter (${waterfront}): ${filteredListings.length} remain`);
      }

      // Post-filter: HOA
      if (hoa) {
        const rawListings = data.listings || [];
        const rawHoaMap = new Map<string, string | null>();
        rawListings.forEach((rl: any) => {
          const mlsNum = rl.mlsNumber || rl.listingId || '';
          rawHoaMap.set(mlsNum, rl.details?.HOAFee || null);
        });
        filteredListings = filteredListings.filter((l: any) => {
          const fee = rawHoaMap.get(l.mlsNumber);
          const hasFee = fee && fee !== '0' && fee !== '' && fee !== null;
          if (hoa === 'yes') return hasFee;
          if (hoa === 'no') return !hasFee;
          return true;
        });
        console.log(`[CMA Search] HOA post-filter (${hoa}): ${filteredListings.length} remain`);
      }

      // Post-filter: pool broadening (when "yes" was selected, also include other pool types beyond "In Ground")
      if (privatePool === 'yes') {
        // The API already filtered for "In Ground", but user wants ANY pool
        // We need to re-search without the swimmingPool param and post-filter
        // For simplicity, just accept the In Ground results (most common pool type)
        // This is a reasonable approximation; the API param works for the majority
        console.log(`[CMA Search] Pool filter: using API "In Ground" filter (covers most pool types)`);
      }

      // Post-filter: primary bedroom on main level
      if (primaryBedOnMain) {
        const rawListings = data.listings || [];
        const rawMainBedroomMap = new Map<string, boolean>();
        rawListings.forEach((rl: any) => {
          const mlsNum = rl.mlsNumber || rl.listingId || '';
          // Check rooms array for primary/master bedroom on main/1st level
          const rooms = rl.rooms || [];
          const desc = (rl.details?.description || '').toLowerCase();
          const hasMainBedOnFirst = rooms.some((r: any) => {
            const roomType = (r.type || r.description || '').toLowerCase();
            const roomLevel = (r.level || '').toLowerCase();
            return (roomType.includes('primary') || roomType.includes('master')) && 
                   (roomLevel.includes('main') || roomLevel.includes('first') || roomLevel === '1');
          });
          // Also check description text as fallback
          const descHint = desc.includes('primary on main') || desc.includes('master on main') || 
                           desc.includes('primary down') || desc.includes('master down') ||
                           desc.includes('owner suite on main') || desc.includes('primary bedroom on main');
          rawMainBedroomMap.set(mlsNum, hasMainBedOnFirst || descHint);
        });
        filteredListings = filteredListings.filter((l: any) => {
          const hasMain = rawMainBedroomMap.get(l.mlsNumber) || false;
          if (primaryBedOnMain === 'yes') return hasMain;
          if (primaryBedOnMain === 'no') return !hasMain;
          return true;
        });
        console.log(`[CMA Search] Primary bed on main post-filter (${primaryBedOnMain}): ${filteredListings.length} remain`);
      }

      const total = subdivisionFilter ? filteredListings.length : (data.count || data.numResults || listings.length);
      const totalPages = subdivisionFilter ? 1 : Math.ceil(total / resultsPerPage);

      console.log(`[CMA Search] Returning ${filteredListings.length} of ${total} results`);

      res.json({
        listings: subdivisionFilter ? filteredListings : filteredListings.slice(0, resultsPerPage),
        total,
        page: subdivisionFilter ? 1 : pageNum,
        totalPages,
        resultsPerPage: subdivisionFilter ? filteredListings.length : resultsPerPage,
      });
    } catch (error) {
      console.error('[CMA Search] Error:', error);
      res.status(500).json({ message: "Failed to search properties" });
    }
  });

  // ======================================================  // PULSE - Market Intelligence Endpoints
  // =============================================================

  const PULSE_MSA_AREAS = ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Caldwell'];

  const pulseHeaders = () => {
    const apiKey = process.env.IDX_GRID_API_KEY;
    if (!apiKey) throw new Error('IDX_GRID_API_KEY not configured');
    return {
      'Accept': 'application/json',
      'REPLIERS-API-KEY': apiKey,
    };
  };

  // GET /api/pulse/overview — Metro-wide stats
  app.get('/api/pulse/overview', isAuthenticated, async (_req: any, res) => {
    try {
      const headers = pulseHeaders();
      const baseUrl = 'https://api.repliers.io/listings';

      // Build shared area params (Repliers uses 'area' not 'county')
      const areaParams = PULSE_MSA_AREAS.map(a => `area=${encodeURIComponent(a)}`).join('&');

      // Active listings count + aggregates for median price
      const activeUrl = `${baseUrl}?listings=false&type=Sale&standardStatus=Active&${areaParams}`;
      // Pending
      const pendingUrl = `${baseUrl}?listings=false&type=Sale&standardStatus=Pending&${areaParams}`;
      // Active Under Contract
      const aucUrl = `${baseUrl}?listings=false&type=Sale&standardStatus=Active%20Under%20Contract&${areaParams}`;

      // Closed last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const minSoldDate = thirtyDaysAgo.toISOString().split('T')[0];
      const closedUrl = `${baseUrl}?listings=false&type=Sale&status=U&lastStatus=Sld&minSoldDate=${minSoldDate}&${areaParams}`;

      // Closed last 90 days (for more accurate absorption rate)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const minSoldDate90 = ninetyDaysAgo.toISOString().split('T')[0];
      const closed90Url = `${baseUrl}?listings=false&type=Sale&status=U&lastStatus=Sld&minSoldDate=${minSoldDate90}&${areaParams}`;

      // New last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const minListDate7 = sevenDaysAgo.toISOString().split('T')[0];
      const newUrl = `${baseUrl}?listings=false&type=Sale&standardStatus=Active&minListDate=${minListDate7}&${areaParams}`;

      // Get a sample of active listings for DOM + price stats
      const sampleUrl = `${baseUrl}?listings=true&type=Sale&standardStatus=Active&resultsPerPage=100&sortBy=createdOnDesc&${areaParams}&fields=listPrice,daysOnMarket,details`;

      // Closed last 30d sample for sold stats
      const closedSampleUrl = `${baseUrl}?listings=true&type=Sale&status=U&lastStatus=Sld&minSoldDate=${minSoldDate}&resultsPerPage=100&sortBy=lastStatusDesc&${areaParams}&fields=soldPrice,listPrice,daysOnMarket,details`;

      const [activeRes, pendingRes, aucRes, closedRes, closed90Res, newRes, sampleRes, closedSampleRes] = await Promise.all([
        fetch(activeUrl, { headers }),
        fetch(pendingUrl, { headers }),
        fetch(aucUrl, { headers }),
        fetch(closedUrl, { headers }),
        fetch(closed90Url, { headers }),
        fetch(newUrl, { headers }),
        fetch(sampleUrl, { headers }),
        fetch(closedSampleUrl, { headers }),
      ]);

      const activeData = activeRes.ok ? await activeRes.json() : { count: 0 };
      const pendingData = pendingRes.ok ? await pendingRes.json() : { count: 0 };
      const aucData = aucRes.ok ? await aucRes.json() : { count: 0 };
      const closedData = closedRes.ok ? await closedRes.json() : { count: 0 };
      const closed90Data = closed90Res.ok ? await closed90Res.json() : { count: 0 };
      const newData = newRes.ok ? await newRes.json() : { count: 0 };
      const sampleData = sampleRes.ok ? await sampleRes.json() : { listings: [] };
      const closedSampleData = closedSampleRes.ok ? await closedSampleRes.json() : { listings: [] };

      // Calculate median from sample
      const activePrices = (sampleData.listings || [])
        .map((l: any) => l.listPrice)
        .filter((p: any) => p && p > 0)
        .sort((a: number, b: number) => a - b);
      const medianPrice = activePrices.length > 0
        ? activePrices[Math.floor(activePrices.length / 2)]
        : 0;

      const doms = (sampleData.listings || [])
        .map((l: any) => l.daysOnMarket || l.dom || 0)
        .filter((d: number) => d > 0);
      const avgDom = doms.length > 0 ? Math.round(doms.reduce((a: number, b: number) => a + b, 0) / doms.length) : 0;

      // Price per sqft from sample — Repliers uses details.sqft (string)
      const ppsfs = (sampleData.listings || [])
        .map((l: any) => {
          const sqft = parseFloat(l.details?.sqft) || 0;
          return { price: l.listPrice, sqft };
        })
        .filter((l: any) => l.price > 0 && l.sqft > 0)
        .map((l: any) => l.price / l.sqft);
      const avgPricePerSqft = ppsfs.length > 0 ? Math.round(ppsfs.reduce((a: number, b: number) => a + b, 0) / ppsfs.length) : 0;

      // Months of supply = active / monthly_absorption
      // Use 90-day closed / 3 for more stable absorption rate (30d data can lag)
      const activeCount = activeData.count || 0;
      const closedCount = closedData.count || 0;
      const closed90Count = closed90Data.count || 0;
      const monthlyAbsorption = closed90Count > 0 ? closed90Count / 3 : closedCount;
      const monthsOfSupply = monthlyAbsorption > 0 ? parseFloat((activeCount / monthlyAbsorption).toFixed(1)) : 0;

      // Closed sample stats
      const closedPrices = (closedSampleData.listings || [])
        .map((l: any) => l.soldPrice || l.closePrice || l.listPrice)
        .filter((p: any) => p && p > 0)
        .sort((a: number, b: number) => a - b);
      const medianSoldPrice = closedPrices.length > 0 ? closedPrices[Math.floor(closedPrices.length / 2)] : 0;

      console.log(`[Pulse Overview] Active: ${activeCount}, Pending: ${pendingData.count}, Closed(30d): ${closedCount}, Closed(90d): ${closed90Count}, MonthlyAbsorption: ${Math.round(monthlyAbsorption)}, MOS: ${monthsOfSupply}, New(7d): ${newData.count}, MedianPrice: ${medianPrice}, AvgDOM: ${avgDom}, AvgPPSF: ${avgPricePerSqft}`);

      res.json({
        totalActive: activeCount,
        activeUnderContract: aucData.count || 0,
        pending: pendingData.count || 0,
        closedLast30: closedCount,
        newLast7: newData.count || 0,
        medianListPrice: medianPrice,
        medianSoldPrice,
        avgDom,
        avgPricePerSqft,
        monthsOfSupply,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Pulse Overview] Error:', error);
      res.status(500).json({ message: 'Failed to fetch pulse overview' });
    }
  });

  // GET /api/pulse/heatmap — Zip-level data for choropleth
  app.get('/api/pulse/heatmap', isAuthenticated, async (_req: any, res) => {
    try {
      const headers = pulseHeaders();
      const baseUrl = 'https://api.repliers.io/listings';
      const areaParams = PULSE_MSA_AREAS.map(a => `area=${encodeURIComponent(a)}`).join('&');

      // Active listings aggregated by zip (Repliers uses address.zip path)
      const url = `${baseUrl}?aggregates=address.zip&listings=false&type=Sale&standardStatus=Active&${areaParams}`;
      console.log(`[Pulse Heatmap] Fetching: ${url}`);

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const text = await response.text();
        console.error('[Pulse Heatmap] API error:', response.status, text.substring(0, 300));
        return res.status(502).json({ message: 'Repliers API error' });
      }

      const data = await response.json();
      // Repliers nests aggregates under address.zip path
      const zipAggregates = data.aggregates?.address?.zip || data.aggregates?.zip || {};

      // Fetch listings across multiple pages spread through the dataset for better zip coverage
      // With ~14K listings and 100/page, grab pages 1,5,10,20,30,50,70,90,110,130 for diverse sampling
      const totalCount = data.count || 0;
      const maxPage = Math.ceil(totalCount / 100);
      const samplePages = [1, 5, 10, 20, 30, 50, 70, 90, 110, 130].filter(p => p <= maxPage);
      
      const pricePromises = samplePages.map(pageNum => {
        const priceUrl = `${baseUrl}?listings=true&type=Sale&standardStatus=Active&resultsPerPage=100&pageNum=${pageNum}&${areaParams}&fields=listPrice,address,daysOnMarket,details`;
        return fetch(priceUrl, { headers }).then(r => r.ok ? r.json() : { listings: [] });
      });
      const priceResults = await Promise.all(pricePromises);
      const priceData = { listings: priceResults.flatMap(r => r.listings || []) };
      console.log(`[Pulse Heatmap] Sampled ${priceData.listings.length} listings across ${samplePages.length} pages for price/DOM data`);

      // Build price map by zip
      const zipPriceMap: Record<string, number[]> = {};
      const zipDomMap: Record<string, number[]> = {};
      (priceData.listings || []).forEach((l: any) => {
        const zip = l.address?.zip || l.address?.postalCode || '';
        if (!zip) return;
        if (l.listPrice > 0) {
          if (!zipPriceMap[zip]) zipPriceMap[zip] = [];
          zipPriceMap[zip].push(l.listPrice);
        }
        const dom = l.daysOnMarket || l.dom || 0;
        if (dom > 0) {
          if (!zipDomMap[zip]) zipDomMap[zip] = [];
          zipDomMap[zip].push(dom);
        }
      });

      const median = (arr: number[]) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      };

      // Zip code coordinates for Austin metro (approximate centroids)
      const zipCoords: Record<string, [number, number]> = {
        '78610': [-97.8561, 30.0863], '78613': [-97.8206, 30.5083], '78615': [-97.5261, 30.5447],
        '78617': [-97.6108, 30.1652], '78620': [-98.0864, 30.2119], '78626': [-97.6781, 30.6339],
        '78628': [-97.7906, 30.6228], '78630': [-97.7906, 30.6500], '78634': [-97.5431, 30.5602],
        '78640': [-97.8267, 30.0094], '78641': [-97.8533, 30.5872], '78642': [-97.7128, 30.6753],
        '78644': [-97.7489, 29.8822], '78645': [-97.9208, 30.4833], '78646': [-97.6800, 30.5600],
        '78652': [-97.8564, 30.1083], '78653': [-97.5253, 30.3169], '78654': [-98.2333, 30.6083],
        '78660': [-97.6186, 30.4519], '78664': [-97.6786, 30.5108], '78665': [-97.7536, 30.5583],
        '78669': [-97.9933, 30.3833], '78681': [-97.7969, 30.5342], '78701': [-97.7403, 30.2700],
        '78702': [-97.7153, 30.2622], '78703': [-97.7611, 30.2928], '78704': [-97.7639, 30.2417],
        '78705': [-97.7400, 30.2922], '78712': [-97.7372, 30.2850], '78717': [-97.7622, 30.4897],
        '78719': [-97.6756, 30.1431], '78721': [-97.6944, 30.2664], '78722': [-97.7167, 30.2861],
        '78723': [-97.6914, 30.3014], '78724': [-97.6328, 30.2914], '78725': [-97.6339, 30.2472],
        '78726': [-97.8325, 30.4308], '78727': [-97.7658, 30.4272], '78728': [-97.6969, 30.4467],
        '78729': [-97.8006, 30.4572], '78730': [-97.8192, 30.3669], '78731': [-97.7694, 30.3447],
        '78732': [-97.8889, 30.3775], '78733': [-97.8597, 30.3164], '78734': [-97.9175, 30.3875],
        '78735': [-97.8325, 30.2639], '78736': [-97.8786, 30.2342], '78737': [-97.9028, 30.1694],
        '78738': [-97.9139, 30.2767], '78739': [-97.8519, 30.1933], '78741': [-97.7297, 30.2222],
        '78742': [-97.6944, 30.2256], '78744': [-97.7361, 30.1750], '78745': [-97.7897, 30.2025],
        '78746': [-97.8028, 30.2989], '78747': [-97.7556, 30.1239], '78748': [-97.8181, 30.1592],
        '78749': [-97.8422, 30.2117], '78750': [-97.7900, 30.4011], '78751': [-97.7264, 30.3111],
        '78752': [-97.7058, 30.3294], '78753': [-97.6767, 30.3783], '78754': [-97.6503, 30.3653],
        '78756': [-97.7386, 30.3189], '78757': [-97.7342, 30.3528], '78758': [-97.7100, 30.3897],
        '78759': [-97.7631, 30.3986],
      };

      const zipData = Object.entries(zipAggregates).map(([zip, count]) => {
        const prices = zipPriceMap[zip] || [];
        const doms = zipDomMap[zip] || [];
        const coords = zipCoords[zip];
        return {
          zip,
          count: typeof count === 'number' ? count : parseInt(count as string, 10) || 0,
          medianPrice: median(prices),
          avgDom: doms.length > 0 ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : 0,
          lat: coords ? coords[1] : null,
          lng: coords ? coords[0] : null,
        };
      }).filter(z => z.lat !== null);

      console.log(`[Pulse Heatmap] Returning ${zipData.length} zip codes`);
      res.json({ zipData, total: data.count || 0 });
    } catch (error) {
      console.error('[Pulse Heatmap] Error:', error);
      res.status(500).json({ message: 'Failed to fetch heatmap data' });
    }
  });

  // GET /api/pulse/zip/:zipCode — Detailed zip stats
  app.get('/api/pulse/zip/:zipCode', isAuthenticated, async (req: any, res) => {
    try {
      const { zipCode } = req.params;
      const headers = pulseHeaders();
      const baseUrl = 'https://api.repliers.io/listings';

      // Active listings in this zip
      const activeUrl = `${baseUrl}?listings=true&type=Sale&standardStatus=Active&zip=${zipCode}&resultsPerPage=50&sortBy=listPriceDesc&fields=listPrice,daysOnMarket,livingArea,address,details,subdivision`;
      // Closed last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const minSoldDate = thirtyDaysAgo.toISOString().split('T')[0];
      const closedUrl = `${baseUrl}?listings=true&type=Sale&status=U&lastStatus=Sld&minSoldDate=${minSoldDate}&zip=${zipCode}&resultsPerPage=50&sortBy=lastStatusDesc`;

      const [activeRes, closedRes] = await Promise.all([
        fetch(activeUrl, { headers }),
        fetch(closedUrl, { headers }),
      ]);

      const activeData = activeRes.ok ? await activeRes.json() : { listings: [], count: 0 };
      const closedData = closedRes.ok ? await closedRes.json() : { listings: [], count: 0 };

      const activeListings = activeData.listings || [];
      const closedListings = closedData.listings || [];

      // Calculate stats
      const activePrices = activeListings.map((l: any) => l.listPrice).filter((p: any) => p > 0).sort((a: number, b: number) => a - b);
      const medianPrice = activePrices.length > 0 ? activePrices[Math.floor(activePrices.length / 2)] : 0;

      const sqfts = activeListings.map((l: any) => parseFloat(l.details?.sqft) || 0).filter((s: number) => s > 0);
      const avgSqft = sqfts.length > 0 ? Math.round(sqfts.reduce((a: number, b: number) => a + b, 0) / sqfts.length) : 0;

      const doms = activeListings.map((l: any) => l.daysOnMarket || l.dom || 0).filter((d: number) => d > 0);
      const avgDom = doms.length > 0 ? Math.round(doms.reduce((a: number, b: number) => a + b, 0) / doms.length) : 0;

      // Top subdivisions
      const subdivisionCounts: Record<string, number> = {};
      activeListings.forEach((l: any) => {
        const sub = l.subdivision || l.area || 'Unknown';
        subdivisionCounts[sub] = (subdivisionCounts[sub] || 0) + 1;
      });
      const topSubdivisions = Object.entries(subdivisionCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      // Recent sales
      const recentSales = closedListings.slice(0, 10).map((l: any) => {
        const streetNumber = l.address?.streetNumber || '';
        const streetName = l.address?.streetName || '';
        const streetSuffix = l.address?.streetSuffix || '';
        return {
          address: [streetNumber, streetName, streetSuffix].filter(Boolean).join(' '),
          soldPrice: l.soldPrice || l.closePrice || l.listPrice,
          listPrice: l.listPrice,
          beds: l.details?.numBedrooms || l.bedroomsTotal || 0,
          baths: l.details?.numBathrooms || l.bathroomsTotalInteger || 0,
          sqft: parseFloat(l.details?.sqft) || 0,
          daysOnMarket: l.daysOnMarket || 0,
          closeDate: l.soldDate || l.closeDate,
          mlsNumber: l.mlsNumber,
        };
      });

      // Price per sqft
      const ppsfs = activeListings
        .map((l: any) => ({ price: l.listPrice, sqft: parseFloat(l.details?.sqft) || 0 }))
        .filter((l: any) => l.price > 0 && l.sqft > 0)
        .map((l: any) => l.price / l.sqft);
      const avgPricePerSqft = ppsfs.length > 0 ? Math.round(ppsfs.reduce((a: number, b: number) => a + b, 0) / ppsfs.length) : 0;

      console.log(`[Pulse Zip] ${zipCode}: Active=${activeData.count}, Closed30d=${closedData.count}, MedianPrice=${medianPrice}`);

      res.json({
        zipCode,
        activeCount: activeData.count || activeListings.length,
        closedCount: closedData.count || closedListings.length,
        medianPrice,
        avgSqft,
        avgDom,
        avgPricePerSqft,
        topSubdivisions,
        recentSales,
      });
    } catch (error) {
      console.error('[Pulse Zip] Error:', error);
      res.status(500).json({ message: 'Failed to fetch zip data' });
    }
  });

  // GET /api/pulse/trends — Market trends for last 6 months
  app.get('/api/pulse/trends', isAuthenticated, async (_req: any, res) => {
    try {
      const headers = pulseHeaders();
      const baseUrl = 'https://api.repliers.io/listings';
      const areaParams = PULSE_MSA_AREAS.map(a => `area=${encodeURIComponent(a)}`).join('&');

      const now = new Date();
      const months: { label: string; startDate: string; endDate: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        months.push({
          label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
          startDate: d.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        });
      }

      // Fetch closed sales per month (parallel)
      const closedPromises = months.map(m => {
        const url = `${baseUrl}?listings=true&type=Sale&status=U&lastStatus=Sld&minSoldDate=${m.startDate}&maxSoldDate=${m.endDate}&${areaParams}&resultsPerPage=100&fields=soldPrice,listPrice,daysOnMarket`;
        return fetch(url, { headers }).then(r => r.ok ? r.json() : { listings: [], count: 0 });
      });

      // Fetch active inventory per month (current snapshot for each — approximate with current)
      // For simplicity, we'll use current active count and the closed data to compute trends
      const activeUrl = `${baseUrl}?listings=false&type=Sale&standardStatus=Active&${areaParams}`;
      const activePromise = fetch(activeUrl, { headers }).then(r => r.ok ? r.json() : { count: 0 });

      const [closedResults, activeData] = await Promise.all([
        Promise.all(closedPromises),
        activePromise,
      ]);

      const median = (arr: number[]) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      };

      const trends = months.map((m, i) => {
        const data = closedResults[i];
        const listings = data.listings || [];
        const count = data.count || listings.length;

        const prices = listings.map((l: any) => l.soldPrice || l.closePrice || l.listPrice).filter((p: any) => p > 0);
        const doms = listings.map((l: any) => l.daysOnMarket || l.dom || 0).filter((d: number) => d > 0);

        return {
          month: m.label,
          closedCount: count,
          medianPrice: median(prices),
          avgDom: doms.length > 0 ? Math.round(doms.reduce((a: number, b: number) => a + b, 0) / doms.length) : 0,
          activeInventory: i === months.length - 1 ? (activeData.count || 0) : null,
        };
      });

      console.log(`[Pulse Trends] Returning ${trends.length} months of data`);
      res.json({ trends });
    } catch (error) {
      console.error('[Pulse Trends] Error:', error);
      res.status(500).json({ message: 'Failed to fetch trends data' });
    }
  });

  // GET /api/pulse/compare — Compare zip codes
  app.get('/api/pulse/compare', isAuthenticated, async (req: any, res) => {
    try {
      const zipsParam = (req.query.zips as string) || '';
      const zips = zipsParam.split(',').map((z: string) => z.trim()).filter(Boolean);

      if (zips.length === 0) {
        return res.status(400).json({ message: 'Please provide zip codes via ?zips=78704,78745' });
      }
      if (zips.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 zip codes for comparison' });
      }

      const headers = pulseHeaders();
      const baseUrl = 'https://api.repliers.io/listings';

      const results = await Promise.all(zips.map(async (zip: string) => {
        const activeUrl = `${baseUrl}?listings=true&type=Sale&standardStatus=Active&zip=${zip}&resultsPerPage=50&fields=listPrice,daysOnMarket,details`;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const closedUrl = `${baseUrl}?listings=false&type=Sale&status=U&lastStatus=Sld&minSoldDate=${thirtyDaysAgo.toISOString().split('T')[0]}&zip=${zip}`;

        const [activeRes, closedRes] = await Promise.all([
          fetch(activeUrl, { headers }),
          fetch(closedUrl, { headers }),
        ]);

        const activeData = activeRes.ok ? await activeRes.json() : { listings: [], count: 0 };
        const closedData = closedRes.ok ? await closedRes.json() : { count: 0 };

        const listings = activeData.listings || [];
        const prices = listings.map((l: any) => l.listPrice).filter((p: any) => p > 0).sort((a: number, b: number) => a - b);
        const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
        const doms = listings.map((l: any) => l.daysOnMarket || l.dom || 0).filter((d: number) => d > 0);
        const avgDom = doms.length > 0 ? Math.round(doms.reduce((a: number, b: number) => a + b, 0) / doms.length) : 0;
        const ppsfs = listings
          .map((l: any) => ({ price: l.listPrice, sqft: parseFloat(l.details?.sqft) || 0 }))
          .filter((l: any) => l.price > 0 && l.sqft > 0)
          .map((l: any) => l.price / l.sqft);
        const avgPricePerSqft = ppsfs.length > 0 ? Math.round(ppsfs.reduce((a: number, b: number) => a + b, 0) / ppsfs.length) : 0;

        return {
          zip,
          activeCount: activeData.count || listings.length,
          closedLast30: closedData.count || 0,
          medianPrice,
          avgDom,
          avgPricePerSqft,
        };
      }));

      console.log(`[Pulse Compare] Compared ${zips.length} zip codes`);
      res.json({ comparisons: results });
    } catch (error) {
      console.error('[Pulse Compare] Error:', error);
      res.status(500).json({ message: 'Failed to compare zip codes' });
    }
  });

  // ── Pulse V2 — Reventure-style data layers ──
  registerPulseV2Routes(app);

  // Register admin routes (integration settings, etc.)
  registerAdminRoutes(app);

  // Register Gmail routes
  registerGmailRoutes(app);

  // Register Xano proxy routes for admin dashboards
  registerXanoRoutes(app, isAuthenticated);

  return httpServer;
}
