import { Router } from "express";
import { db } from "./db";
import { testimonials, reviewSources, agentDirectoryProfiles, communities } from "@shared/schema";
import { eq, and, desc, asc, or, like, sql, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────────
const createTestimonialSchema = z.object({
  reviewerName: z.string().min(1, "Reviewer name is required"),
  reviewerLocation: z.string().optional(),
  reviewText: z.string().min(10, "Review text must be at least 10 characters"),
  rating: z.number().int().min(1).max(5),
  source: z.enum(['google', 'zillow', 'facebook', 'manual']).default('manual'),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  agentId: z.string().optional().or(z.literal("")),
  communitySlug: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  isApproved: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

const updateTestimonialSchema = createTestimonialSchema.partial();

const createReviewSourceSchema = z.object({
  platform: z.enum(['google', 'zillow', 'facebook']),
  placeId: z.string().optional(),
  apiKey: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ── Public API Routes ───────────────────────────────────────────────────────────

// GET /api/testimonials - Public route for approved testimonials
router.get('/api/testimonials', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;
    
    const agentId = req.query.agentId as string;
    const communitySlug = req.query.communitySlug as string;
    const source = req.query.source as string;
    const minRating = parseInt(req.query.minRating as string) || 1;
    const featuredOnly = req.query.featured === 'true';

    // Build where conditions
    const conditions = [eq(testimonials.isApproved, true)];
    
    if (agentId) conditions.push(eq(testimonials.agentId, agentId));
    if (communitySlug) conditions.push(eq(testimonials.communitySlug, communitySlug));
    if (source) conditions.push(eq(testimonials.source, source));
    if (minRating > 1) conditions.push(sql`${testimonials.rating} >= ${minRating}`);
    if (featuredOnly) conditions.push(eq(testimonials.isFeatured, true));

    const whereClause = and(...conditions);

    // Get testimonials with pagination
    const results = await db
      .select()
      .from(testimonials)
      .where(whereClause)
      .orderBy(desc(testimonials.isFeatured), asc(testimonials.displayOrder), desc(testimonials.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(testimonials)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      testimonials: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching public testimonials:', error);
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
});

// ── Admin API Routes (require authentication) ──────────────────────────────────

// GET /api/admin/testimonials - List all testimonials with filters
router.get('/api/admin/testimonials', isAuthenticated, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    
    const search = req.query.search as string;
    const source = req.query.source as string;
    const status = req.query.status as string; // approved, pending, all
    const rating = req.query.rating as string;
    const agentId = req.query.agentId as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build where conditions
    const conditions: any[] = [];
    
    if (search) {
      conditions.push(
        or(
          like(testimonials.reviewerName, `%${search}%`),
          like(testimonials.reviewerLocation, `%${search}%`),
          like(testimonials.reviewText, `%${search}%`)
        )
      );
    }
    
    if (source && source !== 'all') {
      conditions.push(eq(testimonials.source, source));
    }
    
    if (status === 'approved') {
      conditions.push(eq(testimonials.isApproved, true));
    } else if (status === 'pending') {
      conditions.push(eq(testimonials.isApproved, false));
    }
    
    if (rating && rating !== 'all') {
      conditions.push(eq(testimonials.rating, parseInt(rating)));
    }
    
    if (agentId && agentId !== 'all') {
      conditions.push(eq(testimonials.agentId, agentId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column and order
    let orderBy;
    const isDesc = sortOrder === 'desc';
    
    switch (sortBy) {
      case 'reviewerName':
        orderBy = isDesc ? desc(testimonials.reviewerName) : asc(testimonials.reviewerName);
        break;
      case 'rating':
        orderBy = isDesc ? desc(testimonials.rating) : asc(testimonials.rating);
        break;
      case 'source':
        orderBy = isDesc ? desc(testimonials.source) : asc(testimonials.source);
        break;
      case 'isApproved':
        orderBy = isDesc ? desc(testimonials.isApproved) : asc(testimonials.isApproved);
        break;
      case 'updatedAt':
        orderBy = isDesc ? desc(testimonials.updatedAt) : asc(testimonials.updatedAt);
        break;
      default:
        orderBy = isDesc ? desc(testimonials.createdAt) : asc(testimonials.createdAt);
    }

    // Get testimonials with pagination
    const results = await db
      .select({
        id: testimonials.id,
        reviewerName: testimonials.reviewerName,
        reviewerLocation: testimonials.reviewerLocation,
        reviewText: testimonials.reviewText,
        rating: testimonials.rating,
        source: testimonials.source,
        sourceUrl: testimonials.sourceUrl,
        agentId: testimonials.agentId,
        communitySlug: testimonials.communitySlug,
        photoUrl: testimonials.photoUrl,
        isApproved: testimonials.isApproved,
        isFeatured: testimonials.isFeatured,
        displayOrder: testimonials.displayOrder,
        createdAt: testimonials.createdAt,
        updatedAt: testimonials.updatedAt,
      })
      .from(testimonials)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(testimonials)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      testimonials: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching admin testimonials:', error);
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
});

// GET /api/admin/testimonials/:id - Get single testimonial
router.get('/api/admin/testimonials/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({ message: 'Failed to fetch testimonial' });
  }
});

// POST /api/admin/testimonials - Create new testimonial
router.post('/api/admin/testimonials', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createTestimonialSchema.parse(req.body);
    
    const result = await db
      .insert(testimonials)
      .values({
        ...validatedData,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating testimonial:', error);
    res.status(500).json({ message: 'Failed to create testimonial' });
  }
});

// PUT /api/admin/testimonials/:id - Update testimonial
router.put('/api/admin/testimonials/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateTestimonialSchema.parse(req.body);
    
    const result = await db
      .update(testimonials)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(testimonials.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating testimonial:', error);
    res.status(500).json({ message: 'Failed to update testimonial' });
  }
});

// DELETE /api/admin/testimonials/:id - Delete testimonial
router.delete('/api/admin/testimonials/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ message: 'Failed to delete testimonial' });
  }
});

// POST /api/admin/testimonials/bulk-approve - Bulk approve testimonials
router.post('/api/admin/testimonials/bulk-approve', isAuthenticated, async (req, res) => {
  try {
    const { ids, approved = true } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    const result = await db
      .update(testimonials)
      .set({
        isApproved: approved,
        updatedAt: new Date(),
      })
      .where(sql`${testimonials.id} = ANY(${ids})`)
      .returning();

    res.json({
      message: `${result.length} testimonials ${approved ? 'approved' : 'unapproved'} successfully`,
      updated: result.length,
    });
  } catch (error) {
    console.error('Error bulk approving testimonials:', error);
    res.status(500).json({ message: 'Failed to bulk approve testimonials' });
  }
});

// POST /api/admin/testimonials/bulk-feature - Bulk feature testimonials
router.post('/api/admin/testimonials/bulk-feature', isAuthenticated, async (req, res) => {
  try {
    const { ids, featured = true } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    const result = await db
      .update(testimonials)
      .set({
        isFeatured: featured,
        updatedAt: new Date(),
      })
      .where(sql`${testimonials.id} = ANY(${ids})`)
      .returning();

    res.json({
      message: `${result.length} testimonials ${featured ? 'featured' : 'unfeatured'} successfully`,
      updated: result.length,
    });
  } catch (error) {
    console.error('Error bulk featuring testimonials:', error);
    res.status(500).json({ message: 'Failed to bulk feature testimonials' });
  }
});

// ── Review Sources Routes ───────────────────────────────────────────────────────

// GET /api/admin/review-sources - List review sources
router.get('/api/admin/review-sources', isAuthenticated, async (req, res) => {
  try {
    const results = await db
      .select()
      .from(reviewSources)
      .orderBy(asc(reviewSources.platform));

    res.json({ sources: results });
  } catch (error) {
    console.error('Error fetching review sources:', error);
    res.status(500).json({ message: 'Failed to fetch review sources' });
  }
});

// POST /api/admin/review-sources - Create review source
router.post('/api/admin/review-sources', isAuthenticated, async (req, res) => {
  try {
    const validatedData = createReviewSourceSchema.parse(req.body);
    
    const result = await db
      .insert(reviewSources)
      .values(validatedData)
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error creating review source:', error);
    res.status(500).json({ message: 'Failed to create review source' });
  }
});

// PUT /api/admin/review-sources/:id - Update review source
router.put('/api/admin/review-sources/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createReviewSourceSchema.partial().parse(req.body);
    
    const result = await db
      .update(reviewSources)
      .set(validatedData)
      .where(eq(reviewSources.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: 'Review source not found' });
    }

    res.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Error updating review source:', error);
    res.status(500).json({ message: 'Failed to update review source' });
  }
});

