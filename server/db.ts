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
    
  } catch (error) {
    console.error("[Database] Direct migration error:", error);
    throw error;
  }
}
