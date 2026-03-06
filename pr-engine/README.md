# PR Engine for Spyglass Realty

## Overview
Automated PR system managed by Letty, based on the AI PR Engine framework. Replaces traditional PR agency functions with AI-driven workflows.

## Weekly Schedule

### Monday - Story Mining (9:00 AM)
- Extract 5-8 newsworthy angles from Spyglass Realty
- Rank by media appeal (timeliness, impact, novelty, human interest)
- Output: `weekly-angles/YYYY-MM-DD.md`

### Tuesday - Press Release Writing (10:00 AM)
- Take #1 angle from Monday
- Write AP-style press release
- Output: `press-releases/YYYY-MM-DD-[slug].md`

### Wednesday - Media Research (11:00 AM)
- Research Austin real estate journalists
- Update media database with contacts
- Target: 5-10 new journalists/week
- Output: `media-database.json` & `media-updates/YYYY-MM-DD.md`

### Thursday - Pitch Outreach (9:00 AM)
- Send personalized pitches to 10-15 journalists
- Reference their recent work
- Track in pitch log
- Output: `pitch-log/YYYY-MM-DD.json`

### Friday - Follow-ups & X Engagement (10:00 AM)
- Follow up on unanswered pitches
- Engage with journalists on X
- Build relationships
- Output: `followup-log/YYYY-MM-DD.md`

### Daily - X Profile Management (2:00 PM Mon-Fri)
- Post 1-2 times about Austin RE/PropTech
- Engage with 3-5 relevant accounts
- Position Ryan as thought leader
- Output: `x-content/YYYY-MM-DD.md`

## Key Targets

### Publications
- Austin Business Journal
- Austin American-Statesman  
- Inman News
- HousingWire
- The Real Deal Texas
- Community Impact
- Local TV: KVUE, KXAN, FOX 7, KEYE

### Story Angles
- Spyglass growth toward $1B goal
- Agent recruiting milestones
- Mission Control tech innovations
- Austin market insights
- PropTech adoption

## File Structure
```
~/clawd/pr-engine/
├── README.md (this file)
├── weekly-angles/
├── press-releases/
├── media-database.json
├── media-updates/
├── pitch-log/
├── followup-log/
└── x-content/
```

## Success Metrics
- Media mentions per month
- Journalist response rate
- X follower growth
- Engagement rate
- Press coverage quality