import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const XANO_BASE = "https://xmpx-swi5-tlvy.n7c.xano.io";
const XANO_USER_ID = 240;
const XANO_TEAM_ID = 16;

// API Group paths
const API_GROUPS = {
  auth: "api:lkmcgxf_",
  core: "api:KPx5ivcP",
  website: "api:kaVkk3oM",
  charts: "api:YI80HIS5",
  dashboard: "api:prbQK-aI",
  reports: "api:vvPh-tsZ",
} as const;

// Get the Xano auth token from environment or integration config
async function getXanoToken(): Promise<string | null> {
  // Check env first
  if (process.env.XANO_AUTH_TOKEN) {
    return process.env.XANO_AUTH_TOKEN;
  }
  
  // Try to get from integration config in DB
  try {
    const config = await storage.getIntegrationConfig("xano");
    if (config?.apiKey) return config.apiKey;
  } catch (e) {
    // Integration config may not exist yet
  }
  
  return null;
}

// Middleware: require super admin for Xano proxy routes
async function requireSuperAdmin(req: any, res: Response, next: NextFunction) {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

// Generic Xano fetch with auth
async function xanoFetch(endpoint: string, token: string | null, options?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const url = `${XANO_BASE}/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Xano API error ${response.status}: ${text.substring(0, 500)}`);
  }
  
  return response.json();
}

export function registerXanoRoutes(app: Express, isAuthenticated: any) {
  
  // ─── Transactions ─────────────────────────────────
  app.get("/api/admin/xano/transactions/closed", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/transactions/closed?effective_user_id=${XANO_USER_ID}&production_scope=team`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] transactions/closed error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/xano/transactions/pending", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/transactions/pending?effective_user_id=${XANO_USER_ID}&production_scope=team`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] transactions/pending error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/xano/transactions/terminated", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/transactions/terminated?effective_user_id=${XANO_USER_ID}&production_scope=team`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] transactions/terminated error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Listings ─────────────────────────────────────
  app.get("/api/admin/xano/listings", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/listings/all_new?effective_user_id=${XANO_USER_ID}&production_scope=team`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] listings error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Network ──────────────────────────────────────
  app.get("/api/admin/xano/network", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/network/all?user_id=${XANO_USER_ID}`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] network error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── RevShare ─────────────────────────────────────
  app.get("/api/admin/xano/revshare", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/revshare_totals?user_id=${XANO_USER_ID}&view=agent`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] revshare error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Contributions ────────────────────────────────
  app.get("/api/admin/xano/contributions", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/contributions?user_id=${XANO_USER_ID}&view=agent`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] contributions error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Team Roster ──────────────────────────────────
  app.get("/api/admin/xano/roster", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.core}/team_management/roster?team_id=${XANO_TEAM_ID}`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] roster error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Team Locations ───────────────────────────────
  app.get("/api/admin/xano/locations", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(
        `${API_GROUPS.website}/team/locations?team_id=${XANO_TEAM_ID}`,
        token
      );
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] locations error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Charts Config ────────────────────────────────
  app.get("/api/admin/xano/charts", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(`${API_GROUPS.charts}/charts`, token);
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] charts error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Report Templates ─────────────────────────────
  app.get("/api/admin/xano/report-templates", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const token = await getXanoToken();
      const data = await xanoFetch(`${API_GROUPS.website}/report_templates`, token);
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] report-templates error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Generic proxy for any Xano endpoint (admin only) ─
  app.get("/api/admin/xano/proxy", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { endpoint } = req.query;
      if (!endpoint || typeof endpoint !== "string") {
        return res.status(400).json({ error: "Missing endpoint query parameter" });
      }
      const token = await getXanoToken();
      const data = await xanoFetch(endpoint, token);
      res.json(data);
    } catch (error: any) {
      console.error("[Xano] proxy error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[Xano] Admin dashboard proxy routes registered");
}
