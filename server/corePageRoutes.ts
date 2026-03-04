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

// ── Content Section Parser ──────────────────────────────────────────

/** Represents a parsed content section from the Google Doc */
interface ParsedSection {
  heading?: string;
  headingLevel?: number;
  paragraphs: string[];    // HTML paragraph content
  images: Array<{ url: string; alt: string; srcset: string }>;
  listItems: string[];     // Text of list items
  listHtml: string[];      // Full HTML of list blocks
  links: Array<{ text: string; url: string; isButton: boolean }>;
  faqItems: Array<{ question: string; answer: string }>;
  rawElements: Array<{ type: string; html: string }>;
}

/** Parse article HTML into structured sections split on H2 headings */
function parseIntoSections(articleHtml: string, pagePhotosMap: Record<string, string>): ParsedSection[] {
  if (!articleHtml) return [];

  const $ = cheerio.load(articleHtml);
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    paragraphs: [], images: [], listItems: [], listHtml: [],
    links: [], faqItems: [], rawElements: [],
  };

  function resolveImageSrc(src: string): string {
    if (!src) return src;
    for (const [filename, localPath] of Object.entries(pagePhotosMap)) {
      if (src.includes(filename)) return localPath;
    }
    return src;
  }

  function processElement(el: any) {
    const tagName = (el.tagName || el.name || "").toLowerCase();
    const elem = $(el);

    // Skip non-content tags
    if (["script", "style", "link", "meta", "title", "noscript"].includes(tagName)) return;

    // H2 starts a new section
    if (tagName === "h2") {
      const text = elem.text().trim();
      if (text) {
        // Push current section and start a new one
        if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.images.length > 0 || currentSection.rawElements.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: text,
          headingLevel: 2,
          paragraphs: [], images: [], listItems: [], listHtml: [],
          links: [], faqItems: [], rawElements: [],
        };
      }
      return;
    }

    // H3-H6 headings go into the current section as raw elements
    if (/^h[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1], 10);
      const text = elem.text().trim();
      if (text) {
        currentSection.rawElements.push({
          type: "heading",
          html: JSON.stringify({ level, text }),
        });
      }
      return;
    }

    // Images
    if (tagName === "img") {
      let src = resolveImageSrc(elem.attr("src") || elem.attr("data-src") || "");
      if (src) {
        currentSection.images.push({
          url: src,
          alt: elem.attr("alt") || "",
          srcset: elem.attr("srcset") || "",
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

      // Image inside paragraph
      const children = elem.children();
      if (children.length === 1 && children.first().is("img")) {
        let src = resolveImageSrc(children.first().attr("src") || "");
        if (src) {
          currentSection.images.push({
            url: src,
            alt: children.first().attr("alt") || "",
            srcset: "",
          });
          return;
        }
      }

      // Check for button-styled links
      if (children.length === 1 && children.first().is("a")) {
        const link = children.first();
        const style = link.attr("style") || "";
        if (style.includes("inline-block") && (style.includes("background-color") || style.includes("border-radius"))) {
          currentSection.links.push({
            text: link.text().trim(),
            url: link.attr("href") || "#",
            isButton: true,
          });
          return;
        }
      }

      // Check for Q&A pattern (Q: ... / A: ...)
      if (/^(Q|Question)\s*[:\.]/i.test(textOnly)) {
        // Start tracking a FAQ — the question part
        currentSection.rawElements.push({ type: "faq-q", html: textOnly.replace(/^(Q|Question)\s*[:\.]\s*/i, "") });
        return;
      }
      if (/^(A|Answer)\s*[:\.]/i.test(textOnly)) {
        currentSection.rawElements.push({ type: "faq-a", html: textOnly.replace(/^(A|Answer)\s*[:\.]\s*/i, "") });
        return;
      }

      currentSection.paragraphs.push(innerHtml);
      return;
    }

    // Lists
    if (tagName === "ul" || tagName === "ol") {
      const items: string[] = [];
      elem.find("li").each((_li: number, liEl: any) => {
        const liText = $(liEl).text().trim();
        if (liText) items.push(liText);
      });
      currentSection.listItems.push(...items);
      currentSection.listHtml.push($.html(el));
      return;
    }

    // Blockquotes — could be testimonials
    if (tagName === "blockquote") {
      currentSection.rawElements.push({ type: "blockquote", html: elem.text().trim() });
      return;
    }

    // Tables
    if (tagName === "table") {
      currentSection.rawElements.push({ type: "table", html: $.html(el) });
      return;
    }

    // Standalone links (buttons)
    if (tagName === "a") {
      const style = elem.attr("style") || "";
      if (style.includes("inline-block") && (style.includes("background-color") || style.includes("border-radius"))) {
        currentSection.links.push({
          text: elem.text().trim(),
          url: elem.attr("href") || "#",
          isButton: true,
        });
        return;
      }
    }

    // HR → mark section break
    if (tagName === "hr") {
      currentSection.rawElements.push({ type: "hr", html: "" });
      return;
    }

    // Divs/sections — recurse
    if (["div", "section", "article", "main", "span", "figure"].includes(tagName)) {
      const cls = elem.attr("class") || "";
      // Skip social/share widgets
      if (cls.includes("entry__buttons") || cls.includes("buttons") || cls.includes("share") || cls.includes("social")) return;

      const ch = elem.children();
      if (ch.length > 0) {
        ch.each((_ci: number, child: any) => processElement(child));
      } else {
        const text = elem.text().trim();
        if (text) {
          currentSection.paragraphs.push(elem.html() || text);
        }
      }
      return;
    }
  }

  $("body").children().each((_i: number, el: any) => processElement(el));

  // Push the last section
  if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.images.length > 0 || currentSection.rawElements.length > 0 || currentSection.listItems.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// ── Smart Block Builders ──────────────────────────────────────────

/** Check if list items look like card-worthy content (3+ items with similar structure) */
function shouldConvertToCards(items: string[]): boolean {
  if (items.length < 3) return false;
  // Items that are short enough to be card titles/descriptions
  const avgLen = items.reduce((sum, item) => sum + item.length, 0) / items.length;
  return avgLen < 200; // Short items = card-like
}

/** Extract FAQ items from raw elements (Q/A pairs) */
function extractFaqItems(rawElements: Array<{ type: string; html: string }>): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  for (let i = 0; i < rawElements.length; i++) {
    if (rawElements[i].type === "faq-q") {
      const question = rawElements[i].html;
      // Look for the next faq-a
      let answer = "";
      if (i + 1 < rawElements.length && rawElements[i + 1].type === "faq-a") {
        answer = rawElements[i + 1].html;
        i++; // skip the answer element
      }
      if (question) {
        faqs.push({ question, answer });
      }
    }
  }
  return faqs;
}

/** Build page-builder blocks from a parsed section */
function buildBlocksFromSection(section: ParsedSection): any[] {
  const blocks: any[] = [];
  const hasFaqs = extractFaqItems(section.rawElements);
  const hasImages = section.images.length > 0;
  const hasParagraphs = section.paragraphs.length > 0;
  const hasLists = section.listItems.length > 0;

  // Section heading
  if (section.heading) {
    blocks.push({
      id: generateBlockId(),
      type: "heading",
      props: {
        level: section.headingLevel || 2,
        text: section.heading,
        alignment: "left",
        color: "#000000",
        anchorId: section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      },
    });
  }

  // FAQ items → faq block
  if (hasFaqs.length > 0) {
    blocks.push({
      id: generateBlockId(),
      type: "faq",
      props: {
        items: hasFaqs,
      },
    });
  }

  // If section has both image(s) and text → use columns layout
  if (hasImages && hasParagraphs && !hasLists) {
    const imgBlock = {
      id: generateBlockId(),
      type: "image" as const,
      props: {
        url: section.images[0].url,
        alt: section.images[0].alt,
        width: "100%",
        alignment: "center" as const,
        link: "",
        loading: "lazy",
        srcset: section.images[0].srcset,
      },
    };

    const textContent = section.paragraphs.map(p => `<p>${p}</p>`).join("");
    const textBlock = {
      id: generateBlockId(),
      type: "text" as const,
      props: {
        content: textContent,
        alignment: "left" as const,
      },
    };

    // Alternate: even sections get image-left, odd get image-right
    const imageFirst = blocks.length % 2 === 0;

    blocks.push({
      id: generateBlockId(),
      type: "columns",
      props: { columns: 2 },
      children: imageFirst
        ? [[imgBlock], [textBlock]]
        : [[textBlock], [imgBlock]],
    });

    // Any additional images beyond the first go as standalone image blocks
    for (let i = 1; i < section.images.length; i++) {
      blocks.push({
        id: generateBlockId(),
        type: "image",
        props: {
          url: section.images[i].url,
          alt: section.images[i].alt,
          width: "100%",
          alignment: "center",
          link: "",
          loading: "lazy",
          srcset: section.images[i].srcset,
        },
      });
    }
  } else {
    // No columns layout — output paragraphs, images, lists separately

    // Paragraphs → text blocks (group consecutive paragraphs)
    if (hasParagraphs) {
      const groupedContent = section.paragraphs.map(p => `<p>${p}</p>`).join("");
      blocks.push({
        id: generateBlockId(),
        type: "text",
        props: { content: groupedContent, alignment: "left" },
      });
    }

    // Images → image blocks or gallery
    if (hasImages) {
      if (section.images.length >= 3) {
        // Multiple images → image gallery
        blocks.push({
          id: generateBlockId(),
          type: "image-gallery",
          props: {
            images: section.images.map(img => ({ url: img.url, alt: img.alt })),
            columns: section.images.length >= 4 ? 4 : 3,
          },
        });
      } else {
        for (const img of section.images) {
          blocks.push({
            id: generateBlockId(),
            type: "image",
            props: {
              url: img.url,
              alt: img.alt,
              width: "100%",
              alignment: "center",
              link: "",
              loading: "lazy",
              srcset: img.srcset,
            },
          });
        }
      }
    }

    // Lists → cards or text blocks
    if (hasLists) {
      if (shouldConvertToCards(section.listItems)) {
        blocks.push({
          id: generateBlockId(),
          type: "cards",
          props: {
            cards: section.listItems.map(item => ({
              image: "",
              title: item.length > 60 ? item.substring(0, 57) + "..." : item,
              description: item.length > 60 ? item : "",
              link: "",
            })),
            columns: section.listItems.length <= 3 ? 3 : 4,
          },
        });
      } else {
        // Keep as HTML list blocks
        for (const listHtml of section.listHtml) {
          blocks.push({
            id: generateBlockId(),
            type: "text",
            props: { content: listHtml, alignment: "left" },
          });
        }
      }
    }
  }

  // Button links
  for (const link of section.links) {
    if (link.isButton) {
      blocks.push({
        id: generateBlockId(),
        type: "button",
        props: {
          text: link.text,
          url: link.url,
          alignment: "center",
          style: "primary",
          size: "lg",
        },
      });
    }
  }

  // Process remaining raw elements (non-FAQ)
  for (const raw of section.rawElements) {
    if (raw.type === "faq-q" || raw.type === "faq-a") continue; // already handled

    if (raw.type === "heading") {
      try {
        const { level, text } = JSON.parse(raw.html);
        blocks.push({
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
      } catch { /* skip malformed */ }
    } else if (raw.type === "blockquote") {
      // Blockquotes → testimonial blocks
      const quoteText = raw.html;
      if (quoteText) {
        blocks.push({
          id: generateBlockId(),
          type: "testimonial",
          props: {
            quote: quoteText,
            author: "",
            rating: 5,
            avatar: "",
          },
        });
      }
    } else if (raw.type === "table") {
      blocks.push({
        id: generateBlockId(),
        type: "html",
        props: { code: raw.html },
      });
    } else if (raw.type === "hr") {
      blocks.push({
        id: generateBlockId(),
        type: "divider",
        props: { style: "solid", color: "#e5e7eb", width: "100%" },
      });
    }
  }

  return blocks;
}

// ── Core Page Block Builder (Template-Driven) ──────────────────────────

/** Build landing-page-style blocks from parsed Google Doc HTML.
 *  Creates a structured page layout with hero, columns, cards, FAQ, CTA, etc.
 *  rather than a flat dump of heading + text blocks. */
function buildCorePageBlocks(
  h1Text: string,
  title: string,
  heroImageUrl: string,
  articleHtml: string,
  pagePhotosMap: Record<string, string>
): any[] {
  const allBlocks: any[] = [];

  // ─── 1. Hero Block ─────────────────────────────────────────────
  // Parse first paragraph as subtext for the hero
  let heroSubtext = "";
  if (articleHtml) {
    const $temp = cheerio.load(articleHtml);
    const firstP = $temp("p").first();
    if (firstP.length) {
      const firstText = firstP.text().trim();
      // Use first paragraph as subtext if it's a reasonable intro length
      if (firstText.length > 20 && firstText.length < 300) {
        heroSubtext = firstText;
        // Remove it from articleHtml so it doesn't appear twice
        firstP.remove();
        articleHtml = $temp("body").html() || articleHtml;
      }
    }
  }

  allBlocks.push({
    id: generateBlockId(),
    type: "hero",
    props: {
      heading: h1Text || title,
      subtext: heroSubtext,
      bgImage: heroImageUrl,
      overlay: true,
      ctaText: "Get Started",
      ctaUrl: "#main-content",
      ctaText2: "Contact Our Team",
      ctaUrl2: "/contact",
    },
  });

  // ─── 2. Parse content into structured sections ───────────────────
  const parsedSections = parseIntoSections(articleHtml, pagePhotosMap);

  if (parsedSections.length === 0) {
    // Fallback: add a placeholder block
    allBlocks.push({
      id: generateBlockId(),
      type: "spacer",
      props: { height: 40 },
    });
    allBlocks.push({
      id: generateBlockId(),
      type: "text",
      props: {
        content: "<p>Page content will go here. Edit this page to add your content.</p>",
        alignment: "center",
      },
    });
  } else {
    // Add an anchor point after hero
    allBlocks.push({
      id: generateBlockId(),
      type: "spacer",
      props: { height: 40 },
    });

    for (let i = 0; i < parsedSections.length; i++) {
      const section = parsedSections[i];

      // Add spacer before each section (except the first intro section without heading)
      if (i > 0 || section.heading) {
        allBlocks.push({
          id: generateBlockId(),
          type: "spacer",
          props: { height: 48 },
        });
      }

      // If this is a section with a heading, add a subtle divider before it
      if (section.heading && i > 0) {
        allBlocks.push({
          id: generateBlockId(),
          type: "divider",
          props: { style: "solid", color: "#e5e7eb", width: "60%" },
        });
        allBlocks.push({
          id: generateBlockId(),
          type: "spacer",
          props: { height: 24 },
        });
      }

      // Build blocks from this section
      const sectionBlocks = buildBlocksFromSection(section);
      allBlocks.push(...sectionBlocks);
    }
  }

  // ─── 3. Bottom CTA Block ──────────────────────────────────────
  allBlocks.push({
    id: generateBlockId(),
    type: "spacer",
    props: { height: 60 },
  });

  allBlocks.push({
    id: generateBlockId(),
    type: "cta",
    props: {
      heading: "Ready to Get Started?",
      text: "Contact the Spyglass Realty team today and let us help you with your real estate needs.",
      buttonText: "Contact Us Today",
      buttonUrl: "https://www.spyglassrealty.com/contact",
      bgColor: "#1a365d",
    },
  });

  allBlocks.push({
    id: generateBlockId(),
    type: "spacer",
    props: { height: 40 },
  });

  return allBlocks;
}

// ── POST /api/admin/core/import-sheet ──────────────────────────────────
// Accepts a Google Sheets URL, fetches the sheet, parses Google Doc content,
// and creates draft core pages in the page builder (landingPages table).
router.post("/admin/core/import-sheet", async (req, res) => {
  try {
    console.log("Core page import v2 - smart templates active");
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
      } else if (imageCell?.v && typeof imageCell.v === "string") {
        // Check if it's "No image" or similar
        const cellValue = imageCell.v.toLowerCase().trim();
        if (cellValue !== "no image" && cellValue !== "none" && cellValue !== "") {
          heroImageUrl = imageCell.v;
        }
      }

      let ogImageUrl = "";
      if (ogImageCell?.f) {
        ogImageUrl = extractUrlFromFormula(ogImageCell.f);
      } else if (ogImageCell?.l?.Target) {
        ogImageUrl = ogImageCell.l.Target;
      } else if (ogImageCell?.v && typeof ogImageCell.v === "string" && ogImageCell.v.startsWith("http")) {
        ogImageUrl = ogImageCell.v;
      } else if (ogImageCell?.v && typeof ogImageCell.v === "string") {
        // Check if it's "Same as hero" or similar
        const cellValue = ogImageCell.v.toLowerCase().trim();
        if (cellValue === "same as hero") {
          ogImageUrl = heroImageUrl; // Use the hero image URL
        } else if (cellValue !== "no image" && cellValue !== "none" && cellValue !== "") {
          ogImageUrl = ogImageCell.v;
        }
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
      let heroImageDirectUrl = "";
      if (rawHeroUrl && rawHeroUrl.toLowerCase() !== "no image" && rawHeroUrl !== "") {
        const heroDriveFileId = extractDriveFileId(rawHeroUrl);
        if (heroDriveFileId) {
          const heroLocalPath = await downloadDriveImage(heroDriveFileId, `hero-${slug}.jpg`);
          if (heroLocalPath) {
            heroImageDirectUrl = heroLocalPath;
          } else {
            heroImageDirectUrl = `https://drive.google.com/uc?export=view&id=${heroDriveFileId}`;
          }
        } else if (rawHeroUrl.startsWith("http")) {
          heroImageDirectUrl = rawHeroUrl;
        }
      }

      // Resolve and download OG image
      let ogImageDirectUrl = "";
      if (rawOgUrl && rawOgUrl.toLowerCase() !== "same as hero" && rawOgUrl.toLowerCase() !== "no image" && rawOgUrl !== "") {
        const ogDriveFileId = extractDriveFileId(rawOgUrl);
        if (ogDriveFileId) {
          const ogLocalPath = await downloadDriveImage(ogDriveFileId, `og-${slug}.jpg`);
          if (ogLocalPath) {
            ogImageDirectUrl = ogLocalPath;
          } else {
            ogImageDirectUrl = `https://drive.google.com/uc?export=view&id=${ogDriveFileId}`;
          }
        } else if (rawOgUrl.startsWith("http")) {
          ogImageDirectUrl = rawOgUrl;
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
      if (heroImageDirectUrl && heroImageDirectUrl !== "no-image") {
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
      
      // Use a default hero image if none provided
      if (!localHeroUrl || localHeroUrl === "no-image") {
        localHeroUrl = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80";
      }

      // Build landing-page-style blocks (template-driven)
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
            if (imageUrl.startsWith("http")) {
              const blobUrl = await uploadImageToVercelBlob(imageUrl, "core-images");
              if (blobUrl) section.props.url = blobUrl;
            }
          } catch (e) { /* keep original URL */ }
        }
        // Also upload images inside columns blocks
        if (section.type === "columns" && section.children) {
          for (const column of section.children) {
            for (const block of column) {
              if (block.type === "image" && block.props?.url) {
                try {
                  let imageUrl = block.props.url;
                  if (imageUrl.startsWith("/")) {
                    imageUrl = `${RENDER_BASE}${imageUrl}`;
                  }
                  if (imageUrl.startsWith("http")) {
                    const blobUrl = await uploadImageToVercelBlob(imageUrl, "core-images");
                    if (blobUrl) block.props.url = blobUrl;
                  }
                } catch (e) { /* keep original URL */ }
              }
            }
          }
        }
        // Upload images in image-gallery blocks
        if (section.type === "image-gallery" && section.props?.images) {
          for (const img of section.props.images) {
            if (img.url) {
              try {
                let imageUrl = img.url;
                if (imageUrl.startsWith("/")) {
                  imageUrl = `${RENDER_BASE}${imageUrl}`;
                }
                if (imageUrl.startsWith("http")) {
                  const blobUrl = await uploadImageToVercelBlob(imageUrl, "core-images");
                  if (blobUrl) img.url = blobUrl;
                }
              } catch (e) { /* keep original URL */ }
            }
          }
        }
        // Upload images in cards blocks
        if (section.type === "cards" && section.props?.cards) {
          for (const card of section.props.cards) {
            if (card.image) {
              try {
                let imageUrl = card.image;
                if (imageUrl.startsWith("/")) {
                  imageUrl = `${RENDER_BASE}${imageUrl}`;
                }
                if (imageUrl.startsWith("http")) {
                  const blobUrl = await uploadImageToVercelBlob(imageUrl, "core-images");
                  if (blobUrl) card.image = blobUrl;
                }
              } catch (e) { /* keep original URL */ }
            }
          }
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
