#!/usr/bin/env node

/**
 * Setup Gmail OAuth for automated email reading
 * This script helps configure Google OAuth credentials for reading emails
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

async function checkCurrentSetup() {
  console.log('🔍 Checking current Google OAuth setup...');
  
  try {
    // Check gog auth status
    const { stdout: authStatus } = await execAsync('gog auth list');
    console.log('📋 Current gog auth accounts:');
    console.log(authStatus || 'No accounts configured');
    
    // Check for credentials
    const { stdout: credStatus } = await execAsync('gog auth credentials list');
    console.log('🔑 OAuth client credentials:');
    console.log(credStatus || 'No credentials stored');
    
  } catch (error) {
    console.log('❌ Error checking auth setup:', error.message);
  }
}

async function setupOAuthInstructions() {
  console.log('\\n📚 GOOGLE OAUTH SETUP INSTRUCTIONS\\n');
  console.log('To enable automated email reading, you need to:');
  console.log('');
  console.log('1. 🌐 Create OAuth Client Credentials:');
  console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   - Select project: Spyglass Realty (or create new)');
  console.log('   - Click "Create Credentials" → "OAuth client ID"');
  console.log('   - Application type: "Desktop application"');
  console.log('   - Name: "Clawd Email Reader"');
  console.log('   - Download the JSON file');
  console.log('');
  console.log('2. 📥 Install the credentials:');
  console.log('   gog auth credentials set /path/to/downloaded-credentials.json');
  console.log('');
  console.log('3. 🔐 Authorize the account:');
  console.log('   gog auth add clawd@spyglassrealty.com');
  console.log('   (This will open browser for OAuth consent)');
  console.log('');
  console.log('4. ✅ Test the setup:');
  console.log('   gog gmail search "from:maggie@spyglassrealty.com" --account=clawd@spyglassrealty.com');
  console.log('');
  console.log('🔧 SCOPES NEEDED:');
  console.log('   - https://www.googleapis.com/auth/gmail.readonly (read emails)');
  console.log('   - https://www.googleapis.com/auth/gmail.modify (mark as read)');
  console.log('');
  console.log('💡 Alternative: If Maggie already has OAuth set up, you can:');
  console.log('   1. Copy credentials from Maggie\'s system');
  console.log('   2. Or use the same Google Cloud project credentials');
}

async function testEmailAccess() {
  console.log('🔍 Testing email access...');
  
  try {
    // Test if we can access Gmail
    const { stdout } = await execAsync('gog gmail search "is:unread" --account=clawd@spyglassrealty.com --max=1 --json 2>/dev/null');
    
    if (stdout.trim()) {
      console.log('✅ Gmail access working!');
      const result = JSON.parse(stdout);
      console.log(`📧 Found ${result.threads?.length || 0} unread thread(s)`);
      return true;
    }
    
  } catch (error) {
    console.log('❌ Gmail access test failed:', error.message);
    console.log('');
    console.log('This usually means OAuth is not set up yet.');
    console.log('Follow the setup instructions above.');
    return false;
  }
  
  return false;
}

async function main() {
  console.log('🚀 Gmail OAuth Setup for Clawd\\n');
  
  await checkCurrentSetup();
  
  const hasAccess = await testEmailAccess();
  
  if (!hasAccess) {
    await setupOAuthInstructions();
    console.log('\\n⚠️  OAuth setup required before automated email reading can work.');
    console.log('Run this script again after completing the OAuth setup.');
  } else {
    console.log('\\n🎉 OAuth is working! You can now use automated email reading.');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   - The heartbeat system will now check for Maggie\'s replies');
    console.log('   - QA responses will be automatically processed');
    console.log('   - qa-queue.md will be updated automatically');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}