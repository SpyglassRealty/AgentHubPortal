#!/usr/bin/env node

import { chromium } from 'playwright';

async function loginToGmail() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Very slow for visibility
  });
  const page = await browser.newPage();
  
  try {
    console.log('STEP 1: Opening Gmail login page...');
    await page.goto('https://accounts.google.com/signin');
    await page.waitForTimeout(2000);
    
    console.log('STEP 2: Entering email address...');
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    await page.waitForTimeout(2000);
    
    console.log('STEP 3: Entering password...');
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    console.log('STEP 4: Waiting for verification code prompt...');
    await page.waitForSelector('input[type="tel"], input[type="text"][aria-label*="code"]', { visible: true });
    
    console.log('\\n🔴 VERIFICATION CODE NEEDED!');
    console.log('Google should send you a code now.');
    console.log('Tell me the code when you receive it.');
    console.log('\\nBrowser is paused and waiting...');
    
    // Keep browser open
    await page.pause();
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'gmail-login-error.png' });
  }
}

loginToGmail();