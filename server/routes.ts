import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getFubClient } from "./fubClient";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/fub/agents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
            await storage.updateUserFubId(userId, fubUserId);
          }
        }
      }

      if (!fubUserId) {
        return res.json({ events: [], tasks: [], message: "No Follow Up Boss account linked" });
      }

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const [events, tasks] = await Promise.all([
        fubClient.getEvents(fubUserId, startDate, endDate),
        fubClient.getTasks(fubUserId, startDate, endDate),
      ]);

      res.json({ events, tasks });
    } catch (error) {
      console.error("Error fetching FUB calendar:", error);
      res.status(500).json({ message: "Failed to fetch calendar data" });
    }
  });

  app.get('/api/fub/deals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
          const fubUser = await fubClient.getUserByEmail(user.email);
          if (fubUser) {
            fubUserId = fubUser.id;
            await storage.updateUserFubId(userId, fubUserId);
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

  return httpServer;
}
