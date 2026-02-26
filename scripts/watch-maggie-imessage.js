#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';

console.log('🔍 Starting iMessage monitoring for maggie@spyglassrealty.com...');

// Chat ID for maggie@spyglassrealty.com
const MAGGIE_CHAT_ID = 20;

// Auto-response templates
const responses = {
  setup: `Hi Maggie! 👋

I see you're working on setting up Randi's system. Here's what to do:

**If you're getting errors:**
1. Make sure you have admin privileges: System Settings > Users & Groups
2. Try the Homebrew install again: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
3. Then: brew install clawdbot
4. Finally: clawdbot nodes pair

**Need immediate help?** Just describe the exact error message you're seeing and I'll guide you through it!

- Clawd 🤖`,

  pairing: `Great! 🎉 

I can see your pairing request. Let me approve it right now so we can get Randi's assistant fully configured.

Once paired, I'll be able to help remotely with:
- BlueBubbles server setup
- Email configuration  
- Voice setup (ClawdVoice)
- All the business integrations Randi needs

You're doing great! - Clawd 🤖`,

  error: `I see you're having an issue! 🛠️

Please send me:
1. The exact error message
2. What command you were running
3. What step you were on

I'll get you sorted out right away. Don't worry - these setup steps can be tricky but we'll get through it together!

- Clawd 🤖`,

  general: `Hi Maggie! 👋 

I'm monitoring this chat to help with Randi's Clawdbot setup. 

Current status: Ready to help with installation, pairing, configuration, or any issues you encounter.

What do you need help with? - Clawd 🤖`
};

function determineResponseType(message) {
  const text = message.toLowerCase();
  
  if (text.includes('error') || text.includes('failed') || text.includes('not working')) {
    return 'error';
  }
  if (text.includes('pair') || text.includes('code') || text.includes('clawd-')) {
    return 'pairing';
  }
  if (text.includes('install') || text.includes('setup') || text.includes('homebrew') || text.includes('terminal')) {
    return 'setup';
  }
  
  return 'general';
}

async function sendResponse(message) {
  const responseType = determineResponseType(message);
  const response = responses[responseType];
  
  console.log(`📤 Sending ${responseType} response to Maggie`);
  
  // Send iMessage response
  const sendProcess = spawn('imsg', ['send', '--to', 'maggie@spyglassrealty.com', '--text', response]);
  
  sendProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Response sent successfully');
    } else {
      console.log(`❌ Failed to send response (exit code: ${code})`);
    }
  });
}

// Start watching the chat
console.log(`📱 Watching chat ID ${MAGGIE_CHAT_ID} for new messages...`);

const watchProcess = spawn('imsg', ['watch', '--chat-id', MAGGIE_CHAT_ID.toString(), '--json']);

let buffer = '';

watchProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Process complete JSON lines
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        
        // Only respond to messages from Maggie (not from us)
        if (!message.is_from_me && message.sender === 'maggie@spyglassrealty.com') {
          console.log(`📨 New message from Maggie: ${message.text?.substring(0, 100)}...`);
          sendResponse(message.text || '');
        }
      } catch (e) {
        console.log('⚠️ Failed to parse message:', line.substring(0, 100));
      }
    }
  }
});

watchProcess.stderr.on('data', (data) => {
  console.error('❌ Watch error:', data.toString());
});

watchProcess.on('close', (code) => {
  console.log(`❌ Watch process exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping iMessage monitoring...');
  watchProcess.kill();
  process.exit(0);
});

console.log('✅ iMessage monitoring active for maggie@spyglassrealty.com');
console.log('🤖 Auto-responses enabled for setup questions');
console.log('⏹️  Press Ctrl+C to stop');