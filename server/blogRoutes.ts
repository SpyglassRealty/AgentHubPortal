import { Router } from "express";
import { eq, desc, asc, ilike, inArray, and, sql, or, isNull } from "drizzle-orm";
import { db } from "./db";
import { 
  blogPosts, 
  blogCategories, 
  blogAuthors, 
  blogPostCategories,
  type BlogPost,
  type BlogCategory,
  type BlogAuthor,
  type InsertBlogPost,
  type InsertBlogCategory,
  type InsertBlogAuthor
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const createBlogPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with dashes"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  featuredImageUrl: z.string().url().optional().or(z.literal('')),
  ogImageUrl: z.string().url().optional().or(z.literal('')),
  authorId: z.string().min(1, "Author is required"),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  publishedAt: z.string().datetime().optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  indexingDirective: z.string().default('index,follow'),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  ctaConfig: z.object({
    enabled: z.boolean(),
    title: z.string().optional(),
    description: z.string().optional(),
    buttonText: z.string().optional(),
    buttonUrl: z.string().optional(),
  }).optional(),
});

const updateBlogPostSchema = createBlogPostSchema.partial().extend({
  id: z.string(),
});

const createBlogCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with dashes"),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

const createBlogAuthorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

// ── Utility Functions ────────────────────────────────────────────────────

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML
  const wordCount = textContent.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

function generateTableOfContents(content: string): Array<{ id: string; title: string; level: number }> {
  const headings: Array<{ id: string; title: string; level: number }> = [];
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    headings.push({ id, title, level });
  }

  return headings;
}

async function updateCategoryPostCounts() {
  // Update post counts for categories (helper function)
  const categories = await db.select().from(blogCategories);
  
  for (const category of categories) {
    const postsInCategory = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPostCategories)
      .innerJoin(blogPosts, eq(blogPostCategories.postId, blogPosts.id))
      .where(and(
        eq(blogPostCategories.categoryId, category.id),
        eq(blogPosts.status, 'published')
      ));
  }
}

// ── ADMIN ROUTES: Blog Posts ──────────────────────────────────────────────

