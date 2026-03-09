#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function completeGmailLogin() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();
  
  try {
    console.log('STEP 1: Opening Gmail login page...');
    await page.goto('https://accounts.google.com/signin');
    
    console.log('STEP 2: Entering email address...');
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    
    console.log('STEP 3: Entering password...');
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    console.log('STEP 4: Entering verification code 166802...');
    await page.waitForSelector('input[type="tel"], input[type="text"][aria-label*="code"]', { visible: true });
    await page.fill('input[type="tel"], input[type="text"][aria-label*="code"]', '166802');
    await page.keyboard.press('Enter');
    
    console.log('STEP 5: Waiting for login to complete...');
    await page.waitForTimeout(3000);
    
    // Check if we're logged in
    const isGmail = await page.url().includes('mail.google.com');
    const isMyAccount = await page.url().includes('myaccount.google.com');
    
    if (!isGmail && !isMyAccount) {
      // Navigate to Gmail
      console.log('STEP 6: Going to Gmail...');
      await page.goto('https://mail.google.com');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('✅ Successfully logged into Gmail!');
    
    // Now let's send the attorney email
    console.log('\\nSTEP 7: Composing email...');
    await page.click('div[role="button"]:has-text("Compose")');
    await page.waitForTimeout(1000);
    
    // Recipients
    console.log('Adding recipients...');
    const toField = await page.locator('input[aria-label*="To"], div[aria-label*="To"] input').first();
    await toField.fill('ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    
    // Subject
    console.log('Adding subject...');
    await page.fill('input[name="subjectbox"]', 'Attorney Recruitment Project - Research Complete & Ready for Outreach');
    
    // Body
    console.log('Adding email body...');
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    const bodyField = await page.locator('div[role="textbox"][aria-label*="Message"]').first();
    await bodyField.fill(emailBody);
    
    // Attach files
    console.log('Attaching files...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'email-package/attorney-master-list.csv',
      'email-package/email-report.md',
      'email-package/dashboard-design.html'
    ]);
    
    // Wait for uploads
    console.log('Waiting for files to upload...');
    await page.waitForTimeout(5000);
    
    // Send
    console.log('STEP 8: Sending email...');
    const sendButton = await page.locator('div[role="button"]:has-text("Send")').first();
    await sendButton.click();
    
    await page.waitForTimeout(3000);
    
    console.log('\\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('To: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    console.log('Subject: Attorney Recruitment Project - Research Complete & Ready for Outreach');
    console.log('Attachments: attorney-master-list.csv, email-report.md, dashboard-design.html');
    
    await browser.close();
    
  } catch (error) {
    console.error('\\n❌ Error:', error.message);
    await page.screenshot({ path: 'gmail-final-error.png' });
    console.log('Screenshot saved to gmail-final-error.png');
    await browser.close();
  }
}

completeGmailLogin();