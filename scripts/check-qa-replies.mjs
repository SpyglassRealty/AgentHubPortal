#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const QA_QUEUE_PATH = '/Users/ryanrodenbeck/clawd/qa-queue.md';

async function checkGmailForQAReplies() {
  console.log('🔍 Checking Gmail for QA replies from Maggie...');
  
  try {
    // Use gog (Google CLI) to search for unread emails from Maggie
    const { stdout } = await execAsync('gog gmail search "from:maggie@spyglassrealty.com is:unread" --account="clawd@spyglassrealty.com" --json');
    
    if (!stdout.trim()) {
      console.log('📧 No unread emails from Maggie found.');
      return;
    }
    
    // Parse JSON response
    const response = JSON.parse(stdout);
    const threads = response.threads || [];
    
    if (threads.length === 0) {
      console.log('📧 No unread email threads from Maggie found.');
      return;
    }
    
    console.log(`📬 Found ${threads.length} unread email thread(s) from Maggie`);
    
    // Process each thread
    for (const thread of threads) {
      const threadId = thread.id;
      console.log(`🔍 Processing thread: ${threadId}`);
      await processQAThread(threadId);
    }
    
  } catch (error) {
    console.error('❌ Error checking Gmail:', error.message);
    console.log('💡 Note: Make sure gog (Google CLI) is properly configured');
  }
}

async function processQAThread(threadId) {
  try {
    console.log(`📨 Processing thread ID: ${threadId}`);
    
    // Get thread content
    const { stdout } = await execAsync(`gog gmail thread get ${threadId} --account="clawd@spyglassrealty.com" --json`);
    const threadData = JSON.parse(stdout);
    const messages = threadData.messages || [];
    
    if (messages.length === 0) {
      console.log('📝 No messages in thread, skipping');
      return;
    }
    
    // Get the latest message from Maggie
    const latestMessage = messages[messages.length - 1];
    const subject = latestMessage.payload?.headers?.find(h => h.name.toLowerCase() === 'subject')?.value || 'Unknown Subject';
    const from = latestMessage.payload?.headers?.find(h => h.name.toLowerCase() === 'from')?.value || '';
    
    // Check if latest message is from Maggie
    if (!from.includes('maggie@spyglassrealty.com')) {
      console.log('📝 Latest message not from Maggie, skipping');
      return;
    }
    
    // Look for QA-related content
    if (!subject.includes('QA') && !subject.includes('Re:')) {
      console.log('📝 Thread not QA-related, skipping');
      return;
    }
    
    console.log(`📋 Processing QA reply: ${subject}`);
    
    // Extract message body
    let bodyText = '';
    if (latestMessage.payload?.body?.data) {
      bodyText = Buffer.from(latestMessage.payload.body.data, 'base64').toString();
    } else if (latestMessage.payload?.parts) {
      // Handle multipart messages
      for (const part of latestMessage.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText += Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }
    
    // Extract project name
    const projectMatch = subject.match(/QA.*?:?\\s*([A-Za-z-]+)/);
    const projectName = projectMatch ? projectMatch[1] : 'Unknown Project';
    
    // Determine pass/fail status
    const bodyLower = bodyText.toLowerCase();
    const isPass = bodyLower.includes('pass') || bodyLower.includes('✅') || 
                   bodyLower.includes('looks good') || bodyLower.includes('working') ||
                   (bodyLower.includes('all') && bodyLower.includes('good'));
    const isFail = bodyLower.includes('fail') || bodyLower.includes('❌') || 
                   bodyLower.includes('error') || bodyLower.includes('broken') ||
                   bodyLower.includes('issue') || bodyLower.includes('problem');
    
    const status = isPass ? 'PASSED' : (isFail ? 'FAILED' : 'REVIEWED');
    
    // Update qa-queue.md
    await updateQAQueue(projectName, status, bodyText, threadId);
    
    // Mark thread as read
    await execAsync(`gog gmail thread modify ${threadId} --account="clawd@spyglassrealty.com" --remove-labels UNREAD`);
    console.log(`✅ Marked thread ${threadId} as read`);
    
  } catch (error) {
    console.error(`❌ Error processing thread ${threadId}:`, error.message);
  }
}

async function updateQAQueue(projectName, status, emailContent, threadId) {
  try {
    let qaQueue = await fs.readFile(QA_QUEUE_PATH, 'utf-8');
    
    const timestamp = new Date().toLocaleString();
    const statusEmoji = status === 'PASSED' ? '✅' : (status === 'FAILED' ? '❌' : '📋');
    
    // Extract relevant parts of the email content for the summary
    const contentSummary = emailContent
      .replace(/^Subject:.*$/gm, '')
      .replace(/^From:.*$/gm, '')
      .replace(/^To:.*$/gm, '')
      .replace(/^Date:.*$/gm, '')
      .trim()
      .substring(0, 300)
      .replace(/\\n/g, ' ');
    
    const qaResult = `
### ${projectName} - QA ${status}
- **Status:** ${statusEmoji} ${status} by Maggie  
- **Timestamp:** ${timestamp}
- **Results:** ${contentSummary}${contentSummary.length >= 300 ? '...' : ''}
- **Thread ID:** ${threadId}
`;

    // Move from Pending to appropriate section
    const targetSection = status === 'FAILED' ? 'Failed' : 'Completed';
    
    // Try to remove from Pending section
    const pendingRegex = new RegExp(`### ${projectName}[^#]*?(?=###|## |$)`, 'gms');
    qaQueue = qaQueue.replace(pendingRegex, '');
    
    // Add to target section
    const sectionRegex = new RegExp(`(## ${targetSection}[^#]*?)(?=## |$)`, 'gms');
    qaQueue = qaQueue.replace(sectionRegex, `$1${qaResult}`);
    
    // Write back to file
    await fs.writeFile(QA_QUEUE_PATH, qaQueue);
    console.log(`✅ Updated qa-queue.md: ${projectName} ${status}`);
    
    // Log the result for Ryan
    console.log(`🎯 QA RESULT: ${projectName} ${status}`);
    console.log(`📝 Summary: ${contentSummary.substring(0, 100)}...`);
    
  } catch (error) {
    console.error('❌ Error updating qa-queue.md:', error.message);
  }
}

// Run the check
checkGmailForQAReplies().catch(console.error);