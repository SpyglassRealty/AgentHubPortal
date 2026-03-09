#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function sendAttorneyEmail() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
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
    
    // Enter verification code
    await page.waitForSelector('input[type="tel"]', { visible: true });
    console.log('📱 Entering verification code: 176479');
    await page.fill('input[type="tel"]', '176479');
    await page.keyboard.press('Enter');
    
    console.log('⏳ Waiting for Gmail to load...');
    await page.waitForTimeout(5000);
    
    // Go to Gmail
    await page.goto('https://mail.google.com');
    await page.waitForTimeout(3000);
    
    console.log('✉️ Composing email...');
    // Use keyboard shortcut for compose
    await page.keyboard.press('c');
    await page.waitForTimeout(2000);
    
    // Fill email details
    await page.type('ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    await page.keyboard.press('Tab'); // Move to subject
    
    await page.type('Attorney Recruitment Project - Research Complete & Ready for Outreach');
    await page.keyboard.press('Tab'); // Move to body
    
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    await page.type(emailBody);
    
    // Attach files
    console.log('📎 Attaching files...');
    const attachButton = await page.locator('div[command="Files"]').first();
    await attachButton.click();
    
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'email-package/attorney-master-list.csv',
      'email-package/email-report.md',
      'email-package/dashboard-design.html'
    ]);
    
    console.log('⏳ Waiting for uploads...');
    await page.waitForTimeout(5000);
    
    console.log('📤 Sending email...');
    // Send with keyboard shortcut
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(3000);
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 To: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    console.log('📋 Subject: Attorney Recruitment Project - Research Complete & Ready for Outreach');
    console.log('📎 Attachments:');
    console.log('   - attorney-master-list.csv (21 attorneys with contact info)');
    console.log('   - email-report.md (executive summary)');
    console.log('   - dashboard-design.html (visual project tracker)');
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'email-error.png', fullPage: true });
    await browser.close();
  }
}

sendAttorneyEmail();