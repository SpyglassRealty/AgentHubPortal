import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { resetFubClient, refreshFubDbConfig } from "./fubClient";
import { INTEGRATION_DEFINITIONS, upsertIntegrationConfigSchema } from "@shared/schema";
import type { User } from "@shared/schema";

// Mask an API key to show only last 4 chars
function maskApiKey(key: string): string {
  if (key.length <= 4) return "****";
  return "•".repeat(Math.min(key.length - 4, 32)) + key.slice(-4);
}

// Helper function to get the actual database user from request
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

// Middleware: require super admin
async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

// Test integration connections
async function testIntegration(name: string, apiKey: string, additionalConfig?: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    switch (name) {
      case "fub": {
        const auth = Buffer.from(apiKey + ":").toString("base64");
        const response = await fetch("https://api.followupboss.com/v1/users?limit=1", {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            ...(additionalConfig?.systemName ? { "X-System": additionalConfig.systemName } : {}),
          },
        });
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `Connected successfully. Found ${data.users?.length || 0}+ users.` };
        }
        const errorText = await response.text();
        return { success: false, message: `API returned ${response.status}: ${errorText.substring(0, 200)}` };
      }
      
      case "ghl": {
        const response = await fetch("https://rest.gohighlevel.com/v1/custom-values/", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok || response.status === 200) {
          return { success: true, message: "Connected to GoHighLevel successfully." };
        }
        // GHL may return 401 for wrong key
        if (response.status === 401) {
          return { success: false, message: "Invalid API key. Check your GoHighLevel credentials." };
        }
        return { success: response.status < 500, message: `GoHighLevel responded with status ${response.status}.` };
      }

      case "sendblue": {
        const headers: Record<string, string> = {
          "sb-api-key-id": apiKey,
          "Content-Type": "application/json",
        };
        if (additionalConfig?.apiSecret) {
          headers["sb-api-secret-key"] = additionalConfig.apiSecret;
        }
        const response = await fetch("https://api.sendblue.co/api/send-message", {
          method: "OPTIONS",
          headers,
        });
        // SendBlue might not have a clean test endpoint, so we just check the key format
        if (apiKey.length > 10) {
          return { success: true, message: "API key saved. Connection will be verified on first use." };
        }
        return { success: false, message: "API key appears to be too short." };
      }

      case "idx_grid": {
        const response = await fetch("https://api.repliers.io/listings?listings=false&resultsPerPage=1", {
          headers: {
            Accept: "application/json",
            "REPLIERS-API-KEY": apiKey,
          },
        });
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `Connected. ${data.count || 0} listings available.` };
        }
        return { success: false, message: `API returned ${response.status}. Check your Repliers API key.` };
      }

      case "vimeo": {
        const response = await fetch("https://api.vimeo.com/me", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.vimeo.*+json;version=3.4",
          },
        });
        if (response.ok) {
          const data = await response.json();
          return { success: true, message: `Connected as ${data.name || "Vimeo user"}.` };
        }
        return { success: false, message: `Vimeo API returned ${response.status}. Check your access token.` };
      }

      case "openai": {
        const baseURL = additionalConfig?.baseURL || "https://api.openai.com/v1";
        const response = await fetch(`${baseURL}/models`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          return { success: true, message: "Connected to OpenAI successfully." };
        }
        return { success: false, message: `OpenAI API returned ${response.status}. Check your API key.` };
      }

      default:
        return { success: true, message: "API key saved. No connection test available for this integration." };
    }
  } catch (error: any) {
    return { success: false, message: `Connection test failed: ${error.message || "Unknown error"}` };
  }
}

