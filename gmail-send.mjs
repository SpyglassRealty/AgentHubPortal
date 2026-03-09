#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function sendEmail(to, subject, body, attachments = [], email = 'clawd@spyglassrealty.com') {
  // Validate email domain
  if (!email.endsWith('@spyglassrealty.com')) {
    console.error('❌ Access denied: Only @spyglassrealty.com email addresses are allowed');
    return { success: false, error: 'Invalid email domain' };
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📧 Logging into Gmail...');
    await page.goto('https://accounts.google.com/signin');
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    // Handle 2FA if needed
    const needs2FA = await page.waitForSelector('input[type="tel"]', { 
      visible: true, 
      timeout: 5000 
    }).catch(() => false);
    
    if (needs2FA) {
      console.log('🔑 2FA Required! Tell me the verification code...');
      await page.pause(); // Wait for manual code entry
    }
    
    // Go to Gmail and compose
    await page.goto('https://mail.google.com/mail/u/0/#inbox');
    await page.waitForTimeout(3000);
    
    // Click compose using keyboard shortcut
    await page.keyboard.press('c');
    await page.waitForTimeout(1000);
    
    // Fill email
    await page.fill('input[aria-label*="To"], textarea[aria-label*="To"]', to);
    await page.fill('input[name="subjectbox"]', subject);
    
    const bodyField = await page.locator('div[role="textbox"]').first();
    await bodyField.fill(body);
    
    // Attach files if any
    if (attachments.length > 0) {
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(attachments);
      await page.waitForTimeout(3000);
    }
    
    // Send using keyboard shortcut
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);
    
    console.log('✅ Email sent successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // Can be called with: node gmail-send.mjs
  console.log('Gmail Send Script - Usage:');
  console.log('Import and call sendEmail(to, subject, body, attachments)');
}

export default sendEmail;