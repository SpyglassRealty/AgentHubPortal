# Mission Control — Architecture Reference

## Platform
Express + React (Vite) | Hosted on Render | srv-d5vc5od6ubrc73cbslag
DB: Render Postgres via Drizzle ORM | dpg-d5em253e5dus73bvtkhg-a

## Key Rules
- Never cross-deploy — this repo is Render only
- DB writes via psql on Mac Mini (Render Postgres tool is read-only)
- All commits require npm run build to pass first
- One commit per logical fix

## Source Detection
- locationType === 'neighborhood' OR 'district' = LiveBy (Repliers)
- locationType === 'polygon' OR 'snippet' = Spyglass/drawn

## Render Ignored Paths (set in dashboard)
.claude/**, CLAUDE.md, PROMPT_TEMPLATES.md

## community_pages Render Priority
Step 0.5: community_pages (Vercel CMS) — wins over everything
Step 5:   MC API communities table
