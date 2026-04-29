import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import type { User } from "@shared/schema";
import { users } from "@shared/schema";
import { devChangelog, developerActivityLogs } from "@shared/developerSchema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";

// Cache for Render deploy history (5 minute TTL)
let renderDeployCache: { data: any[]; timestamp: number } | null = null;
const RENDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RENDER_SERVICE_ID = "srv-d5vc5od6ubrc73cbslag"; // Mission Control service ID

// Parse commit message to determine category
function detectCategory(commitMessage: string): string {
  const message = commitMessage.toLowerCase();
  const firstLine = message.split('\n')[0];
  
  // Conventional commit patterns
  if (firstLine.match(/^fix:|^bugfix:|^hotfix:|fix\s/)) return 'bug_fix';
  if (firstLine.match(/^feat:|^feature:|^add:|^implement:/)) return 'feature';
  if (firstLine.match(/^docs:|^documentation:/)) return 'documentation';
  if (firstLine.match(/^style:|^ui:|^ux:/)) return 'ui';
  if (firstLine.match(/^refactor:|^chore:|^update:|^upgrade:/)) return 'maintenance';
  if (firstLine.match(/^perf:|^optimize:/)) return 'performance';
  if (firstLine.match(/^test:|^tests:/)) return 'testing';
  
  // Content-based detection
  if (message.includes('deploy') || message.includes('deployment')) return 'deployment';
  if (message.includes('database') || message.includes('migration')) return 'database';
  if (message.includes('api') || message.includes('endpoint')) return 'api';
  if (message.includes('fix') || message.includes('bug') || message.includes('issue')) return 'bug_fix';
  if (message.includes('add') || message.includes('feature') || message.includes('implement')) return 'feature';
  if (message.includes('ui') || message.includes('style') || message.includes('css')) return 'ui';
  
  return 'update'; // default fallback
}

// Fetch Render deploy history with caching
async function fetchRenderDeploys(): Promise<any[]> {
  // Check cache first
  if (renderDeployCache && Date.now() - renderDeployCache.timestamp < RENDER_CACHE_TTL) {
    return renderDeployCache.data;
  }

  // Check if API key exists
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) {
    console.warn('[Changelog] RENDER_API_KEY not configured - deploy status will be unavailable');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys?limit=100`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      console.error(`[Changelog] Render API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const deploys = data.deploys || [];
    
    // Update cache
    renderDeployCache = { data: deploys, timestamp: Date.now() };
    return deploys;
  } catch (e) {
    console.error('[Changelog] Render API fetch error:', e);
    return [];
  }
}

// Determine deploy status based on commit SHA and Render deploy history
function determineStatus(commitSha: string, renderDeploys: any[]): string {
  if (!renderDeploys || renderDeploys.length === 0) {
    return 'committed'; // Default when no deploy data
  }

  // Find deploys matching this commit
  const matchingDeploys = renderDeploys.filter(d => 
    d.commit?.id?.startsWith(commitSha) || commitSha.startsWith(d.commit?.id?.substring(0, 7))
  );

  if (matchingDeploys.length === 0) {
    // Check if commit is newer than latest deploy
    const latestDeploy = renderDeploys.find(d => d.deploy?.status === 'live');
    if (latestDeploy && latestDeploy.commit?.id) {
      // Without commit date comparison, we can't determine if it's pending
      // So we'll just mark as committed
      return 'committed';
    }
    return 'committed';
  }

  // Check status of matching deploys
  for (const deploy of matchingDeploys) {
    if (deploy.deploy?.status === 'live') return 'deployed';
    if (deploy.deploy?.status === 'build_in_progress' || deploy.deploy?.status === 'update_in_progress') return 'deploying';
    if (deploy.deploy?.status === 'failed' || deploy.deploy?.status === 'canceled') return 'failed';
  }

  return 'committed';
}

