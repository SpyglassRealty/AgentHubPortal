#!/usr/bin/env tsx
/**
 * CHECK & FIX MISSING TABLES
 * 
 * First check what tables exist, then create missing ones and populate data
 */

import { db, pool } from "../server/db";
import { communities } from "@shared/schema";
import { sql } from "drizzle-orm";

async function checkAndFixTables() {
  console.log('🔍 CHECKING Database Tables...\n');
  
  try {
    // Check what tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📋 Existing tables:', existingTables);
    
    const requiredTables = [
      'communities',
      'blog_posts', 
      'blog_categories',
      'blog_authors',
      'blog_post_categories'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    console.log('❌ Missing tables:', missingTables);
    
    // Create missing blog tables
    if (missingTables.length > 0) {
      console.log('\n🔨 CREATING Missing Tables...');
      await createMissingTables(missingTables);
    }
    
    // Check table counts
    console.log('\n📊 Current Data Counts:');
    
    if (existingTables.includes('communities')) {
      const [communitiesCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communities);
      console.log(`  Communities: ${communitiesCount.count}`);
      
      if (communitiesCount.count === 0) {
        console.log('\n🏘️ ADDING Austin Communities...');
        await addAustinCommunities();
      }
    }
    
    console.log('\n✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createMissingTables(missingTables: string[]) {
  
  if (missingTables.includes('blog_authors')) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_authors (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        email varchar,
        bio text,
        avatar_url varchar,
        social_links jsonb,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created blog_authors table');
  }
  
  if (missingTables.includes('blog_categories')) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        slug varchar NOT NULL UNIQUE,
        description text,
        parent_id varchar,
        meta_title varchar,
        meta_description text,
        sort_order integer DEFAULT 0,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created blog_categories table');
  }
  
  if (missingTables.includes('blog_posts')) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar NOT NULL,
        slug varchar NOT NULL UNIQUE,
        content text NOT NULL,
        excerpt text,
        featured_image_url varchar,
        og_image_url varchar,
        author_id varchar NOT NULL,
        status varchar DEFAULT 'draft',
        published_at timestamp,
        category_ids varchar[] DEFAULT '{}',
        tags varchar[] DEFAULT '{}',
        meta_title varchar,
        meta_description text,
        reading_time integer DEFAULT 1,
        view_count integer DEFAULT 0,
        table_of_contents jsonb,
        seo_score integer DEFAULT 0,
        seo_issues jsonb,
        cta_config jsonb,
        indexing_directive varchar DEFAULT 'index,follow',
        canonical_url varchar,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created blog_posts table');
  }
  
  if (missingTables.includes('blog_post_categories')) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_post_categories (
        id serial PRIMARY KEY,
        post_id varchar NOT NULL,
        category_id varchar NOT NULL,
        created_at timestamp DEFAULT NOW()
      )
    `);
    console.log('  ✓ Created blog_post_categories table');
  }
}

async function addAustinCommunities() {
  const communities = [
    {
      slug: 'downtown-austin',
      name: 'Downtown Austin',
      county: 'Travis',
      meta_title: 'Downtown Austin Real Estate | Condos & Lofts for Sale',
      description: 'The heart of Austin offers the ultimate urban living experience.',
      published: true,
    },
    {
      slug: 'westlake',
      name: 'Westlake',
      county: 'Travis', 
      meta_title: 'Westlake Austin Homes for Sale | Luxury Real Estate',
      description: 'One of Austin most prestigious communities.',
      published: true,
    },
    {
      slug: 'cedar-park',
      name: 'Cedar Park',
      county: 'Williamson',
      meta_title: 'Cedar Park TX Real Estate | Family-Friendly Homes',
      description: 'A rapidly growing suburb north of Austin.',
      published: true,
    },
    {
      slug: 'round-rock',
      name: 'Round Rock', 
      county: 'Williamson',
      meta_title: 'Round Rock TX Homes for Sale | Affordable Family Living',
      description: 'A thriving suburb with excellent schools.',
      published: true,
    },
    {
      slug: 'south-lamar',
      name: 'South Lamar',
      county: 'Travis',
      meta_title: 'South Lamar Austin Real Estate | Hip Neighborhood Living', 
      description: 'A vibrant, eclectic neighborhood known for its food scene.',
      published: true,
    }
  ];
  
  for (const community of communities) {
    await pool.query(`
      INSERT INTO communities (slug, name, county, meta_title, description, published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `, [community.slug, community.name, community.county, community.meta_title, community.description, community.published]);
    
    console.log(`  ✓ Added ${community.name}`);
  }
  
  // Add blog data
  console.log('\n✍️ ADDING Blog Content...');
  
  // Add author
  await pool.query(`
    INSERT INTO blog_authors (id, name, email, bio) 
    VALUES ('spyglass-team', 'Spyglass Realty Team', 'info@spyglassrealty.com', 'Expert real estate team serving Austin Metro')
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('  ✓ Added blog author');
  
  // Add categories
  const categories = [
    ['market-updates', 'Market Updates', 'market-updates', 1],
    ['home-buying', 'Home Buying', 'home-buying', 2], 
    ['home-selling', 'Home Selling', 'home-selling', 3]
  ];
  
  for (const [id, name, slug, order] of categories) {
    await pool.query(`
      INSERT INTO blog_categories (id, name, slug, sort_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING
    `, [id, name, slug, order]);
    console.log(`  ✓ Added category: ${name}`);
  }
  
  // Add sample blog post
  await pool.query(`
    INSERT INTO blog_posts (id, title, slug, content, excerpt, author_id, status, published_at, category_ids, reading_time)
    VALUES (
      'austin-market-update',
      'Austin Real Estate Market Update: February 2024',
      'austin-market-update',
      '<h2>Market Overview</h2><p>The Austin real estate market continues to show resilience in February 2024, with steady demand and evolving pricing dynamics.</p><h3>Key Indicators</h3><ul><li>Median home price: $550,000</li><li>Days on market: 28 days</li><li>Inventory: 2.1 months supply</li></ul>',
      'A comprehensive look at Austin real estate trends for February 2024.',
      'spyglass-team',
      'published',
      NOW(),
      ARRAY['market-updates'],
      3
    )
    ON CONFLICT (slug) DO NOTHING
  `);
  console.log('  ✓ Added sample blog post');
}

// Run the check and fix
checkAndFixTables().catch(console.error);