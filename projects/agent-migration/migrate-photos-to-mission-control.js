import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MISSION_CONTROL_URL = 'https://missioncontrol-tjfm.onrender.com';
const PHOTO_DIR = path.join(__dirname, 'agent-photos');
const OUTPUT_DIR = path.join(__dirname, '..', 'mission-control', 'dist', 'public', 'agent-photos');

async function migratePhotos() {
  console.log('🖼️  Starting agent photo migration...');
  
  try {
    // 1. Create output directory in Mission Control
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log('✅ Created output directory:', OUTPUT_DIR);
    
    // 2. Get all photo files
    const files = await fs.readdir(PHOTO_DIR);
    const photoFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    console.log(`📁 Found ${photoFiles.length} photo files to migrate`);
    
    // 3. Copy photos to Mission Control public directory
    let copied = 0;
    for (const file of photoFiles) {
      const sourcePath = path.join(PHOTO_DIR, file);
      const destPath = path.join(OUTPUT_DIR, file);
      
      await fs.copyFile(sourcePath, destPath);
      copied++;
      
      if (copied % 10 === 0) {
        console.log(`  Copied ${copied}/${photoFiles.length} photos...`);
      }
    }
    
    console.log(`✅ Copied ${copied} photos to Mission Control`);
    
    // 4. Generate SQL update script
    const sqlStatements = [];
    
    for (const file of photoFiles) {
      const agentSlug = file.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const oldUrl = `https://rew.spyglassrealty.com/images/agents/${file}`;
      const newUrl = `${MISSION_CONTROL_URL}/agent-photos/${file}`;
      
      // Update by matching the slug pattern in the current URL
      sqlStatements.push(`
UPDATE agent_directory_profiles 
SET headshot_url = '${newUrl}'
WHERE headshot_url LIKE '%${agentSlug}%' 
   OR headshot_url LIKE '%${file}%';`);
    }
    
    // Save SQL script
    const sqlScript = `-- Agent Photo Migration Script
-- Generated: ${new Date().toISOString()}
-- This script updates agent headshot URLs from REW to Mission Control

BEGIN;

${sqlStatements.join('\n')}

-- Verify the updates
SELECT 
  CONCAT(first_name, ' ', last_name) as agent_name,
  headshot_url
FROM agent_directory_profiles 
WHERE headshot_url IS NOT NULL
ORDER BY last_name, first_name;

COMMIT;`;
    
    await fs.writeFile(path.join(__dirname, 'update-photo-urls.sql'), sqlScript);
    console.log('✅ Generated SQL update script: update-photo-urls.sql');
    
    // 5. Generate a JSON mapping file for the API endpoint
    const photoMapping = {};
    for (const file of photoFiles) {
      const agentSlug = file.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      photoMapping[agentSlug] = `/agent-photos/${file}`;
    }
    
    await fs.writeFile(
      path.join(__dirname, 'photo-mapping.json'), 
      JSON.stringify(photoMapping, null, 2)
    );
    console.log('✅ Generated photo mapping file');
    
    console.log(`
🎉 Photo migration complete!

Next steps:
1. Commit and push the Mission Control changes
2. Wait for Render deployment (~10 minutes)
3. Run the SQL update script on the database
4. Verify photos are loading from Mission Control

Photos will be accessible at:
${MISSION_CONTROL_URL}/agent-photos/[filename]
`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Run the migration
migratePhotos();