// Fetch recent commits from GitHub API
async function fetchGitHubCommits() {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AgentHubPortal'
    };
    
    const token = process.env.GITHUB_TOKEN;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(
      'https://api.github.com/repos/SpyglassRealty/AgentHubPortal/commits?sha=main&per_page=50',
      { headers }
    );
    
    if (!response.ok) {
      console.error(`[Changelog] GitHub API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`[Changelog] Error details:`, errorBody);
      return [];
    }
    
    const commits = await response.json();
    
    // Fetch Render deploy history for status determination
    const renderDeploys = await fetchRenderDeploys();
    
    return commits.map((c: any) => ({
      id: c.sha,
      description: c.commit.message,
      developerName: c.commit.author?.name || 'Unknown',
      developerEmail: c.commit.author?.email || '',
      commitHash: c.sha.substring(0, 7),
      category: detectCategory(c.commit.message),
      status: determineStatus(c.sha.substring(0, 7), renderDeploys),
      createdAt: c.commit.author?.date || c.commit.committer?.date || new Date().toISOString(),
      source: 'github'
    }));
  } catch (e) {
    console.error('[Changelog] GitHub fetch error:', e);
    return [];
  }
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

// Middleware: require developer access (role === 'developer' OR is_super_admin)
async function requireDeveloper(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  // Consolidated policy: developer role OR super admin
  if (user.role !== 'developer' && !user.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Developer privileges required." });
  }

  (req as any).dbUser = user;
  next();
}

// Log activity function
async function logActivity(userId: string, userEmail: string, userName: string, actionType: string, description: string, metadata?: any, ipAddress?: string) {
  try {
    await db.insert(developerActivityLogs).values({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      action_type: actionType,
      description,
      metadata: metadata || {},
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export function setupDeveloperRoutes(app: Express) {
  // All developer routes require authentication and developer role
  app.use("/api/developer", isAuthenticated, requireDeveloper);

  // GET /api/developer/activity-logs - list all user activity (paginated, filterable)
  app.get("/api/developer/activity-logs", async (req, res) => {
    try {
      const { 
        page = "1", 
        limit = "50", 
        user_id, 
        action_type, 
        start_date, 
        end_date,
        search
      } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Build WHERE conditions
      const conditions: any[] = [];
      
      if (user_id) {
        conditions.push(sql`user_id = ${user_id}`);
      }
      
      if (action_type) {
        conditions.push(sql`action_type = ${action_type}`);
      }
      
      if (start_date) {
        conditions.push(sql`created_at >= ${start_date}`);
      }
      
      if (end_date) {
        conditions.push(sql`created_at <= ${end_date}`);
      }
      
      if (search) {
        conditions.push(sql`(description ILIKE ${'%' + search + '%'} OR user_name ILIKE ${'%' + search + '%'} OR user_email ILIKE ${'%' + search + '%'})`);
      }
      
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      
      // Get total count
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM developer_activity_logs 
        ${whereClause}
      `);
      const totalCount = parseInt(countResult.rows[0]?.count || "0");
      
      // Get logs
      const logsResult = await db.execute(sql`
        SELECT * FROM developer_activity_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ${limitNum} OFFSET ${offset}
      `);
      
      // Log this access
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'view',
        'Accessed activity logs',
        { filters: { user_id, action_type, start_date, end_date, search }, page: pageNum },
        req.ip
      );
      
      res.json({
        logs: logsResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
      
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // GET /api/developer/users - list all users
  app.get("/api/developer/users", async (req, res) => {
    try {
      const usersResult = await db.execute(sql`
        SELECT id, email, first_name, last_name, is_super_admin, role, created_at, updated_at,
               (SELECT COUNT(*) FROM developer_activity_logs WHERE user_id = users.id) as activity_count,
               (SELECT MAX(created_at) FROM developer_activity_logs WHERE user_id = users.id) as last_activity
        FROM users 
        ORDER BY created_at DESC
      `);
      
      // Log this access
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'view',
        'Accessed user management',
        { user_count: usersResult.rows.length },
        req.ip
      );
      
      res.json({ users: usersResult.rows });
      
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // PUT /api/developer/users/:id/super-admin - toggle super admin status
  app.put("/api/developer/users/:id/super-admin", async (req, res) => {
    try {
      const { id } = req.params;
      const { isSuperAdmin } = req.body;
      
      if (typeof isSuperAdmin !== 'boolean') {
        return res.status(400).json({ message: "isSuperAdmin must be a boolean" });
      }
      
      // Get current user info for logging
      const currentUserResult = await db.execute(sql`
        SELECT email, first_name, last_name, is_super_admin as current_super_admin FROM users WHERE id = ${id}
      `);
      
      if (currentUserResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const targetUser = currentUserResult.rows[0];
      
      // Update super admin status
      await db.execute(sql`
        UPDATE users SET is_super_admin = ${isSuperAdmin}, updated_at = NOW() WHERE id = ${id}
      `);
      
      // Log this action
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'update',
        `Changed super admin status from ${targetUser.current_super_admin} to ${isSuperAdmin}`,
        { 
          target_user_id: id, 
          target_email: targetUser.email,
          old_super_admin: targetUser.current_super_admin, 
          new_super_admin: isSuperAdmin 
        },
        req.ip
      );
      
      res.json({ message: "User super admin status updated successfully" });

    } catch (error) {
      console.error("Error updating user super admin status:", error);
      res.status(500).json({ message: "Failed to update user super admin status" });
    }
  });

  // PUT /api/developer/users/:id/role - update user role
  app.put("/api/developer/users/:id/role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['developer', 'admin', 'agent', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: developer, admin, agent, viewer" });
      }

      // Get current user info for logging
      const currentUserResult = await db.execute(sql`
        SELECT email, role as current_role FROM users WHERE id = ${id}
      `);

      if (currentUserResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetUser = currentUserResult.rows[0];

      const updatedUser = await storage.updateUserRole(id, role);

      // Log this action
      await logActivity(
        (req as any).dbUser.id,
        (req as any).dbUser.email,
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'update',
        `Changed role from ${targetUser.current_role} to ${role}`,
        {
          target_user_id: id,
          target_email: targetUser.email,
          old_role: targetUser.current_role,
          new_role: role
        },
        req.ip
      );

      res.json(updatedUser);

    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // POST /api/developer/invite - add co-developer by email (strict @spyglassrealty.com only)
  app.post("/api/developer/invite", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Strict domain validation: @spyglassrealty.com only (Decision A1)
      if (!email.toLowerCase().endsWith('@spyglassrealty.com')) {
        return res.status(400).json({ message: "Spyglass email address required (@spyglassrealty.com)" });
      }

      // Decision B1: role = 'developer', is_super_admin stays false.
      // storage.inviteDeveloper handles both existing-user (update role) and new-user (create) cases.
      const invitedUser = await storage.inviteDeveloper(email);

      // Log this action
      await logActivity(
        (req as any).dbUser.id,
        (req as any).dbUser.email,
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'create',
        `Invited user as co-developer`,
        {
          invited_email: email,
          invited_user_id: invitedUser.id,
          assigned_role: 'developer'
        },
        req.ip
      );

      res.json({
        message: `User successfully invited as co-developer`,
        user: {
          id: invitedUser.id,
          email: invitedUser.email,
          role: invitedUser.role
        }
      });

    } catch (error: any) {
      console.error("Error inviting co-developer:", error);
      res.status(500).json({ message: "Failed to invite co-developer" });
    }
  });

  // GET /api/developer/system-health - system stats and live integration health checks
  app.get("/api/developer/system-health", async (req, res) => {
    try {
      // Get database stats
      const userCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const cmaCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM cmas`);
      const activityCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM developer_activity_logs`);
      
      // Get recent errors from activity logs
      const errorsResult = await db.execute(sql`
        SELECT created_at, description, metadata
        FROM developer_activity_logs 
        WHERE action_type = 'error' 
        ORDER BY created_at DESC 
        LIMIT 10
      `);

      // Live integration health checks with 5s timeout per check
      const TIMEOUT_MS = 5000;

      const pingWithTimeout = async (url: string, options: RequestInit): Promise<{ ok: boolean; responseTime: number; error?: string }> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const start = Date.now();
        try {
          const resp = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timer);
          return { ok: resp.ok, responseTime: Date.now() - start };
        } catch (err: any) {
          clearTimeout(timer);
          return { ok: false, responseTime: Date.now() - start, error: err.name === 'AbortError' ? 'Timeout (5s)' : err.message };
        }
      };

      const checks = await Promise.allSettled([
        // 1. Repliers (MLS)
        (async () => {
          const apiKey = process.env.REPLIERS_API_KEY;
          if (!apiKey) return { name: 'repliers', display_name: 'Repliers (MLS)', is_active: false, last_test_result: 'failed', last_test_message: 'REPLIERS_API_KEY not configured', last_tested_at: new Date().toISOString() };
          const result = await pingWithTimeout('https://api.repliers.io/listings?resultsPerPage=1', { headers: { 'REPLIERS-API-KEY': apiKey } });
          return { name: 'repliers', display_name: 'Repliers (MLS)', is_active: true, last_test_result: result.ok ? 'success' : 'failed', last_test_message: result.ok ? `${result.responseTime}ms` : (result.error || 'Request failed'), last_tested_at: new Date().toISOString(), response_time: result.responseTime };
        })(),
        // 2. Follow Up Boss (CRM)
        (async () => {
          const apiKey = process.env.FUB_API_KEY;
          let dbKey: string | null = null;
          try {
            const { storage } = await import("./storage");
            const cfg = await storage.getIntegrationConfig('fub');
            dbKey = cfg?.isActive ? cfg.apiKey : null;
          } catch {}
          const key = dbKey || apiKey;
          if (!key) return { name: 'fub', display_name: 'Follow Up Boss (CRM)', is_active: false, last_test_result: 'failed', last_test_message: 'FUB_API_KEY not configured', last_tested_at: new Date().toISOString() };
          const result = await pingWithTimeout('https://api.followupboss.com/v1/users?limit=1', { headers: { 'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}` } });
          return { name: 'fub', display_name: 'Follow Up Boss (CRM)', is_active: true, last_test_result: result.ok ? 'success' : 'failed', last_test_message: result.ok ? `${result.responseTime}ms` : (result.error || 'Auth failed'), last_tested_at: new Date().toISOString(), response_time: result.responseTime };
        })(),
        // 3. OpenAI
        (async () => {
          const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
          if (!apiKey) return { name: 'openai', display_name: 'OpenAI', is_active: false, last_test_result: 'failed', last_test_message: 'OPENAI_API_KEY not configured', last_tested_at: new Date().toISOString() };
          const result = await pingWithTimeout('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
          return { name: 'openai', display_name: 'OpenAI', is_active: true, last_test_result: result.ok ? 'success' : 'failed', last_test_message: result.ok ? `${result.responseTime}ms` : (result.error || 'Auth failed'), last_tested_at: new Date().toISOString(), response_time: result.responseTime };
        })(),
        // 4. Google Services (env var check only)
        (async () => {
          const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
          const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
          const configured = hasClientId && hasClientSecret;
          return { name: 'google', display_name: 'Google Services', is_active: configured, last_test_result: configured ? 'success' : 'failed', last_test_message: configured ? 'Configured' : `Missing: ${!hasClientId ? 'GOOGLE_CLIENT_ID ' : ''}${!hasClientSecret ? 'GOOGLE_CLIENT_SECRET' : ''}`.trim(), last_tested_at: new Date().toISOString() };
        })(),
      ]);

      const integrations = checks.map(result =>
        result.status === 'fulfilled' ? result.value : { name: 'unknown', display_name: 'Unknown', is_active: false, last_test_result: 'failed', last_test_message: 'Health check threw an exception', last_tested_at: new Date().toISOString() }
      );

      // Read version from package.json
      let version = '1.0.0';
      try { version = require('../package.json').version; } catch {}
      
      // Log this access
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'view',
        'Accessed system health dashboard',
        {},
        req.ip
      );
      
      res.json({
        database_stats: {
          total_users: parseInt(userCountResult.rows[0]?.count || "0"),
          total_cmas: parseInt(cmaCountResult.rows[0]?.count || "0"),
          total_activity_logs: parseInt(activityCountResult.rows[0]?.count || "0")
        },
        integrations,
        deployment: {
          last_deployed: new Date().toISOString(),
          commit_hash: process.env.RENDER_GIT_COMMIT?.substring(0, 8) || 'unknown',
          environment: process.env.NODE_ENV || 'development',
          version,
        },
        recent_errors: errorsResult.rows
      });
      
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // POST /api/developer/changelog - add new changelog entry
  app.post("/api/developer/changelog", async (req, res) => {
    try {
      const { 
        description, 
        commit_hash, 
        category = 'feature', 
        status = 'deployed',
        requested_by 
      } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Validate category and status
      const validCategories = ['bug_fix', 'feature', 'ui', 'database', 'api', 'deployment', 'documentation', 'maintenance', 'performance', 'testing', 'update'];
      const validStatuses = ['deployed', 'in_progress', 'reverted', 'pending', 'deploying', 'failed', 'committed'];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const developerName = `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email;
      
      // Insert changelog entry
      const result = await db.execute(sql`
        INSERT INTO dev_changelog (description, developer_name, developer_email, requested_by, commit_hash, category, status)
        VALUES (${description}, ${developerName}, ${(req as any).dbUser.email}, ${requested_by || ''}, ${commit_hash || ''}, ${category}, ${status})
        RETURNING id
      `);
      
      const changelogId = result.rows[0]?.id;
      
      // Log this action
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        developerName,
        'create',
        'Added changelog entry',
        { 
          changelog_id: changelogId,
          category,
          status,
          commit_hash
        },
        req.ip
      );
      
      res.json({ message: "Changelog entry created successfully", id: changelogId });
      
    } catch (error) {
      console.error("Error creating changelog entry:", error);
      res.status(500).json({ message: "Failed to create changelog entry" });
    }
  });

  // GET /api/developer/changelog - get changelog entries
  app.get("/api/developer/changelog", async (req, res) => {
    try {
      const { 
        page = "1", 
        limit = "20", 
        category, 
        status, 
        developer_email,
        start_date,
        end_date 
      } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Fetch GitHub commits
      const githubCommits = await fetchGitHubCommits();
      
      // Build WHERE conditions for database entries
      const conditions: any[] = [];
      
      if (category && category !== "all") {
        conditions.push(sql`category = ${category}`);
      }
      
      if (status && status !== "all") {
        conditions.push(sql`status = ${status}`);
      }
      
      if (developer_email && developer_email !== "all") {
        conditions.push(sql`developer_email = ${developer_email}`);
      }
      
      if (start_date) {
        conditions.push(sql`created_at >= ${start_date}`);
      }
      
      if (end_date) {
        conditions.push(sql`created_at <= ${end_date}`);
      }
      
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      
      // Get database changelog entries
      const changelogResult = await db.execute(sql`
        SELECT *, 'database' as source FROM dev_changelog 
        ${whereClause}
        ORDER BY created_at DESC
      `);
      
      // Merge GitHub commits with database entries
      const allEntries = [
        ...githubCommits,
        ...changelogResult.rows.map(row => ({
          ...row,
          createdAt: row.created_at,
          developerName: row.developer_name,
          developerEmail: row.developer_email,
          requestedBy: row.requested_by,
          commitHash: row.commit_hash,
          source: 'database'
        }))
      ];
      
      // Apply filters to merged results
      let filteredEntries = allEntries;
      
      if (category && category !== "all") {
        filteredEntries = filteredEntries.filter(entry => entry.category === category);
      }
      
      if (status && status !== "all") {
        filteredEntries = filteredEntries.filter(entry => entry.status === status);
      }
      
      if (developer_email && developer_email !== "all") {
        filteredEntries = filteredEntries.filter(entry => entry.developerEmail === developer_email);
      }
      
      // Sort by date descending
      filteredEntries.sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime());
      
      // Apply pagination
      const totalCount = filteredEntries.length;
      const paginatedEntries = filteredEntries.slice(offset, offset + limitNum);
      
      res.json({
        changelog: paginatedEntries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
      
    } catch (error) {
      console.error("Error fetching changelog:", error);
      res.status(500).json({ message: "Failed to fetch changelog" });
    }
  });

  // PUT /api/developer/changelog/:id - update changelog entry
  app.put("/api/developer/changelog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { description, commit_hash, category, status, requested_by } = req.body;
      
      // Build update fields
      const updateFields: any[] = [];
      const updateValues: any[] = [];
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      
      if (commit_hash !== undefined) {
        updateFields.push('commit_hash = ?');
        updateValues.push(commit_hash);
      }
      
      if (category !== undefined) {
        const validCategories = ['bug_fix', 'feature', 'ui', 'database', 'api', 'deployment', 'documentation', 'maintenance', 'performance', 'testing', 'update'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({ message: "Invalid category" });
        }
        updateFields.push('category = ?');
        updateValues.push(category);
      }
      
      if (status !== undefined) {
        const validStatuses = ['deployed', 'in_progress', 'reverted', 'pending', 'deploying', 'failed', 'committed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      
      if (requested_by !== undefined) {
        updateFields.push('requested_by = ?');
        updateValues.push(requested_by);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
      
      // Update the entry
      await db.execute(sql.raw(`
        UPDATE dev_changelog 
        SET ${updateFields.join(', ').replace(/\?/g, '$')} 
        WHERE id = $${updateValues.length}
      `, updateValues));
      
      // Log this action
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'update',
        'Updated changelog entry',
        { 
          changelog_id: id,
          updated_fields: updateFields.filter(f => f !== 'updated_at = NOW()'),
          new_values: req.body
        },
        req.ip
      );
      
      res.json({ message: "Changelog entry updated successfully" });
      
    } catch (error) {
      console.error("Error updating changelog entry:", error);
      res.status(500).json({ message: "Failed to update changelog entry" });
    }
  });

  // DELETE /api/developer/changelog/:id - delete changelog entry
  app.delete("/api/developer/changelog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get entry info before deletion for logging
      const entryResult = await db.execute(sql`
        SELECT * FROM dev_changelog WHERE id = ${id}
      `);
      
      if (entryResult.rows.length === 0) {
        return res.status(404).json({ message: "Changelog entry not found" });
      }
      
      const entry = entryResult.rows[0];
      
      // Delete the entry
      await db.execute(sql`
        DELETE FROM dev_changelog WHERE id = ${id}
      `);
      
      // Log this action
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'delete',
        'Deleted changelog entry',
        { 
          deleted_entry: entry
        },
        req.ip
      );
      
      res.json({ message: "Changelog entry deleted successfully" });
      
    } catch (error) {
      console.error("Error deleting changelog entry:", error);
      res.status(500).json({ message: "Failed to delete changelog entry" });
    }
  });

  // DEBUG: Test GitHub commit fetch
  app.get("/api/developer/debug/github", async (req, res) => {
    try {
      const commits = await fetchGitHubCommits();
      res.json({
        success: true,
        count: commits.length,
        has_token: !!process.env.GITHUB_TOKEN,
        first_few: commits.slice(0, 3),
        all_commits: commits
      });
    } catch (error) {
      res.json({
        success: false,
        error: error.message,
        has_token: !!process.env.GITHUB_TOKEN
      });
    }
  });
}

export function registerDeveloperRoutes(app: Express) {
  console.log('[Developer Routes] Registering developer dashboard routes...');
  console.log(`[Developer Routes] GITHUB_TOKEN environment variable: ${process.env.GITHUB_TOKEN ? 'PRESENT' : 'MISSING'}`);
  setupDeveloperRoutes(app);
}