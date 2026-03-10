#!/usr/bin/env node

import fs from 'fs/promises';
import { ImapFlow } from 'imapflow';

const CREDENTIALS_PATH = '/Users/ryanrodenbeck/clawd/.email-credentials-backup.json';
const QA_QUEUE_PATH = '/Users/ryanrodenbeck/clawd/qa-queue.md';

async function loadCredentials() {
  const data = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
  return JSON.parse(data);
}

async function connectToImap(credentials) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: credentials.email,
      pass: credentials.app_password
    }
  });

  await client.connect();
  return client;
}

async function checkForQAReply(client) {
  // Select INBOX
  let lock = await client.getMailboxLock('INBOX');
  
  try {
    // Search for unread emails from Maggie
    const messages = client.search({
      unseen: true,
      from: 'maggie@spyglassrealty.com'
    });

    for await (let message of messages) {
      // Get full message
      const { seq, uid } = message;
      const messageInfo = await client.fetchOne(uid, { 
        envelope: true, 
        bodyText: true,
        headers: ['in-reply-to', 'references', 'subject']
      });

      const subject = messageInfo.envelope.subject;
      const bodyText = messageInfo.bodyText;
      const inReplyTo = messageInfo.headers['in-reply-to']?.[0];
      
      console.log(`📧 New email from Maggie: ${subject}`);
      
      // Check if this is a QA reply
      if (subject.includes('QA Needed:') || subject.includes('Re:') && subject.includes('QA')) {
        console.log('🔍 Processing QA reply...');
        
        await processQAReply({
          subject,
          body: bodyText,
          inReplyTo,
          messageId: messageInfo.envelope.messageId
        });
        
        // Mark as read
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      }
    }
  } finally {
    lock.release();
  }
}

async function processQAReply(email) {
  try {
    // Read current qa-queue.md
    let qaQueue = await fs.readFile(QA_QUEUE_PATH, 'utf-8');
    
    // Extract project name from subject
    const projectMatch = email.subject.match(/QA Needed: ([^\\]]+)/);
    const projectName = projectMatch ? projectMatch[1].trim() : 'Unknown Project';
    
    console.log(`📋 Processing QA results for: ${projectName}`);
    
    // Determine if it's a pass or fail based on email content
    const body = email.body.toLowerCase();
    const isPass = body.includes('pass') || body.includes('✅') || body.includes('approved') || 
                   (body.includes('all') && (body.includes('good') || body.includes('working')));
    const isFail = body.includes('fail') || body.includes('❌') || body.includes('error') || 
                   body.includes('broken') || body.includes('issue');
    
    // Create QA result entry
    const timestamp = new Date().toLocaleString();
    const status = isPass ? 'PASSED' : (isFail ? 'FAILED' : 'REVIEWED');
    
    const qaResult = `
### ${projectName} - QA ${status}
- **Status:** ✅ ${status} by Maggie
- **Timestamp:** ${timestamp}
- **Results:** ${email.body.substring(0, 500)}${email.body.length > 500 ? '...' : ''}
- **Message ID:** ${email.messageId}
`;

    // Move from Pending to appropriate section
    if (qaQueue.includes(`### ${projectName}`)) {
      // Find and move the existing entry
      const sections = qaQueue.split('## ');
      let pendingSection = sections.find(s => s.startsWith('Pending'));
      let completedSection = sections.find(s => s.startsWith('Completed'));
      let failedSection = sections.find(s => s.startsWith('Failed'));
      
      if (pendingSection) {
        // Extract the project entry from Pending
        const projectStart = pendingSection.indexOf(`### ${projectName}`);
        if (projectStart !== -1) {
          const nextProjectStart = pendingSection.indexOf('### ', projectStart + 4);
          const projectEnd = nextProjectStart !== -1 ? nextProjectStart : pendingSection.length;
          
          // Remove from pending
          const projectEntry = pendingSection.substring(projectStart, projectEnd);
          pendingSection = pendingSection.substring(0, projectStart) + 
                          pendingSection.substring(projectEnd);
          
          // Add to completed or failed
          const targetSection = (status === 'FAILED') ? 'Failed' : 'Completed';
          if (targetSection === 'Failed' && failedSection) {
            failedSection += qaResult;
          } else if (targetSection === 'Completed' && completedSection) {
            completedSection += qaResult;
          }
          
          // Reconstruct the file
          qaQueue = sections.map(section => {
            if (section.startsWith('Pending')) return pendingSection;
            if (section.startsWith('Completed')) return completedSection;
            if (section.startsWith('Failed')) return failedSection;
            return section;
          }).join('## ');
        }
      }
    } else {
      // Add as new entry to appropriate section
      const targetSection = (status === 'FAILED') ? 'Failed' : 'Completed';
      qaQueue = qaQueue.replace(
        `## ${targetSection}`,
        `## ${targetSection}${qaResult}`
      );
    }
    
    // Write updated qa-queue.md
    await fs.writeFile(QA_QUEUE_PATH, qaQueue);
    console.log(`✅ Updated qa-queue.md with ${status} result for ${projectName}`);
    
    // Notify Ryan about the QA result (optional - via console for now)
    console.log(`🎯 QA Result: ${projectName} ${status} - ${email.body.substring(0, 100)}...`);
    
  } catch (error) {
    console.error('❌ Error processing QA reply:', error.message);
  }
}

async function monitorQAEmails() {
  console.log('🔍 Starting QA email reply monitoring...');
  
  try {
    const credentials = await loadCredentials();
    const client = await connectToImap(credentials);
    
    console.log('📧 Connected to Gmail IMAP');
    
    // Initial check
    await checkForQAReply(client);
    
    // Set up periodic checking every 2 minutes
    const interval = setInterval(async () => {
      try {
        await checkForQAReply(client);
      } catch (error) {
        console.error('❌ Error during periodic check:', error.message);
      }
    }, 2 * 60 * 1000);
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Shutting down QA email monitoring...');
      clearInterval(interval);
      await client.logout();
      process.exit(0);
    });
    
    console.log('✅ QA email monitoring active (checking every 2 minutes)');
    
  } catch (error) {
    console.error('❌ Failed to start QA email monitoring:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitorQAEmails();
}