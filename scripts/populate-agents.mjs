import { readdir } from 'fs/promises';
import { join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:localtest123@localhost:5433/missioncontrol_dev',
});

async function populateAgents() {
  try {
    console.log('🚀 Starting agent population from photo directory...\n');
    
    // Read photo files
    const photosDir = join(process.cwd(), 'public', 'agent-photos');
    const files = await readdir(photosDir);
    
    const photoFiles = files.filter(file => file.endsWith('.png'));
    console.log(`Found ${photoFiles.length} agent photos\n`);
    
    // Clear existing agents
    console.log('🧹 Clearing existing agent data...');
    await pool.query('DELETE FROM agent_directory_profiles');
    
    let inserted = 0;
    
    for (const photoFile of photoFiles) {
      try {
        const nameWithoutExt = photoFile.replace('.png', '');
        const parts = nameWithoutExt.split('-');
        
        let firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        let lastName = parts.slice(1)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ');
        
        // Handle special last names
        lastName = lastName.replace(' De ', ' de ')
                          .replace(' La ', ' la ')
                          .replace(' Van ', ' van ');
        
        const email = `${firstName.toLowerCase()}@spyglassrealty.com`;
        const subdomain = nameWithoutExt;
        
        await pool.query(`
          INSERT INTO agent_directory_profiles (
            first_name, last_name, email, phone, office_location,
            professional_title, headshot_url, subdomain, bio,
            is_visible, sort_order, social_links, years_of_experience,
            languages, specialties, indexing_directive, seo_score,
            meta_title, meta_description
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
        `, [
          firstName,
          lastName,
          email,
          '',
          'Austin',
          'Real Estate Agent',
          `https://missioncontrol-tjfm.onrender.com/agent-photos/${photoFile}`,
          subdomain,
          `${firstName} ${lastName} is a dedicated real estate professional serving the Austin area with Spyglass Realty.`,
          true,
          0,
          {},
          null,
          ['English'],
          [],
          'index,follow',
          40,
          `${firstName} ${lastName} - Austin Real Estate Agent | Spyglass Realty`,
          `Connect with ${firstName} ${lastName}, a trusted real estate agent at Spyglass Realty. Expert guidance for buying and selling homes in Austin, TX.`
        ]);
        
        console.log(`✅ Created: ${firstName} ${lastName}`);
        inserted++;
        
      } catch (error) {
        console.error(`❌ Failed: ${photoFile} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Successfully created ${inserted} agent profiles!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

populateAgents();