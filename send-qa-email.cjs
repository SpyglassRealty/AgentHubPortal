const nodemailer = require('nodemailer');
const fs = require('fs');

// Read email credentials
const credentials = JSON.parse(fs.readFileSync('clawd-email-credentials.json', 'utf8'));

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: credentials.smtp.host,
  port: credentials.smtp.port,
  secure: credentials.smtp.secure,
  auth: {
    user: credentials.email,
    pass: credentials.app_password
  }
});

async function sendQAEmail(to, subject, body, isTest = false) {
  try {
    // Prefix QA emails with [Clawd] for clear identification
    const emailSubject = subject.startsWith('[Clawd]') ? subject : `[Clawd] ${subject}`;
    
    const mailOptions = {
      from: {
        name: 'Clawd - QA Bot',
        address: credentials.email
      },
      to: to,
      subject: emailSubject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    };

    console.log('Sending email...');
    console.log(`From: ${mailOptions.from.address}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${emailSubject}`);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Rejected: ${result.rejected}`);
    
    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// If run directly, send test email
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node send-qa-email.js <to> <subject> <body>');
    process.exit(1);
  }
  
  const [to, subject, body] = args;
  sendQAEmail(to, subject, body, true)
    .then(result => {
      console.log('Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    });
}

module.exports = { sendQAEmail };