export function registerAdminRoutes(app: Express) {
  // GET /api/admin/users - List all users
  app.get("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json({ users: allUsers });
    } catch (error) {
      console.error("[Admin] Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // PUT /api/admin/users/:id - Update user fields (is_active, is_super_admin)
  app.put("/api/admin/users/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isSuperAdmin: newSuperAdmin } = req.body;

      const updateData: Partial<{ isSuperAdmin: boolean }> = {};
      if (typeof newSuperAdmin === "boolean") updateData.isSuperAdmin = newSuperAdmin;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Admin] User ${id} updated by ${req.dbUser.id}:`, updateData);
      res.json({ success: true, user });
    } catch (error) {
      console.error("[Admin] Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // GET /api/admin/integrations - List all integration configs (keys masked)
  app.get("/api/admin/integrations", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const configs = await storage.getIntegrationConfigs();
      
      // Build a map of saved configs
      const savedMap = new Map(configs.map((c) => [c.name, c]));
      
      // Merge with definitions to show all possible integrations
      const integrations = INTEGRATION_DEFINITIONS.map((def) => {
        const saved = savedMap.get(def.name);
        return {
          name: def.name,
          displayName: def.displayName,
          description: def.description,
          icon: def.icon,
          color: def.color,
          configured: !!saved,
          isActive: saved?.isActive ?? false,
          maskedApiKey: saved ? maskApiKey(saved.apiKey) : null,
          additionalConfig: saved?.additionalConfig 
            ? Object.fromEntries(
                Object.entries(saved.additionalConfig as Record<string, any>).map(([k, v]) => {
                  // Mask secret-type additional fields
                  const fieldDef = def.additionalFields?.find(f => f.key === k);
                  if (fieldDef?.type === 'password' && typeof v === 'string') {
                    return [k, maskApiKey(v)];
                  }
                  return [k, v];
                })
              )
            : null,
          lastTestedAt: saved?.lastTestedAt,
          lastTestResult: saved?.lastTestResult,
          lastTestMessage: saved?.lastTestMessage,
          updatedAt: saved?.updatedAt,
          fields: def.fields,
          additionalFields: def.additionalFields,
          testEndpoint: def.testEndpoint,
        };
      });

      res.json({ integrations });
    } catch (error) {
      console.error("[Admin] Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // PUT /api/admin/integrations/:name - Save/update an integration's API key
  app.put("/api/admin/integrations/:name", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name } = req.params;
      const user = req.dbUser;

      // Validate integration name
      const definition = INTEGRATION_DEFINITIONS.find((d) => d.name === name);
      if (!definition) {
        return res.status(400).json({ message: `Unknown integration: ${name}` });
      }

      const parseResult = upsertIntegrationConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: parseResult.error.errors,
        });
      }

      const { apiKey, additionalConfig } = parseResult.data;

      const config = await storage.upsertIntegrationConfig({
        name,
        displayName: definition.displayName,
        apiKey,
        additionalConfig: additionalConfig || null,
        isActive: true,
        createdBy: user.id,
      });

      // Reset cached clients when keys change
      if (name === "fub") {
        resetFubClient();
        await refreshFubDbConfig();
      }

      console.log(`[Admin] Integration ${name} updated by user ${user.id}`);

      res.json({
        success: true,
        integration: {
          name: config.name,
          displayName: config.displayName,
          configured: true,
          isActive: config.isActive,
          maskedApiKey: maskApiKey(config.apiKey),
          updatedAt: config.updatedAt,
        },
      });
    } catch (error) {
      console.error(`[Admin] Error updating integration:`, error);
      res.status(500).json({ message: "Failed to update integration" });
    }
  });

  // POST /api/admin/integrations/:name/test - Test if the API key works
  app.post("/api/admin/integrations/:name/test", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name } = req.params;

      const config = await storage.getIntegrationConfig(name);
      if (!config) {
        return res.status(404).json({ message: `Integration ${name} is not configured` });
      }

      const additionalConfig = config.additionalConfig as Record<string, any> | null;
      const result = await testIntegration(name, config.apiKey, additionalConfig || undefined);

      // Save test result
      await storage.updateIntegrationTestResult(
        name,
        result.success ? "success" : "failed",
        result.message
      );

      res.json({
        success: result.success,
        message: result.message,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`[Admin] Error testing integration:`, error);
      res.status(500).json({ message: `Test failed: ${error.message}` });
    }
  });

  // GET /api/admin/app-visibility - Get all app visibility settings
  app.get("/api/admin/app-visibility", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const visibility = await storage.getAppVisibility();
      res.json({ visibility });
    } catch (error) {
      console.error("[Admin] Error fetching app visibility:", error);
      res.status(500).json({ message: "Failed to fetch app visibility" });
    }
  });

  // PUT /api/admin/app-visibility/:appId - Update app visibility
  app.put("/api/admin/app-visibility/:appId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { appId } = req.params;
      const { hidden } = req.body;
      if (typeof hidden !== "boolean") {
        return res.status(400).json({ message: "hidden must be a boolean" });
      }
      const result = await storage.setAppVisibility(appId, hidden);
      console.log(`[Admin] App ${appId} visibility set to hidden=${hidden} by ${req.dbUser.id}`);
      res.json({ success: true, visibility: result });
    } catch (error) {
      console.error("[Admin] Error updating app visibility:", error);
      res.status(500).json({ message: "Failed to update app visibility" });
    }
  });

  // GET /api/admin/stats - Usage statistics
  app.get("/api/admin/stats", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("[Admin] Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // GET /api/admin/activity-logs - Recent activity logs
  app.get("/api/admin/activity-logs", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const logs = await storage.getActivityLogs(limit);
      res.json({ logs });
    } catch (error) {
      console.error("[Admin] Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Also expose app-visibility for non-admin users (dashboard needs it)
  app.get("/api/app-visibility", isAuthenticated, async (req: any, res) => {
    try {
      const visibility = await storage.getAppVisibility();
      res.json({ visibility });
    } catch (error) {
      console.error("[API] Error fetching app visibility:", error);
      res.status(500).json({ message: "Failed to fetch app visibility" });
    }
  });

  // DELETE /api/admin/integrations/:name - Remove an integration config
  app.delete("/api/admin/integrations/:name", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name } = req.params;
      const user = req.dbUser;

      const deleted = await storage.deleteIntegrationConfig(name);
      if (!deleted) {
        return res.status(404).json({ message: `Integration ${name} not found` });
      }

      // Reset cached clients
      if (name === "fub") {
        resetFubClient();
        await refreshFubDbConfig();
      }

      console.log(`[Admin] Integration ${name} deleted by user ${user.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`[Admin] Error deleting integration:`, error);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });
}
