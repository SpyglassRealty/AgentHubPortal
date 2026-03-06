import crypto from 'crypto';
import type { Request, Response } from 'express';

const ALLOWED_BLOCK_TYPES = [
  'core-hero',
  'core-split',
  'core-cards',
  'core-testimonials',
  'core-text',
];

interface CacheEntry {
  rendered: any[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) cache.delete(key);
  }
}, 60 * 1000);

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

const renderCoreHero = (content: any): string => {
  const { title, subtitle, backgroundImage, ctaText, ctaLink } = content || {};
  return `<section style="position:relative;min-height:500px;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem;background-color:#f7f8fa;${
    backgroundImage
      ? `background-image:linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('${backgroundImage}');background-size:cover;background-position:center;`
      : ''
  }"><div style="max-width:800px;margin:0 auto;${backgroundImage ? 'color:white;' : 'color:#1a1a1a;'}">${title ? `<h1>${title}</h1>` : ''}${
    subtitle ? `<p style="font-size:1.25rem;margin-bottom:2rem;opacity:0.9;">${subtitle}</p>` : ''
  }${
    ctaText && ctaLink
      ? `<a href="${ctaLink}" style="display:inline-block;padding:1rem 2rem;background-color:#2563eb;color:white;text-decoration:none;border-radius:0.5rem;font-weight:600;">${ctaText}</a>`
      : ''
  }</div></section>`;
};

const renderCoreSplit = (content: any): string => {
  const { heading, body, image, imagePosition = 'right', ctaText, ctaLink } = content || {};
  const t = `<div style="flex:1;min-width:300px;padding:2rem;">${heading ? `<h2>${heading}</h2>` : ''}${
    body ? `<div style="font-size:1.125rem;line-height:1.7;color:#4a5568;margin-bottom:1.5rem;">${body}</div>` : ''
  }${
    ctaText && ctaLink
      ? `<a href="${ctaLink}" style="display:inline-block;padding:0.75rem 1.5rem;background-color:#2563eb;color:white;text-decoration:none;border-radius:0.375rem;font-weight:600;">${ctaText}</a>`
      : ''
  }</div>`;
  const img = image ? `<div style="flex:1;min-width:300px;padding:2rem;"><img src="${image}" alt="" style="width:100%;height:auto;border-radius:0.75rem;box-shadow:0 4px 20px rgba(0,0,0,0.1);" /></div>` : '';
  return `<section style="padding:4rem 2rem;background-color:white;"><div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:3rem;flex-wrap:wrap;">${
    imagePosition === 'left' ? img + t : t + img
  }</div></section>`;
};

const renderCoreCards = (content: any): string => {
  const { heading, cards = [], columns = 3, background } = content || {};
  const bg = background === 'dark' ? '#1a1a1a' : '#f7f8fa';
  const hc = background === 'dark' ? 'white' : '#1a1a1a';
  const items = cards
    .map(
      (c: any) =>
        `<div style="flex:1;min-width:280px;max-width:${Math.floor(
          1100 / columns
        )}px;background:white;border-radius:0.75rem;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">${
          c.imageUrl ? `<img src="${c.imageUrl}" alt="" style="width:100%;height:200px;object-fit:cover;" />` : ''
        }<div style="padding:1.5rem;">${c.title ? `<h3>${c.title}</h3>` : ''}${
          c.description ? `<p style="font-size:1rem;line-height:1.6;color:#4a5568;margin-bottom:1rem;">${c.description}</p>` : ''
        }${c.linkText && c.linkUrl ? `<a href="${c.linkUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${c.linkText} →</a>` : ''}</div></div>`
    )
    .join('');
  return `<section style="padding:4rem 2rem;background-color:${bg};"><div style="max-width:1200px;margin:0 auto;">${
    heading ? `<h2 style="text-align:center;margin-bottom:3rem;color:${hc};">${heading}</h2>` : ''
  }<div style="display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;">${items}</div></div></section>`;
};

