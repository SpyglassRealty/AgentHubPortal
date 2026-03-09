/**
 * Saved Search Routes — Phase 5: Mission Control Agent Dashboard
 * 
 * Provides API endpoints for managing Repliers saved searches, clients, matches, and messages.
 * Uses the Repliers API key stored in the integration_configs table (as 'idx_grid').
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { agentDirectoryProfiles, integrationConfigs } from "@shared/schema";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const REPLIERS_BASE = "https://api.repliers.io";
const BOARD_ID = 53; // ACTRIS/Unlock MLS

async function getRepliersApiKey(): Promise<string | null> {
  try {
    // First check integration_configs table
    const config = await storage.getIntegrationConfig("idx_grid");
    if (config?.apiKey) return config.apiKey;
    // Fallback to env var
    return process.env.IDX_GRID_API_KEY || null;
  } catch {
    return process.env.IDX_GRID_API_KEY || null;
  }
}

async function repliersRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ ok: boolean; status: number; data: any }> {
  const apiKey = await getRepliersApiKey();
  if (!apiKey) {
    return { ok: false, status: 503, data: { error: "Repliers API key not configured" } };
  }

  const url = `${REPLIERS_BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "REPLIERS-API-KEY": apiKey,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    let data: any;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    console.error(`[Repliers] ${method} ${path} failed:`, error.message);
    return { ok: false, status: 500, data: { error: error.message } };
  }
}

// ── Repliers Agent Management ────────────────────────────────────────────────

// POST /api/admin/saved-searches/agents — Create a Repliers Agent
router.post("/admin/saved-searches/agents", async (req, res) => {
  try {
    const { agentDirectoryProfileId, fname, lname, email, phone, brokerage, designation } = req.body;

    if (!fname || !lname || !email || !phone) {
      return res.status(400).json({ error: "fname, lname, email, and phone are required" });
    }

    const result = await repliersRequest("POST", "/agents", {
      fname,
      lname,
      email,
      phone,
      brokerage: brokerage || "Spyglass Realty",
      designation: designation || "Realtor",
      boardId: BOARD_ID,
    });

    if (!result.ok) {
      console.error("[Saved Search] Failed to create Repliers agent:", result.data);
      return res.status(result.status).json({
        error: "Failed to create Repliers agent",
        details: result.data,
      });
    }

    const repliersAgentId = result.data?.agentId?.toString() || result.data?.id?.toString();

    // If we have a directory profile ID, update it with the Repliers agent ID
    if (agentDirectoryProfileId && repliersAgentId) {
      await db
        .update(agentDirectoryProfiles)
        .set({
          repliersAgentId,
          updatedAt: new Date(),
        })
        .where(eq(agentDirectoryProfiles.id, agentDirectoryProfileId));
    }

    res.json({
      success: true,
      repliersAgentId,
      agentData: result.data,
    });
  } catch (error: any) {
    console.error("[Saved Search] Error creating Repliers agent:", error);
    res.status(500).json({ error: "Failed to create Repliers agent" });
  }
});

// GET /api/admin/saved-searches/agents/:agentId — Get Repliers Agent details
router.get("/admin/saved-searches/agents/:agentId", async (req, res) => {
  try {
    const { agentId } = req.params;
    const result = await repliersRequest("GET", `/agents/${agentId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch agent", details: result.data });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error("[Saved Search] Error fetching Repliers agent:", error);
    res.status(500).json({ error: "Failed to fetch Repliers agent" });
  }
});

// PUT /api/admin/saved-searches/link-agent — Link a Repliers agent ID to a directory profile
router.put("/admin/saved-searches/link-agent", async (req, res) => {
  try {
    const { agentDirectoryProfileId, repliersAgentId } = req.body;

    if (!agentDirectoryProfileId || !repliersAgentId) {
      return res.status(400).json({ error: "agentDirectoryProfileId and repliersAgentId are required" });
    }

    await db
      .update(agentDirectoryProfiles)
      .set({
        repliersAgentId: repliersAgentId.toString(),
        updatedAt: new Date(),
      })
      .where(eq(agentDirectoryProfiles.id, agentDirectoryProfileId));

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Saved Search] Error linking agent:", error);
    res.status(500).json({ error: "Failed to link agent" });
  }
});

// ── Clients ──────────────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/clients?agentId=X — List clients for an agent
router.get("/admin/saved-searches/clients", async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ error: "agentId query parameter is required" });
    }

    const result = await repliersRequest("GET", `/clients?agentId=${agentId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch clients", details: result.data });
    }

    // Normalize response — Repliers may return array directly or nested
    const clients = Array.isArray(result.data) ? result.data : result.data?.clients || [];
    res.json({ clients });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// POST /api/admin/saved-searches/clients — Create a client for an agent
router.post("/admin/saved-searches/clients", async (req, res) => {
  try {
    const { agentId, fname, lname, email, phone } = req.body;

    if (!agentId || !fname || !lname || !email) {
      return res.status(400).json({ error: "agentId, fname, lname, and email are required" });
    }

    const result = await repliersRequest("POST", "/clients", {
      agentId,
      fname,
      lname,
      email,
      phone: phone || undefined,
      boardId: BOARD_ID,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to create client", details: result.data });
    }

    res.json({ success: true, client: result.data });
  } catch (error: any) {
    console.error("[Saved Search] Error creating client:", error);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// GET /api/admin/saved-searches/clients/:clientId — Get a specific client
router.get("/admin/saved-searches/clients/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await repliersRequest("GET", `/clients/${clientId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch client", details: result.data });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error("[Saved Search] Error fetching client:", error);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// ── Saved Searches ───────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/searches?clientId=X — List saved searches for a client
router.get("/admin/saved-searches/searches", async (req, res) => {
  try {
    const { clientId, agentId } = req.query;

    let path = "/searches?";
    if (clientId) path += `clientId=${clientId}&`;
    if (agentId) path += `agentId=${agentId}&`;
    path = path.replace(/[&?]$/, "");

    const result = await repliersRequest("GET", path);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch searches", details: result.data });
    }

    const searches = Array.isArray(result.data) ? result.data : result.data?.searches || [];
    res.json({ searches });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching searches:", error);
    res.status(500).json({ error: "Failed to fetch searches" });
  }
});

// POST /api/admin/saved-searches/searches — Create a saved search
router.post("/admin/saved-searches/searches", async (req, res) => {
  try {
    const {
      clientId,
      name,
      // Search criteria
      minPrice,
      maxPrice,
      minBeds,
      maxBeds,
      minBaths,
      maxBaths,
      minSqft,
      maxSqft,
      minYearBuilt,
      maxYearBuilt,
      cities,
      areas,
      neighborhoods,
      propertyTypes,
      classType,
      type,
      map,
      // Alert config
      notificationFrequency,
      soldNotifications,
      priceChangeNotifications,
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: "clientId is required" });
    }
    if (!minPrice || !maxPrice) {
      return res.status(400).json({ error: "minPrice and maxPrice are required for saved searches" });
    }

    // Build search body — only include defined fields
    const searchBody: Record<string, any> = {
      clientId,
      boardId: BOARD_ID,
      type: type || "sale",
      class: classType || "residential",
      minPrice,
      maxPrice,
    };

    if (name) searchBody.name = name;
    if (minBeds) searchBody.minBeds = minBeds;
    if (maxBeds) searchBody.maxBeds = maxBeds;
    if (minBaths) searchBody.minBaths = minBaths;
    if (maxBaths) searchBody.maxBaths = maxBaths;
    if (minSqft) searchBody.minSqft = minSqft;
    if (maxSqft) searchBody.maxSqft = maxSqft;
    if (minYearBuilt) searchBody.minYearBuilt = minYearBuilt;
    if (maxYearBuilt) searchBody.maxYearBuilt = maxYearBuilt;
    if (cities?.length) searchBody.cities = cities;
    if (areas?.length) searchBody.areas = areas;
    if (neighborhoods?.length) searchBody.neighborhoods = neighborhoods;
    if (propertyTypes?.length) searchBody.propertyTypes = propertyTypes;
    if (map) searchBody.map = map;
    if (notificationFrequency) searchBody.notificationFrequency = notificationFrequency;
    if (typeof soldNotifications === "boolean") searchBody.soldNotifications = soldNotifications;
    if (typeof priceChangeNotifications === "boolean") searchBody.priceChangeNotifications = priceChangeNotifications;

    const result = await repliersRequest("POST", "/searches", searchBody);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to create search", details: result.data });
    }

    res.json({ success: true, search: result.data });
  } catch (error: any) {
    console.error("[Saved Search] Error creating search:", error);
    res.status(500).json({ error: "Failed to create search" });
  }
});

// GET /api/admin/saved-searches/searches/:searchId — Get a specific search
router.get("/admin/saved-searches/searches/:searchId", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("GET", `/searches/${searchId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch search", details: result.data });
    }

    res.json(result.data);
  } catch (error: any) {
    console.error("[Saved Search] Error fetching search:", error);
    res.status(500).json({ error: "Failed to fetch search" });
  }
});

// PUT /api/admin/saved-searches/searches/:searchId — Update a saved search
router.put("/admin/saved-searches/searches/:searchId", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("PUT", `/searches/${searchId}`, req.body);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to update search", details: result.data });
    }

    res.json({ success: true, search: result.data });
  } catch (error: any) {
    console.error("[Saved Search] Error updating search:", error);
    res.status(500).json({ error: "Failed to update search" });
  }
});

// DELETE /api/admin/saved-searches/searches/:searchId — Delete a saved search
router.delete("/admin/saved-searches/searches/:searchId", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("DELETE", `/searches/${searchId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to delete search", details: result.data });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Saved Search] Error deleting search:", error);
    res.status(500).json({ error: "Failed to delete search" });
  }
});

// PUT /api/admin/saved-searches/searches/:searchId/pause — Pause a saved search
router.put("/admin/saved-searches/searches/:searchId/pause", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("PUT", `/searches/${searchId}`, { active: false });

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to pause search", details: result.data });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Saved Search] Error pausing search:", error);
    res.status(500).json({ error: "Failed to pause search" });
  }
});

// PUT /api/admin/saved-searches/searches/:searchId/resume — Resume a saved search
router.put("/admin/saved-searches/searches/:searchId/resume", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("PUT", `/searches/${searchId}`, { active: true });

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to resume search", details: result.data });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[Saved Search] Error resuming search:", error);
    res.status(500).json({ error: "Failed to resume search" });
  }
});

// ── Matches ──────────────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/searches/:searchId/matches — Get matches for a search
router.get("/admin/saved-searches/searches/:searchId/matches", async (req, res) => {
  try {
    const { searchId } = req.params;
    const result = await repliersRequest("GET", `/searches/${searchId}/matches`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch matches", details: result.data });
    }

    const matches = Array.isArray(result.data) ? result.data : result.data?.matches || [];
    res.json({ matches });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching matches:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// ── Favorites ────────────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/favorites?clientId=X — Get favorites for a client
router.get("/admin/saved-searches/favorites", async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "clientId query parameter is required" });
    }

    const result = await repliersRequest("GET", `/favorites?clientId=${clientId}`);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch favorites", details: result.data });
    }

    const favorites = Array.isArray(result.data) ? result.data : result.data?.favorites || [];
    res.json({ favorites });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// ── Messages ─────────────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/messages?clientId=X — Get message history
router.get("/admin/saved-searches/messages", async (req, res) => {
  try {
    const { clientId, agentId } = req.query;

    let path = "/messages?";
    if (clientId) path += `clientId=${clientId}&`;
    if (agentId) path += `agentId=${agentId}&`;
    path = path.replace(/[&?]$/, "");

    const result = await repliersRequest("GET", path);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to fetch messages", details: result.data });
    }

    const messages = Array.isArray(result.data) ? result.data : result.data?.messages || [];
    res.json({ messages });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/admin/saved-searches/messages — Send a message to a client
router.post("/admin/saved-searches/messages", async (req, res) => {
  try {
    const { clientId, agentId, message, subject, type } = req.body;

    if (!clientId || !message) {
      return res.status(400).json({ error: "clientId and message are required" });
    }

    const messageBody: Record<string, any> = {
      clientId,
      message,
    };
    if (agentId) messageBody.agentId = agentId;
    if (subject) messageBody.subject = subject;
    if (type) messageBody.type = type; // 'email', 'sms', etc.

    const result = await repliersRequest("POST", "/messages", messageBody);

    if (!result.ok) {
      return res.status(result.status).json({ error: "Failed to send message", details: result.data });
    }

    res.json({ success: true, message: result.data });
  } catch (error: any) {
    console.error("[Saved Search] Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ── Dashboard Summary ────────────────────────────────────────────────────────

// GET /api/admin/saved-searches/dashboard?agentId=X — Get summary stats for agent dashboard
router.get("/admin/saved-searches/dashboard", async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ error: "agentId query parameter is required" });
    }

    // Fetch clients and searches in parallel
    const [clientsResult, searchesResult] = await Promise.all([
      repliersRequest("GET", `/clients?agentId=${agentId}`),
      repliersRequest("GET", `/searches?agentId=${agentId}`),
    ]);

    const clients = clientsResult.ok
      ? (Array.isArray(clientsResult.data) ? clientsResult.data : clientsResult.data?.clients || [])
      : [];
    
    const searches = searchesResult.ok
      ? (Array.isArray(searchesResult.data) ? searchesResult.data : searchesResult.data?.searches || [])
      : [];

    const activeSearches = searches.filter((s: any) => s.active !== false);
    const pausedSearches = searches.filter((s: any) => s.active === false);

    res.json({
      totalClients: clients.length,
      totalSearches: searches.length,
      activeSearches: activeSearches.length,
      pausedSearches: pausedSearches.length,
      clients,
      searches,
    });
  } catch (error: any) {
    console.error("[Saved Search] Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ── Agent Self-Lookup ────────────────────────────────────────────────────────

// GET /api/saved-searches/my-agent — Get the current logged-in user's Repliers agent info
router.get("/saved-searches/my-agent", isAuthenticated, async (req: any, res) => {
  try {
    const sessionUserId = req.user?.claims?.sub;
    const email = req.user?.claims?.email;

    if (!email && !sessionUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Look up the user to get their email
    let userEmail = email;
    if (!userEmail && sessionUserId) {
      const user = await storage.getUser(sessionUserId);
      userEmail = user?.email;
    }

    if (!userEmail) {
      return res.status(404).json({ error: "User email not found", repliersAgentId: null });
    }

    // Look up agent directory profile by email
    const [profile] = await db
      .select()
      .from(agentDirectoryProfiles)
      .where(eq(agentDirectoryProfiles.email, userEmail))
      .limit(1);

    if (!profile) {
      return res.json({
        repliersAgentId: null,
        message: "No agent directory profile found for this email",
      });
    }

    res.json({
      repliersAgentId: profile.repliersAgentId || null,
      profileId: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
    });
  } catch (error: any) {
    console.error("[Saved Search] Error looking up agent profile:", error);
    res.status(500).json({ error: "Failed to look up agent profile" });
  }
});

export default router;
