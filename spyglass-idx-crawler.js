import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const baseUrl = 'https://spyglass-idx.vercel.app';
  const visited = new Set();
  const results = [];
  const brokenLinks = [];
  
  // Capture console errors
  const consoleErrors = new Map();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const url = page.url();
      if (!consoleErrors.has(url)) {
        consoleErrors.set(url, []);
      }
      consoleErrors.get(url).push(msg.text());
    }
  });
  
  // Main routes to check
  const mainRoutes = [
    '/',
    '/search',
    '/blog',
    '/communities',
    '/contact',
    '/about-us',
    '/services',
    '/buying',
    '/selling',
    '/sign-in',
    '/privacy-policy',
    '/terms-of-service'
  ];
  
  async function crawlPage(url) {
    if (visited.has(url) || !url.startsWith(baseUrl)) return;
    visited.add(url);
    
    console.log(`Crawling: ${url}`);
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      const status = response.status();
      const title = await page.title();
      
      // Get all links on the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href && !href.startsWith('mailto:') && !href.startsWith('tel:'));
      });
      
      // Check for broken internal links
      const internalLinks = links.filter(link => link.startsWith(baseUrl));
      for (const link of internalLinks) {
        if (!visited.has(link)) {
          try {
            const linkResponse = await fetch(link, { method: 'HEAD' });
            if (linkResponse.status >= 400) {
              brokenLinks.push({ fromPage: url, toPage: link, status: linkResponse.status });
            }
          } catch (e) {
            // Skip link check errors
          }
        }
      }
      
      results.push({
        url,
        status,
        title,
        consoleErrors: consoleErrors.get(url) || [],
        linkCount: links.length,
        internalLinkCount: internalLinks.length
      });
      
      // Crawl nav links and other important links (limit depth)
      if (url === baseUrl) {
        // Get navigation links
        const navLinks = await page.evaluate(() => {
          const navSelectors = [
            'nav a',
            'header a',
            '.nav-link',
            '[class*="navigation"] a'
          ];
          const links = new Set();
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(a => {
              if (a.href && !a.href.includes('mailto:') && !a.href.includes('tel:')) {
                links.add(a.href);
              }
            });
          });
          return Array.from(links);
        });
        
        // Add nav links to crawl queue
        for (const navLink of navLinks) {
          if (navLink.startsWith(baseUrl) && !visited.has(navLink)) {
            await crawlPage(navLink);
          }
        }
      }
      
    } catch (error) {
      results.push({
        url,
        status: 'ERROR',
        title: 'Failed to load',
        error: error.message,
        consoleErrors: consoleErrors.get(url) || []
      });
    }
  }
  
  // Crawl main routes
  for (const route of mainRoutes) {
    await crawlPage(baseUrl + route);
  }
  
  // Also check some blog posts
  const blogPosts = [
    '/blog/benefits-of-moving-to-texas',
    '/blog/10-best-family-swimming-spots-in-austin-texas',
    '/blog/best-school-districts-austin-tx',
    '/blog/test-post-number-25',  // This should be post #25
    '/blog/test-post-number-64'   // This should be post #64
  ];
  
  for (const post of blogPosts) {
    await crawlPage(baseUrl + post);
  }
  
  // Print results
  console.log('\n=== CRAWL RESULTS ===\n');
  
  console.log('Pages Crawled:', results.length);
  console.log('Total Pages Visited:', visited.size);
  
  console.log('\n--- Page Status Summary ---');
  const statusGroups = {};
  results.forEach(r => {
    const status = r.status || 'ERROR';
    if (!statusGroups[status]) statusGroups[status] = [];
    statusGroups[status].push(r.url);
  });
  
  Object.entries(statusGroups).forEach(([status, urls]) => {
    console.log(`\n${status}: ${urls.length} pages`);
    urls.forEach(url => console.log(`  - ${url}`));
  });
  
  console.log('\n--- Pages with Console Errors ---');
  results.filter(r => r.consoleErrors.length > 0).forEach(r => {
    console.log(`\n${r.url}:`);
    r.consoleErrors.forEach(err => console.log(`  ERROR: ${err}`));
  });
  
  console.log('\n--- Broken Internal Links ---');
  if (brokenLinks.length === 0) {
    console.log('No broken internal links found!');
  } else {
    brokenLinks.forEach(link => {
      console.log(`  From: ${link.fromPage}`);
      console.log(`  To: ${link.toPage} (Status: ${link.status})`);
    });
  }
  
  console.log('\n--- Page Details ---');
  results.forEach(r => {
    console.log(`\n${r.url}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Title: ${r.title}`);
    console.log(`  Links: ${r.linkCount || 0} total, ${r.internalLinkCount || 0} internal`);
    if (r.error) console.log(`  Error: ${r.error}`);
  });
  
  await browser.close();
})();