const renderCoreTestimonials = (content: any): string => {
  const { heading, testimonials = [], background } = content || {};
  const bg = background === 'dark' ? '#1a1a1a' : 'white';
  const hc = background === 'dark' ? 'white' : '#1a1a1a';
  const items = testimonials
    .map(
      (t: any) =>
        `<div style="flex:1;min-width:300px;max-width:400px;background:${
          background === 'dark' ? '#2d2d2d' : 'white'
        };border-radius:0.75rem;padding:2rem;box-shadow:0 4px 20px rgba(0,0,0,0.08);">${
          t.rating ? `<div style="margin-bottom:1rem;color:#f59e0b;font-size:1.25rem;">${'★'.repeat(Math.min(t.rating, 5))}</div>` : ''
        }${t.quote ? `<p style="font-size:1rem;line-height:1.7;color:#4a5568;margin-bottom:1.5rem;font-style:italic;">"${t.quote}"</p>` : ''}${
          t.author ? `<div style="font-weight:600;color:${background === 'dark' ? '#e2e8f0' : '#1a1a1a'};">${t.author}</div>` : ''
        }</div>`
    )
    .join('');
  return `<section style="padding:4rem 2rem;background-color:${bg};"><div style="max-width:1200px;margin:0 auto;">${
    heading ? `<h2 style="text-align:center;margin-bottom:3rem;color:${hc};">${heading}</h2>` : ''
  }<div style="display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;">${items}</div></div></section>`;
};

const renderCoreText = (content: any): string => {
  const { heading, content: textContent, textAlign = 'center', maxWidth = '800px', background } = content || {};
  const bgS = background === 'dark' ? 'background-color:#1a1a1a;color:white;' : 'background-color:white;color:#1a1a1a;';
  const bc = background === 'dark' ? '#e2e8f0' : '#4a5568';
  return `<section style="padding:4rem 2rem;${bgS}"><div style="max-width:${maxWidth};margin:0 auto;text-align:${textAlign};">${
    heading ? `<h2>${heading}</h2>` : ''
  }${textContent ? `<div style="font-size:1.125rem;line-height:1.8;color:${bc};">${textContent}</div>` : ''}</div></section>`;
};

const BLOCK_RENDERERS: Record<string, (content: any) => string> = {
  'core-hero': renderCoreHero,
  'core-split': renderCoreSplit,
  'core-cards': renderCoreCards,
  'core-testimonials': renderCoreTestimonials,
  'core-text': renderCoreText,
};

export function renderBlocks(req: Request, res: Response) {
  try {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 500 * 1024) return res.status(413).json({ error: 'Request body too large. Max 500KB.' });

    const { blocks } = req.body;
    if (!blocks || !Array.isArray(blocks)) return res.status(400).json({ error: 'Request body must contain a "blocks" array.' });

    if (blocks.length > 20) return res.status(413).json({ error: 'Max 20 blocks per request.' });

    if (blocks.length === 0) return res.json({ rendered: [] });

    for (const block of blocks) {
      if (!block.type || !ALLOWED_BLOCK_TYPES.includes(block.type)) {
        return res.status(400).json({
          error: `Invalid block type: "${block.type}". Allowed: ${ALLOWED_BLOCK_TYPES.join(', ')}`
        });
      }
    }

    const cacheKey = crypto.createHash('md5').update(JSON.stringify(blocks)).digest('hex');
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return res.json({ rendered: cached.rendered });

    const rendered = blocks.map((block: any) => {
      const renderer = BLOCK_RENDERERS[block.type];
      const rawHtml = renderer(block.content || {});
      return {
        type: block.type,
        html: sanitizeHtml(rawHtml.trim())
      };
    });

    cache.set(cacheKey, { rendered, timestamp: Date.now() });
    return res.json({ rendered });
  } catch (err: any) {
    console.error('[render-blocks] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error rendering blocks.' });
  }
}