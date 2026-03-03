import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { landingPages } from "@shared/schema";
import * as cheerio from "cheerio";
import XLSX from "xlsx";

const router = Router();

// ── Utility Functions (shared patterns from blogRoutes) ──────────────────

function slugifyForCore(text: string): string {
  return text
    .toLowerCase()
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateBlockId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
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

/** Extract Google Doc ID from a URL (supports multiple formats) */
function extractDocId(url: string): string {
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return docMatch[1];
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();
  return "";
}

/** Extract Google Drive file ID from a URL */
function extractDriveFileId(url: string): string {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
}

/** List files in a public Google Drive folder */
async function listDriveFolderFiles(folderUrl: string): Promise<Array<{ name: string; fileId: string }>> {
  const folderMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (!folderMatch) return [];
  const folderId = folderMatch[1];

  try {
    const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`);
    if (!res.ok) return [];
    const html = await res.text();

    const unescaped = html.replace(/\\x([0-9a-fA-F]{2})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));

    const filenamePattern = /([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;
    const filenameMatches: string[] = [];
    let filenameMatch: RegExpExecArray | null;
    while ((filenameMatch = filenamePattern.exec(unescaped)) !== null) {
      if (!filenameMatches.includes(filenameMatch[1])) {
        filenameMatches.push(filenameMatch[1]);
      }
    }
    const allFilenames = filenameMatches;

    const results: Array<{ name: string; fileId: string }> = [];

    for (const fname of allFilenames) {
      const idx = unescaped.indexOf(fname);
      if (idx === -1) continue;

      const before = unescaped.substring(Math.max(0, idx - 500), idx);
      const idPattern = /([a-zA-Z0-9_-]{20,})/g;
      const ids: string[] = [];
      let idMatch: RegExpExecArray | null;
      while ((idMatch = idPattern.exec(before)) !== null) {
        ids.push(idMatch[1]);
      }
      const fileId = ids.filter(id => id !== folderId && id.length >= 20 && id.length <= 60).pop();

      if (fileId && !results.some(r => r.fileId === fileId)) {
        results.push({ name: fname, fileId });
      }
    }

    return results;
  } catch (e) {
    console.error("Error listing Drive folder:", e);
    return [];
  }
}

/** Download an image from Google Drive and save locally */
async function downloadDriveImage(fileId: string, filename: string): Promise<string | null> {
  try {
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null;

    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(process.cwd(), "dist", "public", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
    fs.writeFileSync(path.join(uploadsDir, uniqueName), buffer);

    return `/uploads/${uniqueName}`;
  } catch (e) {
    console.error(`Error downloading Drive image ${fileId}:`, e);
    return null;
  }
}

/** Upload an image to Vercel Blob via the spyglass-idx upload API */
async function uploadImageToVercelBlob(imageUrl: string, _folder = "core-images"): Promise<string | null> {
  const IDX_UPLOAD_URL = process.env.IDX_UPLOAD_URL || "https://spyglass-idx.vercel.app/api/upload";
  try {
    const res = await fetch(IDX_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl }),
    });
    if (!res.ok) {
      console.error(`Blob upload failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.url || null;
  } catch (err) {
    console.error("Blob upload error:", err);
    return null;
  }
}

/** Fetch a Google Doc exported as HTML and parse content from it */
async function fetchGoogleDocHtml(docId: string): Promise<{
  title: string;
  metaDescription: string;
  h1: string;
  articleHtml: string;
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
  const $doc = cheerio.load(rawHtml);

  let title = $doc("title").text().trim();
  title = title.replace(/Facebook.*$/i, "").trim();

  const metaDescription = $doc('meta[name="description"]').attr("content") || "";
  const h1 = $doc("h1").first().text().trim();
  const articleHtml = $doc("article").html() || $doc("body").html() || "";

  return { title, metaDescription, h1, articleHtml };
}

// ── Core Page Block Builders ──────────────────────────────────────────

/** Build landing-page-style blocks from parsed Google Doc HTML.
 *  Creates hero, heading, text, CTA button, image, divider blocks
 *  that look like a homepage/service page rather than a blog post. */
function buildCorePageBlocks(
  h1Text: string,
  title: string,
  heroImageUrl: string,
  articleHtml: string,
  pagePhotosMap: Record<string, string>
): any[] {
  const sections: any[] = [];

  // ─── Hero Block ─────────────────────────────────────────────
  sections.push({
    id: generateBlockId(),
    type: "hero",
    props: {
      heading: h1Text || title,
      subtext: "",
      bgImage: heroImageUrl,
      overlay: true,
      ctaText: "",
      ctaUrl: "",
      ctaText2: "",
      ctaUrl2: "",
    },
  });

  // ─── Parse article body into granular blocks ────────────────
  if (articleHtml) {
    const $ = cheerio.load(articleHtml);

    const walkElements = (elements: any) => {
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
          let src = elem.attr("src") || elem.attr("data-src") || "";
          // Check if this image filename matches a downloaded page photo
          if (src && Object.keys(pagePhotosMap).length > 0) {
            for (const [filename, localPath] of Object.entries(pagePhotosMap)) {
              if (src.includes(filename)) {
                src = localPath;
                break;
              }
            }
          }
          if (src) {
            sections.push({
              id: generateBlockId(),
              type: "image",
              props: { url: src, alt: elem.attr("alt") || "", width: "100%", alignment: "center", link: "", loading: "lazy", srcset: elem.attr("srcset") || "" },
            });
          }
          return;
        }

        // Paragraphs
        if (tagName === "p") {
          const innerHtml = (elem.html() || "").trim();
          if (!innerHtml) return;

          const textOnly = elem.text().trim();
          if (!textOnly && (elem.find("script").length > 0 || elem.find("style").length > 0)) return;

          // Paragraph containing only an image
          const children = elem.children();
          if (children.length === 1 && children.first().is("img")) {
            let src = children.first().attr("src") || "";
            if (src) {
              sections.push({ id: generateBlockId(), type: "image", props: { url: src, alt: children.first().attr("alt") || "", width: "100%", alignment: "center", link: "", loading: "lazy", srcset: "" } });
              return;
            }
          }

          // CTA button links (styled as buttons)
          if (children.length === 1 && children.first().is("a")) {
            const link = children.first();
            const style = link.attr("style") || "";
            if (style.includes("inline-block") && (style.includes("background-color") || style.includes("border-radius"))) {
              sections.push({ id: generateBlockId(), type: "button", props: { text: link.text().trim(), url: link.attr("href") || "#", alignment: "center", style: "primary", size: "lg" } });
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
            sections.push({ id: generateBlockId(), type: "button", props: { text: elem.text().trim(), url: elem.attr("href") || "#", alignment: "center", style: "primary", size: "lg" } });
            return;
          }
        }

        // HR → divider
        if (tagName === "hr") {
          sections.push({ id: generateBlockId(), type: "divider", props: { style: "solid", color: "#e5e7eb", width: "100%" } });
          return;
        }

        // Divs/sections — recurse or preserve
        if (["div", "section", "article", "main", "span", "figure"].includes(tagName)) {
          const cls = elem.attr("class") || "";
          const style = elem.attr("style") || "";

          // Styled callout boxes
          if (style.includes("border-left") && style.includes("background-color")) {
            sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
            return;
          }

          // CTA boxes
          if (style.includes("background-color") && style.includes("text-align: center")) {
            sections.push({ id: generateBlockId(), type: "html", props: { code: $.html(el) } });
            return;
          }

          // Share/social buttons — skip
          if (cls.includes("entry__buttons") || cls.includes("buttons") || cls.includes("share") || cls.includes("social")) return;

          // Recurse into children
          const ch = elem.children();
          if (ch.length > 0) {
            walkElements(ch);
          } else {
            const text = elem.text().trim();
            if (text) {
              sections.push({ id: generateBlockId(), type: "text", props: { content: elem.html() || text, alignment: "left" } });
            }
          }
          return;
        }
      });
    };

    walkElements($("body").children());
  }

  // Add a CTA block at the bottom for core pages
  sections.push({
    id: generateBlockId(),
    type: "button",
    props: {
      text: "Contact Us Today",
      url: "https://www.spyglassrealty.com/contact",
      alignment: "center",
      style: "primary",
      size: "lg",
    },
  });

  // Fallback if no sections were extracted
  if (sections.length <= 2) {
    // Only hero + CTA — add a placeholder
    sections.splice(1, 0, {
      id: generateBlockId(),
      type: "text",
      props: {
        content: "<p>Page content will go here. Edit this page to add your content.</p>",
        alignment: "left",
      },
    });
  }

  return sections;
}

