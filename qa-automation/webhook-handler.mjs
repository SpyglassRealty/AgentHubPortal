#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// This script handles deployment webhooks and triggers Maggie for QA

const MAGGIE_NODE_ID = 'c56cf964ef3d3c5223ed7d4bad3f029b5fab8cbc986e61cc1c16f32832d63d67';
const QA_REPORTS_CHANNEL = 'C0AH800FPJ7';

async function triggerMaggieQA(deployment) {
  const { project, url, environment, provider } = deployment;
  
  // Build QA task for Maggie
  const qaTask = `
🔍 AUTOMATED QA REQUEST

**Project:** ${project}
**URL:** ${url}  
**Environment:** ${environment}
**Provider:** ${provider}
**Time:** ${new Date().toISOString()}

Please run the standard QA checklist:
1. Visual regression testing
2. Core functionality checks
3. Console error monitoring
4. Mobile responsiveness
5. Performance metrics

Post your findings to #qa-reports in Slack.
`;

  // Send notification to Maggie via nodes tool
  const command = `clawdbot nodes notify --node="${MAGGIE_NODE_ID}" --title="QA Request: ${project}" --body="${qaTask}" --priority=timeSensitive`;
  
  try {
    console.log(`Triggering Maggie for QA on ${project}...`);
    execSync(command, { stdio: 'inherit' });
    
    // Log the trigger
    const logEntry = {
      timestamp: new Date().toISOString(),
      deployment,
      status: 'triggered'
    };
    
    await logQATrigger(logEntry);
    
    return { success: true, message: 'QA triggered successfully' };
  } catch (error) {
    console.error('Failed to trigger QA:', error);
    return { success: false, error: error.message };
  }
}

async function logQATrigger(entry) {
  const logFile = path.join(process.cwd(), 'qa-triggers.log');
  const logLine = JSON.stringify(entry) + '\n';
  await fs.appendFile(logFile, logLine);
}

// Example usage (will be called by webhook receiver)
const exampleDeployment = {
  project: 'spyglass-idx',
  url: 'https://spyglass-idx.vercel.app',
  environment: 'production',
  provider: 'vercel'
};

// Uncomment to test
// triggerMaggieQA(exampleDeployment);

export { triggerMaggieQA };