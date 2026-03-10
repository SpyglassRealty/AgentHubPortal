#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
let to = '';
let subject = '';
let html = '';

for (const arg of args) {
  if (arg.startsWith('--to=')) {
    to = arg.substring(5);
  } else if (arg.startsWith('--subject=')) {
    subject = arg.substring(10);
  } else if (arg.startsWith('--html=')) {
    html = arg.substring(7);
  }
}

if (!to || !subject || !html) {
  console.error('Usage: node send-email.mjs --to=email@domain.com --subject="Subject" --html="<html content>"');
  process.exit(1);
}

try {
  // Load email credentials
  const creds = JSON.parse(fs.readFileSync('clawd-email-credentials.json', 'utf8'));

  const transporter = nodemailer.createTransport({
    host: creds.smtp.host,
    port: creds.smtp.port,
    secure: creds.smtp.secure,
    auth: {
      user: creds.email,
      pass: creds.app_password
    }
  });

  const mailOptions = {
    from: 'clawd@spyglassrealty.com',
    to: to,
    subject: subject,
    html: html
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent successfully!');
  console.log('📧 Message ID:', info.messageId);
  console.log('🔗 Email sent to:', to);

} catch (error) {
  console.error('❌ Email failed:', error.message);
  process.exit(1);
}