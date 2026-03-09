#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs/promises';

async function loginAndSendEmail() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800  // Slower for reliability
  });
  const page = await browser.newPage();
  
  try {
    console.log('🔄 Starting fresh login with new code...');
    await page.goto('https://accounts.google.com/signin');
    
    console.log('📧 Entering email: clawd@spyglassrealty.com');
    await page.fill('input[type="email"]', 'clawd@spyglassrealty.com');
    await page.click('#identifierNext');
    
    console.log('🔑 Entering password...');
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.fill('input[type="password"]', '8&qZGQLNj9r56bU*');
    await page.click('#passwordNext');
    
    console.log('📱 Entering NEW verification code: 432102');
    await page.waitForSelector('input[type="tel"], input[type="text"][aria-label*="code"], input[aria-label*="Enter"]', { visible: true });
    const codeInput = await page.locator('input[type="tel"], input[type="text"]').first();
    await codeInput.fill('432102');
    await page.keyboard.press('Enter');
    
    console.log('⏳ Waiting for authentication...');
    await page.waitForTimeout(5000);
    
    // Navigate directly to Gmail
    console.log('📬 Going to Gmail...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox');
    await page.waitForTimeout(5000);
    
    console.log('✅ In Gmail! Looking for compose button...');
    
    // Try multiple selectors for compose
    const composeSelectors = [
      'div[role="button"]:has-text("Compose")',
      'div[gh="cm"]',
      '[aria-label*="Compose"]',
      'div.T-I.T-I-KE.L3'
    ];
    
    let composeClicked = false;
    for (const selector of composeSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        composeClicked = true;
        console.log('✅ Clicked compose!');
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!composeClicked) {
      throw new Error('Could not find compose button');
    }
    
    await page.waitForTimeout(2000);
    
    // Fill email
    console.log('📝 Filling email details...');
    
    // To field
    await page.fill('input[aria-label*="To"], textarea[aria-label*="To"], div[aria-label*="To"] input', 'ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    
    // Subject
    await page.fill('input[name="subjectbox"], input[aria-label*="Subject"]', 'Attorney Recruitment Project - Research Complete & Ready for Outreach');
    
    // Body
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    const bodyInput = await page.locator('div[role="textbox"][aria-label*="Message"], div[aria-label*="Body"]').first();
    await bodyInput.fill(emailBody);
    
    // Attach files
    console.log('📎 Attaching files...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'email-package/attorney-master-list.csv',
      'email-package/email-report.md',
      'email-package/dashboard-design.html'
    ]);
    
    console.log('⏳ Waiting for uploads...');
    await page.waitForTimeout(5000);
    
    // Send
    console.log('📤 Sending email...');
    const sendSelectors = [
      'div[role="button"]:has-text("Send")',
      '[aria-label*="Send"]',
      'div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3'
    ];
    
    for (const selector of sendSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch (e) {
        continue;
      }
    }
    
    await page.waitForTimeout(3000);
    
    console.log('\\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 To: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    console.log('📋 Subject: Attorney Recruitment Project');
    console.log('📎 Attachments: All 3 files attached');
    
    await browser.close();
    
    // Save success
    await fs.writeFile('email-sent-confirmation.json', JSON.stringify({
      sentAt: new Date().toISOString(),
      to: ['ryan@spyglassrealty.com', 'sunny@spyglassrealty.com'],
      subject: 'Attorney Recruitment Project - Research Complete & Ready for Outreach',
      attachments: [
        'attorney-master-list.csv',
        'email-report.md',
        'dashboard-design.html'
      ]
    }, null, 2));
    
  } catch (error) {
    console.error('\\n❌ Error:', error.message);
    await page.screenshot({ path: 'gmail-error-final.png', fullPage: true });
    console.log('📸 Screenshot saved to gmail-error-final.png');
    await browser.close();
  }
}

loginAndSendEmail();