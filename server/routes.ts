import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getFubClient } from "./fubClient";
import { getRezenClient } from "./rezenClient";
import { generateSuggestionsForUser } from "./contextEngine";
import { type User, saveContentIdeaSchema, updateContentIdeaStatusSchema } from "@shared/schema";
import OpenAI from "openai";
import { getLatestTrainingVideo } from "./vimeoClient";
import { SPYGLASS_OFFICES, DEFAULT_OFFICE, getOfficeConfig } from "./config/offices";

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
          params.append('minSoldDate', thirtyDaysAgo.toISOString().split('T')[0]);
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
      res.status(500).json({ message: "Failed to create CMA" });
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
        city, subdivision, zip, schoolDistrict, 
        elementarySchool, middleSchool, highSchool,
        minBeds, minBaths, minPrice, maxPrice,
        propertyType, statuses, // array of statuses: ['Active', 'Active Under Contract', 'Closed']
        minSqft, maxSqft, minLotAcres, maxLotAcres,
        stories, minYearBuilt, maxYearBuilt,
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

      // Location filters
      if (city) params.append('city', city);
      if (zip) params.append('zip', zip);
      
      // Subdivision: discover all matching neighborhood names via a broad city search,
      // then pass them all as multiple neighborhood params (OR logic).
      // MLS stores subdivisions with section/phase suffixes like "Circle C Ranch Ph A Sec 04"
      // so searching for just "Circle C" or even "Circle C Ranch" misses most listings.
      if (subdivision) {
        const subdivLower = subdivision.toLowerCase().trim();
        let matchedNeighborhoods: string[] = [];

        // Step 1: Check if exact match returns results
        try {
          const testParams = new URLSearchParams({ neighborhood: subdivision, type: 'Sale', resultsPerPage: '1', listings: 'true' });
          const testRes = await fetch(`${baseUrl}?${testParams.toString()}`, {
            headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
          });
          const testData = await testRes.json();
          if ((testData.count || 0) > 0) {
            matchedNeighborhoods.push(subdivision);
            console.log(`[CMA Search] Subdivision "${subdivision}" exact match: ${testData.count} results`);
          }
        } catch { /* continue */ }

        // Step 2: Discovery - search the city (or broad area) to find ALL neighborhood names
        // that contain the user's subdivision text, including section/phase variants
        const discoveryCity = city || 'Austin'; // default to Austin if no city specified
        try {
          const discoverParams = new URLSearchParams({
            city: discoveryCity,
            type: 'Sale',
            resultsPerPage: '200',
            listings: 'true',
          });
          const discoverRes = await fetch(`${baseUrl}?${discoverParams.toString()}`, {
            headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
          });
          const discoverData = await discoverRes.json();
          const allNeighborhoods: string[] = (discoverData.listings || [])
            .map((l: any) => l.address?.neighborhood)
            .filter(Boolean);

          // Find unique neighborhoods that contain the subdivision text (case-insensitive)
          const uniqueNeighborhoods = [...new Set(allNeighborhoods)];
          const matching = uniqueNeighborhoods.filter((n: string) =>
            n.toLowerCase().includes(subdivLower)
          );

          if (matching.length > 0) {
            // Add any we haven't already found
            for (const m of matching) {
              if (!matchedNeighborhoods.some(mn => mn.toLowerCase() === m.toLowerCase())) {
                matchedNeighborhoods.push(m);
              }
            }
            console.log(`[CMA Search] Discovery found ${matching.length} neighborhoods matching "${subdivision}": ${matching.join(', ')}`);
          }
        } catch (err) {
          console.error(`[CMA Search] Discovery search failed:`, err);
        }

        // Step 3: If discovery didn't find enough, try common MLS naming patterns directly
        if (matchedNeighborhoods.length === 0) {
          const variations = [
            `${subdivision} Ranch`, `${subdivision} Sec`, `${subdivision} Phase`,
            `${subdivision} Add`, `${subdivision} Sub`, `${subdivision} Estates`,
          ];
          for (const variant of variations) {
            try {
              const varParams = new URLSearchParams({ neighborhood: variant, type: 'Sale', resultsPerPage: '1', listings: 'true' });
              const varRes = await fetch(`${baseUrl}?${varParams.toString()}`, {
                headers: { 'Accept': 'application/json', 'REPLIERS-API-KEY': apiKey }
              });
              const varData = await varRes.json();
              if ((varData.count || 0) > 0) {
                matchedNeighborhoods.push(variant);
                console.log(`[CMA Search] Variation match: "${variant}" (${varData.count} results)`);
                break; // just need one to get started
              }
            } catch { /* try next */ }
          }
        }

        // Apply neighborhoods to search params
        if (matchedNeighborhoods.length > 0) {
          for (const n of matchedNeighborhoods) {
            params.append('neighborhood', n);
          }
          console.log(`[CMA Search] Using ${matchedNeighborhoods.length} neighborhood(s) for "${subdivision}"`);
        } else {
          // Last resort: use as-is
          params.append('neighborhood', subdivision);
          console.log(`[CMA Search] No matches found for "${subdivision}", using as-is`);
        }
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
      if (propertyType) params.append('propertyType', propertyType);
      if (stories) params.append('stories', stories.toString());
      if (minYearBuilt) params.append('minYearBuilt', minYearBuilt.toString());
      if (maxYearBuilt) params.append('maxYearBuilt', maxYearBuilt.toString());

      // Lot size in acres -> convert to sqft for API if needed
      if (minLotAcres) params.append('minLotWidth', (minLotAcres * 43560).toString());
      if (maxLotAcres) params.append('maxLotWidth', (maxLotAcres * 43560).toString());

      // Status handling - support multiple statuses
      // When doing address search with no explicit statuses, search all statuses
      const statusArray: string[] = statuses || (search && !city && !zip ? [] : ['Active']);
      // If includes Closed, we need a separate approach
      const hasActive = statusArray.includes('Active');
      const hasAUC = statusArray.includes('Active Under Contract');
      const hasClosed = statusArray.includes('Closed');

      if (statusArray.length === 0) {
        // No status filter - search all listings (useful for address lookups)
      } else if (hasClosed && !hasActive && !hasAUC) {
        // Only closed - use dateSoldDays if provided, otherwise default to 365
        const soldDays = dateSoldDays ? parseInt(dateSoldDays.toString(), 10) : 365;
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - soldDays);
        params.append('status', 'U');
        params.append('lastStatus', 'Sld');
        params.append('minSoldDate', minDate.toISOString().split('T')[0]);
      } else if (!hasClosed) {
        // Only active statuses
        statusArray.forEach(s => params.append('standardStatus', s));
      } else {
        // Mix of active and closed - search active statuses first, then merge closed results after
        const activeStatuses = statusArray.filter(s => s !== 'Closed');
        activeStatuses.forEach(s => params.append('standardStatus', s));
      }

      // Flag for merged search (active + closed)
      const needsMergedSearch = hasClosed && (hasActive || hasAUC);

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
          closedParams.set('minSoldDate', minDate.toISOString().split('T')[0]);

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

      const total = data.count || data.numResults || listings.length;
      const totalPages = Math.ceil(total / resultsPerPage);

      console.log(`[CMA Search] Returning ${listings.length} of ${total} results`);

      res.json({
        listings,
        total,
        page: pageNum,
        totalPages,
        resultsPerPage,
      });
    } catch (error) {
      console.error('[CMA Search] Error:', error);
      res.status(500).json({ message: "Failed to search properties" });
    }
  });

  return httpServer;
}
