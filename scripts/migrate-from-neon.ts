/**
 * DATA MIGRATION: Neon → Render Postgres
 * 
 * Migrates data created Feb 1-19 from Neon database to Render Postgres
 * Preserves admin roles, CMAs, and all user data
 * 
 * Usage:
 *   NEON_URL="postgresql://..." RENDER_URL="postgresql://..." npm run migrate-neon
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";

// Environment variables
const NEON_URL = process.env.NEON_URL;
const RENDER_URL = process.env.RENDER_URL || process.env.DATABASE_URL;

if (!NEON_URL) {
  console.error("❌ ERROR: NEON_URL environment variable is required");
  console.error("Usage: NEON_URL='postgresql://...' RENDER_URL='postgresql://...' npm run migrate-neon");
  process.exit(1);
}

if (!RENDER_URL) {
  console.error("❌ ERROR: RENDER_URL or DATABASE_URL environment variable is required");
  process.exit(1);
}

// Database connections
const neonPool = new pg.Pool({ connectionString: NEON_URL });
const renderPool = new pg.Pool({ connectionString: RENDER_URL });
const neonDb = drizzle(neonPool, { schema });
const renderDb = drizzle(renderPool, { schema });

// Tables to migrate (in dependency order)
const TABLES_TO_MIGRATE = [
  'users',
  'agent_profiles', 
  'cmas',
  'transactions',
  'activities',
  'flyers',
  'marketing_assets',
  'notifications',
  'coordinators',
  'agent_marketing_profiles',
  'integration_settings',
  'notification_settings', 
  'user_notification_preferences',
  'market_pulse_snapshots',
  'pulse_zillow_data',
  'pulse_census_data',
  'pulse_redfin_data',
  'pulse_metrics',
  'market_pulse_history',
  'communities',
  'site_content',
  'sync_status',
  'user_video_preferences'
];

interface MigrationStats {
  table: string;
  neonCount: number;
  renderCount: number;
  migrated: number;
  updated: number;
  skipped: number;
}

async function main() {
  console.log('🚀 Starting Neon → Render Postgres migration...');
  console.log('📊 Source (Neon):', NEON_URL.replace(/:[^:@]*@/, ':***@'));
  console.log('🎯 Target (Render):', RENDER_URL.replace(/:[^:@]*@/, ':***@'));
  
  const stats: MigrationStats[] = [];
  
  try {
    // Test connections
    console.log('\n🔗 Testing database connections...');
    const neonTest = await neonPool.query('SELECT current_database(), current_user');
    const renderTest = await renderPool.query('SELECT current_database(), current_user');
    console.log('✅ Neon connected:', neonTest.rows[0]);
    console.log('✅ Render connected:', renderTest.rows[0]);
    
    // Migrate each table
    for (const tableName of TABLES_TO_MIGRATE) {
      console.log(`\n📋 Migrating table: ${tableName}`);
      const tableStats = await migrateTable(tableName);
      stats.push(tableStats);
      
      console.log(`   📊 Neon: ${tableStats.neonCount}, Render: ${tableStats.renderCount}`);
      console.log(`   ✅ Migrated: ${tableStats.migrated}, Updated: ${tableStats.updated}, Skipped: ${tableStats.skipped}`);
    }
    
    // Print summary
    console.log('\n🎉 MIGRATION COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log('┌─────────────────────┬───────┬────────┬─────────┬─────────┬─────────┐');
    console.log('│ Table               │ Neon  │ Render │ Migr.   │ Upd.    │ Skip.   │');
    console.log('├─────────────────────┼───────┼────────┼─────────┼─────────┼─────────┤');
    
    for (const stat of stats) {
      const table = stat.table.padEnd(19);
      const neon = stat.neonCount.toString().padStart(5);
      const render = stat.renderCount.toString().padStart(6);
      const migr = stat.migrated.toString().padStart(7);
      const upd = stat.updated.toString().padStart(7);
      const skip = stat.skipped.toString().padStart(7);
      console.log(`│ ${table} │ ${neon} │ ${render} │ ${migr} │ ${upd} │ ${skip} │`);
    }
    console.log('└─────────────────────┴───────┴────────┴─────────┴─────────┴─────────┘');
    
    const totalMigrated = stats.reduce((sum, s) => sum + s.migrated, 0);
    const totalUpdated = stats.reduce((sum, s) => sum + s.updated, 0);
    console.log(`\n🎯 Total records migrated: ${totalMigrated}`);
    console.log(`🔄 Total records updated: ${totalUpdated}`);
    
    // Special check for admin users
    await verifyAdminUsers();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await neonPool.end();
    await renderPool.end();
  }
}

async function migrateTable(tableName: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: tableName,
    neonCount: 0,
    renderCount: 0,
    migrated: 0,
    updated: 0,
    skipped: 0
  };
  
  try {
    // Check if table exists in both databases
    const neonTableCheck = await neonPool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [tableName]);
    
    const renderTableCheck = await renderPool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [tableName]);
    
    if (neonTableCheck.rows.length === 0) {
      console.log(`   ⚠️  Table ${tableName} not found in Neon, skipping`);
      return stats;
    }
    
    if (renderTableCheck.rows.length === 0) {
      console.log(`   ⚠️  Table ${tableName} not found in Render, skipping`);
      return stats;
    }
    
    // Get record counts
    const neonCountResult = await neonPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const renderCountResult = await renderPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    
    stats.neonCount = parseInt(neonCountResult.rows[0].count);
    stats.renderCount = parseInt(renderCountResult.rows[0].count);
    
    if (stats.neonCount === 0) {
      console.log(`   📭 No records in Neon ${tableName}, skipping`);
      return stats;
    }
    
    // Get column info
    const columnsResult = await neonPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    const columns = columnsResult.rows.map(row => row.column_name);
    const primaryKeyResult = await neonPool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName]);
    
    const primaryKey = primaryKeyResult.rows[0]?.attname || 'id';
    console.log(`   🔑 Primary key: ${primaryKey}`);
    
    // Get all records from Neon
    const neonRecords = await neonPool.query(`SELECT * FROM ${tableName}`);
    
    // Process each record
    for (const neonRecord of neonRecords.rows) {
      const pkValue = neonRecord[primaryKey];
      
      // Check if record exists in Render
      const renderRecord = await renderPool.query(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`,
        [pkValue]
      );
      
      if (renderRecord.rows.length === 0) {
        // Insert new record
        await insertRecord(tableName, columns, neonRecord);
        stats.migrated++;
      } else {
        // Compare updated_at timestamps if available
        const neonUpdatedAt = neonRecord.updated_at;
        const renderUpdatedAt = renderRecord.rows[0].updated_at;
        
        if (neonUpdatedAt && renderUpdatedAt) {
          if (new Date(neonUpdatedAt) > new Date(renderUpdatedAt)) {
            // Update existing record
            await updateRecord(tableName, columns, primaryKey, neonRecord);
            stats.updated++;
          } else {
            stats.skipped++;
          }
        } else {
          // No timestamp comparison possible, update if Neon has more recent data (Feb 1+)
          const createdAt = neonRecord.created_at;
          if (createdAt && new Date(createdAt) >= new Date('2024-02-01')) {
            await updateRecord(tableName, columns, primaryKey, neonRecord);
            stats.updated++;
          } else {
            stats.skipped++;
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error);
  }
  
  return stats;
}

async function insertRecord(tableName: string, columns: string[], record: any) {
  const values = columns.map(col => record[col]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const columnNames = columns.join(', ');
  
  const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
  await renderPool.query(query, values);
}

async function updateRecord(tableName: string, columns: string[], primaryKey: string, record: any) {
  const updateColumns = columns.filter(col => col !== primaryKey);
  const values = updateColumns.map(col => record[col]);
  const setClause = updateColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  
  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = $${updateColumns.length + 1}`;
  await renderPool.query(query, [...values, record[primaryKey]]);
}

async function verifyAdminUsers() {
  console.log('\n👥 Verifying admin users...');
  
  try {
    const adminUsers = await renderPool.query(`
      SELECT id, email, first_name, last_name, is_admin, is_super_admin 
      FROM users 
      WHERE is_admin = true OR is_super_admin = true
      ORDER BY email
    `);
    
    if (adminUsers.rows.length === 0) {
      console.log('⚠️  WARNING: No admin users found in Render database!');
      console.log('   Check that admin roles were properly migrated from Neon');
    } else {
      console.log(`✅ Found ${adminUsers.rows.length} admin users:`);
      for (const user of adminUsers.rows) {
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'No name';
        const roles = [];
        if (user.is_admin) roles.push('admin');
        if (user.is_super_admin) roles.push('super_admin');
        console.log(`   👑 ${user.email} (${name}) - ${roles.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Error verifying admin users:', error);
  }
}

// Run migration
main().catch(console.error);