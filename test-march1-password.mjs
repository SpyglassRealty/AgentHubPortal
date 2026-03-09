#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'clawd@spyglassrealty.com',
    pass: 'uxry pdao hknh rjke'  // App password from March 1st memory
  }
});

console.log('Testing with app password from March 1st memory file...');
console.log('Email: clawd@spyglassrealty.com');
console.log('Password: uxry pdao hknh rjke\n');

try {
  await transporter.verify();
  console.log('✅ SUCCESS! Authentication worked.');
  
  // Send the attorney email
  console.log('\nSending attorney recruitment email...');
  const emailBody = await fs.readFile('email-package/email-body.txt', 'utf8');
  
  const info = await transporter.sendMail({
    from: '"Clawd" <clawd@spyglassrealty.com>',
    to: 'ryan@spyglassrealty.com, sunny@spyglassrealty.com',
    subject: 'Attorney Recruitment Project - Research Complete & Ready for Outreach',
    text: emailBody,
    attachments: [
      { filename: 'attorney-master-list.csv', path: 'email-package/attorney-master-list.csv' },
      { filename: 'email-report.md', path: 'email-package/email-report.md' },
      { filename: 'dashboard-design.html', path: 'email-package/dashboard-design.html' }
    ]
  });
  
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
} catch (error) {
  console.log('❌ Failed:', error.message);
}