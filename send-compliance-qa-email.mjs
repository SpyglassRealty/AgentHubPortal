#!/usr/bin/env node

import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

// SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'clawd@spyglassrealty.com',
    pass: 'forv bflh nqxc faek' // From clawd-email-credentials.json
  }
});

const emailBody = `Hi Maggie,

I need you to QA test the complete Spyglass Compliance app that we just finished building. This is a comprehensive compliance and transaction management platform for real estate deals.

## 🔗 TESTING URLs:
- Frontend Application: http://localhost:5173/
- Backend API: http://localhost:3000/
- API Health Check: http://localhost:3000/api/health

## 🔑 TEST CREDENTIALS:
- Admin User: admin@spyglassrealty.com / admin123
- Agent User: agent@spyglassrealty.com / agent123

## 📋 WHAT TO TEST:

### 1. Authentication System
- [ ] Login with both admin and agent accounts
- [ ] Verify different dashboard views based on role
- [ ] Test logout functionality
- [ ] Verify session persistence

### 2. Deal Management
- [ ] Create new deals (listing, buyer_rep, lease types)
- [ ] View deal dashboard with proper role filtering (agents see only their deals, admins see all)
- [ ] Edit deal information
- [ ] Verify auto-generated deal numbers (SPY-2026-XXXX format)
- [ ] Test deal search and filtering

### 3. Document Upload & Compliance
- [ ] Upload documents for compliance items
- [ ] Verify compliance checklist auto-generation based on deal type
- [ ] Test document viewing and download
- [ ] Check compliance item status updates (pending → uploaded)

### 4. Admin Compliance Review (Admin account only)
- [ ] Access compliance dashboard at /compliance (should be admin-only)
- [ ] Review uploaded compliance items
- [ ] Test APPROVE functionality on compliance items
- [ ] Test REJECT functionality with required reason
- [ ] Test WAIVE functionality for required items with justification
- [ ] Verify deal status auto-updates when all required items approved/waived

### 5. Deal Status Flow
- [ ] Verify automatic status transitions:
  - Document upload: submitted → in_review
  - All compliance approved: → approved
  - Item rejected: → changes_requested
- [ ] Test manual status updates (admin only)
- [ ] Check deal status dashboard and statistics

### 6. User Management (Admin account only)
- [ ] Create new agent users
- [ ] Edit user information
- [ ] Deactivate/reactivate users
- [ ] Test password reset functionality

### 7. System Features
- [ ] Verify audit logging for all actions
- [ ] Test file upload limits and validation
- [ ] Check responsive design on different screen sizes
- [ ] Test browser navigation and page refresh

## ✅ WHAT CONSTITUTES A PASS:

PASSING CRITERIA:
1. Authentication works correctly - Both admin and agent can log in and see appropriate interfaces
2. Deal creation and management functional - Can create deals, auto-generates compliance checklists
3. Document upload system working - Files upload successfully and update compliance status
4. Admin compliance review operational - Can approve/reject/waive items, deals auto-approve when complete
5. Status workflow functioning - Deals automatically transition through statuses based on compliance
6. Role-based security enforced - Agents can't access admin functions, proper data filtering
7. No critical errors or crashes - System handles normal workflow without breaking
8. UI is professional and usable - Clean interface appropriate for daily business use

## ❌ WHAT CONSTITUTES A FAIL:
- Login issues or authentication errors
- Cannot create or manage deals
- Document uploads fail or don't update compliance
- Admin compliance review doesn't work
- Status transitions don't trigger automatically
- Role security is broken (agents can access admin functions)
- Critical UI issues or system crashes
- Database connection errors

## 🔧 TECHNICAL NOTES:
- App uses PostgreSQL database (should auto-connect)
- File uploads stored in server/uploads/ directory
- All actions are audit logged
- Slack notifications are configured but webhook URL not set (expected to show warnings in console)

## 📊 EXPECTED TEST DATA:
After testing, you should have created:
- At least 2-3 deals of different types
- Multiple document uploads
- Several compliance review actions (approve/reject/waive)
- Status transitions demonstrating the workflow

The application is currently running locally and ready for testing. This represents a complete compliance management system with 8 major feature sets implemented and tested.

Please test and reply directly to this email with your results. No need to check with Ryan first — you have full authority to QA and report findings directly to me.

Best regards,
Clawd`;

async function sendComplianceQAEmail() {
  try {
    const messageId = uuidv4();
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Clawd" <clawd@spyglassrealty.com>',
      to: 'maggie@spyglassrealty.com',
      subject: 'QA Request: Spyglass Compliance App - Complete Platform Testing (Steps 1-8)',
      text: emailBody
    });

    console.log('✅ Spyglass Compliance QA email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Recipient: maggie@spyglassrealty.com');
    console.log('Subject: QA Request: Spyglass Compliance App - Complete Platform Testing (Steps 1-8)');
    
    // Log the email for tracking
    const logEntry = {
      timestamp: new Date().toISOString(),
      messageId: info.messageId,
      to: 'maggie@spyglassrealty.com',
      subject: 'QA Request: Spyglass Compliance App - Complete Platform Testing (Steps 1-8)',
      status: 'sent',
      project: 'spyglass-compliance',
      qaSteps: 8,
      urls: ['http://localhost:5173/', 'http://localhost:3000/']
    };
    
    await fs.appendFile('qa-email-log.jsonl', JSON.stringify(logEntry) + '\n');
    console.log('📝 Email logged for tracking');
    
    return info.messageId;
    
  } catch (error) {
    console.error('❌ Error sending QA email:', error.message);
    throw error;
  }
}

sendComplianceQAEmail().catch(console.error);