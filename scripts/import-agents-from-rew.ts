import { JSDOM } from 'jsdom';
import { db } from '../server/db';
import { agentDirectoryProfiles } from '../shared/schema';

interface ScrapedAgent {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  officeLocation: string;
  professionalTitle?: string;
  licenseNumber?: string;
  headshotUrl: string;
  subdomain: string;
  bio?: string;
}

async function scrapeAgentsFromREW(): Promise<ScrapedAgent[]> {
  console.log('🔍 Fetching agents from REW site...');
  
  const response = await fetch('https://www.spyglassrealty.com/agents.php');
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const agents: ScrapedAgent[] = [];
  
  // REW uses specific classes for agent cards
  const agentCards = document.querySelectorAll('.agent-card, .agent-item, .rng-agent-item');
  
  console.log(`Found ${agentCards.length} agent cards on the page`);

  agentCards.forEach((card: any) => {
    try {
      // Extract name
      const nameElement = card.querySelector('.agent-name, h3, h4, .name');
      if (!nameElement) return;
      
      const fullName = nameElement.textContent.trim();
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      // Extract email
      const emailLink = card.querySelector('a[href^="mailto:"]');
      const email = emailLink ? emailLink.getAttribute('href').replace('mailto:', '') : '';
      
      // Extract phone
      const phoneLink = card.querySelector('a[href^="tel:"]');
      const phone = phoneLink ? phoneLink.getAttribute('href').replace('tel:', '').replace(/\D/g, '') : '';
      
      // Extract image
      const imgElement = card.querySelector('img');
      let headshotUrl = '';
      if (imgElement) {
        const src = imgElement.getAttribute('src') || '';
        // Convert REW URL to local URL
        const filename = `${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/\s+/g, '-')}.png`;
        headshotUrl = `/agent-photos/${filename}`;
      }
      
      // Extract title/position
      const titleElement = card.querySelector('.agent-title, .title, .position');
      const professionalTitle = titleElement ? titleElement.textContent.trim() : '';
      
      // Extract office
      const officeElement = card.querySelector('.office, .location');
      const officeLocation = officeElement ? officeElement.textContent.trim() : 'Austin';
      
      // Generate subdomain
      const subdomain = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
      
      if (firstName && lastName && email) {
        agents.push({
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone,
          officeLocation,
          professionalTitle,
          headshotUrl,
          subdomain,
          bio: '', // Will need to be filled in separately
        });
      }
    } catch (error) {
      console.error('Error parsing agent card:', error);
    }
  });

  return agents;
}

async function importAgents() {
  try {
    console.log('🚀 Starting agent import from REW...\n');
    
    // Scrape agents
    const agents = await scrapeAgentsFromREW();
    console.log(`\n✅ Successfully scraped ${agents.length} agents\n`);
    
    // Clear existing agents (optional - comment out if you want to preserve existing data)
    console.log('🧹 Clearing existing agent data...');
    await db.delete(agentDirectoryProfiles);
    
    // Insert agents
    console.log('💾 Inserting agents into database...\n');
    
    let inserted = 0;
    let errors = 0;
    
    for (const agent of agents) {
      try {
        await db.insert(agentDirectoryProfiles).values({
          ...agent,
          isVisible: true,
          sortOrder: 0,
          socialLinks: {},
          yearsOfExperience: null,
          languages: [],
          specialties: [],
          indexingDirective: 'index,follow',
          seoScore: 30, // Base score
        });
        
        console.log(`✅ Imported: ${agent.firstName} ${agent.lastName}`);
        inserted++;
      } catch (error: any) {
        console.error(`❌ Failed to import ${agent.firstName} ${agent.lastName}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 Import complete!`);
    console.log(`   ✅ Successfully imported: ${inserted} agents`);
    console.log(`   ❌ Errors: ${errors}`);
    
    // Update photo URLs to use local versions
    console.log('\n🖼️  Updating photo URLs to use local processed versions...');
    const agentsWithPhotos = await db.select().from(agentDirectoryProfiles);
    
    for (const agent of agentsWithPhotos) {
      if (agent.headshotUrl && agent.headshotUrl.startsWith('/agent-photos/')) {
        // Photo URL is already local, ensure it points to the processed version
        const filename = agent.headshotUrl.split('/').pop();
        await db.update(agentDirectoryProfiles)
          .set({ 
            headshotUrl: `https://missioncontrol-tjfm.onrender.com/agent-photos/${filename}`,
            seoScore: 40 // Bump score for having a photo
          })
          .where(db.eq(agentDirectoryProfiles.id, agent.id));
      }
    }
    
    console.log('✅ Photo URLs updated!\n');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importAgents().then(() => {
  console.log('🎉 Agent import completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});