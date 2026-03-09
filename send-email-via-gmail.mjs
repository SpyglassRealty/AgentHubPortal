#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function sendEmailViaGmail() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
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
    
    // Handle 2FA if needed
    const codeInput = await page.waitForSelector('input[type="tel"]', { visible: true, timeout: 5000 }).catch(() => null);
    if (codeInput) {
      console.log('📱 Enter verification code when prompted...');
      await page.pause(); // Wait for manual code entry
    }
    
    // Go to Gmail
    await page.goto('https://mail.google.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Logged into Gmail!');
    
    // Click compose
    await page.click('div[role="button"]:has-text("Compose")');
    await page.waitForTimeout(1000);
    
    // Fill in email details
    await page.fill('input[aria-label*="To"], input[name="to"]', 'ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    await page.fill('input[name="subjectbox"]', 'Attorney Recruitment Project - Research Complete & Ready for Outreach');
    
    // Load and paste email body
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    await page.fill('div[role="textbox"][aria-label*="Message Body"]', emailBody);
    
    // Attach files
    const attachButton = await page.locator('input[type="file"]');
    const files = [
      'email-package/attorney-master-list.csv',
      'email-package/email-report.md',
      'email-package/dashboard-design.html'
    ];
    
    await attachButton.setInputFiles(files);
    console.log('📎 Files attached');
    
    // Wait for uploads
    await page.waitForTimeout(3000);
    
    // Send email
    await page.click('div[role="button"]:has-text("Send")');
    console.log('📤 Email sent successfully!');
    
    await page.waitForTimeout(2000);
    await browser.close();
    
    console.log('\\n✅ Attorney recruitment email sent to ryan@spyglassrealty.com and sunny@spyglassrealty.com');
    console.log('Attachments: attorney-master-list.csv, email-report.md, dashboard-design.html');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'gmail-send-error.png' });
    await browser.close();
  }
}

sendEmailViaGmail().catch(console.error);