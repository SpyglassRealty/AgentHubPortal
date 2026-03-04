import { readdir } from 'fs/promises';
import { join } from 'path';
import { db } from '../server/db';
import { agentDirectoryProfiles } from '../shared/schema';

// Map of agent names to their email addresses (from FUB or known data)
const AGENT_EMAILS: Record<string, string> = {
  'aaron-mcneeley': 'aaron@spyglassrealty.com',
  'alison-thorn': 'alison@spyglassrealty.com',
  'alli-heller': 'alli@spyglassrealty.com',
  'ana-magallon': 'ana@spyglassrealty.com',
  'andrea-duong': 'andrea@spyglassrealty.com',
  'andrea-hallgarth': 'andrea@spyglassrealty.com',
  'angel-rodenbeck': 'angel@spyglassrealty.com',
  'april-costenbader': 'april@spyglassrealty.com',
  'ashley-sanchez': 'ashley.sanchez@spyglassrealty.com',
  'ashley-simpson': 'ashley.simpson@spyglassrealty.com',
  // Add more as needed - using standard pattern for now
};

function getEmailForAgent(subdomain: string, firstName: string, lastName: string): string {
  // Check if we have a specific email mapping
  if (AGENT_EMAILS[subdomain]) {
    return AGENT_EMAILS[subdomain];
  }
  
  // Otherwise use standard pattern
  // Handle special cases where first name might be used twice
  if (firstName.toLowerCase() === 'ashley' || firstName.toLowerCase() === 'michael') {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@spyglassrealty.com`;
  }
  
  return `${firstName.toLowerCase()}@spyglassrealty.com`;
}

async function populateAgentsFromPhotos() {
  try {
    console.log('🚀 Starting agent population from photo directory...\n');
    
    // Read all files from the agent photos directory
    const photosDir = join(process.cwd(), 'public', 'agent-photos');
    const files = await readdir(photosDir);
    
    // Filter for image files only
    const photoFiles = files.filter(file => 
      file.endsWith('.png') || 
      file.endsWith('.jpg') || 
      file.endsWith('.jpeg') || 
      file.endsWith('.webp')
    );
    
    console.log(`Found ${photoFiles.length} agent photos\n`);
    
    // Clear existing agents (optional)
    console.log('🧹 Clearing existing agent data...');
    await db.delete(agentDirectoryProfiles);
    
    // Process each photo
    let inserted = 0;
    let errors = 0;
    
    for (const photoFile of photoFiles) {
      try {
        // Extract name from filename (format: firstname-lastname.ext)
        const nameWithoutExt = photoFile.replace(/\.(png|jpg|jpeg|webp)$/, '');
        const parts = nameWithoutExt.split('-');
        
        // Handle multi-part names
        let firstName = parts[0];
        let lastName = parts.slice(1).join(' ');
        
        // Capitalize names properly
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        lastName = lastName.split(' ')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        
        // Special case handling for known name formats
        if (lastName.includes(' ')) {
          // Handle cases like "Van Zandt" or "De La Cruz"
          lastName = lastName.split(' ')
            .map((part, index) => {
              // Keep small words lowercase except first word
              if (index > 0 && ['de', 'la', 'van', 'von'].includes(part.toLowerCase())) {
                return part.toLowerCase();
              }
              return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(' ');
        }
        
        const subdomain = nameWithoutExt;
        const email = getEmailForAgent(subdomain, firstName, lastName);
        
        // Insert agent
        await db.insert(agentDirectoryProfiles).values({
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone: '', // Will need to be filled in
          officeLocation: 'Austin', // Default, can be updated
          professionalTitle: 'Real Estate Agent',
          licenseNumber: '', // Will need to be filled in
          headshotUrl: `https://missioncontrol-tjfm.onrender.com/agent-photos/${photoFile}`,
          subdomain,
          bio: `${firstName} ${lastName} is a dedicated real estate professional serving the Austin area with Spyglass Realty.`,
          isVisible: true,
          sortOrder: 0,
          socialLinks: {},
          yearsOfExperience: null,
          languages: ['English'], // Default
          specialties: [],
          indexingDirective: 'index,follow',
          seoScore: 40, // Base score with photo
          videoUrl: null,
          metaTitle: `${firstName} ${lastName} - Austin Real Estate Agent | Spyglass Realty`,
          metaDescription: `Connect with ${firstName} ${lastName}, a trusted real estate agent at Spyglass Realty. Expert guidance for buying and selling homes in Austin, TX.`,
        });
        
        console.log(`✅ Created profile for: ${firstName} ${lastName}`);
        inserted++;
        
      } catch (error: any) {
        console.error(`❌ Failed to process ${photoFile}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Population complete!`);
    console.log(`   ✅ Successfully created: ${inserted} agent profiles`);
    console.log(`   ❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  }
}

// Run the population
populateAgentsFromPhotos().then(() => {
  console.log('🎉 Agent population completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});