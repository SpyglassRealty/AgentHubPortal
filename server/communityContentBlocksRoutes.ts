import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { communityContentBlocks, communities } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import type { User } from "@shared/schema";

// ── Helper: get DB user ──────────────────────────────
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

// ── Helper: require super admin ──────────────────────
async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

export function registerCommunityContentBlocksRoutes(app: Express) {

  // ── Get all content blocks for a community ──────────────────────────────
  app.get('/api/admin/communities/:communityId/content-blocks', requireSuperAdmin, async (req, res) => {
    try {
      const { communityId } = req.params;
      
      // Verify community exists
      const community = await db.select().from(communities).where(eq(communities.id, parseInt(communityId))).limit(1);
      if (community.length === 0) {
        return res.status(404).json({ message: 'Community not found' });
      }
      
      const blocks = await db
        .select()
        .from(communityContentBlocks)
        .where(eq(communityContentBlocks.communityId, parseInt(communityId)))
        .orderBy(asc(communityContentBlocks.sortOrder));
      
      res.json({ blocks });
    } catch (error) {
      console.error('Error fetching content blocks:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ── Create new content block ──────────────────────────────
  app.post('/api/admin/communities/:communityId/content-blocks', requireSuperAdmin, async (req, res) => {
    try {
      const { communityId } = req.params;
      const user = req.dbUser;
      
      // Verify community exists
      const community = await db.select().from(communities).where(eq(communities.id, parseInt(communityId))).limit(1);
      if (community.length === 0) {
        return res.status(404).json({ message: 'Community not found' });
      }
      
      const {
        blockType = 'split',
        title = '',
        content = '',
        imageUrl = '',
        videoUrl = '',
        ctaText = '',
        ctaUrl = '',
        imagePosition = 'right',
        backgroundColor = 'white',
        sortOrder = 0,
        published = true
      } = req.body;
      
      const newBlock = await db
        .insert(communityContentBlocks)
        .values({
          communityId: parseInt(communityId),
          blockType,
          title,
          content,
          imageUrl,
          videoUrl,
          ctaText,
          ctaUrl,
          imagePosition,
          backgroundColor,
          sortOrder,
          published,
          createdBy: user.id
        })
        .returning();
      
      res.json({ block: newBlock[0] });
    } catch (error) {
      console.error('Error creating content block:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ── Update content block ──────────────────────────────
  app.put('/api/admin/communities/:communityId/content-blocks/:blockId', requireSuperAdmin, async (req, res) => {
    try {
      const { communityId, blockId } = req.params;
      
      // Verify block exists and belongs to community
      const existingBlock = await db
        .select()
        .from(communityContentBlocks)
        .where(
          and(
            eq(communityContentBlocks.id, parseInt(blockId)),
            eq(communityContentBlocks.communityId, parseInt(communityId))
          )
        )
        .limit(1);
      
      if (existingBlock.length === 0) {
        return res.status(404).json({ message: 'Content block not found' });
      }
      
      const {
        blockType,
        title,
        content,
        imageUrl,
        videoUrl,
        ctaText,
        ctaUrl,
        imagePosition,
        backgroundColor,
        sortOrder,
        published
      } = req.body;
      
      const updateData: any = {};
      if (blockType !== undefined) updateData.blockType = blockType;
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (ctaText !== undefined) updateData.ctaText = ctaText;
      if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl;
      if (imagePosition !== undefined) updateData.imagePosition = imagePosition;
      if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (published !== undefined) updateData.published = published;
      
      const updatedBlock = await db
        .update(communityContentBlocks)
        .set(updateData)
        .where(
          and(
            eq(communityContentBlocks.id, parseInt(blockId)),
            eq(communityContentBlocks.communityId, parseInt(communityId))
          )
        )
        .returning();
      
      res.json({ block: updatedBlock[0] });
    } catch (error) {
      console.error('Error updating content block:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ── Delete content block ──────────────────────────────
  app.delete('/api/admin/communities/:communityId/content-blocks/:blockId', requireSuperAdmin, async (req, res) => {
    try {
      const { communityId, blockId } = req.params;
      
      // Verify block exists and belongs to community
      const existingBlock = await db
        .select()
        .from(communityContentBlocks)
        .where(
          and(
            eq(communityContentBlocks.id, parseInt(blockId)),
            eq(communityContentBlocks.communityId, parseInt(communityId))
          )
        )
        .limit(1);
      
      if (existingBlock.length === 0) {
        return res.status(404).json({ message: 'Content block not found' });
      }
      
      await db
        .delete(communityContentBlocks)
        .where(
          and(
            eq(communityContentBlocks.id, parseInt(blockId)),
            eq(communityContentBlocks.communityId, parseInt(communityId))
          )
        );
      
      res.json({ message: 'Content block deleted successfully' });
    } catch (error) {
      console.error('Error deleting content block:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ── Reorder content blocks ──────────────────────────────
  app.patch('/api/admin/communities/:communityId/content-blocks/reorder', requireSuperAdmin, async (req, res) => {
    try {
      const { communityId } = req.params;
      const { blockIds } = req.body; // Array of block IDs in new order
      
      if (!Array.isArray(blockIds)) {
        return res.status(400).json({ message: 'blockIds must be an array' });
      }
      
      // Update sort order for each block
      const updatePromises = blockIds.map((blockId, index) => 
        db
          .update(communityContentBlocks)
          .set({ sortOrder: index })
          .where(
            and(
              eq(communityContentBlocks.id, parseInt(blockId)),
              eq(communityContentBlocks.communityId, parseInt(communityId))
            )
          )
      );
      
      await Promise.all(updatePromises);
      
      // Return updated blocks in new order
      const updatedBlocks = await db
        .select()
        .from(communityContentBlocks)
        .where(eq(communityContentBlocks.communityId, parseInt(communityId)))
        .orderBy(asc(communityContentBlocks.sortOrder));
      
      res.json({ blocks: updatedBlocks });
    } catch (error) {
      console.error('Error reordering content blocks:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ── Get published content blocks for public community page ──────────────────────────────
  app.get('/api/public/communities/:slug/content-blocks', async (req, res) => {
    try {
      const { slug } = req.params;
      
      // Get community by slug
      const community = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
      if (community.length === 0) {
        return res.status(404).json({ message: 'Community not found' });
      }
      
      const blocks = await db
        .select()
        .from(communityContentBlocks)
        .where(
          and(
            eq(communityContentBlocks.communityId, community[0].id),
            eq(communityContentBlocks.published, true)
          )
        )
        .orderBy(asc(communityContentBlocks.sortOrder));
      
      res.json({ blocks });
    } catch (error) {
      console.error('Error fetching public content blocks:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}