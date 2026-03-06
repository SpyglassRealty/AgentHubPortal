# Spyglass Realty Content Migration Plan

## Project Overview
Strict content-only migration from https://spyglassrealty.com to Vercel site for SEO/AEO/GEO continuity.

## Migration Status
- **Started**: 2026-02-24
- **Source**: https://www.spyglassrealty.com/  
- **Destination**: ~/clawd/projects/recruiting-pipeline-next (Next.js/Vercel)
- **Status**: Phase 1 - Site Structure Discovery

## Site Analysis Progress

### Discovered Pages
- [x] Homepage (/) - Main landing page with hero content, testimonials, CTA

### Next Steps
1. Map complete site structure through navigation crawling
2. Identify all target page types (community, blog, core pages, landing pages)
3. Create content extraction pipeline
4. Implement in Vercel site
5. Generate migration report and CSV

## Technical Notes
- Robots.txt: 5-second crawl delay required
- Site redirects: spyglassrealty.com -> www.spyglassrealty.com
- Content extraction: HTML body content only (h1-h6, paragraphs, lists, FAQs, links, CTAs)
- Preservation rules: ZERO content changes, maintain exact structure and links