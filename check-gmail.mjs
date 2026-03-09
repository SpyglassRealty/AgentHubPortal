#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function checkGmail(email = 'clawd@spyglassrealty.com', headless = false) {
  // Validate email domain
  if (!email.endsWith('@spyglassrealty.com')) {
    console.error('❌ Access denied: Only @spyglassrealty.com email addresses are allowed');
    process.exit(1);
  }
  
  console.log('📧 Gmail Check Script - Reliable Version');
  console.log(`Account: ${email}`);
  console.log('Note: Will require 2FA code on new login\n');
  
  const browser = await chromium.launch({ 
    headless: headless,
    slowMo: headless ? 100 : 500
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Login flow
    await page.goto('https://accounts.google.com/signin');
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    // Check if 2FA needed
    const needs2FA = await page.waitForSelector('input[type="tel"], input[type="text"][aria-label*="code"]', { 
      visible: true, 
      timeout: 5000 
    }).catch(() => false);
    
    if (needs2FA) {
      console.log('🔑 2FA Required!');
      console.log('Waiting for verification code...');
      console.log('(Browser will pause for manual entry)\n');
      
      if (!headless) {
        await page.pause(); // Manual code entry
      } else {
        throw new Error('2FA required but running in headless mode');
      }
    }
    
    // Go to Gmail
    await page.goto('https://mail.google.com/mail/u/0/#inbox');
    await page.waitForLoadState('networkidle');
    console.log('✅ Successfully logged into Gmail!\n');
    
    // Get unread count
    const unreadElement = await page.locator('div[data-tooltip*="Unread"], span.bsU').first();
    const unreadCount = await unreadElement.textContent().catch(() => '0');
    console.log(`📬 Unread emails: ${unreadCount}\n`);
    
    // Get recent emails
    console.log('Recent emails:');
    const emails = await page.locator('tr.zA').all();
    for (let i = 0; i < Math.min(5, emails.length); i++) {
      const from = await emails[i].locator('span.bA4 span[email]').getAttribute('email').catch(() => 'Unknown');
      const subject = await emails[i].locator('span.bog').textContent().catch(() => 'No subject');
      const snippet = await emails[i].locator('span.y2').textContent().catch(() => '');
      
      console.log(`${i + 1}. From: ${from}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Preview: ${snippet.substring(0, 50)}...\n`);
    }
    
    return { success: true, unreadCount };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'gmail-check-error.png' });
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkGmail(false);
}

export default checkGmail;