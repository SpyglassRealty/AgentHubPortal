import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Auto-migrate database schema on startup
export async function initializeDatabase() {
  try {
    console.log("[Database] Initializing database schema...");
    
    // Direct SQL migrations for missing columns
    await runDirectMigrations();
    
    console.log("[Database] Schema synchronized successfully");
  } catch (error) {
    console.warn("[Database] Schema sync warning:", error);
    // Don't fail startup if schema sync fails - database might already be correct
  }
}

async function runDirectMigrations() {
  try {
    console.log("[Database] Running comprehensive user table migrations...");
    
    // Get existing columns
    const existingColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const columnNames = new Set(existingColumns.rows.map(row => row.column_name));
    
    // Define all expected columns with their SQL types
    const expectedColumns = [
      { name: 'rezen_yenta_id', sql: 'ALTER TABLE users ADD COLUMN rezen_yenta_id varchar' },
      { name: 'is_super_admin', sql: 'ALTER TABLE users ADD COLUMN is_super_admin boolean DEFAULT false' },
      { name: 'theme', sql: 'ALTER TABLE users ADD COLUMN theme varchar DEFAULT \'light\'' },
      { name: 'first_name', sql: 'ALTER TABLE users ADD COLUMN first_name varchar' },
      { name: 'last_name', sql: 'ALTER TABLE users ADD COLUMN last_name varchar' },
      { name: 'profile_image_url', sql: 'ALTER TABLE users ADD COLUMN profile_image_url varchar' },
      { name: 'fub_user_id', sql: 'ALTER TABLE users ADD COLUMN fub_user_id integer' },
      { name: 'created_at', sql: 'ALTER TABLE users ADD COLUMN created_at timestamp DEFAULT NOW()' },
      { name: 'updated_at', sql: 'ALTER TABLE users ADD COLUMN updated_at timestamp DEFAULT NOW()' },
    ];
    
    // Add missing columns
    for (const column of expectedColumns) {
      if (!columnNames.has(column.name)) {
        console.log(`[Database] Adding missing ${column.name} column...`);
        await pool.query(column.sql);
        console.log(`[Database] Added ${column.name} column successfully`);
      } else {
        console.log(`[Database] ${column.name} column already exists`);
      }
    }
    
    console.log("[Database] User table migration completed");
    
    // Add agent profile marketing fields (Stage 2: CMA Bio editing)
    await addAgentProfileMarketingFields();
    
    // Create pulse data tables for Market Pulse functionality
    await createPulseDataTables();
    
  } catch (error) {
    console.error("[Database] Direct migration error:", error);
    throw error;
  }
}

async function addAgentProfileMarketingFields() {
  try {
    console.log("[Database] Adding missing phone column to agent_profiles...");
    
    // Check existing agent_profiles table columns
    const existingColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agent_profiles'
    `);
    
    const columnNames = new Set(existingColumns.rows.map(row => row.column_name));
    console.log("[Database] Existing agent_profiles columns:", Array.from(columnNames).sort());
    
    // Add the missing phone column (the only one not in the actual database according to Daryl's query)
    if (!columnNames.has('phone')) {
      console.log(`[Database] Adding agent_profiles.phone column...`);
      await pool.query('ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS phone TEXT');
      console.log(`[Database] Added phone column successfully`);
    } else {
      console.log(`[Database] agent_profiles.phone column already exists`);
    }
    
    // Verify the column was added
    const verifyColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agent_profiles' AND column_name = 'phone'
    `);
    
    if (verifyColumns.rows.length > 0) {
      console.log("[Database] ✅ Phone column verification: FOUND");
    } else {
      console.error("[Database] ❌ Phone column verification: MISSING");
      // Retry the migration
      console.log("[Database] Retrying phone column creation...");
      await pool.query('ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS phone TEXT');
    }
    
    console.log("[Database] Agent profile migration completed");
    
  } catch (error) {
    console.error("[Database] Agent profile migration error:", error);
    console.error("[Database] Error details:", JSON.stringify(error, null, 2));
    // Re-throw to make the error visible in startup logs
    throw error;
  }
}

