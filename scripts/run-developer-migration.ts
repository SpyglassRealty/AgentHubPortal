import { pool } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runDeveloperMigration() {
  try {
    console.log("🚀 Running Developer Dashboard migration...");
    
    // Read the migration file
    const migrationSQL = readFileSync(
      join(process.cwd(), "migrations", "0009_developer_dashboard_tables.sql"),
      "utf-8"
    );
    
    // Split by semicolon to run each statement separately
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${index + 1}/${statements.length}`);
        await pool.query(statement);
        console.log(`✅ Statement ${index + 1} completed`);
      }
    }
    
    console.log("🎉 Developer Dashboard migration completed successfully!");
    
    // Verify tables were created
    const checkTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('dev_changelog', 'developer_activity_logs')
      AND table_schema = 'public'
    `);
    
    console.log("🔍 Created tables:", checkTables.rows.map(r => r.table_name));
    
    // Check role column exists
    const checkRole = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    console.log("🔍 Users.role column exists:", checkRole.rows.length > 0);
    
    // Check default developer is set
    const checkDeveloper = await pool.query(`
      SELECT email, role 
      FROM users 
      WHERE email = 'daryl@spyglassrealty.com'
    `);
    
    console.log("🔍 Default developer:", checkDeveloper.rows);
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runDeveloperMigration();