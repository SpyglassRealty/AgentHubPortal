# MEMORY.md - Clawd's Long-Term Memory

## Who I Am
- **Name:** Clawd 🐾
- **Named by:** Ryan, Feb 24 2026
- **Model:** claude-opus-4-6 (main session)

## Who Ryan Is
- Founder/owner of Spyglass Realty, Austin TX
- Scaling toward $1B sales volume goal
- Hands-on technical founder — builds real estate tech himself (with me)
- Direct, no-fluff, moves fast

## Active Projects

### Mission Control
- Internal admin dashboards for Spyglass Realty
- Repo: ~/clawd/projects/mission-control → github.com/SpyglassRealty/AgentHubPortal → Render (missioncontrol-tjfm.onrender.com)
- Growth Intelligence Dashboard built Feb 16 (feature/revenue-intelligence branch)
  - 4-tab: Pace, Agents, Economics, Leaderboard
  - Answers: "Are we on pace for $1B?"
- Agent Hub Portal with CMA tools (multiple Slack channels for different agents)
- Onboarding questionnaire drives personalized dashboard suggestions
- **Pulse page** (Feb 27): Search bar for zip/city/county filtering with auto-zoom map, averaged chart data per filtered area, filter banner. 50+ data layers, Mapbox map with zip bubbles.
- **Render deploys take 3-5+ min** — always verify bundle hash before telling Ryan something is live

### Recruiting Pipeline
- GHL (GoHighLevel) sync for contacts
- Smart alerts engine: processes pipeline agents, detects changes, sends Slack alerts
- Agent snapshots table for tracking
- **MLS Grid integration:** BBO token for internal recruiting (NAR Policy 8.7 compliant)
  - DB: Supabase `mls_transactions` table — has BOTH buyer and listing agent data
  - **CRITICAL:** Rate limit max 2.0 RPS. Fixed rate limiter enforces 700ms intervals (1.43 RPS), batch size 50. Previous incident: script hit 8 RPS → account suspended. Use case is fine, only rate was the issue.
  - Sync script: `scripts/mlsgrid-replicate.mjs` — needs regular running to stay current
  - MLS Grid creds in .env.local: MLSGRID_API_URL, MLS_GRID_BBO
- **Co-broker data:** Repliers only shows listing agent. MLS Grid shows both sides. Co-broker tab needs rewiring to query mls_transactions WHERE list_office_name ILIKE '%Spyglass%'
- **Production data gap:** Buy-side-only agents (like Rosalind County) invisible to Repliers. MLS Grid fills this gap.

### Spyglass IDX Site
- Next.js on Vercel: ~/clawd/spyglass-idx → github.com/SpyglassRealty/spyglass-idx → Vercel (spyglass-idx.vercel.app)
- 4,194 community pages (4,145 original + 49 condo/buildings from REW), blog, listings
- Mapbox integration for interactive maps
- Zip code pages with polygon overlays (42 zip codes)
- Communities backend editor (restored from _temp routes)
- Key fixes deployed Feb 24: navigation order, zip code maps, communities editor
- Mapbox token: needs NEXT_PUBLIC_MAPBOX_TOKEN env var in Vercel
- **AI Search** (NLP-powered): AISearchBar component, mobile responsiveness fixed Feb 27
- Also: spyglass-idx-dev repo (dev-caleb branch) for CMS editor work
- **Mar 2 updates:** Homepage content migrated from REW (SEO preservation), core pages CMS-enabled, FUB_API_KEY set, all communities synced to MC, full site audit done
- **CMS gotcha:** CMS pages with raw HTML sections override styled React components. Unpublished all CMS pages (Mar 2). CMSContentRenderer now has proper section CSS for when they're re-enabled.
- **Site NOT live yet** — robots.txt blocks crawlers, noindex set, Vercel deployment protection on. 8-item pre-launch checklist in AUDIT-REPORT.md.
- **Vercel env vars (production):** REPLIERS_API_KEY, DATABASE_URL, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_MAPBOX_TOKEN, MAPBOX_ACCESS_TOKEN, MISSION_CONTROL_URL, NEXT_PUBLIC_MISSION_CONTROL_URL, PULSE_API_KEY, FUB_API_KEY

