#!/usr/bin/env node

import { chromium } from 'playwright';

async function setupGmailAppPassword() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Logging into Gmail...');
  await page.goto('https://accounts.google.com/signin');
  
  // Enter email
  await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
  await page.click('button:has-text("Next")');
  
  // Wait and enter password
  await page.waitForSelector('input[type="password"]', { visible: true });
  await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
  await page.click('button:has-text("Next")');
  
  // Wait for login
  await page.waitForNavigation();
  console.log('Logged in successfully!');
  
  // Go to app passwords
  await page.goto('https://myaccount.google.com/apppasswords');
  await page.waitForLoadState('networkidle');
  
  // Check if 2-step verification is enabled
  const needs2FA = await page.isVisible('text=/enable.*2-Step/i');
  if (needs2FA) {
    console.log('2-Step Verification needs to be enabled first...');
    await page.click('text=/enable.*2-Step/i');
    // Would need to complete 2FA setup here
  }
  
  console.log('Browser is open. Please manually:');
  console.log('1. Complete any additional security steps');
  console.log('2. Generate app password for "Mail"');
  console.log('3. Copy the 16-character password');
  
  // Keep browser open for manual steps
  await new Promise(resolve => {
    console.log('Press Ctrl+C when done...');
  });
}

setupGmailAppPassword().catch(console.error);