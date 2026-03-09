# Send Attorney Email via Gmail

Since the automated email sending isn't working due to authentication issues, here's what you can do:

## Option 1: Manual Send via Gmail
1. Open Gmail in your browser
2. Compose new email to: ryan@spyglassrealty.com, sunny@spyglassrealty.com
3. Subject: Attorney Recruitment Project - Research Complete & Ready for Outreach
4. Copy the content from `email-body.txt` (in this folder)
5. Attach these files:
   - attorney-master-list.csv
   - email-report.md  
   - dashboard-design.html

## Option 2: Fix Email Authentication
The issue is that the Gmail app password may have been revoked or changed.

To create a new one:
1. Go to https://myaccount.google.com/apppasswords
2. Sign in to clawd@spyglassrealty.com
3. Select "Mail" and your device
4. Generate new app password
5. Update the password in clawd-email-credentials.json

## Option 3: Alternative Email Service
We could use:
- SendGrid API
- Mailgun API
- Amazon SES
- Postmark

All files are ready in this folder for immediate sending.