// DELETE /api/admin/review-sources/:id - Delete review source
router.delete('/api/admin/review-sources/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db
      .delete(reviewSources)
      .where(eq(reviewSources.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: 'Review source not found' });
    }

    res.json({ message: 'Review source deleted successfully' });
  } catch (error) {
    console.error('Error deleting review source:', error);
    res.status(500).json({ message: 'Failed to delete review source' });
  }
});

// POST /api/admin/review-sources/:id/sync - Sync reviews from source
router.post('/api/admin/review-sources/:id/sync', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const sourceResult = await db
      .select()
      .from(reviewSources)
      .where(eq(reviewSources.id, id))
      .limit(1);

    if (sourceResult.length === 0) {
      return res.status(404).json({ message: 'Review source not found' });
    }

    const source = sourceResult[0];
    
    // Update last synced timestamp
    await db
      .update(reviewSources)
      .set({ lastSyncedAt: new Date() })
      .where(eq(reviewSources.id, id));

    // TODO: Implement actual sync logic for each platform
    // For now, just return success
    res.json({ 
      message: `Sync initiated for ${source.platform}`,
      platform: source.platform,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing review source:', error);
    res.status(500).json({ message: 'Failed to sync review source' });
  }
});

// ── Helper Routes for Dropdowns ─────────────────────────────────────────────────

// GET /api/admin/testimonials/options - Get dropdown options (agents, communities)
router.get('/api/admin/testimonials/options', isAuthenticated, async (req, res) => {
  try {
    const [agentsResult, communitiesResult] = await Promise.all([
      db.select({
        id: agentDirectoryProfiles.id,
        name: sql<string>`${agentDirectoryProfiles.firstName} || ' ' || ${agentDirectoryProfiles.lastName}`,
      }).from(agentDirectoryProfiles).where(eq(agentDirectoryProfiles.isVisible, true)),
      
      db.select({
        slug: communities.slug,
        name: communities.name,
      }).from(communities).where(eq(communities.published, true))
    ]);

    res.json({
      agents: agentsResult,
      communities: communitiesResult,
    });
  } catch (error) {
    console.error('Error fetching testimonial options:', error);
    res.status(500).json({ message: 'Failed to fetch options' });
  }
});

export default router;