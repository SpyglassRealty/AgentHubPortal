#!/usr/bin/env node

import nodemailer from 'nodemailer';

// Try different auth configurations
const configs = [
  {
    name: "Standard config",
    auth: {
      user: 'clawd@spyglassrealty.com',
      pass: 'swse uvpc cyfq jemh'
    }
  },
  {
    name: "Without spaces",
    auth: {
      user: 'clawd@spyglassrealty.com',
      pass: 'swseuvpccyfqjemh'
    }
  },
  {
    name: "OAuth2 type",
    auth: {
      type: 'OAuth2',
      user: 'clawd@spyglassrealty.com',
      pass: 'swse uvpc cyfq jemh'
    }
  }
];

for (const config of configs) {
  console.log(`\nTrying ${config.name}...`);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: config.auth
  });

  try {
    await transporter.verify();
    console.log('✅ SUCCESS! This configuration works.');
    
    // Try sending test email
    const info = await transporter.sendMail({
      from: '"Clawd" <clawd@spyglassrealty.com>',
      to: 'ryan@spyglassrealty.com',
      subject: 'Test - Gmail Auth Working',
      text: 'This is a test to confirm Gmail authentication is working.'
    });
    
    console.log('✅ Test email sent!', info.messageId);
    break;
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}