import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { seoTemplates, pageSeoSettings, internalLinks, communities } from "@shared/schema";
import { eq, ilike, and, or, sql, desc, asc, count } from "drizzle-orm";
import type { User } from "@shared/schema";
import { z } from "zod";

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

// ── Validation schemas ────────────────────────────────
const seoTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  pageType: z.enum(['community', 'blog', 'agent', 'landing']),
  titleTemplate: z.string().max(255).optional(),
  descriptionTemplate: z.string().optional(),
  schemaTemplate: z.record(z.any()).optional(),
  breadcrumbConfig: z.record(z.any()).optional(),
  defaultIndexing: z.string().max(20).default('index,follow'),
  ogImageTemplate: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
});

const pageSeoSettingsSchema = z.object({
  customTitle: z.string().max(255).optional(),
  customDescription: z.string().optional(),
  customSlug: z.string().max(255).optional(),
  featuredImageUrl: z.string().max(500).optional(),
  ogImageUrl: z.string().max(500).optional(),
  breadcrumbPath: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
  indexingDirective: z.string().max(20).default('index,follow'),
  customSchema: z.record(z.any()).optional(),
  focusKeyword: z.string().max(255).optional(),
  canonicalUrl: z.string().max(500).optional(),
});

// ── SEO Analysis helpers ──────────────────────────────
function calculateSeoScore(data: {
  title?: string;
  description?: string;
  focusKeyword?: string;
  content?: string;
  imageUrl?: string;
  slug?: string;
}): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];
  const maxScore = 100;

  // Title checks (25 points)
  if (data.title) {
    if (data.title.length >= 30 && data.title.length <= 60) {
      score += 15;
    } else if (data.title.length < 30) {
      issues.push('Title too short (recommended: 30-60 characters)');
      score += 5;
    } else if (data.title.length > 60) {
      issues.push('Title too long (recommended: 30-60 characters)');
      score += 5;
    }
    
    if (data.focusKeyword && data.title.toLowerCase().includes(data.focusKeyword.toLowerCase())) {
      score += 10;
    } else if (data.focusKeyword) {
      issues.push('Focus keyword not found in title');
    }
  } else {
    issues.push('Missing title');
  }

  // Description checks (20 points)
  if (data.description) {
    if (data.description.length >= 120 && data.description.length <= 160) {
      score += 15;
    } else if (data.description.length < 120) {
      issues.push('Meta description too short (recommended: 120-160 characters)');
      score += 5;
    } else if (data.description.length > 160) {
      issues.push('Meta description too long (recommended: 120-160 characters)');
      score += 5;
    }
    
    if (data.focusKeyword && data.description.toLowerCase().includes(data.focusKeyword.toLowerCase())) {
      score += 5;
    } else if (data.focusKeyword) {
      issues.push('Focus keyword not found in description');
    }
  } else {
    issues.push('Missing meta description');
  }

  // Content checks (25 points)
  if (data.content) {
    if (data.content.length >= 300) {
      score += 15;
    } else {
      issues.push('Content too short (recommended: minimum 300 characters)');
      score += 5;
    }
    
    if (data.focusKeyword) {
      const keywordCount = (data.content.toLowerCase().match(new RegExp(data.focusKeyword.toLowerCase(), 'g')) || []).length;
      const density = (keywordCount / data.content.split(' ').length) * 100;
      if (density >= 1 && density <= 3) {
        score += 10;
      } else if (density < 1) {
        issues.push('Focus keyword density too low (recommended: 1-3%)');
      } else {
        issues.push('Focus keyword density too high (recommended: 1-3%)');
      }
    }
  } else {
    issues.push('Missing content');
  }

  // Technical checks (20 points)
  if (data.imageUrl) {
    score += 10;
  } else {
    issues.push('Missing featured image');
  }

  if (data.slug) {
    if (data.slug.length <= 75) {
      score += 5;
    } else {
      issues.push('URL slug too long (recommended: under 75 characters)');
    }
    
    if (data.focusKeyword && data.slug.toLowerCase().includes(data.focusKeyword.toLowerCase().replace(/\s+/g, '-'))) {
      score += 5;
    } else if (data.focusKeyword) {
      issues.push('Focus keyword not found in URL slug');
    }
  } else {
    issues.push('Missing URL slug');
  }

  // Additional checks (10 points)
  if (data.focusKeyword) {
    score += 10;
  } else {
    issues.push('Missing focus keyword');
  }

  return { score: Math.round(score), issues };
}

