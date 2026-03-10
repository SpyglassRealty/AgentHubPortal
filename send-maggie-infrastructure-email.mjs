#!/usr/bin/env node

import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';

const credentials = JSON.parse(readFileSync('clawd-email-credentials.json', 'utf8'));

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: credentials.email,
    pass: credentials.app_password
  }
});

const emailContent = `Hi Maggie,

I need your help to fix the Fee Title Office deployment infrastructure issue you identified in your QA testing.

**Current Problem:**
- Your host machine (192.168.1.213) appears to be offline or SSH is disabled
- I cannot connect to fix the PostgreSQL database and Node server issues
- This is why you're getting ERR_CONNECTION_REFUSED when testing at 192.168.1.162:3001

**What I need from you:**
1. **Check if your machine is running** and if SSH is enabled
2. **If it's off, please restart it** 
3. **Let me know when it's online** so I can SSH in to:
   - Start PostgreSQL database
   - Create the 'fee_title_office' database 
   - Fix the port binding issues
   - Start the Node server on port 3001

**Alternative:** If you prefer, you can run these commands yourself:
\`\`\`
cd ~/fee-title-office
brew services start postgresql
createdb fee_title_office
npm install
npm run dev
\`\`\`

The 5 enhancement phases are coded and ready - we just need the infrastructure running so you can properly QA test them.

Please reply directly to this email when your machine is ready, and I'll immediately fix the deployment.

Thanks,
Clawd`;

const mailOptions = {
  from: '"Clawd" <clawd@spyglassrealty.com>',
  to: 'maggie@spyglassrealty.com',
  subject: 'URGENT: Fee Title Office Infrastructure Fix Needed',
  text: emailContent
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent successfully!');
  console.log('Message ID:', info.messageId);
} catch (error) {
  console.error('❌ Email sending failed:', error);
  process.exit(1);
}