async function createPulseDataTables() {
  try {
    console.log("[Database] Creating missing database tables...");
    
    // Create all missing tables based on schema
    const missingTables = [
      // CMA tables
      {
        name: 'cmas',
        sql: `
          CREATE TABLE IF NOT EXISTS cmas (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar NOT NULL,
            name varchar NOT NULL,
            subject_property jsonb,
            comparable_properties jsonb DEFAULT '[]'::jsonb,
            notes text,
            status varchar DEFAULT 'draft',
            presentation_config jsonb,
            created_at timestamp DEFAULT NOW(),
            updated_at timestamp DEFAULT NOW()
          )
        `
      },
      // Market Pulse snapshot table
      {
        name: 'market_pulse_snapshots',
        sql: `
          CREATE TABLE IF NOT EXISTS market_pulse_snapshots (
            id serial PRIMARY KEY,
            cached_data jsonb NOT NULL,
            last_updated_at timestamp DEFAULT NOW()
          )
        `
      },
      // Pulse data tables
      {
        name: 'pulse_zillow_data',
        sql: `
          CREATE TABLE IF NOT EXISTS pulse_zillow_data (
            id serial PRIMARY KEY,
            zip varchar(10) NOT NULL,
            date date NOT NULL,
            home_value numeric,
            rent_value numeric,
            single_family_value numeric,
            condo_value numeric,
            created_at timestamp DEFAULT NOW()
          )
        `
      },
      {
        name: 'pulse_census_data', 
        sql: `
          CREATE TABLE IF NOT EXISTS pulse_census_data (
            id serial PRIMARY KEY,
            zip varchar(10) NOT NULL,
            year integer NOT NULL,
            population integer,
            median_household_income numeric,
            median_age numeric,
            total_households integer,
            created_at timestamp DEFAULT NOW()
          )
        `
      },
      {
        name: 'pulse_redfin_data',
        sql: `
          CREATE TABLE IF NOT EXISTS pulse_redfin_data (
            id serial PRIMARY KEY,
            zip varchar(10) NOT NULL,
            period_start date NOT NULL,
            inventory integer,
            homes_sold integer,
            median_dom integer,
            median_sale_price numeric,
            created_at timestamp DEFAULT NOW()
          )
        `
      },
      {
        name: 'pulse_metrics',
        sql: `
          CREATE TABLE IF NOT EXISTS pulse_metrics (
            id serial PRIMARY KEY,
            zip varchar(10) NOT NULL,
            date date NOT NULL,
            price_forecast numeric,
            overvalued_pct numeric,
            cap_rate numeric,
            created_at timestamp DEFAULT NOW()
          )
        `
      },
      // Market Pulse History for daily snapshots and trending
      {
        name: 'market_pulse_history',
        sql: `
          CREATE TABLE IF NOT EXISTS market_pulse_history (
            id serial PRIMARY KEY,
            date date NOT NULL,
            zip varchar(5) NOT NULL,
            
            -- Price metrics
            median_home_value numeric,
            median_sale_price numeric,
            median_list_price numeric,
            price_per_sqft numeric,
            
            -- Market activity
            homes_sold integer,
            active_listings integer,
            new_listings integer,
            pending_listings integer,
            
            -- Market timing
            median_dom integer,
            avg_dom integer,
            
            -- Market conditions  
            months_of_supply numeric,
            sale_to_list_ratio numeric,
            price_drops_pct numeric,
            
            -- Calculated metrics
            inventory_growth_mom numeric, -- month-over-month inventory change
            sales_growth_mom numeric,     -- month-over-month sales change
            price_growth_mom numeric,     -- month-over-month price change
            price_growth_yoy numeric,     -- year-over-year price change
            
            -- Market temperature (calculated)
            market_temperature varchar(20), -- 'Hot', 'Warm', 'Balanced', 'Cool', 'Cold'
            market_score integer,           -- 0-100 composite score
            
            -- Metadata
            data_source varchar(50) DEFAULT 'repliers_mls',
            created_at timestamp DEFAULT NOW(),
            updated_at timestamp DEFAULT NOW()
          )
        `
      },
      // Notifications table
      {
        name: 'notifications',
        sql: `
          CREATE TABLE IF NOT EXISTS notifications (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar NOT NULL,
            type varchar NOT NULL,
            title varchar NOT NULL,
            message text,
            is_read boolean DEFAULT false,
            payload jsonb,
            created_at timestamp DEFAULT NOW()
          )
        `
      },
      // User video preferences table
      {
        name: 'user_video_preferences',
        sql: `
          CREATE TABLE IF NOT EXISTS user_video_preferences (
            id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar NOT NULL,
            video_id varchar(50) NOT NULL,
            video_name varchar(255),
            video_thumbnail varchar(500),
            video_duration integer,
            is_favorite boolean DEFAULT false,
            is_watch_later boolean DEFAULT false,
            watch_progress integer DEFAULT 0,
            watch_percentage integer DEFAULT 0,
            last_watched_at timestamp,
            created_at timestamp DEFAULT NOW(),
            updated_at timestamp DEFAULT NOW()
          )
        `
      },
      // Sync status table
      {
        name: 'sync_status',
        sql: `
          CREATE TABLE IF NOT EXISTS sync_status (
            id serial PRIMARY KEY,
            user_id varchar NOT NULL,
            section varchar(50) NOT NULL,
            last_manual_refresh timestamp,
            last_auto_refresh timestamp,
            created_at timestamp DEFAULT NOW(),
            updated_at timestamp DEFAULT NOW()
          )
        `
      }
    ];
    
    for (const table of missingTables) {
      await pool.query(table.sql);
      console.log(`[Database] Created/verified ${table.name} table`);
    }
    
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_cmas_user_id ON cmas(user_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_zillow_zip_date ON pulse_zillow_data(zip, date)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_census_zip_year ON pulse_census_data(zip, year)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_redfin_zip_period ON pulse_redfin_data(zip, period_start)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_metrics_zip_date ON pulse_metrics(zip, date)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_market_pulse_history_date_zip ON market_pulse_history(date, zip)',
      'CREATE INDEX IF NOT EXISTS idx_market_pulse_history_zip_date ON market_pulse_history(zip, date DESC)',
    ];
    
    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
      } catch (error) {
        // Ignore index creation errors (might already exist)
      }
    }
    
    console.log("[Database] All required tables created successfully");
    
    // Create CMS pages table
    await createCmsPagesTable();
    
    // Add market pulse snapshots schema migration
    await migrateMarketPulseSnapshots();
    
  } catch (error) {
    console.error("[Database] Tables creation error:", error);
    // Don't throw - some features can work without all tables
  }
}

