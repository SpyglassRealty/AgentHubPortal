#!/usr/bin/env node
// Parse downloaded REW agent pages into structured JSON
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const RAW_DIR = '/Users/ryanrodenbeck/clawd/projects/agent-migration/raw-pages';
const OUTPUT = '/Users/ryanrodenbeck/clawd/projects/agent-migration/scraped-agents.json';

function extractBetween(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return '';
  const afterStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, afterStart);
  if (endIdx === -1) return '';
  return html.substring(afterStart, endIdx).trim();
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
}

function extractAllMatches(html, regex) {
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1] || m[0]);
  }
  return matches;
}

function parseAgentPage(rawHtml, slug) {
  const agent = { slug, oldUrl: `/agent/${slug}/`, newSlug: slug };
  
  // Strip <style> and <script> blocks to prevent CSS class names from polluting extractBetween matches
  const html = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Extract name from title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    const title = stripTags(titleMatch[1]);
    // Title format: "Name | Spyglass Realty" or "Name - Title | Spyglass Realty" 
    const namePart = title.split('|')[0].trim();
    // Some might have " - Title" after the name
    const dashParts = namePart.split(' - ');
    agent.fullName = dashParts[0].trim();
    if (dashParts.length > 1) {
      agent.titleFromMeta = dashParts.slice(1).join(' - ').trim();
    }
  }
  
  // Extract name from hero headline
  const heroNameMatch = html.match(/hero__container__headline[^>]*>([^<]+)</i);
  if (heroNameMatch) {
    agent.fullName = stripTags(heroNameMatch[1]).trim();
  }
  
  // Split name into first/last
  if (agent.fullName) {
    const nameParts = agent.fullName.split(/\s+/);
    agent.firstName = nameParts[0];
    agent.lastName = nameParts.slice(1).join(' ');
  }
  
  // Extract professional title from kicker headline or hero info
  const kickerMatch = html.match(/kicker__headline[^>]*>([^<]+)</i);
  if (kickerMatch) {
    agent.professionalTitle = stripTags(kickerMatch[1]).trim();
  }
  
  // Extract hero info items (phone, email, location)
  const heroInfoSection = extractBetween(html, 'class="hero__info"', '</ul>');
  if (heroInfoSection) {
    // Phone - look for tel: links
    const phoneMatch = heroInfoSection.match(/href="tel:([^"]+)"/i);
    if (phoneMatch) {
      agent.phone = phoneMatch[1].trim();
    }
    
    // Email - look for mailto: links
    const emailMatch = heroInfoSection.match(/href="mailto:([^"]+)"/i);
    if (emailMatch) {
      agent.email = emailMatch[1].trim();
    }
  }
  
  // Fallback: search entire page for phone/email
  if (!agent.phone) {
    const phoneMatch = html.match(/href="tel:([^"]+)"/i);
    if (phoneMatch) {
      agent.phone = phoneMatch[1].replace(/\s+/g, '').trim();
    }
  }
  if (!agent.email) {
    const emailMatch = html.match(/href="mailto:([^"]+)"/i);
    if (emailMatch) {
      agent.email = emailMatch[1].trim();
    }
  }
  
  // Extract headshot image (check data-src first for lazy-loaded images)
  const agentImgSection = extractBetween(html, 'class="agent-details__img"', '</div>');
  if (agentImgSection) {
    // First try data-src (lazy-loaded images)
    let imgMatch = agentImgSection.match(/data-src="([^"]+)"/i);
    if (!imgMatch || imgMatch[1].includes('no-image')) {
      // Fallback to src attribute
      imgMatch = agentImgSection.match(/src="([^"]+)"/i);
    }
    if (imgMatch && !imgMatch[1].includes('35mm_landscape')) {
      let imgUrl = imgMatch[1];
      if (imgUrl.startsWith('/')) {
        imgUrl = 'https://www.spyglassrealty.com' + imgUrl;
      }
      agent.headshotUrl = imgUrl;
    }
  }
  
  // Fallback: look for agent photo in summary section
  if (!agent.headshotUrl) {
    const summarySection = extractBetween(html, 'agent-details__summary', '</section>');
    if (summarySection) {
      // Try data-src first
      let imgMatch = summarySection.match(/data-src="([^"]*(?:uploads|photos|agents)[^"]*)"/i);
      if (!imgMatch || imgMatch[1].includes('no-image')) {
        // Fallback to src
        imgMatch = summarySection.match(/src="([^"]*(?:uploads|photos|agents)[^"]*)"/i);
      }
      if (imgMatch && !imgMatch[1].includes('35mm_landscape')) {
        let imgUrl = imgMatch[1];
        if (imgUrl.startsWith('/')) {
          imgUrl = 'https://www.spyglassrealty.com' + imgUrl;
        }
        agent.headshotUrl = imgUrl;
      }
    }
  }
  
  // Extract bio/about text
  const bioSection = extractBetween(html, 'agent-details__content', '</div>');
  if (bioSection) {
    // Get all paragraph content
    const paragraphs = extractAllMatches(bioSection, /<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs.length > 0) {
      agent.bio = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
      agent.bioPlain = paragraphs.map(p => stripTags(p)).join('\n\n');
    }
  }
  
  // Broader bio extraction - look in the main content area
  if (!agent.bio || agent.bio.length < 50) {
    const mainContent = extractBetween(html, 'id="main"', '</main>') || extractBetween(html, 'class="main"', '</main>');
    if (mainContent) {
      // Look for substantial paragraphs (more than 100 chars) that aren't navigation
      const allParagraphs = extractAllMatches(mainContent, /<p[^>]*>([\s\S]*?)<\/p>/gi);
      const contentParagraphs = allParagraphs
        .map(p => p.trim())
        .filter(p => {
          const plain = stripTags(p);
          return plain.length > 50 && !plain.includes('Search') && !plain.includes('Navigate');
        });
      
      if (contentParagraphs.length > 0) {
        agent.bio = contentParagraphs.map(p => `<p>${p}</p>`).join('\n');
        agent.bioPlain = contentParagraphs.map(p => stripTags(p)).join('\n\n');
      }
    }
  }
  
  // Extract social media links
  agent.socialLinks = {};
  
  // Get the hero__info-social section specifically (personal social links)
  const socialStart = html.indexOf('hero__info-social');
  let socialSection = '';
  if (socialStart !== -1) {
    // Grab about 2000 chars after the social section starts
    socialSection = html.substring(socialStart, socialStart + 2000);
  }
  
  const socialPatterns = [
    { name: 'facebook', pattern: /href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i },
    { name: 'instagram', pattern: /href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i },
    { name: 'linkedin', pattern: /href="(https?:\/\/(?:www\.)?linkedin\.com\/[^"]+)"/i },
    { name: 'twitter', pattern: /href="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i },
    { name: 'youtube', pattern: /href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/i },
    { name: 'tiktok', pattern: /href="(https?:\/\/(?:www\.)?tiktok\.com\/[^"]+)"/i },
  ];
  
  // Search in social section first, then fall back to full HTML
  for (const { name, pattern } of socialPatterns) {
    let match = null;
    if (socialSection) {
      match = pattern.exec(socialSection);
    }
    if (!match) {
      // Search full HTML but skip facebook tracking pixel
      const fullMatches = [...html.matchAll(new RegExp(pattern.source, 'gi'))];
      for (const fm of fullMatches) {
        // Skip tracking pixels and footer links
        if (name === 'facebook' && fm[1].includes('tr?id=')) continue;
        match = fm;
        break;
      }
    }
    if (match) {
      agent.socialLinks[name] = match[1];
    }
  }
  
  // Extract testimonials - look for testimonial review containers  
  agent.testimonials = [];
  const testimonialBlocks = [...html.matchAll(/testimonials-new-custom__review-container[\s\S]*?testimonials-new-custom__review--author-info([\s\S]*?)<\/div>/gi)];
  
  if (testimonialBlocks.length === 0) {
    // Try alternate pattern - look for the review text and author separately
    const reviewTexts = [...html.matchAll(/testimonials-new-custom__review"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi)];
    const reviewAuthors = [...html.matchAll(/testimonials-new-custom__review--author"[^>]*>([\s\S]*?)<\//gi)];
    
    for (let j = 0; j < reviewTexts.length; j++) {
      const text = stripTags(reviewTexts[j][1]).trim();
      if (text.length > 20 && !text.includes('slick-') && !text.includes('slider')) {
        const testimonial = { text };
        if (reviewAuthors[j]) {
          testimonial.author = stripTags(reviewAuthors[j][1]).trim();
        }
        agent.testimonials.push(testimonial);
      }
    }
  }
  
  // Extract office location from breadcrumbs or page content
  const officeMatch = html.match(/office\/([^/"]+)/i);
  if (officeMatch) {
    agent.officeSlug = officeMatch[1];
  }
  
  // Default office
  agent.officeLocation = 'Austin';
  
  // Extract meta description
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (metaDescMatch) {
    agent.metaDescription = metaDescMatch[1];
  }
  
  // Clean up empty fields
  if (!agent.bio) agent.bio = '';
  if (!agent.bioPlain) agent.bioPlain = '';
  if (!agent.phone) agent.phone = '';
  if (!agent.email) agent.email = '';
  if (!agent.headshotUrl) agent.headshotUrl = '';
  if (!agent.professionalTitle) agent.professionalTitle = '';
  if (Object.keys(agent.socialLinks).length === 0) agent.socialLinks = {};
  
  return agent;
}

// Main execution
const files = readdirSync(RAW_DIR).filter(f => f.endsWith('.html'));
console.log(`Found ${files.length} agent pages to parse`);

const agents = [];
for (const file of files) {
  const slug = file.replace('.html', '');
  const html = readFileSync(join(RAW_DIR, file), 'utf-8');
  
  try {
    const agent = parseAgentPage(html, slug);
    agents.push(agent);
    
    const hasData = agent.fullName && (agent.phone || agent.email);
    if (!hasData) {
      console.warn(`⚠️  ${slug}: Missing critical data (name: ${agent.fullName}, phone: ${agent.phone}, email: ${agent.email})`);
    }
  } catch (err) {
    console.error(`❌ Error parsing ${slug}:`, err.message);
  }
}

// Sort alphabetically by last name
agents.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

writeFileSync(OUTPUT, JSON.stringify(agents, null, 2));
console.log(`\n✅ Saved ${agents.length} agents to ${OUTPUT}`);

// Stats
const withBio = agents.filter(a => a.bio && a.bio.length > 100).length;
const withPhone = agents.filter(a => a.phone).length;
const withEmail = agents.filter(a => a.email).length;
const withPhoto = agents.filter(a => a.headshotUrl).length;
const withSocial = agents.filter(a => Object.keys(a.socialLinks).length > 0).length;
const withTestimonials = agents.filter(a => a.testimonials.length > 0).length;

console.log(`\n📊 Stats:`);
console.log(`   Total agents: ${agents.length}`);
console.log(`   With bio (>100 chars): ${withBio}`);
console.log(`   With phone: ${withPhone}`);
console.log(`   With email: ${withEmail}`);
console.log(`   With photo: ${withPhoto}`);
console.log(`   With social links: ${withSocial}`);
console.log(`   With testimonials: ${withTestimonials}`);
