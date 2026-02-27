import { Router } from "express";
import { eq, desc, asc, ilike, and, or, sql } from "drizzle-orm";
import { db } from "./db";
import { landingPages, type LandingPage } from "@shared/schema";
import { z } from "zod";
import * as cheerio from "cheerio";

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
  // Blog-specific fields
  author: z.string().max(255).optional().default(""),
  publishDate: z.string().optional().nullable(),
  modifiedDate: z.string().optional().nullable(),
  canonicalUrl: z.string().max(500).optional().default(""),
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

function parseBlogDates(data: any) {
  return {
    publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
    modifiedDate: data.modifiedDate ? new Date(data.modifiedDate) : undefined,
  };
}

// POST /api/admin/pages — Create new page
router.post("/admin/pages", async (req, res) => {
  try {
    const data = createPageSchema.parse(req.body);
    const seoScore = calculateSeoScore(data as any);
    const { publishDate, modifiedDate } = parseBlogDates(data);

    // Ensure slug is unique — append suffix if needed
    let slug = data.slug;
    let suffix = 0;
    while (true) {
      const [existing] = await db.select({ id: landingPages.id }).from(landingPages).where(eq(landingPages.slug, slug));
      if (!existing) break;
      suffix++;
      slug = `${data.slug}-${suffix}`;
    }

    const [newPage] = await db
      .insert(landingPages)
      .values({
        ...data,
        slug,
        publishDate,
        modifiedDate,
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

    const merged = { ...existing, ...data } as Partial<LandingPage>;
    const seoScore = calculateSeoScore(merged);
    const { publishDate, modifiedDate } = parseBlogDates(data);

    const [updated] = await db
      .update(landingPages)
      .set({
        ...data,
        publishDate,
        modifiedDate,
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

// ── URL IMPORT ───────────────────────────────────────────────────────

function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

async function importFromUrl(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SpyglassCMS/1.0)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim() || '';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
  const ogImageUrl = $('meta[property="og:image"]').attr('content') || '';
  const h1Text = $('h1').first().text().trim() || '';

  // Derive slug from URL path
  const urlPath = new URL(url).pathname;
  const slugRaw = urlPath.replace(/\.html?$/, '').split('/').filter(Boolean).pop() || '';
  const slug = slugifyText(slugRaw);

  // Try to extract author and publish date from common meta tags
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[class*="author"]').first().text().trim() ||
    'Spyglass Realty';

  const publishDateRaw =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[name="pubdate"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    '';
  const publishDate = publishDateRaw ? new Date(publishDateRaw).toISOString() : new Date().toISOString();

  // ── Recursive block extractor ──────────────────────────────────
  // Walks the DOM tree and extracts granular blocks from any nesting depth.
  const sections: any[] = [];

  function extractImageBlock(elem: any): any | null {
    const src = $(elem).attr('src') || $(elem).attr('data-src') || '';
    const srcset = $(elem).attr('srcset') || '';
    let imgUrl = src;
    if (srcset) {
      const parts = srcset.split(',').map((s: string) => s.trim().split(/\s+/));
      const largest = parts.sort((a: string[], b: string[]) => {
        const aw = parseInt(a[1] || '0', 10);
        const bw = parseInt(b[1] || '0', 10);
        return bw - aw;
      })[0];
      if (largest && largest[0]) imgUrl = largest[0];
    }
    if (!imgUrl) return null;
    return {
      id: generateId(),
      type: 'image',
      props: {
        url: imgUrl,
        alt: $(elem).attr('alt') || '',
        width: '100%',
        alignment: 'center',
        link: '',
        loading: 'lazy',
        srcset,
      },
    };
  }

  function walkElements(elements: any) {
    $(elements).each((_i: number, el: any) => {
      const tagName = (el.tagName || el.name || '').toLowerCase();
      const elem = $(el);

      // Skip non-visible elements
      if (tagName === 'script' || tagName === 'style' || tagName === 'link' || tagName === 'meta' || tagName === 'title' || tagName === 'noscript') {
        // But capture <title> content for SEO if needed — already handled above
        return;
      }

      // Headings → heading blocks
      if (/^h[1-6]$/.test(tagName)) {
        const level = parseInt(tagName[1], 10);
        const text = elem.text().trim();
        if (text) {
          sections.push({
            id: generateId(),
            type: 'heading',
            props: {
              level,
              text,
              alignment: 'left',
              color: '#000000',
              anchorId: elem.attr('id') || slugifyText(text),
            },
          });
        }
        return;
      }

      // Standalone images → image blocks
      if (tagName === 'img') {
        const block = extractImageBlock(el);
        if (block) sections.push(block);
        return;
      }

      // Paragraphs → text blocks (may contain inline images or buttons)
      if (tagName === 'p') {
        const innerHtml = (elem.html() || '').trim();
        if (!innerHtml) return;

        // Skip paragraphs that only contain script/style tags (no visible content)
        const textOnly = elem.text().trim();
        const hasOnlyScriptOrStyle = !textOnly && (elem.find('script').length > 0 || elem.find('style').length > 0);
        if (hasOnlyScriptOrStyle) return;

        // Check if paragraph only contains an image
        const children = elem.children();
        if (children.length === 1 && (children.first().is('img') || (children.first().is('a') && children.first().find('img').length === 1))) {
          const imgEl = children.first().is('img') ? children.first() : children.first().find('img').first();
          const block = extractImageBlock(imgEl[0]);
          if (block) {
            // If wrapped in a link, add the link URL
            if (children.first().is('a')) {
              block.props.link = children.first().attr('href') || '';
            }
            sections.push(block);
            return;
          }
        }

        // Check if paragraph only contains a button/CTA link
        if (children.length === 1 && children.first().is('a')) {
          const link = children.first();
          const style = link.attr('style') || '';
          // Detect CTA-style buttons (inline-block, background-color, border-radius, etc.)
          if (style.includes('inline-block') && (style.includes('background-color') || style.includes('border-radius'))) {
            sections.push({
              id: generateId(),
              type: 'button',
              props: {
                text: link.text().trim(),
                url: link.attr('href') || '#',
                alignment: 'center',
                style: 'primary',
                size: 'md',
              },
            });
            return;
          }
        }

        // Regular paragraph → text block
        sections.push({
          id: generateId(),
          type: 'text',
          props: { content: innerHtml, alignment: 'left' },
        });
        return;
      }

      // Lists → text blocks
      if (tagName === 'ul' || tagName === 'ol') {
        sections.push({
          id: generateId(),
          type: 'text',
          props: { content: $.html(el), alignment: 'left' },
        });
        return;
      }

      // Blockquotes → text blocks
      if (tagName === 'blockquote') {
        sections.push({
          id: generateId(),
          type: 'text',
          props: { content: $.html(el), alignment: 'left' },
        });
        return;
      }

      // Tables → html blocks
      if (tagName === 'table') {
        sections.push({
          id: generateId(),
          type: 'html',
          props: { code: $.html(el) },
        });
        return;
      }

      // Standalone <a> that looks like a CTA button
      if (tagName === 'a') {
        const style = elem.attr('style') || '';
        if (style.includes('inline-block') && (style.includes('background-color') || style.includes('border-radius'))) {
          sections.push({
            id: generateId(),
            type: 'button',
            props: {
              text: elem.text().trim(),
              url: elem.attr('href') || '#',
              alignment: 'center',
              style: 'primary',
              size: 'md',
            },
          });
          return;
        }
      }

      // <small> / author byline → text block
      if (tagName === 'small') {
        const innerHtml = (elem.html() || '').trim();
        if (innerHtml) {
          sections.push({
            id: generateId(),
            type: 'text',
            props: { content: innerHtml, alignment: 'left' },
          });
        }
        return;
      }

      // Divs and other containers — decide whether to recurse or keep as HTML block
      if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'main' || tagName === 'span' || tagName === 'figure') {
        const cls = elem.attr('class') || '';
        const style = elem.attr('style') || '';

        // TOC container → toc block
        if (cls.includes('highlight') || elem.find('#table-of-contents').length > 0) {
          sections.push({
            id: generateId(),
            type: 'toc',
            props: { headings: [] }, // auto-computed by editor
          });
          return;
        }

        // Styled callout/info boxes (has border-left, background-color, padding — keep as HTML)
        if (style.includes('border-left') && style.includes('background-color')) {
          sections.push({
            id: generateId(),
            type: 'html',
            props: { code: $.html(el) },
          });
          return;
        }

        // CTA box with bg color and centered text (keep as HTML block)
        if (style.includes('background-color') && style.includes('text-align: center')) {
          sections.push({
            id: generateId(),
            type: 'html',
            props: { code: $.html(el) },
          });
          return;
        }

        // Social share buttons, navigation, etc. — skip
        if (cls.includes('entry__buttons') || cls.includes('buttons') || cls.includes('share') || cls.includes('social')) {
          return;
        }

        // Otherwise, recurse into the container's children to extract granular blocks
        const children = elem.children();
        if (children.length > 0) {
          walkElements(children);
        } else {
          // Leaf div with text content
          const text = elem.text().trim();
          if (text) {
            sections.push({
              id: generateId(),
              type: 'text',
              props: { content: elem.html() || text, alignment: 'left' },
            });
          }
        }
        return;
      }

      // <hr> → divider block
      if (tagName === 'hr') {
        sections.push({
          id: generateId(),
          type: 'divider',
          props: { style: 'solid', color: '#e5e7eb', width: '100%' },
        });
        return;
      }

      // Anything else with meaningful content → html block
      const outerHtml = $.html(el);
      if (outerHtml && outerHtml.trim()) {
        sections.push({
          id: generateId(),
          type: 'html',
          props: { code: outerHtml },
        });
      }
    });
  }

  // Find the best content root
  const article = $('article.block--lightest, article[class*="block"], article').first();
  const contentRoot = article.length ? article : $('main, .content, body').first();

  // Walk all children recursively
  walkElements(contentRoot.children());

  // If no sections found (SPA or JS-rendered), try a simpler extraction
  if (sections.length === 0 && h1Text) {
    sections.push({
      id: generateId(),
      type: 'heading',
      props: { level: 1, text: h1Text, alignment: 'left', color: '#000000', anchorId: slugifyText(h1Text) },
    });
  }

  return {
    title: title || h1Text,
    slug,
    metaTitle: title,
    metaDescription,
    canonicalUrl,
    ogImageUrl,
    author,
    publishDate,
    sections,
  };
}

// POST /api/admin/pages/import-url — Import page(s) from URL(s)
router.post("/admin/pages/import-url", async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "urls array is required" });
    }

    const results: any[] = [];
    for (const url of urls) {
      try {
        const data = await importFromUrl(url.trim());
        results.push({ url, success: true, data });
      } catch (err: any) {
        results.push({ url, success: false, error: err.message });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error importing from URL:", error);
    res.status(500).json({ error: "Failed to import URL" });
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
