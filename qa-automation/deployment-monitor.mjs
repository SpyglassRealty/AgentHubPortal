#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const MONITORED_PROJECTS = [
  {
    name: 'spyglass-idx',
    provider: 'vercel',
    prodUrl: 'https://spyglass-idx.vercel.app',
    checkCommand: 'cd ~/clawd/spyglass-idx && git log -1 --format="%H"'
  },
  {
    name: 'mission-control',
    provider: 'render', 
    prodUrl: 'https://missioncontrol-tjfm.onrender.com',
    checkCommand: 'cd ~/clawd/MissionControl && git log -1 --format="%H"'
  },
  {
    name: 'spyglass-crm',
    provider: 'vercel',
    prodUrl: 'https://spyglass-crm.vercel.app',
    checkCommand: 'cd ~/clawd/spyglass-cms && git log -1 --format="%H"'
  }
];

const STATE_FILE = path.join(process.cwd(), 'deployment-state.json');
const MAGGIE_NODE_ID = 'c56cf964ef3d3c5223ed7d4bad3f029b5fab8cbc986e61cc1c16f32832d63d67';

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function getCurrentCommit(project) {
  try {
    const { stdout } = await execAsync(project.checkCommand);
    return stdout.trim();
  } catch (error) {
    console.error(`Failed to get commit for ${project.name}:`, error.message);
    return null;
  }
}

async function notifyMaggie(project, commitHash) {
  const qaMessage = `New Deployment Detected!

Project: ${project.name}
URL: ${project.prodUrl}
Provider: ${project.provider}
Commit: ${commitHash.substring(0, 7)}
Time: ${new Date().toLocaleString()}

Please run the standard QA checklist and post results to #qa-reports.

Checklist:
- Visual regression (screenshots)
- Core functionality 
- Console errors
- Mobile responsiveness
- Load time < 3s`;

  const title = `QA Needed: ${project.name}`;

  try {
    // Use spawn to avoid shell interpretation issues
    const { spawn } = await import('child_process');
    const child = spawn('clawdbot', [
      'nodes', 'notify',
      `--node=${MAGGIE_NODE_ID}`,
      `--title=${title}`,
      `--body=${qaMessage}`,
      '--priority=timeSensitive'
    ]);

    await new Promise((resolve, reject) => {
      let stderr = '';
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });

    console.log(`✅ Notified Maggie about ${project.name} deployment`);
  } catch (error) {
    console.error(`❌ Failed to notify Maggie:`, error.message);
    
    // Fallback: try email notification
    await sendQAEmailNotification(project, commitHash);
  }
}

async function sendQAEmailNotification(project, commitHash) {
  try {
    console.log('📧 Attempting email notification as fallback...');
    
    // Import the dedicated QA email function
    const { sendQAEmail } = await import('/Users/ryanrodenbeck/clawd/scripts/send-qa-email.mjs');
    
    await sendQAEmail(
      project.name,
      project.prodUrl, 
      project.provider,
      commitHash.substring(0, 7)
    );
    
    console.log(`✅ QA email sent to Maggie about ${project.name} deployment`);
    
  } catch (error) {
    console.error(`❌ QA email notification failed:`, error.message);
  }
}

async function checkDeployments() {
  console.log('🔍 Checking for new deployments...');
  const state = await loadState();
  let hasChanges = false;

  for (const project of MONITORED_PROJECTS) {
    const currentCommit = await getCurrentCommit(project);
    if (!currentCommit) continue;

    const lastCommit = state[project.name];
    
    if (lastCommit && lastCommit !== currentCommit) {
      console.log(`📦 New deployment detected for ${project.name}!`);
      await notifyMaggie(project, currentCommit);
      hasChanges = true;
    }

    state[project.name] = currentCommit;
  }

  await saveState(state);
  
  if (!hasChanges) {
    console.log('No new deployments detected.');
  }
}

// Run immediately if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkDeployments().catch(console.error);
}