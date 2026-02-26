/**
 * BACKUP SCRIPT: Render Postgres → Local SQL File
 * 
 * Creates a backup of the current Render database before migration
 * 
 * Usage:
 *   RENDER_URL="postgresql://..." npm run backup-db
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const RENDER_URL = process.env.RENDER_URL || process.env.DATABASE_URL;

if (!RENDER_URL) {
  console.error("❌ ERROR: RENDER_URL or DATABASE_URL environment variable is required");
  process.exit(1);
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(process.cwd(), `backup-render-${timestamp}.sql`);
  
  console.log('💾 Creating Render database backup...');
  console.log('🎯 Target:', RENDER_URL.replace(/:[^:@]*@/, ':***@'));
  console.log('📁 Backup file:', backupFile);
  
  try {
    const { stdout, stderr } = await execAsync(`pg_dump "${RENDER_URL}" > "${backupFile}"`);
    
    if (stderr) {
      console.error('⚠️ pg_dump warnings:', stderr);
    }
    
    console.log('✅ Backup completed successfully!');
    console.log('📁 Backup saved to:', backupFile);
    console.log('');
    console.log('To restore this backup:');
    console.log(`  psql "${RENDER_URL}" < "${backupFile}"`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);