// GET /api/admin/blog/posts - List all blog posts (with filters)
router.get("/admin/blog/posts", async (req, res) => {
  try {
    const { search, category, author, status, sortBy = 'updatedAt', order = 'desc' } = req.query;
    
    let query = db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        authorId: blogPosts.authorId,
        authorName: blogAuthors.name,
        categoryIds: blogPosts.categoryIds,
        tags: blogPosts.tags,
        viewCount: blogPosts.viewCount,
        readingTime: blogPosts.readingTime,
        seoScore: blogPosts.seoScore,
        seoIssues: blogPosts.seoIssues,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .leftJoin(blogAuthors, eq(blogPosts.authorId, blogAuthors.id));

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(blogPosts.title, `%${search}%`),
          ilike(blogPosts.content, `%${search}%`)
        )
      );
    }
    
    if (status && status !== 'all') {
      conditions.push(eq(blogPosts.status, status as string));
    }
    
    if (author) {
      conditions.push(eq(blogPosts.authorId, author as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderDirection = order === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'title':
        query = query.orderBy(orderDirection(blogPosts.title));
        break;
      case 'publishedAt':
        query = query.orderBy(orderDirection(blogPosts.publishedAt));
        break;
      case 'viewCount':
        query = query.orderBy(orderDirection(blogPosts.viewCount));
        break;
      case 'seoScore':
        query = query.orderBy(orderDirection(blogPosts.seoScore));
        break;
      default:
        query = query.orderBy(orderDirection(blogPosts.updatedAt));
    }

    const posts = await query;
    
    res.json({ posts });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// GET /api/admin/blog/posts/:slug - Get single blog post
router.get("/admin/blog/posts/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Get author details
    const [author] = await db
      .select()
      .from(blogAuthors)
      .where(eq(blogAuthors.id, post.authorId));

    // Get categories
    const categoryData = await db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
        slug: blogCategories.slug,
      })
      .from(blogPostCategories)
      .innerJoin(blogCategories, eq(blogPostCategories.categoryId, blogCategories.id))
      .where(eq(blogPostCategories.postId, post.id));

    res.json({ 
      post: {
        ...post,
        author,
        categories: categoryData,
      }
    });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// POST /api/admin/blog/posts - Create new blog post
router.post("/admin/blog/posts", async (req, res) => {
  try {
    const validatedData = createBlogPostSchema.parse(req.body);
    
    // Calculate reading time and table of contents
    const readingTime = calculateReadingTime(validatedData.content);
    const tableOfContents = generateTableOfContents(validatedData.content);
    
    // Convert publishedAt string to Date if provided
    let publishedAt = null;
    if (validatedData.publishedAt) {
      publishedAt = new Date(validatedData.publishedAt);
    }
    
    const [newPost] = await db
      .insert(blogPosts)
      .values({
        ...validatedData,
        publishedAt,
        readingTime,
        tableOfContents,
        updatedAt: new Date(),
      })
      .returning();

    // Handle category associations
    if (validatedData.categoryIds && validatedData.categoryIds.length > 0) {
      const categoryInserts = validatedData.categoryIds.map(categoryId => ({
        postId: newPost.id,
        categoryId,
      }));
      
      await db.insert(blogPostCategories).values(categoryInserts);
    }

    res.status(201).json({ post: newPost });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating blog post:", error);
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

// PUT /api/admin/blog/posts/:slug - Update blog post
router.put("/admin/blog/posts/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const validatedData = updateBlogPostSchema.parse({ ...req.body, slug });
    
    // Check if post exists
    const [existingPost] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug));

    if (!existingPost) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Calculate reading time and table of contents if content changed
    let updateData: any = { ...validatedData, updatedAt: new Date() };
    
    if (validatedData.content) {
      updateData.readingTime = calculateReadingTime(validatedData.content);
      updateData.tableOfContents = generateTableOfContents(validatedData.content);
    }
    
    // Convert publishedAt string to Date if provided
    if (validatedData.publishedAt) {
      updateData.publishedAt = new Date(validatedData.publishedAt);
    }

    const [updatedPost] = await db
      .update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.slug, slug))
      .returning();

    // Handle category associations update
    if (validatedData.categoryIds !== undefined) {
      // Remove existing associations
      await db
        .delete(blogPostCategories)
        .where(eq(blogPostCategories.postId, existingPost.id));
      
      // Add new associations
      if (validatedData.categoryIds.length > 0) {
        const categoryInserts = validatedData.categoryIds.map(categoryId => ({
          postId: existingPost.id,
          categoryId,
        }));
        
        await db.insert(blogPostCategories).values(categoryInserts);
      }
    }

    res.json({ post: updatedPost });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating blog post:", error);
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

// DELETE /api/admin/blog/posts/:slug - Delete blog post
router.delete("/admin/blog/posts/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [deletedPost] = await db
      .delete(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .returning();

    if (!deletedPost) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

// ── ADMIN ROUTES: Blog Categories ──────────────────────────────────────────

// GET /api/admin/blog/categories
router.get("/admin/blog/categories", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));

    // Get post counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blogPostCategories)
          .innerJoin(blogPosts, eq(blogPostCategories.postId, blogPosts.id))
          .where(and(
            eq(blogPostCategories.categoryId, category.id),
            eq(blogPosts.status, 'published')
          ));

        return { ...category, postCount: count };
      })
    );

    res.json({ categories: categoriesWithCounts });
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    res.status(500).json({ error: "Failed to fetch blog categories" });
  }
});

