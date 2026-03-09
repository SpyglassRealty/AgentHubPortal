#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function sendEmail() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
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
    
    // Handle verification code
    try {
      await page.waitForSelector('input[type="tel"]', { visible: true, timeout: 5000 });
      console.log('📱 Entering verification code...');
      await page.fill('input[type="tel"]', '199709');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('No verification code needed, continuing...');
    }
    
    // Go to Gmail
    await page.goto('https://mail.google.com');
    await page.waitForSelector('div[role="button"]:has-text("Compose")', { timeout: 10000 });
    console.log('✅ In Gmail!');
    
    // Compose email
    await page.click('div[role="button"]:has-text("Compose")');
    await page.waitForTimeout(1000);
    
    // Recipients
    const toField = await page.waitForSelector('input[aria-label*="To"], div[aria-label*="To"] input', { visible: true });
    await toField.fill('ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    
    // Subject
    await page.fill('input[name="subjectbox"]', 'Attorney Recruitment Project - Research Complete & Ready for Outreach');
    
    // Body
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    const bodyField = await page.locator('div[role="textbox"][aria-label*="Message"]').first();
    await bodyField.fill(emailBody);
    
    // Attach files
    console.log('📎 Attaching files...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'email-package/attorney-master-list.csv',
      'email-package/email-report.md',
      'email-package/dashboard-design.html'
    ]);
    
    // Wait for uploads
    await page.waitForTimeout(3000);
    
    // Send
    const sendButton = await page.locator('div[role="button"]:has-text("Send")').first();
    await sendButton.click();
    
    console.log('\\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('To: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    console.log('Subject: Attorney Recruitment Project - Research Complete & Ready for Outreach');
    console.log('Attachments: attorney-master-list.csv, email-report.md, dashboard-design.html');
    
    await page.waitForTimeout(2000);
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'gmail-error.png' });
    console.log('Screenshot saved to gmail-error.png');
  }
}

sendEmail();