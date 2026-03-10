# HEARTBEAT.md

# Keep this file empty (or with only comments) to skip heartbeat API calls.
# Add tasks below when you want the agent to check something periodically.

## QA Queue Automation
During every heartbeat check, read ~/clawd/qa-queue.md. If there are items in Pending that haven't been sent to Maggie yet, send Maggie an email to maggie@spyglassrealty.com with the test details. If items move to Completed or Failed, close the loop with Cody and report back to Ryan. This should be fully automated — Ryan should never have to act as go-between for QA tasks.

## Email Reply Monitoring
Check clawd@spyglassrealty.com for new emails from maggie@spyglassrealty.com every heartbeat cycle. Process any QA replies automatically and update qa-queue.md (moving items from Pending to Completed/Failed based on Maggie's PASS/FAIL responses). Run: node scripts/check-qa-email-replies.mjs
