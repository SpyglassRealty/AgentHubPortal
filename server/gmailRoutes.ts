/**
 * Gmail API Routes - Separate file to avoid conflicts with routes.ts
 * 
 * Provides:
 *   GET /api/gmail/inbox  — list inbox messages with pagination & search
 *   GET /api/gmail/message/:messageId — get full message details
 */

import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { getGmailInbox, getGmailMessage } from "./gmailClient";
import type { User } from "@shared/schema";

// Helper: get the actual database user (same pattern as routes.ts)
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  
  let user = await storage.getUser(sessionUserId);
  
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  
  return user;
}

export function registerGmailRoutes(app: Express) {
  
  // GET /api/gmail/inbox — List inbox messages
  app.get('/api/gmail/inbox', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine which email to impersonate
      let targetEmail = user.email;

      // Super admin can view another agent's email by providing agentId (user DB id)
      const requestedAgentId = req.query.agentId as string;
      if (requestedAgentId && user.isSuperAdmin) {
        const targetUser = await storage.getUser(requestedAgentId);
        if (targetUser?.email) {
          targetEmail = targetUser.email;
        } else {
          return res.status(404).json({ message: "Agent not found or has no email" });
        }
      }

      if (!targetEmail) {
        return res.json({ 
          messages: [], 
          message: "No email address linked to your account" 
        });
      }

      const maxResults = Math.min(parseInt(req.query.maxResults as string) || 20, 50);
      const pageToken = req.query.pageToken as string | undefined;
      const query = req.query.q as string | undefined;

      const result = await getGmailInbox(targetEmail, maxResults, pageToken, query);

      res.json({
        messages: result.messages,
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
      });
    } catch (error: any) {
      console.error("[Gmail Routes] Error fetching inbox:", error);
      
      // Provide helpful error messages for common issues
      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({ 
          message: "Gmail access not authorized. Domain-wide delegation may not be configured for this user's email." 
        });
      }
      if (error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Gmail service not configured" });
      }
      
      res.status(500).json({ message: "Failed to fetch inbox" });
    }
  });

  // GET /api/gmail/message/:messageId — Get full message details
  app.get('/api/gmail/message/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let targetEmail = user.email;

      const requestedAgentId = req.query.agentId as string;
      if (requestedAgentId && user.isSuperAdmin) {
        const targetUser = await storage.getUser(requestedAgentId);
        if (targetUser?.email) {
          targetEmail = targetUser.email;
        } else {
          return res.status(404).json({ message: "Agent not found or has no email" });
        }
      }

      if (!targetEmail) {
        return res.status(400).json({ message: "No email address linked to your account" });
      }

      const { messageId } = req.params;
      const message = await getGmailMessage(targetEmail, messageId);

      res.json({ message });
    } catch (error: any) {
      console.error("[Gmail Routes] Error fetching message:", error);
      
      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({ 
          message: "Gmail access not authorized for this user." 
        });
      }
      
      res.status(500).json({ message: "Failed to fetch message" });
    }
  });
}
