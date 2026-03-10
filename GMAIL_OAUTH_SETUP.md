# Gmail OAuth Setup for Automated QA Reply Processing

## ✅ What's Been Set Up

### 1. **Email Reply Monitoring System**
- **File:** `~/clawd/scripts/check-qa-email-replies.mjs`
- **Purpose:** Automatically checks clawd@spyglassrealty.com for QA replies from Maggie
- **Features:**
  - OAuth-based Gmail API integration (when configured)
  - Automatic PASS/FAIL detection from reply content
  - Updates qa-queue.md automatically (moves items from Pending to Completed/Failed)
  - Marks processed emails as read

### 2. **Heartbeat Integration**
- **File:** `HEARTBEAT.md` - Updated to include email checking
- **Frequency:** Every heartbeat cycle
- **Command:** `node scripts/check-qa-email-replies.mjs`

### 3. **Manual Processing Fallback**
- **File:** `~/clawd/scripts/process-manual-qa-reply.mjs`
- **Usage:** `node process-manual-qa-reply.mjs [project-name] [PASS/FAIL] "[reply text]"`
- **Purpose:** Process QA replies manually until OAuth is configured

### 4. **Setup Assistant**
- **File:** `~/clawd/scripts/setup-gmail-oauth.mjs`
- **Purpose:** Guides through OAuth configuration and tests setup

## 🔧 OAuth Setup Required

To enable **automated email processing**, you need to complete Google OAuth setup:

### Step 1: Create OAuth Credentials
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **Spyglass Realty** (or create new)
3. Click **"Create Credentials" → "OAuth client ID"**
4. Application type: **"Desktop application"**
5. Name: **"Clawd Email Reader"**
6. **Download the JSON file**

### Step 2: Install Credentials
```bash
gog auth credentials set /path/to/downloaded-credentials.json
```

### Step 3: Authorize Account
```bash
gog auth add clawd@spyglassrealty.com
```
*(This will open browser for OAuth consent)*

### Step 4: Test Setup
```bash
gog gmail search "from:maggie@spyglassrealty.com" --account=clawd@spyglassrealty.com
```

### Required Scopes
- `https://www.googleapis.com/auth/gmail.readonly` (read emails)
- `https://www.googleapis.com/auth/gmail.modify` (mark as read)

## 🔄 How It Works

### With OAuth Configured:
1. **Heartbeat runs** → `check-qa-email-replies.mjs`
2. **Searches Gmail** for unread emails from `maggie@spyglassrealty.com`
3. **Analyzes subject/body** for QA-related content
4. **Detects PASS/FAIL** status from reply text
5. **Updates qa-queue.md** automatically
6. **Marks email as read**

### Without OAuth (Current State):
1. **Manual checking** mode activated
2. **Instructions provided** for manual email review
3. **Use manual processor** when replies are found

## 🧪 Testing

### Test OAuth Setup:
```bash
node scripts/setup-gmail-oauth.mjs
```

### Test Email Checking:
```bash
node scripts/check-qa-email-replies.mjs
```

### Manual Reply Processing:
```bash
node scripts/process-manual-qa-reply.mjs mission-control PASS "All tests passed, deployment looks good!"
```

## 📁 Files Created/Modified

### New Scripts:
- `~/clawd/scripts/check-qa-email-replies.mjs` - Main email checker
- `~/clawd/scripts/setup-gmail-oauth.mjs` - OAuth setup assistant  
- `~/clawd/scripts/process-manual-qa-reply.mjs` - Manual processing
- `~/clawd/scripts/check-maggie-qa-replies.mjs` - Basic checker (legacy)

### Modified Files:
- `HEARTBEAT.md` - Added email reply monitoring
- `~/clawd/qa-queue.md` - Added completed entry for email system setup

### Log Files:
- `~/clawd/qa-email-log.jsonl` - Sent QA emails log
- `~/clawd/qa-processing-log.jsonl` - Processed replies log

## 🎯 Current Status

✅ **Email sending system** - Working (QA notifications sent to Maggie)  
✅ **Manual processing** - Working (can manually update qa-queue.md)  
✅ **Heartbeat integration** - Configured  
⚠️ **OAuth setup** - **NEEDED** for full automation  
⚠️ **Automatic processing** - Pending OAuth configuration  

## 🚀 Next Steps

1. **Complete OAuth setup** using instructions above
2. **Test with real QA reply** from Maggie
3. **Verify qa-queue.md updates** automatically
4. **Monitor logs** for processing confirmation

Once OAuth is configured, Maggie's QA replies will be processed automatically every heartbeat cycle without any manual intervention!