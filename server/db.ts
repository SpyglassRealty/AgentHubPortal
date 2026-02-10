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
    // Check if rezen_yenta_id column exists, if not add it
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'rezen_yenta_id'
    `);
    
    if (result.rows.length === 0) {
      console.log("[Database] Adding missing rezen_yenta_id column...");
      await pool.query('ALTER TABLE users ADD COLUMN rezen_yenta_id varchar');
      console.log("[Database] Added rezen_yenta_id column successfully");
    } else {
      console.log("[Database] rezen_yenta_id column already exists");
    }
    
    // Add any other missing columns as needed
    
  } catch (error) {
    console.error("[Database] Direct migration error:", error);
    throw error;
  }
}