// POST /api/admin/blog/categories
router.post("/admin/blog/categories", async (req, res) => {
  try {
    const validatedData = createBlogCategorySchema.parse(req.body);
    
    const [newCategory] = await db
      .insert(blogCategories)
      .values(validatedData)
      .returning();

    res.status(201).json({ category: newCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating blog category:", error);
    res.status(500).json({ error: "Failed to create blog category" });
  }
});

// PUT /api/admin/blog/categories/:id
router.put("/admin/blog/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createBlogCategorySchema.partial().parse(req.body);
    
    const [updatedCategory] = await db
      .update(blogCategories)
      .set(validatedData)
      .where(eq(blogCategories.id, id))
      .returning();

    if (!updatedCategory) {
      return res.status(404).json({ error: "Blog category not found" });
    }

    res.json({ category: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating blog category:", error);
    res.status(500).json({ error: "Failed to update blog category" });
  }
});

// DELETE /api/admin/blog/categories/:id
router.delete("/admin/blog/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedCategory] = await db
      .delete(blogCategories)
      .where(eq(blogCategories.id, id))
      .returning();

    if (!deletedCategory) {
      return res.status(404).json({ error: "Blog category not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog category:", error);
    res.status(500).json({ error: "Failed to delete blog category" });
  }
});

// ── ADMIN ROUTES: Blog Authors ──────────────────────────────────────────

// GET /api/admin/blog/authors
router.get("/admin/blog/authors", async (req, res) => {
  try {
    const authors = await db
      .select()
      .from(blogAuthors)
      .orderBy(asc(blogAuthors.name));

    res.json({ authors });
  } catch (error) {
    console.error("Error fetching blog authors:", error);
    res.status(500).json({ error: "Failed to fetch blog authors" });
  }
});

// POST /api/admin/blog/authors
router.post("/admin/blog/authors", async (req, res) => {
  try {
    const validatedData = createBlogAuthorSchema.parse(req.body);
    
    const [newAuthor] = await db
      .insert(blogAuthors)
      .values(validatedData)
      .returning();

    res.status(201).json({ author: newAuthor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating blog author:", error);
    res.status(500).json({ error: "Failed to create blog author" });
  }
});

// PUT /api/admin/blog/authors/:id
router.put("/admin/blog/authors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createBlogAuthorSchema.partial().parse(req.body);
    
    const [updatedAuthor] = await db
      .update(blogAuthors)
      .set(validatedData)
      .where(eq(blogAuthors.id, id))
      .returning();

    if (!updatedAuthor) {
      return res.status(404).json({ error: "Blog author not found" });
    }

    res.json({ author: updatedAuthor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating blog author:", error);
    res.status(500).json({ error: "Failed to update blog author" });
  }
});

// DELETE /api/admin/blog/authors/:id
router.delete("/admin/blog/authors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if author has posts
    const [postCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.authorId, id));

    if (postCount.count > 0) {
      return res.status(400).json({ error: "Cannot delete author with existing posts" });
    }
    
    const [deletedAuthor] = await db
      .delete(blogAuthors)
      .where(eq(blogAuthors.id, id))
      .returning();

    if (!deletedAuthor) {
      return res.status(404).json({ error: "Blog author not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog author:", error);
    res.status(500).json({ error: "Failed to delete blog author" });
  }
});

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────

// GET /api/blog/posts - Public blog posts (published only)
router.get("/blog/posts", async (req, res) => {
  try {
    const { page = 1, limit = 10, category, author, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        featuredImageUrl: blogPosts.featuredImageUrl,
        publishedAt: blogPosts.publishedAt,
        authorId: blogPosts.authorId,
        authorName: blogAuthors.name,
        authorAvatar: blogAuthors.avatarUrl,
        tags: blogPosts.tags,
        readingTime: blogPosts.readingTime,
        viewCount: blogPosts.viewCount,
      })
      .from(blogPosts)
      .leftJoin(blogAuthors, eq(blogPosts.authorId, blogAuthors.id))
      .where(eq(blogPosts.status, 'published'));

    // Apply filters
    const conditions = [eq(blogPosts.status, 'published')];
    
    if (search) {
      conditions.push(
        or(
          ilike(blogPosts.title, `%${search}%`),
          ilike(blogPosts.content, `%${search}%`)
        )
      );
    }
    
    if (author) {
      conditions.push(eq(blogPosts.authorId, author as string));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    query = query
      .orderBy(desc(blogPosts.publishedAt))
      .limit(Number(limit))
      .offset(offset);

    const posts = await query;
    
    res.json({ posts });
  } catch (error) {
    console.error("Error fetching public blog posts:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// GET /api/blog/posts/:slug - Public single blog post
router.get("/blog/posts/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, 'published')
      ));

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    // Increment view count
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, post.id));

    // Get author details
    const [author] = await db
      .select()
      .from(blogAuthors)
      .where(eq(blogAuthors.id, post.authorId));

    // Get categories
    const categoryData = await db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
        slug: blogCategories.slug,
      })
      .from(blogPostCategories)
      .innerJoin(blogCategories, eq(blogPostCategories.categoryId, blogCategories.id))
      .where(eq(blogPostCategories.postId, post.id));

    res.json({ 
      post: {
        ...post,
        viewCount: post.viewCount + 1, // Return updated count
        author,
        categories: categoryData,
      }
    });
  } catch (error) {
    console.error("Error fetching public blog post:", error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// GET /api/blog/categories - Public categories
router.get("/blog/categories", async (req, res) => {
  try {
    const categories = await db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
        slug: blogCategories.slug,
        description: blogCategories.description,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));

    res.json({ categories });
  } catch (error) {
    console.error("Error fetching public blog categories:", error);
    res.status(500).json({ error: "Failed to fetch blog categories" });
  }
});

// ── IMPORT: Google Sheets Blog Import ──────────────────────────────────────

// POST /api/admin/blog/import-sheet - Import blogs from Google Sheets
router.post("/admin/blog/import-sheet", async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return res.status(400).json({ error: "sheetUrl is required" });
    }

    // Extract spreadsheet ID from URL
    const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({ error: "Invalid Google Sheets URL" });
    }
    const spreadsheetId = sheetIdMatch[1];

    // Download as XLSX
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    const xlsxResponse = await fetch(xlsxUrl);
    if (!xlsxResponse.ok) {
      return res.status(400).json({ error: "Failed to download spreadsheet. Make sure it's publicly shared." });
    }
    const xlsxBuffer = Buffer.from(await xlsxResponse.arrayBuffer());

    // Parse XLSX
    const XLSX = require('xlsx');
    const workbook = XLSX.read(xlsxBuffer, { cellFormula: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Helper: extract URL from HYPERLINK formula
    function extractHyperlink(cell: any): string | null {
      if (!cell) return null;
      if (cell.l?.Target) return cell.l.Target;
      if (cell.f) {
        const match = cell.f.match(/HYPERLINK\("([^"]+)"/);
        if (match) return match[1];
      }
      return null;
    }

    // Helper: convert Google Drive view URL to direct URL
    function driveToDirectUrl(url: string | null): string | null {
      if (!url) return null;
      // https://drive.google.com/file/d/FILE_ID/view -> direct URL
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
      }
      return url;
    }

    // Helper: parse date like "January 29th, 2026"
    function parsePublishedDate(dateStr: string | null): Date | null {
      if (!dateStr) return null;
      // Strip ordinal suffixes
      const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
      const parsed = new Date(cleaned);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Helper: extract Google Doc ID from URL
    function extractDocId(url: string | null): string | null {
      if (!url) return null;
      const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }

    // Get or create default author "Spyglass Realty"
    let [defaultAuthor] = await db
      .select()
      .from(blogAuthors)
      .where(eq(blogAuthors.name, 'Spyglass Realty'));

    if (!defaultAuthor) {
      [defaultAuthor] = await db
        .insert(blogAuthors)
        .values({ name: 'Spyglass Realty' })
        .returning();
    }

    const results: { imported: number; failed: Array<{ title: string; error: string }> } = {
      imported: 0,
      failed: [],
    };

    // Process each data row (skip header row 0)
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const titleCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      const slugCell = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
      const docCell = sheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
      const heroCell = sheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
      const ogCell = sheet[XLSX.utils.encode_cell({ r: row, c: 4 })];
      const photosCell = sheet[XLSX.utils.encode_cell({ r: row, c: 5 })];
      const dateCell = sheet[XLSX.utils.encode_cell({ r: row, c: 6 })];

      const title = titleCell?.v?.toString()?.trim();
      if (!title) continue; // Skip empty rows

      let rawSlug = slugCell?.v?.toString()?.trim() || '';
      // Strip .html extension
      rawSlug = rawSlug.replace(/\.html?$/i, '');
      // Clean slug
      const slug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!slug) {
        results.failed.push({ title, error: 'Invalid or missing slug' });
        continue;
      }

      try {
        // Check if slug already exists
        const [existing] = await db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, slug));

        if (existing) {
          results.failed.push({ title, error: `Slug "${slug}" already exists` });
          continue;
        }

        // Extract URLs from HYPERLINK formulas
        const docUrl = extractHyperlink(docCell);
        const heroImageUrl = driveToDirectUrl(extractHyperlink(heroCell));
        const ogImageUrl = driveToDirectUrl(extractHyperlink(ogCell));
        const datePublished = parsePublishedDate(dateCell?.v?.toString());

        // Fetch and parse Google Doc content
        let content = '';
        let excerpt = '';
        let metaTitle = title;
        let metaDescription = '';

        const docId = extractDocId(docUrl);
        if (docId) {
          try {
            const docHtmlUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
            const docResponse = await fetch(docHtmlUrl);
            if (docResponse.ok) {
              const docHtml = await docResponse.text();

              // Extract title from <title> tag
              const titleMatch = docHtml.match(/<title[^>]*>(.*?)<\/title>/is);
              if (titleMatch) {
                metaTitle = titleMatch[1].replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n))).trim();
              }

              // Extract meta description
              const metaMatch = docHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/is);
              if (metaMatch) {
                metaDescription = metaMatch[1]
                  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .trim();
                excerpt = metaDescription;
              }

              // Extract body content - Google Docs export wraps in <body>
              const bodyMatch = docHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
              if (bodyMatch) {
                let bodyContent = bodyMatch[1];

                // Google Docs exports have styled content - clean it up
                // Remove Google Docs style tags
                bodyContent = bodyContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

                // Check if the body contains raw HTML source code (paragraphs containing HTML tags as text)
                // This is the case when the Google Doc stores HTML code as text content
                const paragraphs = bodyContent.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
                let decodedContent = '';

                // Check first paragraph for HTML-encoded content
                const firstP = paragraphs[0] || '';
                const hasEncodedHtml = firstP.includes('&lt;') || firstP.includes('&amp;lt;');

                if (hasEncodedHtml) {
                  // The doc contains HTML source as text - decode it
                  for (const p of paragraphs) {
                    let text = p.replace(/<\/?p[^>]*>/gi, '').replace(/<\/?span[^>]*>/gi, '');
                    // Decode HTML entities
                    text = text
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
                    decodedContent += text + '\n';
                  }

                  // Extract <article> content from decoded HTML
                  const articleMatch = decodedContent.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
                  if (articleMatch) {
                    content = articleMatch[1].trim();
                  } else {
                    // No article tag, use everything after any meta tags
                    content = decodedContent
                      .replace(/<title[^>]*>.*?<\/title>/gi, '')
                      .replace(/<meta[^>]*>/gi, '')
                      .trim();
                  }

                  // Re-extract title and description from decoded content
                  const decodedTitleMatch = decodedContent.match(/<title[^>]*>(.*?)<\/title>/is);
                  if (decodedTitleMatch) metaTitle = decodedTitleMatch[1].trim();

                  const decodedMetaMatch = decodedContent.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/is);
                  if (decodedMetaMatch) {
                    metaDescription = decodedMetaMatch[1].trim();
                    excerpt = metaDescription;
                  }
                } else {
                  // The doc contains actual formatted content (not source code)
                  content = bodyContent.trim();
                }
              }
            } else {
              results.failed.push({ title, error: `Failed to fetch Google Doc (HTTP ${docResponse.status}). Is it publicly shared?` });
              continue;
            }
          } catch (docError: any) {
            results.failed.push({ title, error: `Error fetching Google Doc: ${docError.message}` });
            continue;
          }
        }

        if (!content) {
          results.failed.push({ title, error: 'No content could be extracted from Google Doc' });
          continue;
        }

        // Calculate reading time
        const textContent = content.replace(/<[^>]*>/g, '');
        const wordCount = textContent.split(/\s+/).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        // Generate table of contents
        const toc: Array<{ id: string; title: string; level: number }> = [];
        const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        let headingMatch;
        while ((headingMatch = headingRegex.exec(content)) !== null) {
          const level = parseInt(headingMatch[1]);
          const headingTitle = headingMatch[2].replace(/<[^>]*>/g, '').trim();
          const id = headingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          toc.push({ id, title: headingTitle, level });
        }

        // Insert blog post as draft
        await db.insert(blogPosts).values({
          title,
          slug,
          content,
          excerpt: excerpt || null,
          featuredImageUrl: heroImageUrl || null,
          ogImageUrl: ogImageUrl || null,
          authorId: defaultAuthor.id,
          status: 'draft',
          publishedAt: datePublished,
          metaTitle: metaTitle !== title ? metaTitle : null,
          metaDescription: metaDescription || null,
          readingTime,
          tableOfContents: toc.length > 0 ? toc : null,
          tags: [],
          categoryIds: [],
        });

        results.imported++;
      } catch (rowError: any) {
        results.failed.push({ title, error: rowError.message || 'Unknown error' });
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error("Error importing from Google Sheet:", error);
    res.status(500).json({ error: `Import failed: ${error.message}` });
  }
});


export default router;