# QA Email Reply System - Fixed

## Problem Fixed
Maggie's email replies to QA notifications were failing with 'Message failed' error due to:
1. **Deployment monitor** was sending malformed notifications via `clawdbot nodes notify`
2. **Email threading** was not properly configured for replies
3. **No email monitoring** system to process QA replies

## Solutions Implemented

### ✅ 1. Fixed Deployment Monitor
**File:** `~/clawd/qa-automation/deployment-monitor.mjs`

**Changes:**
- Fixed command execution to use `spawn()` instead of shell execution to avoid emoji/multiline parsing errors
- Added email fallback when node notifications fail
- Proper error handling and logging

**Now works:** Deployment notifications are sent via email when node notifications fail

### ✅ 2. Created Proper QA Email System  
**File:** `~/clawd/scripts/send-qa-email.mjs`

**Features:**
- Proper email threading headers (`Message-ID`, `Reply-To`)
- Professional HTML email template with clear QA checklist
- Unique message IDs for tracking replies
- Logging system for tracking sent emails (`qa-email-log.jsonl`)

**Usage:**
```bash
node scripts/send-qa-email.mjs project-name https://project.url provider commit-hash
```

### ✅ 3. Email Reply Monitoring (Manual)
**File:** `~/clawd/scripts/check-qa-replies.mjs`

**Status:** Requires Google OAuth setup for automated monitoring

**Alternative:** Manual check process until OAuth is configured

## How It Works Now

### 1. Deployment Detection
- Monitor detects new deployments every 10 minutes
- Tries to send node notification to Maggie first
- **Fallback:** Sends properly formatted email to maggie@spyglassrealty.com

### 2. Maggie Receives Email
- Professional QA notification with clear checklist
- Direct reply instructions  
- Proper threading headers for email clients

### 3. Reply Processing (Manual for now)
- Maggie replies directly to the QA email
- Replies include "PASS" or "FAIL" status
- Include any issues found or screenshots

### 4. QA Queue Updates (Manual)
- Check for Maggie's replies in clawd@spyglassrealty.com inbox
- Update `~/clawd/qa-queue.md` with results
- Move items from Pending → Completed/Failed

## Testing Completed

✅ **Email sending:** Works with correct credentials  
✅ **HTML template:** Professional QA notification format  
✅ **Threading:** Message-ID and Reply-To headers properly set  
✅ **Deployment monitor:** No longer crashes on emoji/multiline content  
✅ **Fallback system:** Email sent when node notifications fail  

## Next Steps for Full Automation

To make Maggie's replies fully automated:

1. **Set up Google OAuth for Gmail API**
   ```bash
   # Download OAuth credentials from Google Cloud Console
   gog auth credentials /path/to/credentials.json
   gog auth login clawd@spyglassrealty.com
   ```

2. **Enable automatic reply monitoring**
   ```bash
   # Run periodically (every 5 minutes)
   node scripts/check-qa-replies.mjs
   ```

3. **Add to cron job for automation**
   ```bash
   # Check for QA replies every 5 minutes
   */5 * * * * cd /Users/ryanrodenbeck/clawd && node scripts/check-qa-replies.mjs
   ```

## Files Modified

- `~/clawd/qa-automation/deployment-monitor.mjs` - Fixed notification system
- `~/clawd/scripts/send-qa-email.mjs` - NEW: Professional QA email system  
- `~/clawd/scripts/check-qa-replies.mjs` - NEW: Reply monitoring (needs OAuth)

## Immediate Use

**Maggie can now reply directly to QA emails!** The threading and formatting are fixed. The only missing piece is automated reply processing, which requires OAuth setup or manual checking of the clawd@spyglassrealty.com inbox.

## Testing Commands

```bash
# Test QA email sending
node scripts/send-qa-email.mjs test-project https://example.com vercel abc123

# Test deployment monitor  
cd qa-automation && node deployment-monitor.mjs

# Check for existing QA replies (manual)
# Login to clawd@spyglassrealty.com and check for replies from maggie@spyglassrealty.com
```