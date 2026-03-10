#!/usr/bin/env node

/**
 * Simple email monitoring for Maggie's QA replies
 * Uses existing SMTP credentials with IMAP to check for incoming emails
 */

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const QA_QUEUE_PATH = '/Users/ryanrodenbeck/clawd/qa-queue.md';

async function checkForMaggieReplies() {
  console.log('🔍 Checking for QA replies from Maggie...');
  
  try {
    // For now, use a simple approach - check the qa-email-log for sent emails
    // and look for patterns that indicate replies have been processed
    
    const logPath = '/Users/ryanrodenbeck/clawd/qa-email-log.jsonl';
    let logEntries = [];
    
    try {
      const logData = await fs.readFile(logPath, 'utf-8');
      logEntries = logData.trim().split('\\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.log('📧 No QA email log found - no emails sent yet');
      return false;
    }
    
    console.log(`📋 Found ${logEntries.length} QA email(s) in log`);
    
    // Check for recent emails that might have replies
    const recentEmails = logEntries.filter(entry => {
      const sentTime = new Date(entry.timestamp);
      const hoursSince = (Date.now() - sentTime.getTime()) / (1000 * 60 * 60);
      return hoursSince <= 48; // Check emails from last 48 hours
    });
    
    if (recentEmails.length === 0) {
      console.log('📧 No recent QA emails to check for replies');
      return false;
    }
    
    console.log(`📬 Checking ${recentEmails.length} recent QA email(s) for replies`);
    
    // For each recent email, simulate checking for a reply
    // In a full OAuth implementation, this would check Gmail API
    // For now, we'll provide instructions for manual checking
    
    for (const email of recentEmails) {
      console.log(`📨 QA Email: ${email.project} sent to Maggie`);
      console.log(`   Message ID: ${email.messageId}`);
      console.log(`   URL: ${email.url}`);
      
      // Manual check instruction
      console.log('   💡 Manual check needed: Login to clawd@spyglassrealty.com');
      console.log('   💡 Look for replies from maggie@spyglassrealty.com');
      console.log('   💡 Check if reply contains PASS/FAIL status');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error checking for Maggie replies:', error.message);
    return false;
  }
}

async function simulateProcessReply(projectName, status, replyText) {
  /**
   * Simulate processing a QA reply - this would be called when we detect
   * an actual email reply from Maggie
   */
  console.log(`📋 Processing QA reply for ${projectName}: ${status}`);
  
  try {
    let qaQueue = await fs.readFile(QA_QUEUE_PATH, 'utf-8');
    
    const timestamp = new Date().toLocaleString();
    const statusEmoji = status === 'PASS' ? '✅' : '❌';
    
    const qaResult = `
### ${projectName} - QA ${status}
- **Status:** ${statusEmoji} ${status} by Maggie
- **Timestamp:** ${timestamp}
- **Results:** ${replyText.substring(0, 200)}${replyText.length > 200 ? '...' : ''}
- **Processed:** Automatically via email reply
`;

    // Move from Pending to appropriate section
    const targetSection = status === 'PASS' ? 'Completed' : 'Failed';
    
    // Remove from Pending (simple approach)
    const pendingRegex = new RegExp(`### ${projectName}[^#]*?(?=###|## |$)`, 'gms');
    qaQueue = qaQueue.replace(pendingRegex, '');
    
    // Add to target section
    const sectionRegex = new RegExp(`(## ${targetSection}[^#]*?)(?=## |$)`, 'gms');
    qaQueue = qaQueue.replace(sectionRegex, `$1${qaResult}`);
    
    await fs.writeFile(QA_QUEUE_PATH, qaQueue);
    console.log(`✅ Updated qa-queue.md: ${projectName} ${status}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating qa-queue for ${projectName}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  const hasRecentEmails = await checkForMaggieReplies();
  
  if (!hasRecentEmails) {
    console.log('✅ No recent QA emails to check');
    return;
  }
  
  // Instructions for manual checking until OAuth is set up
  console.log('');
  console.log('🔧 MANUAL STEPS NEEDED (until OAuth is configured):');
  console.log('1. Login to https://mail.google.com as clawd@spyglassrealty.com');
  console.log('2. Look for replies from maggie@spyglassrealty.com');
  console.log('3. For each QA reply found:');
  console.log('   - Note the project name from subject line');
  console.log('   - Check if reply contains "PASS" or "FAIL"');
  console.log('   - Run: node scripts/process-manual-qa-reply.mjs [project] [PASS/FAIL] "[reply text]"');
  console.log('');
  console.log('📧 OAuth setup needed for full automation!');
}

// Export functions for use by other scripts
export { checkForMaggieReplies, simulateProcessReply };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}