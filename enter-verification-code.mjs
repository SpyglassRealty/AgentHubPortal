#!/usr/bin/env node

import { chromium } from 'playwright';

async function enterCode() {
  // Connect to existing browser
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];
  
  try {
    // Enter verification code
    await page.fill('input[type="tel"], input[aria-label*="code"], input[name="code"]', '199709');
    await page.click('button:has-text("Next"), button:has-text("Verify")');
    
    console.log('✅ Verification code entered!');
    
    // Wait for next step
    await page.waitForTimeout(2000);
    
  } catch (error) {
    console.log('Trying to find running browser and enter code...');
    // If can't connect, try to find and control existing instance
  }
}

enterCode().catch(console.error);