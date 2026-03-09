#!/usr/bin/env node

import { chromium } from 'playwright';

export async function loginToGmail(email, password) {
  // Validate email domain
  if (!email.endsWith('@spyglassrealty.com')) {
    throw new Error('❌ Access denied: Only @spyglassrealty.com email addresses are allowed');
  }
  
  console.log('✅ Email domain verified: @spyglassrealty.com');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    console.log(`📧 Logging into Gmail as ${email}...`);
    await page.goto('https://accounts.google.com/signin');
    
    // Enter email
    await page.fill('input[type="email"]', email);
    await page.click('#identifierNext');
    
    // Enter password
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', password);
    await page.click('#passwordNext');
    
    // Handle 2FA if needed
    const needs2FA = await page.waitForSelector('input[type="tel"]', { 
      visible: true, 
      timeout: 5000 
    }).catch(() => false);
    
    if (needs2FA) {
      console.log('🔑 2FA Required! Waiting for verification code...');
      await page.pause(); // Wait for manual code entry
    }
    
    // Go to Gmail
    await page.goto('https://mail.google.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Successfully logged into Gmail!');
    
    return { success: true, browser, page };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    throw error;
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2] || 'clawd@spyglassrealty.com';
  const password = process.argv[3] || '8&qZGQLNj9r56bU*';
  
  loginToGmail(email, password).catch(console.error);
}