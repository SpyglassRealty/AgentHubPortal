import { Router } from "express";
import { eq, desc, asc, ilike, inArray, and, sql, or, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  blogPosts,
  blogCategories,
  blogAuthors,
  blogPostCategories,
  landingPages,
  type BlogPost,
  type BlogCategory,
  type BlogAuthor,
  type InsertBlogPost,
  type InsertBlogCategory,
  type InsertBlogAuthor
} from "@shared/schema";
import { z } from "zod";
import * as cheerio from "cheerio";
import XLSX from "xlsx";

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

// ── GOOGLE SHEETS IMPORT ──────────────────────────────────────────────────

function slugifyForBlog(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateBlockId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

/** Populate TOC blocks with headings collected from heading blocks in the sections list */
function populateTocBlocks(sections: any[]): any[] {
  // Collect all H2/H3 headings
  const headings: Array<{ text: string; level: number; anchorId: string }> = [];
  for (const block of sections) {
    if (block.type === "heading") {
      const level = block.props?.level || 2;
      if (level === 2 || level === 3) {
        const text = block.props?.text || "Heading";
        const anchorId = block.props?.anchorId || text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        headings.push({ text, level, anchorId });
      }
    }
  }
  // Inject headings into all TOC blocks
  return sections.map(block => {
    if (block.type === "toc") {
      return { ...block, props: { ...block.props, headings } };
    }
    return block;
  });
}

/** Convert page-builder blocks back to an HTML string for blog post storage */
function blocksToHtml(sections: any[]): string {
  return sections
    .map((block: any) => {
      switch (block.type) {
        case "heading": {
          const level = block.props?.level || 2;
          const id = block.props?.anchorId ? ` id="${block.props.anchorId}"` : "";
          const text = block.props?.text || "";
          return `<h${level}${id}>${text}</h${level}>`;
        }
        case "text":
          return block.props?.content || "";
        case "image": {
          const url = block.props?.url || "";
          const alt = block.props?.alt ? ` alt="${block.props.alt}"` : "";
          const srcset = block.props?.srcset ? ` srcset="${block.props.srcset}"` : "";
          return url ? `<img src="${url}"${alt}${srcset} style="max-width:100%;height:auto" loading="lazy" />` : "";
        }
        case "html":
          return block.props?.code || "";
        case "toc":
          return ""; // skip – will be generated from headings
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

/** Fetch a blog URL and parse its content into page-builder blocks + metadata */
async function fetchAndParseBlogUrl(url: string): Promise<{
  title: string;
  metaDescription: string;
  ogImageUrl: string;
  sections: any[];
}> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SpyglassCMS/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() || "";
  const metaDescription = $("meta[name='description']").attr("content") || "";
  const ogImageUrl = $("meta[property='og:image']").attr("content") || "";

  // Prefer the article.block--lightest container; fall back to main/body
  const articleEl = $("article.block--lightest, article[class*='block'], article").first();
  const container = articleEl.length ? articleEl : $("main, .content, body");

  const sections: any[] = [];

  container.children().each((_i: number, el: any) => {
    const tagName = ((el.tagName || el.name) as string || "").toLowerCase();
    const elem = $(el);

    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      const level = parseInt(tagName[1], 10);
      const text = elem.text().trim();
      if (text) {
        sections.push({
          id: generateBlockId(),
          type: "heading",
          props: {
            level,
            text,
            alignment: "left",
            color: "#000000",
            anchorId: elem.attr("id") || slugifyForBlog(text),
          },
        });
      }
    } else if (tagName === "p") {
      const innerHtml = elem.html() || "";
      if (innerHtml.trim()) {
        sections.push({ id: generateBlockId(), type: "text", props: { content: innerHtml, alignment: "left" } });
      }
    } else if (tagName === "img") {
      const src = elem.attr("src") || elem.attr("data-src") || "";
      const srcset = elem.attr("srcset") || "";
      let imgUrl = src;
      if (srcset) {
        const parts = srcset.split(",").map((s: string) => s.trim().split(/\s+/));
        const largest = parts.sort((a: string[], b: string[]) => parseInt(b[1] || "0", 10) - parseInt(a[1] || "0", 10))[0];
        if (largest?.[0]) imgUrl = largest[0];
      }
      if (imgUrl) {
        sections.push({
          id: generateBlockId(),
          type: "image",
          props: { url: imgUrl, alt: elem.attr("alt") || "", width: "100%", alignment: "center", srcset },
        });
      }
    } else if (tagName === "ul" || tagName === "ol" || tagName === "blockquote") {
      const innerHtml = $.html(el);
      if (innerHtml.trim()) {
        sections.push({ id: generateBlockId(), type: "text", props: { content: innerHtml, alignment: "left" } });
      }
    } else if (tagName === "table") {
      sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
    } else if (tagName === "div") {
      const cls = elem.attr("class") || "";
      if (cls.includes("highlight")) {
        sections.push({ id: generateBlockId(), type: "toc", props: { headings: [] } });
      } else {
        const innerHtml = elem.html() || "";
        if (innerHtml.trim()) {
          sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
        }
      }
    }
  });

  // Fallback if content area was empty
  if (sections.length === 0) {
    const h1 = $("h1").first().text().trim();
    if (h1) {
      sections.push({
        id: generateBlockId(),
        type: "heading",
        props: { level: 1, text: h1, alignment: "left", color: "#000000", anchorId: slugifyForBlog(h1) },
      });
    }
  }

  return { title, metaDescription, ogImageUrl, sections: populateTocBlocks(sections) };
}

/** Extract a URL from a HYPERLINK formula like: HYPERLINK("https://...", "View Doc") */
function extractUrlFromFormula(formula: string): string {
  const match = formula.match(/HYPERLINK\("([^"]+)"/i);
  return match ? match[1] : "";
}

/** Extract Google Sheet ID from a URL */
function extractSheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

/** Extract Google Doc ID from a URL */
function extractDocId(url: string): string {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

/** Extract Google Drive file ID from a URL */
function extractDriveFileId(url: string): string {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

/** Fetch a Google Doc exported as HTML and parse the blog content from it.
 *  The doc contains HTML source code as plain text in <p><span> elements.
 *  We extract all paragraph text, join it, then parse as HTML. */
async function fetchGoogleDocHtml(docId: string): Promise<{
  title: string;
  metaDescription: string;
  h1: string;
  articleHtml: string;
  publishDateRaw: string;
}> {
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
  const res = await fetch(exportUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SpyglassCMS/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch Google Doc: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // The Google Doc contains HTML source code as plain text in <p> elements
  const lines: string[] = [];
  $("body p").each((_i: number, el: any) => {
    const text = $(el).text().trim();
    if (text) lines.push(text);
  });

  const rawHtml = lines.join("\n");

  // Parse the assembled HTML source code
  const $blog = cheerio.load(rawHtml);

  // Extract title (clean trailing social share text like "FacebookTwitterEmail")
  let title = $blog("title").text().trim();
  title = title.replace(/Facebook.*$/i, "").trim();

  const metaDescription = $blog('meta[name="description"]').attr("content") || "";
  const h1 = $blog("h1").first().text().trim();
  const articleHtml = $blog("article").html() || $blog("body").html() || "";

  const timeEl = $blog('time[datetime]').first();
  const publishDateRaw = timeEl.attr('datetime') || '';

  return { title, metaDescription, h1, articleHtml, publishDateRaw };
}

// POST /api/admin/blog/import-sheet
// Accepts a Google Sheets URL, fetches the sheet, parses Google Doc content,
// and creates draft blog pages in the page builder (landingPages table).
router.post("/admin/blog/import-sheet", async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: "sheetUrl is required" });
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return res.status(400).json({ error: "Invalid Google Sheets URL" });
    }

    // Fetch the sheet as XLSX (preserves HYPERLINK formulas)
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const xlsxRes = await fetch(xlsxUrl);
    if (!xlsxRes.ok) {
      return res.status(400).json({ error: `Failed to fetch sheet: ${xlsxRes.status}. Make sure it's shared publicly.` });
    }
    const xlsxBuffer = Buffer.from(await xlsxRes.arrayBuffer());

    // Parse the XLSX with formula support
    const wb = XLSX.read(xlsxBuffer, { cellFormula: true, type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws || !ws["!ref"]) {
      return res.status(400).json({ error: "Sheet is empty" });
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    const dataRows: Array<{
      title: string;
      slug: string;
      googleDocUrl: string;
      heroImageUrl: string;
    }> = [];

    // Skip header row (row 0), process data rows
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const getCell = (c: number) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        return ws[addr] || null;
      };

      const titleCell = getCell(0);
      const slugCell = getCell(1);
      const docCell = getCell(2);
      const imageCell = getCell(3);

      const title = titleCell?.v?.toString() || "";
      const rawSlug = slugCell?.v?.toString() || "";

      // Extract URLs from HYPERLINK formulas
      let googleDocUrl = "";
      if (docCell?.f) {
        googleDocUrl = extractUrlFromFormula(docCell.f);
      } else if (docCell?.l?.Target) {
        googleDocUrl = docCell.l.Target;
      } else if (docCell?.v && typeof docCell.v === "string" && docCell.v.startsWith("http")) {
        googleDocUrl = docCell.v;
      }

      let heroImageUrl = "";
      if (imageCell?.f) {
        heroImageUrl = extractUrlFromFormula(imageCell.f);
      } else if (imageCell?.l?.Target) {
        heroImageUrl = imageCell.l.Target;
      } else if (imageCell?.v && typeof imageCell.v === "string" && imageCell.v.startsWith("http")) {
        heroImageUrl = imageCell.v;
      }

      if (title) {
        dataRows.push({ title, slug: rawSlug, googleDocUrl, heroImageUrl });
      }
    }

    if (!dataRows.length) {
      return res.status(400).json({ error: "No data rows found in sheet" });
    }

    const results: Array<{
      row: number;
      title: string;
      slug: string;
      success: boolean;
      pageId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < dataRows.length; i++) {
      const { title, slug: rawSlug, googleDocUrl, heroImageUrl: rawHeroUrl } = dataRows[i];

      // Clean the slug
      const slug = slugifyForBlog(rawSlug || title);

      // Auto-deduplicate slug if it already exists
      let finalSlug = slug;
      let slugSuffix = 0;
      while (true) {
        const [existing] = await db
          .select({ id: landingPages.id })
          .from(landingPages)
          .where(eq(landingPages.slug, finalSlug))
          .limit(1);
        if (!existing) break;
        slugSuffix++;
        finalSlug = `${slug}-${slugSuffix}`;
      }

      // Resolve hero image URL from Google Drive
      let heroImageDirectUrl = rawHeroUrl;
      const driveFileId = extractDriveFileId(rawHeroUrl);
      if (driveFileId) {
        heroImageDirectUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`;
      }

      // Fetch and parse the Google Doc
      let docTitle = "";
      let metaDescription = "";
      let h1Text = "";
      let articleHtml = "";
      let publishDateRaw = "";

      if (googleDocUrl) {
        const docId = extractDocId(googleDocUrl);
        if (!docId) {
          results.push({ row: i + 2, title, slug, success: false, error: "Could not extract Google Doc ID from URL" });
          continue;
        }
        try {
          const parsed = await fetchGoogleDocHtml(docId);
          docTitle = parsed.title;
          metaDescription = parsed.metaDescription;
          h1Text = parsed.h1;
          articleHtml = parsed.articleHtml;
          publishDateRaw = parsed.publishDateRaw;
        } catch (fetchErr: any) {
          results.push({ row: i + 2, title, slug, success: false, error: `Doc fetch error: ${fetchErr.message}` });
          continue;
        }
      } else {
        results.push({ row: i + 2, title, slug, success: false, error: "No Google Doc URL found" });
        continue;
      }

      // Build granular page builder blocks from the Google Doc content
      const sections: any[] = [];

      // Block 1: Hero block (combined image + heading)
      let localHeroUrl = heroImageDirectUrl;
      if (heroImageDirectUrl) {
        try {
          const imgRes = await fetch(heroImageDirectUrl);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}${ext}`;
            const uploadsDir = require('path').join(process.cwd(), 'dist', 'public', 'uploads');
            require('fs').mkdirSync(uploadsDir, { recursive: true });
            require('fs').writeFileSync(require('path').join(uploadsDir, filename), buffer);
            localHeroUrl = `/uploads/${filename}`;
          }
        } catch (e) { /* keep original URL as fallback */ }
      }

      sections.push({
        id: generateBlockId(),
        type: "hero",
        props: {
          heading: h1Text || title,
          subtext: "",
          bgImage: localHeroUrl,
          overlay: true,
          ctaText: "",
          ctaUrl: "",
          ctaText2: "",
          ctaUrl2: "",
        },
      });

      // Parse article body HTML into granular blocks
      if (articleHtml) {
        const $ = cheerio.load(articleHtml);

        function walkDocElements(elements: any) {
          $(elements).each((_i: number, el: any) => {
            const tagName = (el.tagName || el.name || "").toLowerCase();
            const elem = $(el);

            // Skip script/style/meta
            if (["script", "style", "link", "meta", "title", "noscript"].includes(tagName)) return;

            // Headings → heading blocks
            if (/^h[1-6]$/.test(tagName)) {
              const level = parseInt(tagName[1], 10);
              const text = elem.text().trim();
              if (text) {
                sections.push({
                  id: generateBlockId(),
                  type: "heading",
                  props: {
                    level,
                    text,
                    alignment: "left",
                    color: "#000000",
                    anchorId: text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                  },
                });
              }
              return;
            }

            // Images → image blocks
            if (tagName === "img") {
              const src = elem.attr("src") || elem.attr("data-src") || "";
              if (src) {
                sections.push({
                  id: generateBlockId(),
                  type: "image",
                  props: { url: src, alt: elem.attr("alt") || "", width: "100%", alignment: "center", link: "", loading: "lazy", srcset: elem.attr("srcset") || "" },
                });
              }
              return;
            }

            // Paragraphs → text or button blocks
            if (tagName === "p") {
              const innerHtml = (elem.html() || "").trim();
              if (!innerHtml) return;

              // Skip paragraphs that only contain script/style
              const textOnly = elem.text().trim();
              if (!textOnly && (elem.find("script").length > 0 || elem.find("style").length > 0)) return;

              // Check if paragraph only contains an image
              const children = elem.children();
              if (children.length === 1 && children.first().is("img")) {
                const src = children.first().attr("src") || "";
                if (src) {
                  sections.push({ id: generateBlockId(), type: "image", props: { url: src, alt: children.first().attr("alt") || "", width: "100%", alignment: "center", link: "", loading: "lazy", srcset: "" } });
                  return;
                }
              }

              // Check for CTA button links
              if (children.length === 1 && children.first().is("a")) {
                const link = children.first();
                const style = link.attr("style") || "";
                if (style.includes("inline-block") && (style.includes("background-color") || style.includes("border-radius"))) {
                  sections.push({ id: generateBlockId(), type: "button", props: { text: link.text().trim(), url: link.attr("href") || "#", alignment: "center", style: "primary", size: "md" } });
                  return;
                }
              }

              sections.push({ id: generateBlockId(), type: "text", props: { content: innerHtml, alignment: "left" } });
              return;
            }

            // Lists → text blocks
            if (tagName === "ul" || tagName === "ol") {
              sections.push({ id: generateBlockId(), type: "text", props: { content: $.html(el), alignment: "left" } });
              return;
            }

            // Blockquotes → text blocks
            if (tagName === "blockquote") {
              sections.push({ id: generateBlockId(), type: "text", props: { content: $.html(el), alignment: "left" } });
              return;
            }

            // Tables → html blocks
            if (tagName === "table") {
              sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
              return;
            }

            // Standalone CTA buttons
            if (tagName === "a") {
              const style = elem.attr("style") || "";
              if (style.includes("inline-block") && (style.includes("background-color") || style.includes("border-radius"))) {
                sections.push({ id: generateBlockId(), type: "button", props: { text: elem.text().trim(), url: elem.attr("href") || "#", alignment: "center", style: "primary", size: "md" } });
                return;
              }
            }

            // Divs — recurse or preserve as HTML
            if (["div", "section", "article", "main", "span", "figure"].includes(tagName)) {
              const cls = elem.attr("class") || "";
              const style = elem.attr("style") || "";

              // TOC container
              if (cls.includes("highlight") || elem.find("#table-of-contents").length > 0) {
                sections.push({ id: generateBlockId(), type: "toc", props: { headings: [] } });
                return;
              }

              // Styled callout boxes — keep as HTML
              if (style.includes("border-left") && style.includes("background-color")) {
                sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
                return;
              }

              // CTA boxes — keep as HTML
              if (style.includes("background-color") && style.includes("text-align: center")) {
                sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
                return;
              }

              // Share/social buttons — skip
              if (cls.includes("entry__buttons") || cls.includes("buttons") || cls.includes("share") || cls.includes("social")) return;

              // Recurse into children
              const ch = elem.children();
              if (ch.length > 0) {
                walkDocElements(ch);
              } else {
                const text = elem.text().trim();
                if (text) {
                  sections.push({ id: generateBlockId(), type: "text", props: { content: elem.html() || text, alignment: "left" } });
                }
              }
              return;
            }

            // HR → divider
            if (tagName === "hr") {
              sections.push({ id: generateBlockId(), type: "divider", props: { style: "solid", color: "#e5e7eb", width: "100%" } });
              return;
            }
          });
        }

        walkDocElements($('body').children());
      }

      // Fallback if no sections were extracted
      if (sections.length === 0) {
        sections.push({ id: generateBlockId(), type: "html", props: { code: articleHtml || "<p>No content found</p>" } });
      }

      // Populate TOC blocks with collected headings
      const finalSections = populateTocBlocks(sections);

      const fullContent = articleHtml || " ";

      try {
        const [newPage] = await db
          .insert(landingPages)
          .values({
            title,
            slug: finalSlug,
            pageType: "blog",
            content: fullContent || " ",
            sections: finalSections,
            metaTitle: docTitle || title,
            metaDescription: metaDescription || undefined,
            ogImageUrl: heroImageDirectUrl || undefined,
            indexingDirective: "index,follow",
            author: "Spyglass Realty",
            canonicalUrl: `https://www.spyglassrealty.com/blog/${finalSlug}`,
            isPublished: false,
            publishDate: publishDateRaw ? new Date(publishDateRaw) : new Date(),
            modifiedDate: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: landingPages.id, slug: landingPages.slug });

        results.push({ row: i + 2, title, slug: newPage.slug, success: true, pageId: newPage.id });
      } catch (dbErr: any) {
        results.push({ row: i + 2, title, slug, success: false, error: `DB error: ${dbErr.message}` });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({ results, successCount, failCount, total: dataRows.length });
  } catch (error: any) {
    console.error("Error importing from sheet:", error);
    res.status(500).json({ error: `Failed to import: ${error.message}` });
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