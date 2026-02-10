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
    
    // Run database schema synchronization
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Run drizzle-kit push to sync schema
    await execAsync('npx drizzle-kit push', { 
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    
    console.log("[Database] Schema synchronized successfully");
  } catch (error) {
    console.warn("[Database] Schema sync warning:", error);
    // Don't fail startup if schema sync fails - database might already be correct
  }
}
