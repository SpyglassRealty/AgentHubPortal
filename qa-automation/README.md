# Automated QA System with Maggie

## Overview
This system automatically triggers Maggie to run QA tests whenever deployments are detected on Vercel or Render.

## How It Works

1. **Deployment Monitor** runs every 10 minutes during business hours (9am-6pm Mon-Fri)
2. It checks git commits for these projects:
   - spyglass-idx (Vercel)
   - mission-control (Render)
   - spyglass-crm (Vercel)
3. When a new commit is detected, it notifies Maggie via the nodes system
4. Maggie runs the standard QA checklist and posts results to #qa-reports in Slack

## Files

- `deployment-monitor.mjs` - Main monitoring script that checks for new deployments
- `qa-checklist-template.md` - Standard checklist Maggie follows for each QA review
- `webhook-handler.mjs` - Future webhook receiver (when Vercel/Render webhooks are set up)
- `deployment-state.json` - Tracks last known commits to detect changes
- `qa-triggers.log` - Log of all QA triggers sent to Maggie

## Manual Testing

To manually trigger a QA review:
```bash
cd ~/clawd/qa-automation
node deployment-monitor.mjs
```

## Cron Job

The deployment monitor runs automatically via cron:
- **Schedule:** Every 10 minutes, 9am-6pm Mon-Fri
- **Name:** deployment-qa-monitor
- **Command:** `cd ~/clawd/qa-automation && node deployment-monitor.mjs`

## What Maggie Tests

1. Visual regression (screenshots)
2. Core functionality (forms, search, filters)
3. Console errors
4. Mobile responsiveness  
5. Page load times
6. Critical user paths

## Results

All QA reports are posted to **#qa-reports** in Slack with:
- PASS/FAIL status
- What was tested
- Issues found
- Recommendations

## Next Steps

1. Set up Vercel webhooks for instant deployment notifications
2. Add visual regression screenshot comparison
3. Create dashboard in Mission Control for QA history
4. Add more sophisticated test scenarios