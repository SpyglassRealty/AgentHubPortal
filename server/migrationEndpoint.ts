import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

// POST /api/admin/run-agent-migration - Run database migration to add missing columns
router.post("/admin/run-agent-migration", async (req, res) => {
  try {
    // Check for admin auth or a secret key
    const secretKey = req.headers['x-migration-key'];
    if (secretKey !== 'migrate-agents-2024') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log('🔄 Running agent directory migration...');
    
    const migrations = [];
    
    try {
      // Add years_of_experience column
      await db.execute(sql`
        ALTER TABLE agent_directory_profiles 
        ADD COLUMN IF NOT EXISTS years_of_experience INTEGER
      `);
      migrations.push('✅ Added years_of_experience column');
    } catch (e: any) {
      migrations.push(`⚠️  years_of_experience: ${e.message}`);
    }
    
    try {
      // Add languages column (JSONB array)
      await db.execute(sql`
        ALTER TABLE agent_directory_profiles 
        ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb
      `);
      migrations.push('✅ Added languages column');
    } catch (e: any) {
      migrations.push(`⚠️  languages: ${e.message}`);
    }
    
    try {
      // Add specialties column (JSONB array)
      await db.execute(sql`
        ALTER TABLE agent_directory_profiles 
        ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::jsonb
      `);
      migrations.push('✅ Added specialties column');
    } catch (e: any) {
      migrations.push(`⚠️  specialties: ${e.message}`);
    }
    
    // Add comments for documentation
    try {
      await db.execute(sql`
        COMMENT ON COLUMN agent_directory_profiles.years_of_experience IS 'Years of real estate experience'
      `);
      await db.execute(sql`
        COMMENT ON COLUMN agent_directory_profiles.languages IS 'JSON array of languages spoken, e.g. ["English", "Spanish", "Mandarin"]'
      `);
      await db.execute(sql`
        COMMENT ON COLUMN agent_directory_profiles.specialties IS 'JSON array of specialties/areas of expertise, e.g. ["Luxury Homes", "First-Time Buyers", "Investment Properties"]'
      `);
      migrations.push('✅ Added column comments');
    } catch (e: any) {
      migrations.push(`⚠️  Comments: ${e.message}`);
    }
    
    console.log('Migration results:', migrations);
    
    return res.json({
      success: true,
      message: 'Migration completed',
      results: migrations
    });
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;