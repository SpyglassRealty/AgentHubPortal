#!/usr/bin/env node

/**
 * Manual QA reply processor
 * Usage: node process-manual-qa-reply.mjs [project-name] [PASS/FAIL] "[reply text]"
 */

import fs from 'fs/promises';

const QA_QUEUE_PATH = '/Users/ryanrodenbeck/clawd/qa-queue.md';

async function processManualQAReply(projectName, status, replyText) {
  console.log(`📋 Processing manual QA reply for ${projectName}: ${status}`);
  
  try {
    // Read current qa-queue.md
    let qaQueue = await fs.readFile(QA_QUEUE_PATH, 'utf-8');
    
    const timestamp = new Date().toLocaleString();
    const statusEmoji = status === 'PASS' ? '✅' : '❌';
    
    // Create the result entry
    const qaResult = `
### ${projectName} - QA ${status}
- **Status:** ${statusEmoji} ${status} by Maggie
- **Timestamp:** ${timestamp}
- **Results:** ${replyText.substring(0, 300)}${replyText.length > 300 ? '...' : ''}
- **Source:** Manual processing of email reply
`;

    // Determine target section
    const targetSection = status === 'PASS' ? 'Completed' : 'Failed';
    
    // Remove from Pending section
    const projectEntryRegex = new RegExp(`### ${projectName}[\\s\\S]*?(?=###|## |$)`, 'g');
    
    // Find and extract the pending entry
    const pendingMatch = qaQueue.match(projectEntryRegex);
    if (pendingMatch) {
      console.log(`📝 Found pending entry for ${projectName}, moving to ${targetSection}`);
      qaQueue = qaQueue.replace(projectEntryRegex, '');
    } else {
      console.log(`⚠️  No pending entry found for ${projectName}, adding new entry to ${targetSection}`);
    }
    
    // Add to target section
    const targetSectionRegex = new RegExp(`(## ${targetSection}[\\s\\S]*?)(?=## |$)`, 'g');
    const targetMatch = qaQueue.match(targetSectionRegex);
    
    if (targetMatch) {
      qaQueue = qaQueue.replace(targetSectionRegex, `$1${qaResult}`);
    } else {
      // If target section doesn't exist, add it
      qaQueue += `\\n## ${targetSection}${qaResult}\\n`;
    }
    
    // Write back to file
    await fs.writeFile(QA_QUEUE_PATH, qaQueue);
    console.log(`✅ Updated qa-queue.md: ${projectName} → ${targetSection} (${status})`);
    
    // Log the action
    const logEntry = {
      timestamp: new Date().toISOString(),
      project: projectName,
      status: status,
      action: 'manual_qa_reply_processed',
      replyText: replyText.substring(0, 100)
    };
    
    const logFile = '/Users/ryanrodenbeck/clawd/qa-processing-log.jsonl';
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\\n');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing manual QA reply for ${projectName}:`, error.message);
    return false;
  }
}

// Command line usage
if (process.argv.length < 5) {
  console.log('Usage: node process-manual-qa-reply.mjs [project-name] [PASS/FAIL] "[reply text]"');
  console.log('');
  console.log('Examples:');
  console.log('  node process-manual-qa-reply.mjs mission-control PASS "All tests passed, looks good!"');
  console.log('  node process-manual-qa-reply.mjs spyglass-idx FAIL "Found broken search functionality"');
  process.exit(1);
}

const projectName = process.argv[2];
const status = process.argv[3].toUpperCase();
const replyText = process.argv[4];

if (!['PASS', 'FAIL'].includes(status)) {
  console.error('❌ Status must be PASS or FAIL');
  process.exit(1);
}

processManualQAReply(projectName, status, replyText)
  .then(success => {
    if (success) {
      console.log('🎯 QA reply processed successfully!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Failed to process QA reply:', error.message);
    process.exit(1);
  });

export { processManualQAReply };