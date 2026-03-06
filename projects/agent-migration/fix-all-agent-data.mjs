#!/usr/bin/env node
/**
 * COMPREHENSIVE FIX: Update all agent data with correct information
 * - Phone numbers
 * - Real bios (not generic placeholders)
 * - Correct photo URLs pointing to our edited gray-background photos
 */

import { readFileSync } from 'fs';

const SCRAPED_FILE = './scraped-agents.json';
const MC_URL = 'https://missioncontrol-tjfm.onrender.com';
const DRY_RUN = process.argv.includes('--dry-run');

console.log('🛠️  COMPREHENSIVE AGENT DATA FIX');
console.log('================================');
if (DRY_RUN) console.log('🔍 DRY RUN MODE - no changes will be made\n');

// Load scraped data with real info
const scrapedAgents = JSON.parse(readFileSync(SCRAPED_FILE, 'utf-8'));
const scrapedMap = new Map();
scrapedAgents.forEach(a => {
  if (a.slug) {
    scrapedMap.set(a.slug, a);
  }
});
console.log(`Loaded ${scrapedAgents.length} agents with real data\n`);

// Fetch current agents from MC
console.log('Fetching current agents from Mission Control...');
const res = await fetch(`${MC_URL}/api/admin/agents?limit=500`);
if (!res.ok) {
  console.error('❌ Failed to fetch agents:', res.status);
  process.exit(1);
}
const data = await res.json();
const agents = data.agents || [];
console.log(`Found ${agents.length} agents in Mission Control\n`);

// Fix each agent
let updated = 0;
let skipped = 0;
let errors = 0;

console.log('Starting fixes...\n');

for (const agent of agents) {
  const scraped = scrapedMap.get(agent.subdomain);
  
  if (!scraped) {
    console.log(`⏭️  ${agent.firstName} ${agent.lastName} - no scraped data found`);
    skipped++;
    continue;
  }

  // Determine what needs updating
  const updates = {};
  let needsUpdate = false;
  
  // 1. PHONE NUMBER
  if (scraped.phone && !agent.phone) {
    updates.phone = scraped.phone;
    needsUpdate = true;
  }
  
  // 2. REAL BIO (replace generic placeholder)
  const isGenericBio = agent.bio && agent.bio.includes('is a dedicated real estate professional serving the Austin area');
  if (scraped.bio && scraped.bio.length > 50 && (isGenericBio || !agent.bio)) {
    updates.bio = scraped.bio;
    needsUpdate = true;
  }
  
  // 3. CORRECT PHOTO URL (ensure using our edited photos)
  const editedPhotoUrl = `/agent-photos/${agent.subdomain}.png`;
  if (agent.headshotUrl !== editedPhotoUrl) {
    updates.headshotUrl = editedPhotoUrl;
    needsUpdate = true;
  }

  if (!needsUpdate) {
    console.log(`✓ ${agent.firstName} ${agent.lastName} - already up to date`);
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`📝 Would update ${agent.firstName} ${agent.lastName}:`);
    if (updates.phone) console.log(`   Phone: ${updates.phone}`);
    if (updates.bio) console.log(`   Bio: ${updates.bio.substring(0, 80)}...`);
    if (updates.headshotUrl) console.log(`   Photo: ${updates.headshotUrl}`);
    updated++;
    continue;
  }

  // Apply the update
  try {
    const updateRes = await fetch(`${MC_URL}/api/admin/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...agent,
        ...updates
      })
    });

    if (updateRes.ok) {
      console.log(`✅ Updated ${agent.firstName} ${agent.lastName}:`);
      if (updates.phone) console.log(`   Phone: ${updates.phone}`);
      if (updates.bio) console.log(`   Bio: ${updates.bio.substring(0, 80)}...`);
      if (updates.headshotUrl) console.log(`   Photo: ${updates.headshotUrl}`);
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
  await new Promise(r => setTimeout(r, 50));
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Errors: ${errors}`);

if (!DRY_RUN && updated > 0) {
  console.log(`\n🔄 Changes are live in Mission Control!`);
  console.log(`   The IDX site should reflect these changes immediately.`);
  console.log(`   If photos still show wrong, try hard refresh (Cmd+Shift+R).`);
}

console.log(`\n✨ Done!`);