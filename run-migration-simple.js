// Simple migration runner - uses existing database setup
import { pool } from "./server/db.js";

async function runMigration() {
  try {
    console.log("🚀 Running Developer Dashboard migration...");
    
    // Step 1: Add role column to users table
    console.log("📝 Step 1: Adding role column to users table");
    await pool.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'role'
          ) THEN
              ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'agent';
          END IF;
      END $$;
    `);
    
    // Set default developer
    console.log("📝 Setting default developer role");
    await pool.query(`UPDATE users SET role = 'developer' WHERE email = 'daryl@spyglassrealty.com'`);
    
    // Set existing super admins to admin role
    await pool.query(`UPDATE users SET role = 'admin' WHERE is_super_admin = true AND email != 'daryl@spyglassrealty.com'`);
    
    // Step 2: Create dev_changelog table
    console.log("📝 Step 2: Creating dev_changelog table");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dev_changelog (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          developer_name VARCHAR(255),
          developer_email VARCHAR(255),
          requested_by VARCHAR(255),
          commit_hash VARCHAR(100),
          category VARCHAR(50) CHECK (category IN ('bug_fix', 'feature', 'ui', 'database', 'api', 'deployment')),
          status VARCHAR(50) DEFAULT 'deployed' CHECK (status IN ('deployed', 'in_progress', 'reverted', 'pending')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Step 3: Create developer_activity_logs table
    console.log("📝 Step 3: Creating developer_activity_logs table");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS developer_activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          user_email VARCHAR(255),
          user_name VARCHAR(255),
          action_type VARCHAR(100) CHECK (action_type IN ('create', 'update', 'delete', 'view', 'login', 'export', 'search')),
          description TEXT,
          metadata JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Step 4: Create indexes
    console.log("📝 Step 4: Creating indexes");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dev_changelog_status ON dev_changelog(status)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dev_changelog_category ON dev_changelog(category)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dev_changelog_created_at ON dev_changelog(created_at)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_user_id ON developer_activity_logs(user_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_action_type ON developer_activity_logs(action_type)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_created_at ON developer_activity_logs(created_at)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
    
    // Step 5: Insert initial changelog entry
    console.log("📝 Step 5: Inserting initial changelog entry");
    await pool.query(`
      INSERT INTO dev_changelog (
          description, 
          developer_name, 
          developer_email, 
          requested_by, 
          category, 
          status
      ) VALUES (
          'Added Developer Dashboard and Admin Settings fix - comprehensive 4-tab developer portal with access control',
          'Clawd AI',
          'ai@spyglassrealty.com',
          'Daryl',
          'feature',
          'in_progress'
      ) ON CONFLICT DO NOTHING;
    `);
    
    console.log("🎉 Migration completed successfully!");
    
    // Verify results
    const roleCheck = await pool.query("SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'");
    console.log("🔍 Role column exists:", roleCheck.rows[0].count > 0);
    
    const devCheck = await pool.query("SELECT email, role FROM users WHERE email = 'daryl@spyglassrealty.com'");
    console.log("🔍 Default developer:", devCheck.rows);
    
    const tableCheck = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('dev_changelog', 'developer_activity_logs') AND table_schema = 'public'");
    console.log("🔍 Created tables:", tableCheck.rows);
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();