// ── POST /api/admin/core/import-sheet ──────────────────────────────────
// Accepts a Google Sheets URL, fetches the sheet, parses Google Doc content,
// and creates draft core pages in the page builder (landingPages table).
router.post("/admin/core/import-sheet", async (req, res) => {
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
      ogImageUrl: string;
      pagePhotosUrl: string;
    }> = [];

    // Skip header row (row 0), process data rows
    // Columns: Page Title, URL Slug, Google Doc (HYPERLINK), Hero Image (HYPERLINK), OG Image (HYPERLINK), Page Photos (HYPERLINK), Date Crawled
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const getCell = (c: number) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        return ws[addr] || null;
      };

      const titleCell = getCell(0);
      const slugCell = getCell(1);
      const docCell = getCell(2);
      const imageCell = getCell(3);
      const ogImageCell = getCell(4);
      const pagePhotosCell = getCell(5);
      // Column 6 = Date Crawled (not used for import)

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

      let ogImageUrl = "";
      if (ogImageCell?.f) {
        ogImageUrl = extractUrlFromFormula(ogImageCell.f);
      } else if (ogImageCell?.l?.Target) {
        ogImageUrl = ogImageCell.l.Target;
      } else if (ogImageCell?.v && typeof ogImageCell.v === "string" && ogImageCell.v.startsWith("http")) {
        ogImageUrl = ogImageCell.v;
      }

      let pagePhotosUrl = "";
      if (pagePhotosCell?.f) {
        pagePhotosUrl = extractUrlFromFormula(pagePhotosCell.f);
      } else if (pagePhotosCell?.l?.Target) {
        pagePhotosUrl = pagePhotosCell.l.Target;
      } else if (pagePhotosCell?.v && typeof pagePhotosCell.v === "string" && pagePhotosCell.v.startsWith("http")) {
        pagePhotosUrl = pagePhotosCell.v;
      }

      if (title) {
        dataRows.push({ title, slug: rawSlug, googleDocUrl, heroImageUrl, ogImageUrl, pagePhotosUrl });
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
      const { title, slug: rawSlug, googleDocUrl, heroImageUrl: rawHeroUrl, ogImageUrl: rawOgUrl, pagePhotosUrl } = dataRows[i];

      // Clean the slug
      const slug = slugifyForCore(rawSlug || title);

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
      const heroDriveFileId = extractDriveFileId(rawHeroUrl);
      if (heroDriveFileId) {
        const heroLocalPath = await downloadDriveImage(heroDriveFileId, `hero-${slug}.jpg`);
        if (heroLocalPath) {
          heroImageDirectUrl = heroLocalPath;
        } else {
          heroImageDirectUrl = `https://drive.google.com/uc?export=view&id=${heroDriveFileId}`;
        }
      }

      // Resolve and download OG image
      let ogImageDirectUrl = rawOgUrl;
      const ogDriveFileId = extractDriveFileId(rawOgUrl);
      if (ogDriveFileId) {
        const ogLocalPath = await downloadDriveImage(ogDriveFileId, `og-${slug}.jpg`);
        if (ogLocalPath) {
          ogImageDirectUrl = ogLocalPath;
        } else {
          ogImageDirectUrl = `https://drive.google.com/uc?export=view&id=${ogDriveFileId}`;
        }
      }

      // Upload OG image to Vercel Blob
      let ogBlobUrl: string | null = null;
      if (ogImageDirectUrl) {
        try {
          let ogUploadUrl = ogImageDirectUrl;
          if (ogUploadUrl.startsWith("/")) {
            const RENDER_BASE = process.env.RENDER_EXTERNAL_URL || "https://missioncontrol-tjfm.onrender.com";
            ogUploadUrl = `${RENDER_BASE}${ogUploadUrl}`;
          }
          if (ogUploadUrl.startsWith("http")) {
            ogBlobUrl = await uploadImageToVercelBlob(ogUploadUrl, "core-images");
          }
        } catch (e) { /* keep original URL as fallback */ }
      }

      // Download images from Page Photos folder
      const pagePhotoMap: Record<string, string> = {};
      if (pagePhotosUrl) {
        try {
          const folderFiles = await listDriveFolderFiles(pagePhotosUrl);
          for (const file of folderFiles) {
            const localPath = await downloadDriveImage(file.fileId, file.name);
            if (localPath) {
              pagePhotoMap[file.name] = localPath;
            }
          }
        } catch (photoErr) {
          console.error("Error downloading page photos:", photoErr);
        }
      }

      // Fetch and parse the Google Doc
      let docTitle = "";
      let metaDescription = "";
      let h1Text = "";
      let articleHtml = "";

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
        } catch (fetchErr: any) {
          results.push({ row: i + 2, title, slug, success: false, error: `Doc fetch error: ${fetchErr.message}` });
          continue;
        }
      } else {
        results.push({ row: i + 2, title, slug, success: false, error: "No Google Doc URL found" });
        continue;
      }

      // Replace old image paths in content with downloaded Page Photos
      if (Object.keys(pagePhotoMap).length > 0) {
        for (const [filename, localPath] of Object.entries(pagePhotoMap)) {
          const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const imgSrcPattern = new RegExp(`(src=["'])[^"']*?${escapedName}(["'])`, "gi");
          articleHtml = articleHtml.replace(imgSrcPattern, `$1${localPath}$2`);
        }
      }

      // Upload hero image to Vercel Blob
      let localHeroUrl = heroImageDirectUrl;
      if (heroImageDirectUrl) {
        try {
          let heroUploadUrl = heroImageDirectUrl;
          if (heroUploadUrl.startsWith("/")) {
            const RENDER_BASE = process.env.RENDER_EXTERNAL_URL || "https://missioncontrol-tjfm.onrender.com";
            heroUploadUrl = `${RENDER_BASE}${heroUploadUrl}`;
          }
          const blobUrl = await uploadImageToVercelBlob(heroUploadUrl, "core-images");
          if (blobUrl) localHeroUrl = blobUrl;
        } catch (e) { /* keep original URL as fallback */ }
      }

      // Build landing-page-style blocks
      const sections = buildCorePageBlocks(h1Text, title, localHeroUrl, articleHtml, pagePhotoMap);

      // Upload all image block URLs to Vercel Blob
      const RENDER_BASE = process.env.RENDER_EXTERNAL_URL || "https://missioncontrol-tjfm.onrender.com";
      for (const section of sections) {
        if (section.type === "image" && section.props?.url) {
          try {
            let imageUrl = section.props.url;
            if (imageUrl.startsWith("/")) {
              imageUrl = `${RENDER_BASE}${imageUrl}`;
            }
            const blobUrl = await uploadImageToVercelBlob(imageUrl, "core-images");
            if (blobUrl) section.props.url = blobUrl;
          } catch (e) { /* keep original URL */ }
        }
      }

      // Generate minimal content HTML from sections (for search/SEO)
      const fullContent = articleHtml || " ";

      try {
        const [newPage] = await db
          .insert(landingPages)
          .values({
            title,
            slug: finalSlug,
            pageType: "core",
            content: fullContent,
            sections,
            metaTitle: docTitle || title,
            metaDescription: metaDescription || undefined,
            ogImageUrl: ogBlobUrl || ogImageDirectUrl || localHeroUrl || heroImageDirectUrl || undefined,
            indexingDirective: "index,follow",
            canonicalUrl: `https://www.spyglassrealty.com/${finalSlug}`,
            isPublished: false,
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
    console.error("Error importing core pages from sheet:", error);
    res.status(500).json({ error: `Failed to import: ${error.message}` });
  }
});

export default router;
