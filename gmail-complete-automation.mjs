#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function createGmailAppPassword() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  const page = await browser.newPage();
  
  try {
    console.log('📧 Logging into Gmail...');
    await page.goto('https://accounts.google.com/signin');
    
    // Enter email
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    
    // Enter password
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    console.log('✅ Logged in successfully!');
    
    // Navigate to security settings
    console.log('🔐 Going to security settings...');
    await page.goto('https://myaccount.google.com/security');
    await page.waitForLoadState('networkidle');
    
    // Click on 2-Step Verification
    try {
      await page.click('text="2-Step Verification"', { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      // Check if we need to re-enter password
      if (await page.isVisible('input[type="password"]', { timeout: 3000 })) {
        await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(2000);
      }
      
      // Look for App passwords
      await page.click('text="App passwords"');
      await page.waitForLoadState('networkidle');
      
      // Click create/generate
      const createButton = await page.locator('button:has-text("Create"), button:has-text("Generate")').first();
      await createButton.click();
      
      // Enter app name
      await page.fill('input[aria-label="App name"], input[placeholder*="app"]', 'Clawdbot SMTP');
      await page.click('button:has-text("Create"), button:has-text("Next")');
      
      // Wait for password to appear
      await page.waitForSelector('div[aria-live="polite"]');
      
      // Get the app password - it's usually in a div with monospace font
      const passwordElement = await page.locator('div[style*="monospace"], div[class*="password"], div[aria-live="polite"] div').first();
      const appPassword = await passwordElement.textContent();
      const cleanPassword = appPassword.replace(/\s+/g, ' ').trim();
      
      console.log('\\n✅ App Password Generated:', cleanPassword);
      
      // Save it
      const credentials = {
        email: "clawd@spyglassrealty.com",
        app_password: cleanPassword,
        created_at: new Date().toISOString(),
        smtp: {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true
        },
        note: "Generated via Playwright automation. DO NOT DELETE."
      };
      
      await fs.writeFile('clawd-email-credentials.json', JSON.stringify(credentials, null, 2));
      console.log('\\n💾 Saved to clawd-email-credentials.json');
      
      // Click done
      await page.click('button:has-text("Done")');
      
      return cleanPassword;
      
    } catch (error) {
      console.log('\\n⚠️  Need to enable 2-Step Verification first!');
      console.log('Please complete the setup in the browser window...');
      // Keep browser open
      await page.pause();
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'gmail-error.png' });
  }
  
  await browser.close();
}

createGmailAppPassword().catch(console.error);