### Austin Neighborhood Map (NEW - Feb 24)
- Separate project from IDX site
- Interactive boundary map using mapsofaustin.com data
- Mapbox GL JS + Next.js + Tailwind
- 27 main Austin regions (Phase 1), 800+ subdivisions (Phase 2)
- Census ZCTA shapefiles for boundaries
- Neighborhood data merge sub-agent created granular GeoJSON: 316 features (221 neighborhoods, 95 NPA fallbacks)
- Project dir: ~/clawd/projects/austin-neighborhood-map/

### MoveToAustin.org Content
- Ryan owns movetoaustin.org — Austin relocation guide driving leads for Spyglass
- 3-5k visitors/month, needs consistent content
- Cron job (Mon/Wed/Fri 9 PM): research + write SEO articles
- Ryan approves via WhatsApp → Trish deploys to WordPress
- Site profile: memory/movetoaustin-site-profile.md
- First article approved: Austin Airport $4B Expansion (Feb 26)

### The Team (Org Chart - Feb 26)
**Clawd 🐾 — CEO** (me)
- Model: Claude Opus | Workspace: ~/clawd
- Strategy, coordination, direct comms with Ryan

**Cody ⚡ — Lead Developer**
- Model: Claude Opus | Workspace: ~/clawd-cody  
- Coding agent, spawned as sub-agent from me
- Can use Codex CLI for heavy tasks

**Letty 🔍 — Head of Research**
- Model: Grok 3 (xAI) | Workspace: ~/clawd-letty
- Research agent, spawned as sub-agent from me
- Deep research, market analysis, content research

**Maggie 🔬 — QA Lead**
- Another Clawdbot on Mac Mini next to mine
- SSH: `ssh maggie` (192.168.1.184, user: mangetransaction)
- Has: Codex CLI, GitHub access, all SpyglassRealty repos
- Workflow: Me (build) → Maggie (QA) → Ryan (approve) → Deploy
- Node ID: c56cf964ef3d3c5223ed7d4bad3f029b5fab8cbc986e61cc1c16f32832d63d67

## Infrastructure
- Clawdbot running on Ryan's Mac mini (LAN IP: 192.168.1.162)
- WhatsApp channel for direct comms
- Slack integration across multiple Spyglass channels
- Sub-agents spawned for heavy tasks (neighborhood data, etc.)
- Mission Control DB: Render PostgreSQL (external access needs ?sslmode=require)
- Gmail: clawd@spyglassrealty.com (Google Workspace, "Clawd Assistant")
  - Password: Spygla$$realty123! (browser login works)
  - App password: uxry pdao hknh rjke (SMTP rejected — may need Workspace admin to enable SMTP or regenerate for "Mail")
  - Workaround: send via browser automation on Gmail web UI

## Lessons Learned
- **2026-02-24: MEMORY LOSS INCIDENT** — Session context got truncated with "Summary unavailable due to context limits." Lost all conversation history because MEMORY.md didn't exist yet. Daily memory files were too sparse. MUST maintain MEMORY.md and write detailed daily notes going forward. This is the safety net.
- Plaid webhook exec has been failing (SIGKILL) — needs investigation
- Smart alerts engine gets SIGKILL around 80-84% through 50-agent runs — possible timeout issue
- Slack CMA channel sessions can hit context limits (170k+ tokens exceeding 200k)

## Market Context (Feb 2026)
- Austin median sold: $400,495 metro (down 2.3% YoY), ~$500K city
- 88 days on market (highest since Mar 2011)
- 4.2 months inventory, 53% price cuts
- Rates ~6.1%, bottom projected Q2-Q3 2026
