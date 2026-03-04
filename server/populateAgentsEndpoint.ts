import { Router } from "express";
import { db } from "./db";
import { agentDirectoryProfiles } from "@shared/schema";
import { readdirSync } from "fs";
import { join } from "path";

const router = Router();

// POST /api/admin/populate-agents - One-time endpoint to populate agents from photos
router.post("/admin/populate-agents-from-photos", async (req, res) => {
  try {
    // Check for admin auth or a secret key
    const secretKey = req.headers['x-populate-key'];
    if (secretKey !== 'populate-agents-2024') {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log('🚀 Starting agent population from photo directory...');
    
    // Read photo files
    const photosDir = join(process.cwd(), 'public', 'agent-photos');
    let photoFiles: string[] = [];
    
    try {
      const files = readdirSync(photosDir);
      photoFiles = files.filter(file => file.endsWith('.png'));
    } catch (error) {
      console.error('Error reading photos directory:', error);
      return res.status(500).json({ error: "Could not read photos directory" });
    }
    
    console.log(`Found ${photoFiles.length} agent photos`);
    
    // Clear existing agents if requested
    if (req.body.clearExisting) {
      await db.delete(agentDirectoryProfiles);
      console.log('Cleared existing agents');
    }
    
    const results = {
      total: photoFiles.length,
      inserted: 0,
      errors: [] as string[],
      agents: [] as any[]
    };
    
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
        
        // Email patterns based on known agent emails
        let email = `${firstName.toLowerCase()}@spyglassrealty.com`;
        
        // Handle special email patterns
        if (['ashley', 'michael', 'chris'].includes(firstName.toLowerCase()) && lastName) {
          email = `${firstName.toLowerCase()}.${lastName.split(' ')[0].toLowerCase()}@spyglassrealty.com`;
        }
        
        const subdomain = nameWithoutExt;
        
        const agentData = {
          firstName,
          lastName,
          email: email.toLowerCase(),
          phone: '',
          officeLocation: 'Austin',
          professionalTitle: 'Real Estate Agent',
          licenseNumber: '',
          headshotUrl: `/agent-photos/${photoFile}`,
          subdomain,
          bio: `${firstName} ${lastName} is a dedicated real estate professional serving the Austin area with Spyglass Realty. With a commitment to excellence and deep knowledge of the local market, ${firstName} helps clients navigate their real estate journey with confidence.`,
          isVisible: true,
          sortOrder: 0,
          socialLinks: {},
          yearsOfExperience: null,
          languages: ['English'],
          specialties: [],
          indexingDirective: 'index,follow',
          seoScore: 40,
          videoUrl: null,
          metaTitle: `${firstName} ${lastName} - Austin Real Estate Agent | Spyglass Realty`,
          metaDescription: `Connect with ${firstName} ${lastName}, a trusted real estate agent at Spyglass Realty. Expert guidance for buying and selling homes in Austin, TX.`,
          repliersAgentId: null,
          customSchema: null
        };
        
        const [insertedAgent] = await db.insert(agentDirectoryProfiles)
          .values(agentData)
          .returning();
        
        results.inserted++;
        results.agents.push({
          id: insertedAgent.id,
          name: `${firstName} ${lastName}`,
          email: insertedAgent.email,
          photo: insertedAgent.headshotUrl
        });
        
        console.log(`✅ Created: ${firstName} ${lastName}`);
        
      } catch (error: any) {
        console.error(`❌ Failed: ${photoFile} - ${error.message}`);
        results.errors.push(`${photoFile}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Population complete! Created ${results.inserted} agent profiles`);
    
    return res.json({
      success: true,
      message: `Successfully populated ${results.inserted} out of ${results.total} agents`,
      results
    });
    
  } catch (error: any) {
    console.error('Population failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;