#!/usr/bin/env node

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'clawd@spyglassrealty.com',
    pass: 'swse uvpc cyfq jemh'  // This is from Ryan's personal account
  }
});

console.log('Testing authentication with:');
console.log('Email: clawd@spyglassrealty.com');
console.log('Password: swse uvpc cyfq jemh (from Ryan\'s personal Google account)\n');

try {
  await transporter.verify();
  console.log('✅ SUCCESS! Authentication worked.');
} catch (error) {
  console.log('❌ FAILED as expected!');
  console.log('Error:', error.message);
  console.log('\nThis is because:');
  console.log('- The app password was created in Ryan\'s PERSONAL Google account');
  console.log('- But we\'re trying to use it with clawd@spyglassrealty.com');
  console.log('- App passwords are account-specific and cannot be shared between accounts');
}