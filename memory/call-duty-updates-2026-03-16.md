# Call Duty Updates - March 16, 2026

## Recent Fixes & Enhancements Shipped

### 🔧 Technical Fixes
- **Sidebar nav labels truncated** — Fixed with `min-w-0 overflow-x-hidden` on content wrapper div (line 714 in call-duty.tsx)
- **External assignments display** — Force-assigned signups (with no MC account) now show correctly on shift calendar with assignee name and accurate spot counts
- **Duplicate signup protection** — System now handles duplicate signup attempts gracefully instead of server crash

### ✨ New Features
- **Force-assign by email** — Admins/Developers can assign any agent by email (even without MC account), sends Google Calendar invite automatically
- **FUB agent avatars** — Agent profile photos from Follow Up Boss now appear on shift slot cards
- **Slack notifications** — Admins get notified when shifts are assigned (includes assignee, date/time, self-signup vs force-assign)

### 🎯 UX Improvements
- **"Sign Me Up" label** — Button renamed from "Sign Up" to "Sign Me Up" for clarity

### 🚨 Issues Audited
1. ✅ Sidebar nav truncation — FIXED
2. ❓ Admin assign autocomplete — needs audit (3+ letters in "Search agents..." should show suggestions)
3. ❓ Non-Spyglass email display — needs confirmation (was fixed in commit `34b2ab4` with `leftJoin`)

## Context
- Call Duty page: `/call-duty`
- Main repo: AgentHubPortal on Render (missioncontrol-tjfm.onrender.com)
- Feedback channel: #spyglass-app-projects