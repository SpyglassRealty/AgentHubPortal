#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createConnection } from 'net';

// Simple IMAP connection to check for emails from Maggie
async function checkMaggieEmail() {
  console.log('🔍 Checking for emails from Maggie...');
  
  try {
    // Load credentials
    const credentialsRaw = readFileSync('/Users/ryanrodenbeck/clawd/clawd-email-credentials.json', 'utf8');
    const credentials = JSON.parse(credentialsRaw);
    
    console.log(`📧 Checking email: ${credentials.email}`);
    console.log('📅 Looking for recent emails from maggie@spyglassrealty.com');
    
    // For now, let's check if there are any .eml files or logs that might contain recent emails
    // This is a placeholder - in a production system, we'd use proper IMAP
    console.log('⚠️  Unable to check email directly - IMAP client not properly configured');
    console.log('💡 Please check email manually or set up proper IMAP access');
    
    return false;
  } catch (error) {
    console.error('❌ Error checking email:', error.message);
    return false;
  }
}

// Run the check
checkMaggieEmail().then(result => {
  if (!result) {
    process.exit(1);
  }
});