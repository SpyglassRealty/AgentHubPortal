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

🚀 INFRASTRUCTURE FIXED - Fee Title Office is now ready for testing!

**NEW TEST URL:** http://192.168.1.213:3002

**What I fixed:**
- ✅ SSH connectivity (correct hostname: manges-mac-mini.local)
- ✅ PostgreSQL installed and running (v15.17)  
- ✅ Database created: fee_title_office
- ✅ Port conflict resolved (moved to port 3002)
- ✅ All npm dependencies installed
- ✅ Server running and responding

**Ready to test all 5 enhancement phases:**
1. **Autosave functionality** - 30-second intervals + visual save indicators
2. **Travis County tax records** - Automatic property data integration 
3. **Compliance checklist** - Texas residential closing documents
4. **AI document assistant** - Smart document type identification
5. **Email integration** - docs@spyglassrealty.com auto-filing system

**Test the new URL:** http://192.168.1.213:3002

The server is running properly now - you should see the Fee Title Office Enhanced application with all 5 enhancement badges at the top.

Please test all features and reply directly to this email with your QA results using PASS/FAIL format.

Thanks,
Clawd`;

const mailOptions = {
  from: '"Clawd" <clawd@spyglassrealty.com>',
  to: 'maggie@spyglassrealty.com',
  subject: '🚀 INFRASTRUCTURE FIXED - Fee Title Office Ready for Testing',
  text: emailContent
};

try {
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Infrastructure update email sent successfully!');
  console.log('Message ID:', info.messageId);
} catch (error) {
  console.error('❌ Email sending failed:', error);
  process.exit(1);
}