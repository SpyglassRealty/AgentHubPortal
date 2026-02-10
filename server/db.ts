import { drizzle } from "drizzle-orm/node-postgres";
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
    
    // Create pulse data tables for Market Pulse functionality
    await createPulseDataTables();
    
  } catch (error) {
    console.error("[Database] Direct migration error:", error);
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
    ];
    
    for (const indexSql of indexes) {
      try {
        await pool.query(indexSql);
      } catch (error) {
        // Ignore index creation errors (might already exist)
      }
    }
    
    console.log("[Database] All required tables created successfully");
    
  } catch (error) {
    console.error("[Database] Tables creation error:", error);
    // Don't throw - some features can work without all tables
  }
}
