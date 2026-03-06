#!/usr/bin/env node
/**
 * Update agent headshots in Mission Control with correct URLs
 */

import { readFileSync } from 'fs';

const SCRAPED_FILE = '/Users/ryanrodenbeck/clawd/projects/agent-migration/scraped-agents.json';
const MC_URL = process.env.MC_URL || 'https://missioncontrol-tjfm.onrender.com';

const agents = JSON.parse(readFileSync(SCRAPED_FILE, 'utf-8'));
console.log(`Loaded ${agents.length} scraped agents\n`);

// First, fetch existing agents from MC to get their IDs
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
    console.log(`⚠️  Could not fetch existing agents (${res.status})\n`);
    process.exit(1);
  }
} catch (err) {
  console.log(`⚠️  Could not reach MC API: ${err.message}\n`);
  process.exit(1);
}

const existingBySubdomain = new Map(existingAgents.map(a => [a.subdomain, a]));

let updated = 0;
let skipped = 0;
let errors = 0;

for (const agent of agents) {
  if (!agent.headshotUrl || agent.headshotUrl.includes('35mm_landscape')) {
    skipped++;
    continue;
  }

  const subdomain = agent.slug;
  const existing = existingBySubdomain.get(subdomain);

  if (!existing) {
    console.log(`⏭️  ${agent.fullName} (${subdomain}) — not found in MC`);
    skipped++;
    continue;
  }

  try {
    const res = await fetch(`${MC_URL}/api/admin/agents/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...existing,
        headshotUrl: agent.headshotUrl 
      }),
    });

    if (res.ok) {
      console.log(`✅ Updated headshot: ${agent.fullName} (${subdomain})`);
      updated++;
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
console.log(`   Updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Errors: ${errors}`);