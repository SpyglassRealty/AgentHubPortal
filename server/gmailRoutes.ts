/**
 * Gmail API Routes - Separate file to avoid conflicts with routes.ts
 * 
 * Provides:
 *   GET /api/gmail/inbox  — list inbox messages with pagination & search
 *   GET /api/gmail/message/:messageId — get full message details
 *   POST /api/gmail/send — compose and send a new email
 *   POST /api/gmail/reply/:messageId — reply to an existing message
 */

import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { getGmailInbox, getGmailMessage, getGmailCategoryUnreadCounts, sendGmailMessage } from "./gmailClient";
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

  // GET /api/gmail/unread-counts — Get unread counts for each category
  app.get('/api/gmail/unread-counts', isAuthenticated, async (req: any, res) => {
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
        return res.json({ 
          primary: 0, 
          promotions: 0, 
          social: 0, 
          forums: 0 
        });
      }

      const counts = await getGmailCategoryUnreadCounts(targetEmail);
      res.json(counts);
    } catch (error: any) {
      console.error("[Gmail Routes] Error fetching unread counts:", error);
      
      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({ 
          message: "Gmail access not authorized for this user." 
        });
      }
      
      res.status(500).json({ message: "Failed to fetch unread counts" });
    }
  });

  // POST /api/gmail/send — Compose and send a new email
  app.post('/api/gmail/send', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine sender email (super admin can send on behalf of agents)
      let senderEmail = user.email;
      const { agentId } = req.body;
      if (agentId && user.isSuperAdmin) {
        const targetUser = await storage.getUser(agentId);
        if (targetUser?.email) {
          senderEmail = targetUser.email;
        } else {
          return res.status(404).json({ message: "Agent not found or has no email" });
        }
      }

      if (!senderEmail) {
        return res.status(400).json({ message: "No email address linked to your account" });
      }

      const { to, cc, bcc, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ message: "Missing required fields: to, subject, body" });
      }

      const messageId = await sendGmailMessage({
        userEmail: senderEmail,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        htmlBody: body,
      });

      res.json({ success: true, messageId });
    } catch (error: any) {
      console.error("[Gmail Routes] Error sending email:", error);

      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({
          message: "Gmail send access not authorized. Check domain-wide delegation scopes."
        });
      }

      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // POST /api/gmail/reply/:messageId — Reply to an existing message
  app.post('/api/gmail/reply/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getDbUser(req);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let senderEmail = user.email;
      const { agentId } = req.body;
      if (agentId && user.isSuperAdmin) {
        const targetUser = await storage.getUser(agentId);
        if (targetUser?.email) {
          senderEmail = targetUser.email;
        } else {
          return res.status(404).json({ message: "Agent not found or has no email" });
        }
      }

      if (!senderEmail) {
        return res.status(400).json({ message: "No email address linked to your account" });
      }

      const { messageId } = req.params;
      const { body, replyAll, to, cc, subject } = req.body;

      if (!body) {
        return res.status(400).json({ message: "Missing required field: body" });
      }

      // Fetch the original message to get threading info
      const originalMessage = await getGmailMessage(senderEmail, messageId);

      // Determine recipients
      let replyTo = to;
      let replyCc = cc;

      if (!replyTo) {
        // Extract sender's email from the "From" field
        const fromMatch = originalMessage.from.match(/<(.+?)>/);
        replyTo = fromMatch ? fromMatch[1] : originalMessage.from;
      }

      if (replyAll && !replyCc) {
        // Add original To and CC (minus the sender) as CC
        const allRecipients = [originalMessage.to, originalMessage.cc].filter(Boolean).join(', ');
        const recipientList = allRecipients.split(',').map(r => r.trim()).filter(r => {
          // Exclude the sender's own email from CC
          const emailMatch = r.match(/<(.+?)>/) || [null, r];
          return emailMatch[1]?.toLowerCase() !== senderEmail!.toLowerCase();
        });
        replyCc = recipientList.length > 0 ? recipientList.join(', ') : undefined;
      }

      // Build reply subject
      const replySubject = subject || (
        originalMessage.subject.startsWith('Re:')
          ? originalMessage.subject
          : `Re: ${originalMessage.subject}`
      );

      const sentMessageId = await sendGmailMessage({
        userEmail: senderEmail,
        to: replyTo,
        cc: replyCc || undefined,
        subject: replySubject,
        htmlBody: body,
        inReplyTo: originalMessage.messageIdHeader,
        references: originalMessage.references,
        threadId: originalMessage.threadId,
      });

      res.json({ success: true, messageId: sentMessageId });
    } catch (error: any) {
      console.error("[Gmail Routes] Error sending reply:", error);

      if (error.message?.includes('Not Authorized') || error.code === 403) {
        return res.status(403).json({
          message: "Gmail send access not authorized. Check domain-wide delegation scopes."
        });
      }

      res.status(500).json({ message: "Failed to send reply" });
    }
  });
}
