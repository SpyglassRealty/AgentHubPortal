import { Router } from "express";
import { eq, desc, asc, ilike, and, or, sql } from "drizzle-orm";
import { db } from "./storage";
import { 
  landingPages,
  type LandingPage,
  type InsertLandingPage
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const pageTypeOptions = [
  'buy', 'sell', 'cash-offer', 'trade-in', 'relocation', 
  'join-team', 'join-real', 'about', 'newsroom', 'faq', 'custom'
] as const;

const sectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  content: z.string(),
  imageUrl: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  order: z.number().int(),
});

const createLandingPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with dashes"),
  pageType: z.enum(pageTypeOptions),
  content: z.string().min(1, "Content is required"),
  sections: z.array(sectionSchema).default([]),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
  indexingDirective: z.string().default('index,follow'),
  customSchema: z.record(z.any()).optional(),
  breadcrumbPath: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
  customScripts: z.string().optional(),
  isPublished: z.boolean().default(false),
});

const updateLandingPageSchema = createLandingPageSchema.partial().extend({
  id: z.string(),
});

// ── Utility Functions ────────────────────────────────────────────────────

function calculateSeoScore(page: Partial<LandingPage>): number {
  let score = 0;
  const maxScore = 100;
  
  // Basic content (40 points)
  if (page.title) score += 10;
  if (page.content && page.content.length >= 300) score += 15;
  if (page.sections && page.sections.length >= 3) score += 15;
  
  // SEO fields (35 points)
  if (page.metaTitle && page.metaTitle.length >= 30 && page.metaTitle.length <= 60) score += 15;
  if (page.metaDescription && page.metaDescription.length >= 120 && page.metaDescription.length <= 160) score += 15;
  if (page.customSchema) score += 5;
  
  // Additional elements (25 points)
  if (page.ogImageUrl) score += 10;
  if (page.breadcrumbPath && page.breadcrumbPath.length > 0) score += 5;
  if (page.customScripts) score += 5;
  if (page.isPublished) score += 5;
  
  return Math.min(score, maxScore);
}

function generateBreadcrumbs(pageType: string, title: string): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' }
  ];
  
  // Add category-based breadcrumbs
  if (['buy', 'sell', 'cash-offer', 'trade-in'].includes(pageType)) {
    breadcrumbs.push({ name: 'Services', url: '/services' });
  } else if (['join-team', 'join-real'].includes(pageType)) {
    breadcrumbs.push({ name: 'Careers', url: '/careers' });
  } else if (['about', 'newsroom'].includes(pageType)) {
    breadcrumbs.push({ name: 'Company', url: '/company' });
  }
  
  breadcrumbs.push({ name: title, url: '' }); // Current page
  
  return breadcrumbs;
}

// ── ADMIN ROUTES: Landing Pages ───────────────────────────────────────────

// GET /api/admin/landing-pages - List all landing pages (with filters)
router.get("/admin/landing-pages", async (req, res) => {
  try {
    const { search, pageType, published, sortBy = 'updatedAt', order = 'desc' } = req.query;
    
    let query = db
      .select()
      .from(landingPages);

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(landingPages.title, `%${search}%`),
          ilike(landingPages.content, `%${search}%`),
          ilike(landingPages.slug, `%${search}%`)
        )
      );
    }
    
    if (pageType && pageType !== 'all') {
      conditions.push(eq(landingPages.pageType, pageType as string));
    }
    
    if (published && published !== 'all') {
      const isPublished = published === 'published';
      conditions.push(eq(landingPages.isPublished, isPublished));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderDirection = order === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'title':
        query = query.orderBy(orderDirection(landingPages.title));
        break;
      case 'pageType':
        query = query.orderBy(orderDirection(landingPages.pageType));
        break;
      case 'seoScore':
        query = query.orderBy(orderDirection(landingPages.seoScore));
        break;
      default:
        query = query.orderBy(orderDirection(landingPages.updatedAt));
    }

    const pages = await query;
    
    res.json({ pages });
  } catch (error) {
    console.error("Error fetching landing pages:", error);
    res.status(500).json({ error: "Failed to fetch landing pages" });
  }
});

// GET /api/admin/landing-pages/:id - Get single landing page
router.get("/admin/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [page] = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.id, id));

    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    res.json({ page });
  } catch (error) {
    console.error("Error fetching landing page:", error);
    res.status(500).json({ error: "Failed to fetch landing page" });
  }
});

