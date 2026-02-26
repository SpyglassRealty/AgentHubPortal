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

export default router;