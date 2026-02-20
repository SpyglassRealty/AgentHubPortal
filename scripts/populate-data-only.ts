#!/usr/bin/env tsx
/**
 * POPULATE DATA ONLY - Add Communities and Blog Content
 */

import { pool } from "../server/db";

async function populateData() {
  console.log('🚀 POPULATING Communities & Blog Data...\n');
  
  try {
    // Add Communities
    console.log('🏘️ Adding Austin Communities...');
    const communities = [
      ['downtown-austin', 'Downtown Austin', 'Travis', 'Downtown Austin Real Estate | Condos & Lofts for Sale'],
      ['westlake', 'Westlake', 'Travis', 'Westlake Austin Homes for Sale | Luxury Real Estate'],
      ['cedar-park', 'Cedar Park', 'Williamson', 'Cedar Park TX Real Estate | Family-Friendly Homes'],
      ['round-rock', 'Round Rock', 'Williamson', 'Round Rock TX Homes for Sale | Affordable Family Living'],
      ['south-lamar', 'South Lamar', 'Travis', 'South Lamar Austin Real Estate | Hip Neighborhood Living'],
      ['mueller', 'Mueller', 'Travis', 'Mueller Austin Real Estate | Master-Planned Community'],
      ['travis-heights', 'Travis Heights', 'Travis', 'Travis Heights Austin | Historic Neighborhood Real Estate'],
      ['dripping-springs', 'Dripping Springs', 'Hays', 'Dripping Springs Real Estate | Hill Country Living']
    ];
    
    let communitiesAdded = 0;
    for (const [slug, name, county, title] of communities) {
      const result = await pool.query(`
        INSERT INTO communities (slug, name, county, meta_title, description, published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING
        RETURNING slug
      `, [slug, name, county, title, `${name} neighborhood in ${county} County, Austin Metro area.`, true]);
      
      if (result.rows.length > 0) {
        communitiesAdded++;
        console.log(`  ✓ Added ${name}`);
      } else {
        console.log(`  - ${name} (already exists)`);
      }
    }
    
    // Add Blog Author
    console.log('\n✍️ Adding Blog Author...');
    const authorResult = await pool.query(`
      INSERT INTO blog_authors (id, name, email, bio, created_at, updated_at) 
      VALUES ('spyglass-team', 'Spyglass Realty Team', 'info@spyglassrealty.com', 'Expert real estate team serving Austin Metro area with local market knowledge and exceptional service.', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `);
    
    if (authorResult.rows.length > 0) {
      console.log('  ✓ Added Spyglass Realty Team author');
    } else {
      console.log('  - Author already exists');
    }
    
    // Add Blog Categories
    console.log('\n📂 Adding Blog Categories...');
    const categories = [
      ['market-updates', 'Market Updates', 'market-updates', 'Latest Austin real estate market trends and analysis', 1],
      ['home-buying', 'Home Buying', 'home-buying', 'Tips and guidance for home buyers', 2],
      ['home-selling', 'Home Selling', 'home-selling', 'Strategies and advice for home sellers', 3],
      ['neighborhoods', 'Neighborhoods', 'neighborhoods', 'Austin area neighborhood spotlights and guides', 4]
    ];
    
    let categoriesAdded = 0;
    for (const [id, name, slug, desc, order] of categories) {
      const result = await pool.query(`
        INSERT INTO blog_categories (id, name, slug, description, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `, [id, name, slug, desc, order]);
      
      if (result.rows.length > 0) {
        categoriesAdded++;
        console.log(`  ✓ Added ${name} category`);
      } else {
        console.log(`  - ${name} category (already exists)`);
      }
    }
    
    // Add Sample Blog Posts
    console.log('\n📝 Adding Sample Blog Posts...');
    const posts = [
      [
        'austin-market-update-feb-2024',
        'Austin Real Estate Market Update: February 2024',
        'austin-market-update-feb-2024',
        '<h2>Market Overview</h2><p>The Austin real estate market continues to show resilience in February 2024, with steady demand and evolving pricing dynamics across different neighborhoods.</p><h3>Key Market Indicators</h3><ul><li>Median home price: $550,000 (up 3.2% year-over-year)</li><li>Days on market: 28 days (down from 32 days last month)</li><li>Inventory levels: 2.1 months supply (slightly improving)</li></ul><h3>Neighborhood Spotlights</h3><p>Downtown Austin condos are seeing increased activity, while suburban areas like Cedar Park and Round Rock continue attracting families seeking value and space.</p>',
        'A comprehensive look at Austin real estate trends, pricing, and market conditions for February 2024.',
        'spyglass-team',
        'published',
        '2024-02-15',
        '{market-updates}',
        3
      ],
      [
        'first-time-buyer-guide-austin',
        'First-Time Home Buyer Guide: Austin Edition',
        'first-time-buyer-guide-austin',
        '<h2>Getting Started</h2><p>Buying your first home in Austin can feel overwhelming, but with the right guidance, it can be an exciting and successful journey.</p><h3>Step 1: Get Pre-Approved</h3><p>Before you start house hunting, get pre-approved for a mortgage. This shows sellers you are serious and helps you understand your budget.</p><h3>Step 2: Choose Your Area</h3><p>Austin offers diverse neighborhoods from urban downtown living to family-friendly suburbs. Consider commute to work, school districts, lifestyle preferences, and future resale potential.</p><h3>Step 3: Work with Local Experts</h3><p>A knowledgeable local agent can guide you through Austin competitive market and help you make informed decisions.</p>',
        'Everything first-time buyers need to know about purchasing a home in the Austin metro area.',
        'spyglass-team',
        'published',
        '2024-02-10',
        '{home-buying}',
        5
      ],
      [
        'selling-austin-home-fast',
        '5 Essential Tips for Selling Your Austin Home Fast',
        'selling-austin-home-fast',
        '<h2>Maximize Your Home Appeal</h2><p>In Austin competitive market, presentation is everything. Here are five essential tips to help your home sell quickly.</p><h3>1. Price It Right from Day One</h3><p>Proper pricing is crucial in Austin fast-paced market. An overpriced home will sit, while a well-priced home generates multiple offers.</p><h3>2. Stage for Austin Buyers</h3><p>Austin buyers love modern, clean aesthetics with touches of local character. Consider professional staging to showcase your home potential.</p><h3>3. Highlight Austin Lifestyle Benefits</h3><p>Emphasize proximity to music venues, food trucks, hiking trails, or tech companies that make Austin special.</p><h3>4. Professional Photography is a Must</h3><p>In a visual market, high-quality photos can make or break your listing.</p><h3>5. Time Your Listing Strategically</h3><p>Austin market has seasonal patterns. Spring and early fall typically see the most buyer activity.</p>',
        'Proven strategies to help your Austin home sell quickly and for top dollar in today market.',
        'spyglass-team',
        'published',
        '2024-02-05',
        '{home-selling}',
        4
      ]
    ];
    
    let postsAdded = 0;
    for (const [id, title, slug, content, excerpt, authorId, status, publishedAt, categoryIds, readingTime] of posts) {
      const result = await pool.query(`
        INSERT INTO blog_posts (id, title, slug, content, excerpt, author_id, status, published_at, category_ids, reading_time, view_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `, [id, title, slug, content, excerpt, authorId, status, publishedAt, categoryIds, readingTime]);
      
      if (result.rows.length > 0) {
        postsAdded++;
        console.log(`  ✓ Added "${title}"`);
      } else {
        console.log(`  - "${title}" (already exists)`);
      }
    }
    
    // Final count check
    console.log('\n📊 FINAL RESULTS:');
    
    const [communitiesCount] = await pool.query('SELECT COUNT(*) as count FROM communities');
    const [authorsCount] = await pool.query('SELECT COUNT(*) as count FROM blog_authors');
    const [categoriesCount] = await pool.query('SELECT COUNT(*) as count FROM blog_categories');
    const [postsCount] = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
    
    console.log(`  Communities: ${communitiesCount.rows[0].count} (${communitiesAdded} new)`);
    console.log(`  Blog Authors: ${authorsCount.rows[0].count}`);
    console.log(`  Blog Categories: ${categoriesCount.rows[0].count} (${categoriesAdded} new)`);
    console.log(`  Blog Posts: ${postsCount.rows[0].count} (${postsAdded} new)`);
    
    console.log('\n🎉 SUCCESS! Communities & Blog sections should now display content.');
    console.log('\n📋 Next Steps:');
    console.log('  1. Refresh the Spyglass IDX site');
    console.log('  2. Check Communities section - should show 8 Austin neighborhoods');
    console.log('  3. Check Blog section - should show 3 real estate articles');
    
  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the population
populateData().catch(console.error);