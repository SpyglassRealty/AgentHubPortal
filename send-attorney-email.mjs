#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

// Read credentials
const credentials = JSON.parse(await fs.readFile('clawd-email-credentials.json', 'utf8'));

// Create transporter
const transporter = nodemailer.createTransport({
  host: credentials.smtp.host,
  port: credentials.smtp.port,
  secure: credentials.smtp.secure,
  auth: {
    user: credentials.email,
    pass: credentials.app_password
  }
});

// Read email body
const emailBody = await fs.readFile('projects/attorney-recruitment-tracking/email-to-sunny.txt', 'utf8');

// Prepare attachments
const attachments = [
  {
    filename: 'attorney-master-list.csv',
    path: 'projects/attorney-recruitment-tracking/attorney-master-list.csv'
  },
  {
    filename: 'attorney-recruitment-report.md',
    path: 'projects/attorney-recruitment-tracking/email-report.md'
  },
  {
    filename: 'project-dashboard.html',
    path: 'projects/attorney-recruitment-tracking/dashboard-design.html'
  }
];

// Send email
try {
  const info = await transporter.sendMail({
    from: '"Clawd" <clawd@spyglassrealty.com>',
    to: 'ryan@spyglassrealty.com, sunny@spyglassrealty.com',
    subject: 'Attorney Recruitment Project - Research Complete & Ready for Outreach',
    text: emailBody,
    attachments: attachments
  });

  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Recipients: ryan@spyglassrealty.com, sunny@spyglassrealty.com');
  console.log('Attachments: attorney-master-list.csv, attorney-recruitment-report.md, project-dashboard.html');
} catch (error) {
  console.error('❌ Error sending email:', error);
}