// Create CMS pages table for the page builder
async function createCmsPagesTable() {
  try {
    console.log("[Database] Creating CMS pages table if not exists...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        slug VARCHAR NOT NULL UNIQUE,
        type VARCHAR NOT NULL DEFAULT 'page',
        status VARCHAR NOT NULL DEFAULT 'draft',
        content JSONB,
        excerpt TEXT,
        featured_image_url TEXT,
        meta_title VARCHAR,
        meta_description TEXT,
        focus_keyword VARCHAR,
        author_id VARCHAR REFERENCES users(id),
        tags JSONB DEFAULT '[]'::jsonb,
        category VARCHAR,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cms_pages_type ON cms_pages(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status)`);
    
    console.log("[Database] CMS pages table created/verified successfully");
  } catch (error) {
    console.error("[Database] CMS pages table creation error:", error);
  }
}

// Auto-migration for market_pulse_snapshots to match schema.ts expectations
export async function migrateMarketPulseSnapshots() {
  try {
    console.log('[Migration] Checking market_pulse_snapshots schema...');
    
    const alterStatements = [
      // Market pulse snapshots
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS total_properties INTEGER DEFAULT 0",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 0", 
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS active_under_contract INTEGER DEFAULT 0",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS pending INTEGER DEFAULT 0",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS closed INTEGER DEFAULT 0",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT NOW()",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS office_id VARCHAR(50) DEFAULT 'ACT1518371'",
      "ALTER TABLE market_pulse_snapshots ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'spyglass'",
      "ALTER TABLE market_pulse_snapshots ALTER COLUMN cached_data DROP NOT NULL",
      
      // CMA table fixes - add ALL missing columns to match schema.ts
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS subject_property JSONB",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS comparable_properties JSONB DEFAULT '[]'::jsonb",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS notes TEXT",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS presentation_config JSONB",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS share_token TEXT",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS share_created_at TIMESTAMP",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS properties_data JSONB",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS prepared_for TEXT", 
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS suggested_list_price INTEGER",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS cover_letter TEXT",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS brochure JSONB",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS adjustments JSONB",
      "ALTER TABLE cmas ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP"
    ];

    for (const stmt of alterStatements) {
      try {
        await pool.query(stmt);
        console.log(`[Migration] Executed: ${stmt.substring(0, 60)}...`);
      } catch (e) {
        // Ignore if column already exists
        console.log(`[Migration] Column might already exist: ${e.message}`);
      }
    }
    
    // DEBUG: Diagnose phone column migration failure with detailed logging
    try {
      console.log('[Migration] 🔍 DEBUG: Diagnosing phone column migration failure...');
      
      // Get database connection info
      const dbInfo = await db.execute(sql`SELECT current_database(), current_user, inet_server_addr(), inet_server_port()`);
      console.log('[Migration] 🔗 CONNECTED TO:', JSON.stringify(dbInfo.rows));
      
      // BEFORE ALTER TABLE: Check if phone column exists
      const beforeCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agent_profiles' AND column_name = 'phone'
      `);
      console.log('[Migration] 📋 BEFORE ALTER: phone exists in DB?', beforeCheck.rows.length > 0, JSON.stringify(beforeCheck.rows));
      
      // Get ALL existing columns BEFORE
      const existingColumnsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agent_profiles'
        ORDER BY ordinal_position
      `);
      console.log('[Migration] 📋 ALL columns BEFORE ALTER:', existingColumnsResult.rows.map((row: any) => row.column_name));
      
      // Execute the ALTER TABLE for phone column
      console.log('[Migration] 🔨 Executing ALTER TABLE for phone column...');
      await db.execute(sql`ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS phone TEXT`);
      console.log('[Migration] ✅ ALTER TABLE executed');
      
      // IMMEDIATELY after ALTER TABLE: Check if phone column exists
      const afterCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agent_profiles' AND column_name = 'phone'
      `);
      console.log('[Migration] 📋 AFTER ALTER: phone exists in DB?', afterCheck.rows.length > 0, JSON.stringify(afterCheck.rows));
      
      // Get ALL existing columns AFTER
      const finalColumnsResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'agent_profiles'
        ORDER BY ordinal_position
      `);
      console.log('[Migration] 📋 ALL columns AFTER ALTER:', finalColumnsResult.rows.map((row: any) => row.column_name));
      
      // If phone column still doesn't exist, this is critical
      if (afterCheck.rows.length === 0) {
        console.error('[Migration] ❌ CRITICAL: ALTER TABLE succeeded but phone column NOT found!');
        console.error('[Migration] 🔍 Database connection details:', JSON.stringify(dbInfo.rows));
        console.error('[Migration] 🔍 This suggests a connection or transaction issue');
        throw new Error('CRITICAL: Phone column migration failed - ALTER succeeded but column not found');
      } else {
        console.log('[Migration] 🎉 SUCCESS: Phone column successfully added to database');
      }
      
      // Now add other missing columns
      const requiredColumns = [
        { name: 'title', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS title TEXT' },
        { name: 'headshot_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS headshot_url TEXT' },
        { name: 'bio', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS bio TEXT' },
        { name: 'facebook_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT' },
        { name: 'instagram_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT' },
        { name: 'linkedin_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT' },
        { name: 'twitter_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT' },
        { name: 'website_url', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS website_url TEXT' },
        { name: 'marketing_company', sql: 'ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS marketing_company TEXT' }
      ];
      
      // Check and add each required column
      for (const column of requiredColumns) {
        const columnCheck = await db.execute(sql.raw(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'agent_profiles' AND column_name = '${column.name}'
        `));
        
        if (columnCheck.rows.length === 0) {
          console.log(`[Migration] ➕ Adding missing column: ${column.name}`);
          await db.execute(sql.raw(column.sql));
          
          // Verify it was added
          const verifyCheck = await db.execute(sql.raw(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'agent_profiles' AND column_name = '${column.name}'
          `));
          console.log(`[Migration] 🔍 Column ${column.name} added? ${verifyCheck.rows.length > 0}`);
        } else {
          console.log(`[Migration] ✅ Column already exists: ${column.name}`);
        }
      }
      
      console.log('[Migration] 🎉 DEBUG: Agent profiles migration completed with detailed logging');
      
    } catch (e) {
      console.error(`[Migration] ❌ CRITICAL: agent_profiles migration failed: ${e.message}`);
      console.error('[Migration] Full error details:', e);
      throw e; // Re-throw to fail startup if critical columns are missing
    }
    
    console.log('[Migration] market_pulse_snapshots schema updated successfully');
    
  } catch (error) {
    console.error('[Migration] CRITICAL: market_pulse_snapshots migration failed:', error);
    console.error('[Migration] Full error details:', JSON.stringify(error, null, 2));
    // Re-throw to see the error in startup logs
    throw error;
  }
}
