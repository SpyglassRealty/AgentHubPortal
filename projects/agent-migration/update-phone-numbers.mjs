#!/usr/bin/env node
/**
 * Update phone numbers for existing agents in Mission Control
 * Reads from scraped-agents.json and updates ONLY the phone field
 */

import { readFileSync } from 'fs';

const SCRAPED_FILE = './scraped-agents.json';
const MC_URL = 'https://missioncontrol-tjfm.onrender.com';
const DRY_RUN = process.argv.includes('--dry-run');

console.log('📞 Phone Number Update Script');
if (DRY_RUN) console.log('🔍 DRY RUN MODE - no changes will be made\n');

// Load scraped data with phone numbers
const scrapedAgents = JSON.parse(readFileSync(SCRAPED_FILE, 'utf-8'));
const phoneMap = new Map();
scrapedAgents.forEach(a => {
  if (a.phone && a.slug) {
    phoneMap.set(a.slug, a.phone);
  }
});
console.log(`Found ${phoneMap.size} agents with phone numbers in scraped data\n`);

// Fetch current agents from MC
console.log('Fetching agents from Mission Control...');
const res = await fetch(`${MC_URL}/api/admin/agents?limit=500`);
const data = await res.json();
const agents = data.agents || [];
console.log(`Found ${agents.length} agents in Mission Control\n`);

// Update agents missing phone numbers
let updated = 0;
let skipped = 0;
let errors = 0;

for (const agent of agents) {
  const phone = phoneMap.get(agent.subdomain);
  
  // Skip if no phone in scraped data or agent already has phone
  if (!phone || agent.phone) {
    if (agent.phone) {
      console.log(`✓ ${agent.firstName} ${agent.lastName} - already has phone: ${agent.phone}`);
    } else {
      console.log(`⏭️  ${agent.firstName} ${agent.lastName} - no phone in scraped data`);
    }
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`📝 Would update ${agent.firstName} ${agent.lastName}: ${phone}`);
    updated++;
    continue;
  }

  // Update only the phone field
  try {
    const updateRes = await fetch(`${MC_URL}/api/admin/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...agent,
        phone: phone
      })
    });

    if (updateRes.ok) {
      console.log(`✅ Updated ${agent.firstName} ${agent.lastName}: ${phone}`);
      updated++;
    } else {
      const err = await updateRes.text();
      console.error(`❌ Failed to update ${agent.firstName} ${agent.lastName}: ${err}`);
      errors++;
    }
  } catch (err) {
    console.error(`❌ Error updating ${agent.firstName} ${agent.lastName}: ${err.message}`);
    errors++;
  }

  // Small delay to be nice to the API
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Errors: ${errors}`);
console.log(`\n✨ Done!`);