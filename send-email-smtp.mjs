#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';

// Validate email domain
const email = 'clawd@spyglassrealty.com';
if (!email.endsWith('@spyglassrealty.com')) {
  console.error('❌ Access denied: Only @spyglassrealty.com email addresses are allowed');
  process.exit(1);
}

// SMTP configuration - port 465 as requested
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465
  auth: {
    user: 'clawd@spyglassrealty.com',
    pass: 'forv bflh nqxc faek' // New app password from Ryan
  }
});

async function sendAttorneyEmail() {
  try {
    // Read email body
    const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Clawd" <clawd@spyglassrealty.com>',
      to: 'ryan@spyglassrealty.com, sunny@spyglassrealty.com',
      subject: 'Attorney Recruitment Project - Research Complete & Ready for Outreach',
      text: emailBody,
      attachments: [
        {
          filename: 'attorney-master-list.csv',
          path: 'email-package/attorney-master-list.csv'
        },
        {
          filename: 'email-report.md',
          path: 'email-package/email-report.md'
        },
        {
          filename: 'dashboard-design.html',
          path: 'email-package/dashboard-design.html'
        }
      ]
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Recipients: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
    console.log('Attachments: 3 files attached');
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
}

sendAttorneyEmail();