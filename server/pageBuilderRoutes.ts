import { Router } from "express";
import { eq, desc, asc, ilike, and, or, sql } from "drizzle-orm";
import { db } from "./db";
import { landingPages, type LandingPage } from "@shared/schema";
import { z } from "zod";

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const blockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.any()),
    children: z.array(z.array(blockSchema)).optional(),
  })
);

const createPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with dashes"),
  pageType: z.string().min(1),
  content: z.string().default(" "),
  sections: z.array(blockSchema).default([]),
  metaTitle: z.string().max(255).optional().default(""),
  metaDescription: z.string().optional().default(""),
  ogImageUrl: z.string().optional().default(""),
  indexingDirective: z.string().default("index,follow"),
  customSchema: z.any().optional(),
  breadcrumbPath: z.array(z.object({ name: z.string(), url: z.string() })).optional().default([]),
  customScripts: z.string().optional().default(""),
  isPublished: z.boolean().default(false),
});

const updatePageSchema = createPageSchema.partial();

// ── SEO Score Calculator ──────────────────────────────────────────────

function calculateSeoScore(page: Partial<LandingPage>): number {
  let score = 0;
  if (page.title) score += 10;
  if (page.sections && Array.isArray(page.sections) && page.sections.length >= 2) score += 15;
  if (page.content && page.content.length >= 100) score += 10;
  if (page.metaTitle && page.metaTitle.length >= 30 && page.metaTitle.length <= 60) score += 15;
  if (page.metaDescription && page.metaDescription.length >= 120 && page.metaDescription.length <= 160) score += 15;
  if (page.customSchema) score += 5;
  if (page.ogImageUrl) score += 10;
  if (page.breadcrumbPath && Array.isArray(page.breadcrumbPath) && page.breadcrumbPath.length > 0) score += 5;
  if (page.isPublished) score += 5;
  if (page.slug) score += 10;
  return Math.min(score, 100);
}

// ── ADMIN ROUTES ─────────────────────────────────────────────────────

// GET /api/admin/pages — List all pages (paginated, filterable)
router.get("/admin/pages", async (req, res) => {
  try {
    const { search, pageType, published, sortBy = "updatedAt", order = "desc", page = "1", limit = "50" } = req.query;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(landingPages.title, `%${search}%`),
          ilike(landingPages.slug, `%${search}%`)
        )
      );
    }

    if (pageType && pageType !== "all") {
      conditions.push(eq(landingPages.pageType, pageType as string));
    }

    if (published && published !== "all") {
      conditions.push(eq(landingPages.isPublished, published === "published"));
    }

    let query = db.select().from(landingPages);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const orderFn = order === "asc" ? asc : desc;
    switch (sortBy) {
      case "title":
        query = query.orderBy(orderFn(landingPages.title)) as any;
        break;
      case "seoScore":
        query = query.orderBy(orderFn(landingPages.seoScore)) as any;
        break;
      default:
        query = query.orderBy(orderFn(landingPages.updatedAt)) as any;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    query = query.limit(limitNum).offset((pageNum - 1) * limitNum) as any;

    const pages = await query;
    res.json({ pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

// GET /api/admin/pages/:id — Get single page
router.get("/admin/pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [page] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

// POST /api/admin/pages — Create new page
router.post("/admin/pages", async (req, res) => {
  try {
    const data = createPageSchema.parse(req.body);
    const seoScore = calculateSeoScore(data as any);

    const [newPage] = await db
      .insert(landingPages)
      .values({
        ...data,
        seoScore,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ page: newPage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating page:", error);
    res.status(500).json({ error: "Failed to create page" });
  }
});

// PUT /api/admin/pages/:id — Update page
router.put("/admin/pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = updatePageSchema.parse(req.body);

    const [existing] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    if (!existing) return res.status(404).json({ error: "Page not found" });

    const merged = { ...existing, ...data };
    const seoScore = calculateSeoScore(merged);

    const [updated] = await db
      .update(landingPages)
      .set({
        ...data,
        seoScore,
        updatedAt: new Date(),
      })
      .where(eq(landingPages.id, id))
      .returning();

    res.json({ page: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating page:", error);
    res.status(500).json({ error: "Failed to update page" });
  }
});

// DELETE /api/admin/pages/:id — Delete page
router.delete("/admin/pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(landingPages).where(eq(landingPages.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Page not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ error: "Failed to delete page" });
  }
});

// POST /api/admin/pages/:id/duplicate — Duplicate a page
router.post("/admin/pages/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;
    const [original] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    if (!original) return res.status(404).json({ error: "Page not found" });

    // Generate unique slug
    let newSlug = `${original.slug}-copy`;
    let suffix = 1;
    while (true) {
      const [existing] = await db.select().from(landingPages).where(eq(landingPages.slug, newSlug));
      if (!existing) break;
      newSlug = `${original.slug}-copy-${suffix++}`;
    }

    const [duplicate] = await db
      .insert(landingPages)
      .values({
        title: `${original.title} (Copy)`,
        slug: newSlug,
        pageType: original.pageType,
        content: original.content,
        sections: original.sections,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        ogImageUrl: original.ogImageUrl,
        indexingDirective: original.indexingDirective,
        customSchema: original.customSchema,
        breadcrumbPath: original.breadcrumbPath,
        customScripts: original.customScripts,
        isPublished: false,
        seoScore: original.seoScore,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ page: duplicate });
  } catch (error) {
    console.error("Error duplicating page:", error);
    res.status(500).json({ error: "Failed to duplicate page" });
  }
});

// ── PUBLIC ROUTE ─────────────────────────────────────────────────────

// GET /api/pages/:slug — Public: Get published page by slug
router.get("/pages/:slug", async (req, res) => {
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

    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json({ page });
  } catch (error) {
    console.error("Error fetching public page:", error);
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

export default router;
