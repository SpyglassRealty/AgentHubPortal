#!/usr/bin/env node

import sendEmail from './gmail-send.mjs';
import fs from 'fs/promises';

async function sendAttorneyEmail() {
  const to = 'ryan@spyglassrealty.com, sunny@spyglassrealty.com';
  const subject = 'Attorney Recruitment Project - Research Complete & Ready for Outreach';
  const body = await fs.readFile('email-package/email-body.txt', 'utf8');
  const attachments = [
    'email-package/attorney-master-list.csv',
    'email-package/email-report.md',
    'email-package/dashboard-design.html'
  ];
  
  console.log('📤 Sending attorney recruitment email...');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Attachments: ${attachments.length} files\n`);
  
  const result = await sendEmail(to, subject, body, attachments);
  
  if (result.success) {
    console.log('\n✅ Attorney recruitment email sent successfully!');
  } else {
    console.log('\n❌ Failed to send email:', result.error);
  }
}

sendAttorneyEmail();