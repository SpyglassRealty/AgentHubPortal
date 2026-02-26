import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import type { User } from "@shared/schema";
import { users } from "@shared/schema";
import { devChangelog, developerActivityLogs } from "@shared/developerSchema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";

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
    
    if (!response.ok) return [];
    
    const commits = await response.json();
    
    return commits.map((c: any) => ({
      id: c.sha,
      description: c.commit.message,
      developerName: c.commit.author?.name || 'Unknown',
      developerEmail: c.commit.author?.email || '',
      commitHash: c.sha.substring(0, 7),
      category: 'deployment',
      status: 'deployed',
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

// Middleware: require developer access (hardcoded check)
async function requireDeveloper(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  
  // Hardcoded developer check until role migration is complete
  if (user.email !== 'daryl@spyglassrealty.com' && !user.isSuperAdmin) {
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
        SELECT id, email, first_name, last_name, is_super_admin, created_at, updated_at,
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

  // POST /api/developer/invite - add co-developer by email
  app.post("/api/developer/invite", async (req, res) => {
    try {
      const { email, makeSuperAdmin = false } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists
      const existingUserResult = await db.execute(sql`
        SELECT id, is_super_admin FROM users WHERE email = ${email}
      `);
      
      if (existingUserResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found. They must sign up first." });
      }
      
      const user = existingUserResult.rows[0];
      
      // Update super admin status if requested
      if (makeSuperAdmin) {
        await db.execute(sql`
          UPDATE users SET is_super_admin = true, updated_at = NOW() WHERE email = ${email}
        `);
      }
      
      // Log this action
      await logActivity(
        (req as any).dbUser.id, 
        (req as any).dbUser.email, 
        `${(req as any).dbUser.firstName || ''} ${(req as any).dbUser.lastName || ''}`.trim() || (req as any).dbUser.email,
        'create',
        `Invited user as co-developer${makeSuperAdmin ? ' with super admin privileges' : ''}`,
        { 
          invited_email: email,
          previous_super_admin: user.is_super_admin,
          new_super_admin: makeSuperAdmin || user.is_super_admin
        },
        req.ip
      );
      
      res.json({ message: `User successfully invited as co-developer${makeSuperAdmin ? ' with super admin privileges' : ''}` });
      
    } catch (error) {
      console.error("Error inviting co-developer:", error);
      res.status(500).json({ message: "Failed to invite co-developer" });
    }
  });

  // GET /api/developer/system-health - system stats and integration status
  app.get("/api/developer/system-health", async (req, res) => {
    try {
      // Get database stats
      const userCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const cmaCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM cmas`);
      const activityCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM developer_activity_logs`);
      
      // Get integration status
      const integrationsResult = await db.execute(sql`
        SELECT name, display_name, is_active, last_tested_at, last_test_result, last_test_message
        FROM integration_configs
        ORDER BY display_name
      `);
      
      // Get recent errors from activity logs
      const errorsResult = await db.execute(sql`
        SELECT created_at, description, metadata
        FROM developer_activity_logs 
        WHERE action_type = 'error' 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      // Simulate deployment info (in production, this could come from environment or git)
      const deploymentInfo = {
        last_deployed: new Date().toISOString(),
        commit_hash: process.env.COMMIT_HASH || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };
      
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
        integrations: integrationsResult.rows,
        deployment: deploymentInfo,
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
      const validCategories = ['bug_fix', 'feature', 'ui', 'database', 'api', 'deployment'];
      const validStatuses = ['deployed', 'in_progress', 'reverted', 'pending'];
      
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
        const validCategories = ['bug_fix', 'feature', 'ui', 'database', 'api', 'deployment'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({ message: "Invalid category" });
        }
        updateFields.push('category = ?');
        updateValues.push(category);
      }
      
      if (status !== undefined) {
        const validStatuses = ['deployed', 'in_progress', 'reverted', 'pending'];
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
}

export function registerDeveloperRoutes(app: Express) {
  console.log('[Developer Routes] Registering developer dashboard routes...');
  setupDeveloperRoutes(app);
}