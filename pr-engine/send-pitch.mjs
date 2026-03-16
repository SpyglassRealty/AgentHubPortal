#!/usr/bin/env node

import nodemailer from 'nodemailer';
import fs from 'fs/promises';

// Load credentials
const creds = JSON.parse(await fs.readFile('../clawd-email-credentials.json', 'utf8'));

const transporter = nodemailer.createTransport({
  host: creds.smtp.host,
  port: 587,
  secure: false,
  auth: {
    user: creds.email,
    pass: creds.app_password.replace(/\s/g, '')
  }
});

async function sendPitch(to, subject, body) {
  try {
    const info = await transporter.sendMail({
      from: `"Letty at Spyglass" <${creds.email}>`,
      to: to,
      subject: subject,
      text: body
    });
    console.log(`✓ Sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send to ${to}:`, error.message);
    return false;
  }
}

const [,, email, subject, ...bodyParts] = process.argv;
if (!email || !subject || bodyParts.length === 0) {
  console.error('Usage: node send-pitch.mjs <email> <subject> <body>');
  process.exit(1);
}

const body = bodyParts.join(' ');
await sendPitch(email, subject, body);