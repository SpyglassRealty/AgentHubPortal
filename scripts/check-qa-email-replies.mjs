#!/usr/bin/env node

/**
 * Automated QA email reply checker
 * Checks clawd@spyglassrealty.com for replies from Maggie and processes them
 */

import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const QA_QUEUE_PATH = '/Users/ryanrodenbeck/clawd/qa-queue.md';

async function hasGoogleOAuth() {
  try {
    await execAsync('gog gmail search "is:unread" --account=clawd@spyglassrealty.com --max=1 --json 2>/dev/null');
    return true;
  } catch (error) {
    return false;
  }
}

async function checkForQARepliesWithOAuth() {
  console.log('🔍 Checking Gmail for QA replies from Maggie (OAuth)...');
  
  try {
    // Search for unread emails from Maggie with QA-related subjects
    const { stdout } = await execAsync(`gog gmail search "from:maggie@spyglassrealty.com is:unread (subject:QA OR subject:Re:)" --account=clawd@spyglassrealty.com --json`);
    
    if (!stdout.trim()) {
      console.log('📧 No unread QA emails from Maggie found');
      return [];
    }
    
    const searchResult = JSON.parse(stdout);
    const threads = searchResult.threads || [];
    
    if (threads.length === 0) {
      console.log('📧 No unread QA email threads from Maggie');
      return [];
    }
    
    console.log(`📬 Found ${threads.length} unread QA thread(s) from Maggie`);
    
    const processedReplies = [];
    
    // Process each thread
    for (const thread of threads) {
      const threadId = thread.id;
      console.log(`📨 Processing thread: ${threadId}`);
      
      try {
        // Get thread details
        const { stdout: threadData } = await execAsync(`gog gmail thread get ${threadId} --account=clawd@spyglassrealty.com --json`);
        const thread = JSON.parse(threadData);
        const messages = thread.messages || [];
        
        if (messages.length === 0) continue;
        
        // Get the latest message from Maggie
        const latestMessage = messages[messages.length - 1];
        const headers = latestMessage.payload?.headers || [];
        
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        
        // Verify it's from Maggie and QA-related
        if (!from.includes('maggie@spyglassrealty.com') || 
            (!subject.includes('QA') && !subject.includes('Re:'))) {
          continue;
        }
        
        console.log(`📋 Processing QA reply: ${subject}`);
        
        // Extract message body
        let bodyText = '';
        if (latestMessage.payload?.body?.data) {
          bodyText = Buffer.from(latestMessage.payload.body.data, 'base64').toString();
        } else if (latestMessage.payload?.parts) {
          for (const part of latestMessage.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              bodyText += Buffer.from(part.body.data, 'base64').toString();
            }
          }
        }
        
        // Extract project name from subject
        const projectMatch = subject.match(/QA.*?:?\\s*([A-Za-z-]+)/i) || 
                           subject.match(/Re:\\s*QA.*?([A-Za-z-]+)/i) ||
                           subject.match(/([A-Za-z-]+).*QA/i);
        const projectName = projectMatch ? projectMatch[1].toLowerCase() : 'unknown';
        
        // Determine PASS/FAIL status
        const bodyLower = bodyText.toLowerCase();
        let status = 'REVIEWED';
        
        if (bodyLower.includes('pass') || bodyLower.includes('✅') || 
            bodyLower.includes('looks good') || bodyLower.includes('working') ||
            bodyLower.includes('all good') || bodyLower.includes('approved')) {
          status = 'PASS';
        } else if (bodyLower.includes('fail') || bodyLower.includes('❌') || 
                   bodyLower.includes('error') || bodyLower.includes('broken') ||
                   bodyLower.includes('issue') || bodyLower.includes('problem')) {
          status = 'FAIL';
        }
        
        // Process the reply
        const replyResult = await processQAReply(projectName, status, bodyText, threadId);
        
        if (replyResult) {
          processedReplies.push({
            project: projectName,
            status: status,
            threadId: threadId,
            subject: subject
          });
          
          // Mark thread as read
          try {
            await execAsync(`gog gmail thread modify ${threadId} --account=clawd@spyglassrealty.com --remove-labels UNREAD`);
            console.log(`✅ Marked thread ${threadId} as read`);
          } catch (markError) {
            console.log(`⚠️ Could not mark thread as read: ${markError.message}`);
          }
        }
        
      } catch (threadError) {
        console.error(`❌ Error processing thread ${threadId}:`, threadError.message);
      }
    }
    
    return processedReplies;
    
  } catch (error) {
    console.error('❌ Error checking Gmail with OAuth:', error.message);
    return [];
  }
}