function generateSchemaMarkup(pageType: string, data: any): any {
  const baseUrl = process.env.FRONTEND_URL || 'https://spyglassrealty.com';
  
  switch (pageType) {
    case 'community':
      return {
        "@context": "https://schema.org",
        "@type": "Place",
        "name": data.name,
        "description": data.description,
        "url": `${baseUrl}/communities/${data.slug}`,
        "image": data.featuredImageUrl || data.heroImage,
        "containedInPlace": {
          "@type": "AdministrativeArea",
          "name": data.county,
          "addressCountry": "US"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${baseUrl}/search?location=${encodeURIComponent(data.name)}`,
          "query-input": "required name=search"
        }
      };
    
    case 'blog':
      return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": data.title,
        "description": data.description,
        "url": `${baseUrl}/blog/${data.slug}`,
        "datePublished": data.publishedAt,
        "dateModified": data.updatedAt,
        "author": {
          "@type": "Organization",
          "name": "Spyglass Realty"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Spyglass Realty"
        },
        "image": data.featuredImageUrl
      };
    
    case 'agent':
      return {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": data.name,
        "description": data.bio,
        "url": `${baseUrl}/agents/${data.slug}`,
        "image": data.headshotUrl,
        "jobTitle": data.title,
        "worksFor": {
          "@type": "RealEstateAgency",
          "name": "Spyglass Realty"
        }
      };
    
    default:
      return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": data.title,
        "description": data.description,
        "url": `${baseUrl}${data.url || ''}`,
        "image": data.featuredImageUrl
      };
  }
}

export function registerSeoRoutes(app: Express) {
  // ── GET /api/admin/seo/templates — list SEO templates ──
  app.get("/api/admin/seo/templates", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const pageType = req.query.pageType as string;
      
      const conditions = pageType ? [eq(seoTemplates.pageType, pageType)] : [];
      
      const templates = await db
        .select()
        .from(seoTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(seoTemplates.isDefault), asc(seoTemplates.name));

      res.json({ templates });
    } catch (error) {
      console.error("[SEO] Error listing templates:", error);
      res.status(500).json({ message: "Failed to list SEO templates" });
    }
  });

  // ── POST /api/admin/seo/templates — create SEO template ──
  app.post("/api/admin/seo/templates", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const validatedData = seoTemplateSchema.parse(req.body);

      // If setting as default, unset other defaults for this page type
      if (validatedData.isDefault) {
        await db
          .update(seoTemplates)
          .set({ isDefault: false })
          .where(eq(seoTemplates.pageType, validatedData.pageType));
      }

      const [created] = await db
        .insert(seoTemplates)
        .values({
          ...validatedData,
          createdBy: user?.email || user?.id || "admin",
        })
        .returning();

      console.log(`[SEO] Created template "${validatedData.name}" for ${validatedData.pageType} by ${user?.email}`);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[SEO] Error creating template:", error);
      res.status(500).json({ message: "Failed to create SEO template" });
    }
  });

  // ── PUT /api/admin/seo/templates/:id — update SEO template ──
  app.put("/api/admin/seo/templates/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;
      const validatedData = seoTemplateSchema.partial().parse(req.body);

      // If setting as default, unset other defaults for this page type
      if (validatedData.isDefault && validatedData.pageType) {
        await db
          .update(seoTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(seoTemplates.pageType, validatedData.pageType),
            sql`${seoTemplates.id} != ${id}`
          ));
      }

      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(seoTemplates)
        .set(updateData)
        .where(eq(seoTemplates.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "SEO template not found" });
      }

      console.log(`[SEO] Updated template ${id} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[SEO] Error updating template:", error);
      res.status(500).json({ message: "Failed to update SEO template" });
    }
  });

  // ── DELETE /api/admin/seo/templates/:id — delete SEO template ──
  app.delete("/api/admin/seo/templates/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;

      const [deleted] = await db
        .delete(seoTemplates)
        .where(eq(seoTemplates.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "SEO template not found" });
      }

      console.log(`[SEO] Deleted template ${id} by ${user?.email}`);
      res.json({ message: "SEO template deleted", template: deleted });
    } catch (error) {
      console.error("[SEO] Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete SEO template" });
    }
  });

  // ── GET /api/admin/seo/analyze — analyze page SEO ──
  app.post("/api/admin/seo/analyze", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { pageType, pageData } = req.body;

      const analysis = calculateSeoScore({
        title: pageData.title || pageData.metaTitle,
        description: pageData.description || pageData.metaDescription,
        focusKeyword: pageData.focusKeyword,
        content: pageData.content || pageData.description,
        imageUrl: pageData.featuredImageUrl || pageData.heroImage,
        slug: pageData.slug || pageData.customSlug,
      });

      const schema = generateSchemaMarkup(pageType, pageData);

      res.json({
        seoScore: analysis.score,
        issues: analysis.issues,
        schema,
        recommendations: analysis.issues.length === 0 ? ['SEO looks good!'] : analysis.issues,
      });
    } catch (error) {
      console.error("[SEO] Error analyzing page:", error);
      res.status(500).json({ message: "Failed to analyze page SEO" });
    }
  });

  // ── GET /api/admin/seo/page-settings/:pageType/:pageId — get page SEO settings ──
  app.get("/api/admin/seo/page-settings/:pageType/:pageId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { pageType, pageId } = req.params;

      const [settings] = await db
        .select()
        .from(pageSeoSettings)
        .where(and(
          eq(pageSeoSettings.pageType, pageType),
          eq(pageSeoSettings.pageIdentifier, pageId)
        ))
        .limit(1);

      if (!settings) {
        return res.status(404).json({ message: "Page SEO settings not found" });
      }

      res.json(settings);
    } catch (error) {
      console.error("[SEO] Error getting page settings:", error);
      res.status(500).json({ message: "Failed to get page SEO settings" });
    }
  });

  // ── PUT /api/admin/seo/page-settings/:pageType/:pageId — upsert page SEO settings ──
  app.put("/api/admin/seo/page-settings/:pageType/:pageId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { pageType, pageId } = req.params;
      const user = req.dbUser;
      const validatedData = pageSeoSettingsSchema.parse(req.body);

      // Calculate SEO score if we have enough data
      const analysis = calculateSeoScore({
        title: validatedData.customTitle,
        description: validatedData.customDescription,
        focusKeyword: validatedData.focusKeyword,
        imageUrl: validatedData.featuredImageUrl,
        slug: validatedData.customSlug,
      });

      const upsertData = {
        pageType,
        pageIdentifier: pageId,
        ...validatedData,
        seoScore: analysis.score,
        seoIssues: analysis.issues,
        updatedAt: new Date(),
        createdBy: user?.email || user?.id || "admin",
      };

      // Use ON CONFLICT to upsert
      const [upserted] = await db
        .insert(pageSeoSettings)
        .values(upsertData)
        .onConflictDoUpdate({
          target: [pageSeoSettings.pageType, pageSeoSettings.pageIdentifier],
          set: {
            customTitle: sql`excluded.custom_title`,
            customDescription: sql`excluded.custom_description`,
            customSlug: sql`excluded.custom_slug`,
            featuredImageUrl: sql`excluded.featured_image_url`,
            ogImageUrl: sql`excluded.og_image_url`,
            breadcrumbPath: sql`excluded.breadcrumb_path`,
            indexingDirective: sql`excluded.indexing_directive`,
            customSchema: sql`excluded.custom_schema`,
            focusKeyword: sql`excluded.focus_keyword`,
            seoScore: sql`excluded.seo_score`,
            seoIssues: sql`excluded.seo_issues`,
            canonicalUrl: sql`excluded.canonical_url`,
            updatedAt: sql`excluded.updated_at`,
          },
        })
        .returning();

      console.log(`[SEO] Updated page settings for ${pageType}:${pageId} by ${user?.email}`);
      res.json(upserted);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[SEO] Error updating page settings:", error);
      res.status(500).json({ message: "Failed to update page SEO settings" });
    }
  });

  // ── GET /api/admin/seo/internal-links/:pageType/:pageId — get internal links for page ──
  app.get("/api/admin/seo/internal-links/:pageType/:pageId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { pageType, pageId } = req.params;

      const [outgoingLinks, incomingLinks] = await Promise.all([
        // Links from this page to other pages
        db.select()
          .from(internalLinks)
          .where(and(
            eq(internalLinks.sourcePageType, pageType),
            eq(internalLinks.sourcePageId, pageId),
            eq(internalLinks.isActive, true)
          )),
        
        // Links from other pages to this page
        db.select()
          .from(internalLinks)
          .where(and(
            eq(internalLinks.targetPageType, pageType),
            eq(internalLinks.targetPageId, pageId),
            eq(internalLinks.isActive, true)
          ))
      ]);

      res.json({
        outgoing: outgoingLinks,
        incoming: incomingLinks,
        outgoingCount: outgoingLinks.length,
        incomingCount: incomingLinks.length,
      });
    } catch (error) {
      console.error("[SEO] Error getting internal links:", error);
      res.status(500).json({ message: "Failed to get internal links" });
    }
  });

  // ── GET /api/admin/seo/link-suggestions/:pageType/:pageId — get internal link suggestions ──
  app.get("/api/admin/seo/link-suggestions/:pageType/:pageId", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { pageType, pageId } = req.params;

      // For communities, suggest other communities in same county or nearby
      if (pageType === 'community') {
        const [currentCommunity] = await db
          .select()
          .from(communities)
          .where(eq(communities.slug, pageId))
          .limit(1);

        if (currentCommunity) {
          const suggestions = await db
            .select({
              pageType: sql`'community'::text`.as('pageType'),
              pageId: communities.slug,
              title: communities.name,
              description: sql`COALESCE(${communities.description}, ${communities.metaDescription})`.as('description'),
              url: sql`'/communities/' || ${communities.slug}`.as('url'),
            })
            .from(communities)
            .where(and(
              eq(communities.published, true),
              sql`${communities.slug} != ${pageId}`,
              currentCommunity.county ? eq(communities.county, currentCommunity.county) : sql`true`
            ))
            .limit(10);

          res.json({ suggestions });
        } else {
          res.json({ suggestions: [] });
        }
      } else {
        // For other page types, we could add more sophisticated suggestions
        res.json({ suggestions: [] });
      }
    } catch (error) {
      console.error("[SEO] Error getting link suggestions:", error);
      res.status(500).json({ message: "Failed to get link suggestions" });
    }
  });

  // ── GET /api/seo/schema/:pageType/:pageId — public schema markup endpoint ──
  app.get("/api/seo/schema/:pageType/:pageId", async (req: any, res) => {
    try {
      const { pageType, pageId } = req.params;

      let schema = null;

      if (pageType === 'community') {
        const [community] = await db
          .select()
          .from(communities)
          .where(and(
            eq(communities.slug, pageId),
            eq(communities.published, true)
          ))
          .limit(1);

        if (community) {
          schema = generateSchemaMarkup('community', community);
        }
      }

      if (!schema) {
        return res.status(404).json({ message: "Schema not found" });
      }

      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.json(schema);
    } catch (error) {
      console.error("[SEO] Error getting schema:", error);
      res.status(500).json({ message: "Failed to get schema markup" });
    }
  });
}