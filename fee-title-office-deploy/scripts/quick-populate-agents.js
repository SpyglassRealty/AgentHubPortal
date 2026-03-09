#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all photo files
const photosDir = path.join(__dirname, '../public/agent-photos');
const files = fs.readdirSync(photosDir).filter(f => f.endsWith('.png'));

console.log(`Found ${files.length} agent photos to process\n`);

// Function to create an agent
async function createAgent(photoFile) {
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
  
  const agentData = {
    firstName,
    lastName,
    email,
    phone: '',
    officeLocation: 'Austin',
    professionalTitle: 'Real Estate Agent',
    licenseNumber: '',
    headshotUrl: `/agent-photos/${photoFile}`,
    subdomain: nameWithoutExt,
    bio: `${firstName} ${lastName} is a dedicated real estate professional serving the Austin area with Spyglass Realty.`,
    isVisible: true,
    socialLinks: {},
    yearsOfExperience: null,
    languages: ['English'],
    specialties: [],
    metaTitle: `${firstName} ${lastName} - Austin Real Estate Agent | Spyglass Realty`,
    metaDescription: `Connect with ${firstName} ${lastName}, a trusted real estate agent at Spyglass Realty.`
  };
  
  try {
    const response = await fetch('https://missioncontrol-tjfm.onrender.com/api/admin/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Created: ${firstName} ${lastName}`);
      return { success: true, name: `${firstName} ${lastName}` };
    } else {
      console.log(`❌ Failed: ${firstName} ${lastName} - ${JSON.stringify(result)}`);
      return { success: false, name: `${firstName} ${lastName}`, error: result };
    }
  } catch (error) {
    console.log(`❌ Error: ${firstName} ${lastName} - ${error.message}`);
    return { success: false, name: `${firstName} ${lastName}`, error: error.message };
  }
}

// Process all agents
async function populateAllAgents() {
  console.log('Starting agent population...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process in batches of 5
  for (let i = 0; i < files.length; i += 5) {
    const batch = files.slice(i, i + 5);
    const promises = batch.map(file => createAgent(file));
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      if (result.success) successCount++;
      else errorCount++;
    });
    
    console.log(`Progress: ${i + batch.length}/${files.length}`);
    
    // Small delay between batches
    if (i + 5 < files.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✅ Population complete!`);
  console.log(`   Success: ${successCount} agents`);
  console.log(`   Errors: ${errorCount} agents`);
}

// Run it
populateAllAgents().catch(console.error);