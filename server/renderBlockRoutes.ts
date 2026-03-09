import { Request, Response } from 'express';
import crypto from 'crypto'; // Built-in Node module

// Block type allowlist
const ALLOWED_BLOCK_TYPES = [
  'core-hero',
  'core-split',
  'core-cards',
  'core-testimonials',
  'core-text',
  'community-hero'
];

// Simple in-memory cache with 5-minute TTL
interface CacheEntry {
  html: any[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// Block rendering functions
const renderCoreHero = (content: any): string => {
  const { title, subtitle, backgroundImage, ctaText, ctaLink } = content;
  
  return `
    <section class="hero-section" style="position: relative; min-height: 500px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 4rem 2rem; background-color: #f7f8fa; ${backgroundImage ? `background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${backgroundImage}'); background-size: cover; background-position: center;` : ''}">
      <div style="max-width: 800px; margin: 0 auto; ${backgroundImage ? 'color: white;' : 'color: #1a1a1a;'}">
        ${title ? `<h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1rem; line-height: 1.2;">${title}</h1>` : ''}
        ${subtitle ? `<p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">${subtitle}</p>` : ''}
        ${ctaText && ctaLink ? `<a href="${ctaLink}" style="display: inline-block; padding: 1rem 2rem; background-color: #2563eb; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.3s;">${ctaText}</a>` : ''}
      </div>
    </section>
  `;
};

const renderCoreSplit = (content: any): string => {
  const { heading, body, image, imagePosition = 'right', ctaText, ctaLink } = content;
  
  const textContent = `
    <div style="flex: 1; padding: 2rem;">
      ${heading ? `<h2 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: #1a1a1a;">${heading}</h2>` : ''}
      ${body ? `<div style="font-size: 1.125rem; line-height: 1.7; color: #4a5568; margin-bottom: 1.5rem;">${body}</div>` : ''}
      ${ctaText && ctaLink ? `<a href="${ctaLink}" style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #2563eb; color: white; text-decoration: none; border-radius: 0.375rem; font-weight: 600;">${ctaText}</a>` : ''}
    </div>
  `;
  
  const imageContent = image ? `
    <div style="flex: 1; padding: 2rem;">
      <img src="${image}" alt="" style="width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
    </div>
  ` : '';
  
  return `
    <section style="padding: 4rem 2rem; background-color: white;">
      <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 3rem; flex-wrap: wrap;">
        ${imagePosition === 'left' ? imageContent + textContent : textContent + imageContent}
      </div>
    </section>
  `;
};

const renderCoreCards = (content: any): string => {
  const { heading, cards = [] } = content;
  
  const cardElements = cards.map((card: any) => `
    <div style="background-color: white; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s;">
      ${card.icon ? `<div style="font-size: 3rem; margin-bottom: 1rem;">${card.icon}</div>` : ''}
      ${card.title ? `<h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.75rem; color: #1a1a1a;">${card.title}</h3>` : ''}
      ${card.description ? `<p style="color: #4a5568; line-height: 1.6;">${card.description}</p>` : ''}
    </div>
  `).join('');
  
  return `
    <section style="padding: 4rem 2rem; background-color: #f7f8fa;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${heading ? `<h2 style="text-align: center; font-size: 2.5rem; font-weight: bold; margin-bottom: 3rem; color: #1a1a1a;">${heading}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          ${cardElements}
        </div>
      </div>
    </section>
  `;
};

const renderCoreTestimonials = (content: any): string => {
  const { heading, testimonials = [] } = content;
  
  const testimonialElements = testimonials.map((testimonial: any) => `
    <div style="background-color: white; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      ${testimonial.quote ? `<blockquote style="font-size: 1.125rem; font-style: italic; color: #4a5568; margin-bottom: 1.5rem; line-height: 1.7;">"${testimonial.quote}"</blockquote>` : ''}
      <div style="display: flex; align-items: center; gap: 1rem;">
        ${testimonial.image ? `<img src="${testimonial.image}" alt="${testimonial.name || ''}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` : ''}
        <div>
          ${testimonial.name ? `<div style="font-weight: 600; color: #1a1a1a;">${testimonial.name}</div>` : ''}
          ${testimonial.role ? `<div style="color: #718096; font-size: 0.875rem;">${testimonial.role}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
  
  return `
    <section style="padding: 4rem 2rem; background-color: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${heading ? `<h2 style="text-align: center; font-size: 2.5rem; font-weight: bold; margin-bottom: 3rem; color: #1a1a1a;">${heading}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
          ${testimonialElements}
        </div>
      </div>
    </section>
  `;
};

const renderCoreText = (content: any): string => {
  const { heading, body, alignment = 'left' } = content;
  
  return `
    <section style="padding: 3rem 2rem; background-color: white;">
      <div style="max-width: 800px; margin: 0 auto; text-align: ${alignment};">
        ${heading ? `<h2 style="font-size: 2rem; font-weight: bold; margin-bottom: 1.5rem; color: #1a1a1a;">${heading}</h2>` : ''}
        ${body ? `<div style="font-size: 1.125rem; line-height: 1.8; color: #4a5568;">${body.replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    </section>
  `;
};

const renderCommunityHero = (content: any): string => {
  const { title, subtitle, backgroundImage, stats = [] } = content;
  
  const statElements = stats.map((stat: any) => `
    <div style="text-align: center;">
      <div style="font-size: 2.5rem; font-weight: bold; ${backgroundImage ? 'color: white;' : 'color: #2563eb;'}">${stat.value || '0'}</div>
      <div style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8;">${stat.label || ''}</div>
    </div>
  `).join('');
  
  return `
    <section class="community-hero" style="position: relative; min-height: 400px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 3rem 2rem; background-color: #f7f8fa; ${backgroundImage ? `background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${backgroundImage}'); background-size: cover; background-position: center;` : ''}">
      <div style="max-width: 900px; margin: 0 auto; ${backgroundImage ? 'color: white;' : 'color: #1a1a1a;'}">
        ${title ? `<h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.75rem; line-height: 1.2;">${title}</h1>` : ''}
        ${subtitle ? `<p style="font-size: 1.125rem; margin-bottom: 2rem; opacity: 0.9;">${subtitle}</p>` : ''}
        ${stats.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid ${backgroundImage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'};">
            ${statElements}
          </div>
        ` : ''}
      </div>
    </section>
  `;
};

// Main block renderer
const renderBlock = (block: any): { type: string; html: string } => {
  let html = '';
  
  switch (block.type) {
    case 'core-hero':
      html = renderCoreHero(block.content || {});
      break;
    case 'core-split':
      html = renderCoreSplit(block.content || {});
      break;
    case 'core-cards':
      html = renderCoreCards(block.content || {});
      break;
    case 'core-testimonials':
      html = renderCoreTestimonials(block.content || {});
      break;
    case 'core-text':
      html = renderCoreText(block.content || {});
      break;
    case 'community-hero':
      html = renderCommunityHero(block.content || {});
      break;
    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }
  
  // Sanitize HTML to prevent XSS
  // Remove script tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove on* event handlers
  html = html.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  // Remove javascript: URLs
  html = html.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  html = html.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src="#"');
  
  const sanitized = html;
  
  return {
    type: block.type,
    html: sanitized.trim()
  };
};

// Route handler
export const renderBlocks = async (req: Request, res: Response) => {
  try {
    // Check request size (500KB limit)
    if (req.get('content-length') && parseInt(req.get('content-length')!) > 500 * 1024) {
      return res.status(413).json({ error: 'Request body too large (max 500KB)' });
    }
    
    const { blocks } = req.body;
    
    // Validate input
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ error: 'blocks must be an array' });
    }
    
    if (blocks.length === 0) {
      return res.status(400).json({ error: 'blocks array cannot be empty' });
    }
    
    if (blocks.length > 20) {
      return res.status(413).json({ error: 'Too many blocks (max 20)' });
    }
    
    // Validate block types
    for (const block of blocks) {
      if (!block.type || !ALLOWED_BLOCK_TYPES.includes(block.type)) {
        return res.status(400).json({ 
          error: `Invalid block type: ${block.type}. Allowed types: ${ALLOWED_BLOCK_TYPES.join(', ')}` 
        });
      }
    }
    
    // Generate cache key
    const cacheKey = crypto.createHash('md5').update(JSON.stringify(blocks)).digest('hex');
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ rendered: cached.html });
    }
    
    // Render blocks
    const rendered = blocks.map(block => renderBlock(block));
    
    // Store in cache
    cache.set(cacheKey, {
      html: rendered,
      timestamp: Date.now()
    });
    
    res.json({ rendered });
    
  } catch (error: any) {
    console.error('Error rendering blocks:', error);
    res.status(500).json({ error: 'Failed to render blocks' });
  }
};