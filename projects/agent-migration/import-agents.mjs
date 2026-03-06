#!/usr/bin/env node
/**
 * Import scraped agents into Mission Control's agent_directory_profiles table
 * via the admin API.
 * 
 * Usage: node import-agents.mjs [--dry-run] [--force]
 *   --dry-run   Preview what would be imported without writing
 *   --force     Overwrite existing profiles (by subdomain match)
 */

import { readFileSync } from 'fs';

const SCRAPED_FILE = '/Users/ryanrodenbeck/clawd/projects/agent-migration/scraped-agents.json';
const MC_URL = process.env.MC_URL || 'https://missioncontrol-tjfm.onrender.com';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

if (DRY_RUN) console.log('🔍 DRY RUN — no data will be written\n');

const agents = JSON.parse(readFileSync(SCRAPED_FILE, 'utf-8'));
console.log(`Loaded ${agents.length} scraped agents\n`);

// First, fetch existing agents from MC to check for dupes
let existingAgents = [];
try {
  const res = await fetch(`${MC_URL}/api/admin/agents?limit=500`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.ok) {
    const data = await res.json();
    existingAgents = data.agents || [];
    console.log(`Found ${existingAgents.length} existing agents in MC\n`);
  } else {
    console.log(`⚠️  Could not fetch existing agents (${res.status}), proceeding with import\n`);
  }
} catch (err) {
  console.log(`⚠️  Could not reach MC API: ${err.message}\n`);
}

const existingBySubdomain = new Map(existingAgents.map(a => [a.subdomain, a]));

let created = 0;
let skipped = 0;
let updated = 0;
let errors = 0;

for (const agent of agents) {
  // Skip agents with no name
  if (!agent.fullName) {
    console.log(`⏭️  Skipping ${agent.slug} — no name`);
    skipped++;
    continue;
  }

  const subdomain = agent.slug; // Use the REW slug as subdomain
  const existing = existingBySubdomain.get(subdomain);

  if (existing && !FORCE) {
    console.log(`⏭️  ${agent.fullName} (${subdomain}) — already exists, skipping`);
    skipped++;
    continue;
  }

  const payload = {
    firstName: agent.firstName || '',
    lastName: agent.lastName || '',
    email: agent.email || `${subdomain}@spyglassrealty.com`, // fallback
    phone: agent.phone || '',
    officeLocation: agent.officeLocation || 'Austin',
    bio: agent.bio || '',
    professionalTitle: agent.professionalTitle || '',
    headshotUrl: agent.headshotUrl || '',
    socialLinks: agent.socialLinks || {},
    subdomain,
    isVisible: true,
    sortOrder: 0,
    metaDescription: agent.metaDescription || '',
  };

  if (DRY_RUN) {
    console.log(`📝 Would ${existing ? 'UPDATE' : 'CREATE'}: ${agent.fullName} (${subdomain})`);
    console.log(`   Phone: ${payload.phone}, Email: ${payload.email}`);
    console.log(`   Bio: ${payload.bio ? payload.bio.length + ' chars' : 'none'}`);
    console.log(`   Social: ${Object.keys(payload.socialLinks).filter(k => payload.socialLinks[k]).join(', ') || 'none'}`);
    console.log(`   Headshot: ${payload.headshotUrl ? 'yes' : 'no'}`);
    created++;
    continue;
  }

  try {
    let res;
    if (existing && FORCE) {
      // Update existing
      res = await fetch(`${MC_URL}/api/admin/agents/${existing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id: existing.id }),
      });
    } else {
      // Create new
      res = await fetch(`${MC_URL}/api/admin/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const action = existing ? 'Updated' : 'Created';
      console.log(`✅ ${action}: ${agent.fullName} (${subdomain})`);
      if (existing) updated++;
      else created++;
    } else {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`❌ ${agent.fullName}: ${err.error || res.status}`);
      errors++;
    }
  } catch (err) {
    console.error(`❌ ${agent.fullName}: ${err.message}`);
    errors++;
  }

  // Small delay to avoid hammering the API
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n📊 Results:`);
console.log(`   Created: ${created}`);
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Errors: ${errors}`);