// GET /api/admin/landing-pages/slug/:slug - Get single landing page by slug
router.get("/admin/landing-pages/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [page] = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.slug, slug));

    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    res.json({ page });
  } catch (error) {
    console.error("Error fetching landing page:", error);
    res.status(500).json({ error: "Failed to fetch landing page" });
  }
});

// POST /api/admin/landing-pages - Create new landing page
router.post("/admin/landing-pages", async (req, res) => {
  try {
    const validatedData = createLandingPageSchema.parse(req.body);
    
    // Auto-generate breadcrumbs if not provided
    if (!validatedData.breadcrumbPath) {
      validatedData.breadcrumbPath = generateBreadcrumbs(validatedData.pageType, validatedData.title);
    }
    
    // Calculate SEO score
    const seoScore = calculateSeoScore(validatedData);
    
    const [newPage] = await db
      .insert(landingPages)
      .values({
        ...validatedData,
        seoScore,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ page: newPage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating landing page:", error);
    res.status(500).json({ error: "Failed to create landing page" });
  }
});

// PUT /api/admin/landing-pages/:id - Update landing page
router.put("/admin/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateLandingPageSchema.parse({ ...req.body, id });
    
    // Check if page exists
    const [existingPage] = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.id, id));

    if (!existingPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    // Calculate updated SEO score
    const mergedData = { ...existingPage, ...validatedData };
    const seoScore = calculateSeoScore(mergedData);

    const [updatedPage] = await db
      .update(landingPages)
      .set({
        ...validatedData,
        seoScore,
        updatedAt: new Date(),
      })
      .where(eq(landingPages.id, id))
      .returning();

    res.json({ page: updatedPage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating landing page:", error);
    res.status(500).json({ error: "Failed to update landing page" });
  }
});

// DELETE /api/admin/landing-pages/:id - Delete landing page
router.delete("/admin/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedPage] = await db
      .delete(landingPages)
      .where(eq(landingPages.id, id))
      .returning();

    if (!deletedPage) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting landing page:", error);
    res.status(500).json({ error: "Failed to delete landing page" });
  }
});

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────

// GET /api/landing-pages - Public landing pages (published only)
router.get("/landing-pages", async (req, res) => {
  try {
    const { pageType } = req.query;
    
    let query = db
      .select({
        id: landingPages.id,
        title: landingPages.title,
        slug: landingPages.slug,
        pageType: landingPages.pageType,
        content: landingPages.content,
        sections: landingPages.sections,
        metaTitle: landingPages.metaTitle,
        metaDescription: landingPages.metaDescription,
        ogImageUrl: landingPages.ogImageUrl,
        breadcrumbPath: landingPages.breadcrumbPath,
        customScripts: landingPages.customScripts,
        updatedAt: landingPages.updatedAt,
      })
      .from(landingPages)
      .where(eq(landingPages.isPublished, true));

    // Apply filters
    const conditions = [eq(landingPages.isPublished, true)];
    
    if (pageType && pageType !== 'all') {
      conditions.push(eq(landingPages.pageType, pageType as string));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(asc(landingPages.title));

    const pages = await query;
    
    res.json({ pages });
  } catch (error) {
    console.error("Error fetching public landing pages:", error);
    res.status(500).json({ error: "Failed to fetch landing pages" });
  }
});

// GET /api/landing-pages/:slug - Public single landing page by slug
router.get("/landing-pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [page] = await db
      .select({
        id: landingPages.id,
        title: landingPages.title,
        slug: landingPages.slug,
        pageType: landingPages.pageType,
        content: landingPages.content,
        sections: landingPages.sections,
        metaTitle: landingPages.metaTitle,
        metaDescription: landingPages.metaDescription,
        ogImageUrl: landingPages.ogImageUrl,
        indexingDirective: landingPages.indexingDirective,
        customSchema: landingPages.customSchema,
        breadcrumbPath: landingPages.breadcrumbPath,
        customScripts: landingPages.customScripts,
      })
      .from(landingPages)
      .where(and(
        eq(landingPages.slug, slug),
        eq(landingPages.isPublished, true)
      ));

    if (!page) {
      return res.status(404).json({ error: "Landing page not found" });
    }

    res.json({ page });
  } catch (error) {
    console.error("Error fetching public landing page:", error);
    res.status(500).json({ error: "Failed to fetch landing page" });
  }
});

export default router;