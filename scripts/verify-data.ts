#!/usr/bin/env tsx
/**
 * VERIFY DATA - Check final counts
 */

import { pool } from "../server/db";

async function verifyData() {
  console.log('📊 VERIFYING Data Population...\n');
  
  try {
    // Check communities
    const communitiesResult = await pool.query('SELECT COUNT(*) as count, string_agg(name, \', \') as names FROM communities');
    console.log(`Communities: ${communitiesResult.rows[0].count}`);
    console.log(`  Names: ${communitiesResult.rows[0].names || 'None'}`);
    
    // Check blog authors
    const authorsResult = await pool.query('SELECT COUNT(*) as count, string_agg(name, \', \') as names FROM blog_authors');
    console.log(`\nBlog Authors: ${authorsResult.rows[0].count}`);
    console.log(`  Names: ${authorsResult.rows[0].names || 'None'}`);
    
    // Check blog categories
    const categoriesResult = await pool.query('SELECT COUNT(*) as count, string_agg(name, \', \') as names FROM blog_categories');
    console.log(`\nBlog Categories: ${categoriesResult.rows[0].count}`);
    console.log(`  Names: ${categoriesResult.rows[0].names || 'None'}`);
    
    // Check blog posts
    const postsResult = await pool.query('SELECT COUNT(*) as count, string_agg(title, \' | \') as titles FROM blog_posts');
    console.log(`\nBlog Posts: ${postsResult.rows[0].count}`);
    console.log(`  Titles: ${postsResult.rows[0].titles || 'None'}`);
    
    console.log('\n🎯 STATUS: Ready for Phase 4 Verification!');
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  } finally {
    await pool.end();
  }
}

verifyData().catch(console.error);