async function processQAReply(projectName, status, bodyText, threadId) {
  try {
    console.log(`📋 Processing QA reply: ${projectName} → ${status}`);
    
    let qaQueue = await fs.readFile(QA_QUEUE_PATH, 'utf-8');
    
    const timestamp = new Date().toLocaleString();
    const statusEmoji = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '📋');
    
    // Create result entry
    const qaResult = `
### ${projectName} - QA ${status}
- **Status:** ${statusEmoji} ${status} by Maggie
- **Timestamp:** ${timestamp}
- **Results:** ${bodyText.substring(0, 300).replace(/\\n/g, ' ').trim()}${bodyText.length > 300 ? '...' : ''}
- **Thread ID:** ${threadId}
- **Processed:** Automatically via OAuth email integration
`;

    // Determine target section
    const targetSection = status === 'PASS' ? 'Completed' : (status === 'FAIL' ? 'Failed' : 'In Progress');
    
    // Remove from Pending (case-insensitive project name matching)
    const pendingRegex = new RegExp(`### ${projectName}[\\s\\S]*?(?=###|## |$)`, 'gi');
    const hadPendingEntry = pendingRegex.test(qaQueue);
    
    if (hadPendingEntry) {
      qaQueue = qaQueue.replace(pendingRegex, '');
      console.log(`📝 Moved ${projectName} from Pending to ${targetSection}`);
    } else {
      console.log(`📝 Added new entry for ${projectName} to ${targetSection}`);
    }
    
    // Add to target section
    const targetSectionRegex = new RegExp(`(## ${targetSection}[\\s\\S]*?)(?=## |$)`, 'g');
    const targetMatch = qaQueue.match(targetSectionRegex);
    
    if (targetMatch) {
      qaQueue = qaQueue.replace(targetSectionRegex, `$1${qaResult}`);
    } else {
      // Add new section if it doesn't exist
      qaQueue += `\\n## ${targetSection}${qaResult}\\n`;
    }
    
    // Write updated qa-queue.md
    await fs.writeFile(QA_QUEUE_PATH, qaQueue);
    console.log(`✅ Updated qa-queue.md: ${projectName} ${status}`);
    
    // Log the processing
    const logEntry = {
      timestamp: new Date().toISOString(),
      project: projectName,
      status: status,
      threadId: threadId,
      processed: 'oauth_automated'
    };
    
    const logFile = '/Users/ryanrodenbeck/clawd/qa-processing-log.jsonl';
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\\n');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing QA reply for ${projectName}:`, error.message);
    return false;
  }
}

async function checkForQARepliesManual() {
  console.log('📧 OAuth not available - checking QA email log for manual processing opportunities...');
  
  try {
    const logPath = '/Users/ryanrodenbeck/clawd/qa-email-log.jsonl';
    const logData = await fs.readFile(logPath, 'utf-8');
    const logEntries = logData.trim().split('\\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    // Check for recent emails that might have replies
    const recentEmails = logEntries.filter(entry => {
      const sentTime = new Date(entry.timestamp);
      const hoursSince = (Date.now() - sentTime.getTime()) / (1000 * 60 * 60);
      return hoursSince <= 24; // Check emails from last 24 hours
    });
    
    if (recentEmails.length === 0) {
      console.log('📧 No recent QA emails to check for replies');
      return [];
    }
    
    console.log(`📬 Found ${recentEmails.length} recent QA email(s) that may have replies`);
    console.log('💡 Manual check needed - login to clawd@spyglassrealty.com to check for replies');
    
    return [];
    
  } catch (error) {
    console.log('📧 No QA email log found or error reading it');
    return [];
  }
}

// Main function
async function main() {
  console.log('🔍 Checking for QA email replies from Maggie...');
  
  const hasOAuth = await hasGoogleOAuth();
  
  if (hasOAuth) {
    console.log('✅ OAuth available - using automated Gmail checking');
    const processedReplies = await checkForQARepliesWithOAuth();
    
    if (processedReplies.length > 0) {
      console.log(`\\n🎉 Processed ${processedReplies.length} QA replies:`);
      processedReplies.forEach(reply => {
        console.log(`   - ${reply.project}: ${reply.status}`);
      });
    } else {
      console.log('📭 No new QA replies to process');
    }
    
    return processedReplies.length;
    
  } else {
    console.log('⚠️  OAuth not configured - using manual checking mode');
    await checkForQARepliesManual();
    
    console.log('\\n🔧 To enable automated processing:');
    console.log('   node scripts/setup-gmail-oauth.mjs');
    
    return 0;
  }
}

// Export for use in other scripts
export { checkForQARepliesWithOAuth, processQAReply };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}