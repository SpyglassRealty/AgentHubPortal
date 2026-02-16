import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { cmsPages, users, insertCmsPageSchema, updateCmsPageSchema } from "@shared/schema";
import type { User } from "@shared/schema";
import { eq, and, or, desc, asc, ilike, sql, count } from "drizzle-orm";
import { storage } from "./storage";

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

// Generate a URL-friendly slug from a title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

export function registerCmsRoutes(app: Express) {
  // ============================================================
  // CMS Dashboard Stats
  // ============================================================
  app.get('/api/cms/stats', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const [totalPages] = await db
        .select({ count: count() })
        .from(cmsPages)
        .where(or(eq(cmsPages.type, 'page'), eq(cmsPages.type, 'community'), eq(cmsPages.type, 'landing')));

      const [totalBlogPosts] = await db
        .select({ count: count() })
        .from(cmsPages)
        .where(eq(cmsPages.type, 'blog'));

      const [publishedCount] = await db
        .select({ count: count() })
        .from(cmsPages)
        .where(eq(cmsPages.status, 'published'));

      const [draftCount] = await db
        .select({ count: count() })
        .from(cmsPages)
        .where(eq(cmsPages.status, 'draft'));

      const recentlyEdited = await db
        .select({
          id: cmsPages.id,
          title: cmsPages.title,
          type: cmsPages.type,
          status: cmsPages.status,
          updatedAt: cmsPages.updatedAt,
        })
        .from(cmsPages)
        .orderBy(desc(cmsPages.updatedAt))
        .limit(10);

      res.json({
        totalPages: totalPages?.count || 0,
        totalBlogPosts: totalBlogPosts?.count || 0,
        published: publishedCount?.count || 0,
        drafts: draftCount?.count || 0,
        recentlyEdited,
      });
    } catch (error: any) {
      console.error('[CMS] Stats error:', error);
      res.status(500).json({ message: "Failed to fetch CMS stats" });
    }
  });

  // ============================================================
  // List all CMS pages (with filters)
  // ============================================================
  app.get('/api/cms/pages', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { type, status, search, sort = 'updatedAt', order = 'desc' } = req.query;

      const conditions = [];
      if (type && type !== 'all') {
        conditions.push(eq(cmsPages.type, type as string));
      }
      if (status && status !== 'all') {
        conditions.push(eq(cmsPages.status, status as string));
      }
      if (search) {
        conditions.push(ilike(cmsPages.title, `%${search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Determine sort column
      let orderByClause;
      const sortOrder = order === 'asc' ? asc : desc;
      switch (sort) {
        case 'title':
          orderByClause = sortOrder(cmsPages.title);
          break;
        case 'type':
          orderByClause = sortOrder(cmsPages.type);
          break;
        case 'createdAt':
          orderByClause = sortOrder(cmsPages.createdAt);
          break;
        default:
          orderByClause = sortOrder(cmsPages.updatedAt);
      }

      const pages = await db
        .select({
          id: cmsPages.id,
          title: cmsPages.title,
          slug: cmsPages.slug,
          type: cmsPages.type,
          status: cmsPages.status,
          excerpt: cmsPages.excerpt,
          featuredImageUrl: cmsPages.featuredImageUrl,
          metaTitle: cmsPages.metaTitle,
          metaDescription: cmsPages.metaDescription,
          focusKeyword: cmsPages.focusKeyword,
          authorId: cmsPages.authorId,
          tags: cmsPages.tags,
          category: cmsPages.category,
          publishedAt: cmsPages.publishedAt,
          createdAt: cmsPages.createdAt,
          updatedAt: cmsPages.updatedAt,
        })
        .from(cmsPages)
        .where(whereClause)
        .orderBy(orderByClause);

      res.json(pages);
    } catch (error: any) {
      console.error('[CMS] List pages error:', error);
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  // ============================================================
  // Get single CMS page (with full content)
  // ============================================================
  app.get('/api/cms/pages/:id', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const [page] = await db
        .select()
        .from(cmsPages)
        .where(eq(cmsPages.id, req.params.id));

      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json(page);
    } catch (error: any) {
      console.error('[CMS] Get page error:', error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // ============================================================
  // Create new CMS page
  // ============================================================
  app.post('/api/cms/pages', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const data = insertCmsPageSchema.parse(req.body);
      const user = req.dbUser as User;

      // Auto-generate slug if not provided or empty
      let slug = data.slug || slugify(data.title);
      
      // Ensure unique slug
      const existing = await db
        .select({ id: cmsPages.id })
        .from(cmsPages)
        .where(eq(cmsPages.slug, slug));

      if (existing.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }

      const defaultContent = {
        sections: [{
          id: crypto.randomUUID(),
          columns: [{
            id: crypto.randomUUID(),
            width: 12,
            blocks: [{
              id: crypto.randomUUID(),
              type: 'heading',
              content: { text: data.title, level: 'h1' },
              style: {},
            }],
          }],
          style: {},
        }],
      };

      const [newPage] = await db
        .insert(cmsPages)
        .values({
          title: data.title,
          slug,
          type: data.type,
          status: data.status || 'draft',
          content: data.content || defaultContent,
          excerpt: data.excerpt,
          featuredImageUrl: data.featuredImageUrl,
          metaTitle: data.metaTitle || data.title,
          metaDescription: data.metaDescription,
          focusKeyword: data.focusKeyword,
          authorId: user.id,
          tags: data.tags || [],
          category: data.category,
        })
        .returning();

      res.status(201).json(newPage);
    } catch (error: any) {
      console.error('[CMS] Create page error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  // ============================================================
  // Update CMS page
  // ============================================================
  app.put('/api/cms/pages/:id', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const data = updateCmsPageSchema.parse(req.body);

      // Check if page exists
      const [existing] = await db
        .select({ id: cmsPages.id })
        .from(cmsPages)
        .where(eq(cmsPages.id, req.params.id));

      if (!existing) {
        return res.status(404).json({ message: "Page not found" });
      }

      // If slug changed, ensure uniqueness
      if (data.slug) {
        const [slugConflict] = await db
          .select({ id: cmsPages.id })
          .from(cmsPages)
          .where(and(
            eq(cmsPages.slug, data.slug),
            sql`${cmsPages.id} != ${req.params.id}`
          ));

        if (slugConflict) {
          return res.status(409).json({ message: "Slug already exists" });
        }
      }

      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(cmsPages)
        .set(updateData)
        .where(eq(cmsPages.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error('[CMS] Update page error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update page" });
    }
  });

  // ============================================================
  // Delete CMS page
  // ============================================================
  app.delete('/api/cms/pages/:id', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const [deleted] = await db
        .delete(cmsPages)
        .where(eq(cmsPages.id, req.params.id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json({ message: "Page deleted", id: deleted.id });
    } catch (error: any) {
      console.error('[CMS] Delete page error:', error);
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  // ============================================================
  // Publish / Unpublish
  // ============================================================
  app.post('/api/cms/pages/:id/publish', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const [updated] = await db
        .update(cmsPages)
        .set({
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('[CMS] Publish error:', error);
      res.status(500).json({ message: "Failed to publish page" });
    }
  });

  app.post('/api/cms/pages/:id/unpublish', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const [updated] = await db
        .update(cmsPages)
        .set({
          status: 'draft',
          updatedAt: new Date(),
        })
        .where(eq(cmsPages.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('[CMS] Unpublish error:', error);
      res.status(500).json({ message: "Failed to unpublish page" });
    }
  });

  // ============================================================
  // Bulk actions
  // ============================================================
  app.post('/api/cms/pages/bulk', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { ids, action } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No page IDs provided" });
      }

      let results;
      switch (action) {
        case 'publish':
          results = await Promise.all(
            ids.map((id: string) =>
              db.update(cmsPages)
                .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
                .where(eq(cmsPages.id, id))
                .returning()
            )
          );
          break;
        case 'unpublish':
          results = await Promise.all(
            ids.map((id: string) =>
              db.update(cmsPages)
                .set({ status: 'draft', updatedAt: new Date() })
                .where(eq(cmsPages.id, id))
                .returning()
            )
          );
          break;
        case 'delete':
          results = await Promise.all(
            ids.map((id: string) =>
              db.delete(cmsPages)
                .where(eq(cmsPages.id, id))
                .returning()
            )
          );
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      res.json({ message: `Bulk ${action} completed`, count: results.length });
    } catch (error: any) {
      console.error('[CMS] Bulk action error:', error);
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });

  // ============================================================
  // Public Blog API (for IDX site to consume)
  // ============================================================
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const { category, tag, limit: limitStr = '20', offset: offsetStr = '0' } = req.query;
      const limit = Math.min(parseInt(limitStr as string) || 20, 100);
      const offset = parseInt(offsetStr as string) || 0;

      const conditions = [
        eq(cmsPages.type, 'blog'),
        eq(cmsPages.status, 'published'),
      ];

      if (category) {
        conditions.push(eq(cmsPages.category, category as string));
      }

      const posts = await db
        .select({
          id: cmsPages.id,
          title: cmsPages.title,
          slug: cmsPages.slug,
          excerpt: cmsPages.excerpt,
          featuredImageUrl: cmsPages.featuredImageUrl,
          tags: cmsPages.tags,
          category: cmsPages.category,
          publishedAt: cmsPages.publishedAt,
          createdAt: cmsPages.createdAt,
          authorId: cmsPages.authorId,
          metaTitle: cmsPages.metaTitle,
          metaDescription: cmsPages.metaDescription,
        })
        .from(cmsPages)
        .where(and(...conditions))
        .orderBy(desc(cmsPages.publishedAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(cmsPages)
        .where(and(...conditions));

      res.json({
        posts,
        total: totalResult?.count || 0,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error('[Blog] List posts error:', error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
      const [post] = await db
        .select()
        .from(cmsPages)
        .where(and(
          eq(cmsPages.slug, req.params.slug),
          eq(cmsPages.type, 'blog'),
          eq(cmsPages.status, 'published'),
        ));

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error: any) {
      console.error('[Blog] Get post error:', error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.get('/api/blog/categories', async (_req, res) => {
    try {
      const categories = await db
        .selectDistinct({ category: cmsPages.category })
        .from(cmsPages)
        .where(and(
          eq(cmsPages.type, 'blog'),
          eq(cmsPages.status, 'published'),
          sql`${cmsPages.category} IS NOT NULL AND ${cmsPages.category} != ''`
        ));

      res.json(categories.map(c => c.category).filter(Boolean));
    } catch (error: any) {
      console.error('[Blog] Categories error:', error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ============================================================
  // Public Site Content API (for IDX site)
  // ============================================================
  app.get('/api/site-content', async (req, res) => {
    try {
      const { slug, type } = req.query;

      if (slug) {
        const [page] = await db
          .select()
          .from(cmsPages)
          .where(and(
            eq(cmsPages.slug, slug as string),
            eq(cmsPages.status, 'published'),
          ));

        if (!page) {
          return res.status(404).json({ message: "Content not found" });
        }

        return res.json(page);
      }

      const conditions = [eq(cmsPages.status, 'published')];
      if (type) {
        conditions.push(eq(cmsPages.type, type as string));
      }

      const content = await db
        .select({
          id: cmsPages.id,
          title: cmsPages.title,
          slug: cmsPages.slug,
          type: cmsPages.type,
          excerpt: cmsPages.excerpt,
          featuredImageUrl: cmsPages.featuredImageUrl,
          metaTitle: cmsPages.metaTitle,
          metaDescription: cmsPages.metaDescription,
          publishedAt: cmsPages.publishedAt,
        })
        .from(cmsPages)
        .where(and(...conditions))
        .orderBy(desc(cmsPages.publishedAt));

      res.json(content);
    } catch (error: any) {
      console.error('[SiteContent] Error:', error);
      res.status(500).json({ message: "Failed to fetch site content" });
    }
  });

  // ============================================================
  // Image upload (basic file upload to server)
  // ============================================================
  app.post('/api/cms/upload', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      // Accept base64 image in request body
      const { image, filename } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: "No image provided" });
      }

      // For now, return the base64 data URL directly
      // In production, this would upload to S3/Cloudflare R2/etc.
      res.json({ 
        url: image,
        filename: filename || 'uploaded-image',
      });
    } catch (error: any) {
      console.error('[CMS] Upload error:', error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  console.log('[CMS] CMS routes registered');
}
