#!/usr/bin/env node
import { readFileSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import path from 'path';

const SCRAPED_FILE = './scraped-agents.json';
const PHOTOS_DIR = './agent-photos';

const agents = JSON.parse(readFileSync(SCRAPED_FILE, 'utf-8'));

async function downloadPhoto(url, filename) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`  ❌ Failed to download: ${response.status} ${response.statusText}`);
      return false;
    }

    const dest = path.join(PHOTOS_DIR, filename);
    await pipeline(response.body, createWriteStream(dest));
    console.log(`  ✅ Downloaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error downloading: ${error.message}`);
    return false;
  }
}

console.log(`Downloading photos for ${agents.length} agents...\n`);

let downloaded = 0;
let failed = 0;

for (const agent of agents) {
  if (!agent.headshotUrl || agent.headshotUrl.includes('35mm_landscape')) {
    console.log(`⏭️  Skipping ${agent.fullName || agent.slug} - no photo`);
    continue;
  }

  console.log(`📸 ${agent.fullName} (${agent.slug})`);
  
  // Extract file extension from URL
  const urlPath = new URL(agent.headshotUrl).pathname;
  const ext = path.extname(urlPath) || '.jpg';
  const filename = `${agent.slug}${ext}`;

  const success = await downloadPhoto(agent.headshotUrl, filename);
  
  if (success) {
    downloaded++;
    // Update agent data with local photo path
    agent.localPhotoPath = `/agent-photos/${filename}`;
  } else {
    failed++;
  }
  
  // Small delay to be nice to their server
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n📊 Summary:`);
console.log(`   Downloaded: ${downloaded}`);
console.log(`   Failed: ${failed}`);
console.log(`   Skipped: ${agents.length - downloaded - failed}`);