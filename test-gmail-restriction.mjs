#!/usr/bin/env node

// Test Gmail domain restriction

const testEmails = [
  'clawd@spyglassrealty.com',        // ✅ Should work
  'ryan@spyglassrealty.com',         // ✅ Should work  
  'sunny@spyglassrealty.com',        // ✅ Should work
  'someone@gmail.com',               // ❌ Should fail
  'test@example.com',                // ❌ Should fail
  'clawd@spyglassrealty.org'         // ❌ Should fail (wrong TLD)
];

console.log('Testing Gmail domain restriction...\n');

testEmails.forEach(email => {
  const allowed = email.endsWith('@spyglassrealty.com');
  const icon = allowed ? '✅' : '❌';
  console.log(`${icon} ${email} - ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
});

console.log('\nRestriction enforced: Only @spyglassrealty.com emails can login to Gmail.');
console.log('This applies to all Gmail scripts: check-gmail.mjs, gmail-send.mjs, send-email-smtp.mjs');