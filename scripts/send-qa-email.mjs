#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import crypto from 'crypto';

async function sendQAEmail(projectName, projectUrl, provider, commitHash) {
  console.log(`📧 Sending QA notification for ${projectName}...`);
  
  try {
    // Load credentials
    const credentials = JSON.parse(await fs.readFile('/Users/ryanrodenbeck/clawd/clawd-email-credentials.json', 'utf-8'));
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: credentials.smtp.host,
      port: credentials.smtp.port,
      secure: credentials.smtp.secure,
      requireTLS: credentials.smtp.requireTLS,
      auth: {
        user: credentials.email,
        pass: credentials.app_password
      }
    });

    // Generate unique message ID for proper threading
    const messageId = `qa-${projectName}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}@spyglassrealty.com`;
    
    const qaEmailBody = `New deployment detected for ${projectName}:

🔗 URL: ${projectUrl}
📦 Provider: ${provider}  
💾 Commit: ${commitHash}
⏰ Time: ${new Date().toLocaleString()}

Please run the standard QA checklist and REPLY DIRECTLY to this email with results:

✅ QA Checklist:
□ Visual regression check (screenshots if issues)
□ Core functionality testing
□ Console errors check  
□ Mobile responsiveness
□ Load time < 3s
□ Navigation and links working

REPLY FORMAT:
- Status: PASS or FAIL
- Issues found: (describe any problems)
- Screenshots: (attach if needed)

Reply directly to this email - do not create a new email thread.`;

    const emailOptions = {
      messageId: messageId,
      from: {
        name: 'Clawd QA System',
        address: 'clawd@spyglassrealty.com'
      },
      to: {
        name: 'Maggie',
        address: 'maggie@spyglassrealty.com'
      },
      replyTo: 'clawd@spyglassrealty.com',
      subject: `QA Needed: ${projectName}`,
      text: qaEmailBody,
      html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e1e5e9; border-radius: 8px; overflow: hidden;">
  
  <div style="background: #e74c3c; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">🔍 QA Needed</h1>
    <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">${projectName}</p>
  </div>
  
  <div style="padding: 24px;">
    
    <div style="background: #f8f9fa; border-left: 4px solid #e74c3c; padding: 16px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #2c3e50;">📦 New Deployment Detected</h3>
      <p style="margin: 0; color: #555;"><strong>URL:</strong> <a href="${projectUrl}" style="color: #e74c3c;">${projectUrl}</a></p>
      <p style="margin: 8px 0 0 0; color: #555;"><strong>Provider:</strong> ${provider}</p>
      <p style="margin: 8px 0 0 0; color: #555;"><strong>Commit:</strong> ${commitHash}</p>
      <p style="margin: 8px 0 0 0; color: #555;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <h3 style="color: #2c3e50; margin-bottom: 16px;">✅ QA Checklist</h3>
    <ul style="color: #555; line-height: 1.6;">
      <li>Visual regression check (screenshots if issues)</li>
      <li>Core functionality testing</li>
      <li>Console errors check</li>
      <li>Mobile responsiveness</li>
      <li>Load time &lt; 3s</li>
      <li>Navigation and links working</li>
    </ul>

    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <h4 style="margin: 0 0 8px 0; color: #856404;">📧 Reply Instructions</h4>
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>REPLY DIRECTLY to this email</strong> with your QA results. Include:
      </p>
      <ul style="color: #856404; margin: 8px 0 0 0; font-size: 14px;">
        <li>Status: PASS or FAIL</li>
        <li>Issues found (if any)</li>
        <li>Screenshots (if needed)</li>
      </ul>
    </div>

  </div>
  
  <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #e1e5e9;">
    <p style="margin: 0; color: #6c757d; font-size: 12px;">Clawd QA System • Spyglass Realty</p>
  </div>
  
</div>`,
      
      // Email threading headers
      headers: {
        'X-QA-Project': projectName,
        'X-QA-URL': projectUrl,
        'X-QA-Commit': commitHash,
        'X-Priority': '2', // High priority
        'Importance': 'high'
      }
    };
    
    // Send the email
    const info = await transporter.sendMail(emailOptions);
    console.log(`✅ QA email sent successfully!`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`🔗 Email sent to: maggie@spyglassrealty.com`);
    
    // Log the message ID for tracking replies
    const logEntry = {
      timestamp: new Date().toISOString(),
      project: projectName,
      messageId: info.messageId,
      originalMessageId: messageId,
      url: projectUrl,
      status: 'sent'
    };
    
    // Append to QA email log
    const logFile = '/Users/ryanrodenbeck/clawd/qa-email-log.jsonl';
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\\n');
    
    return info;
    
  } catch (error) {
    console.error('❌ Failed to send QA email:', error.message);
    throw error;
  }
}

// Command line usage
if (process.argv.length > 2) {
  const projectName = process.argv[2];
  const projectUrl = process.argv[3] || 'https://example.com';
  const provider = process.argv[4] || 'unknown';
  const commitHash = process.argv[5] || 'latest';
  
  sendQAEmail(projectName, projectUrl, provider, commitHash)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { sendQAEmail };