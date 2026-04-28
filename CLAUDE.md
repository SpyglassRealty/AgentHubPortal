# Mission Control (Agent Hub Portal) — CLAUDE.md
**Admin CMS backend | Hosted on Render | Last updated: April 28, 2026**

---

## Cross-Platform Reference

Each repo has its own CLAUDE.md and is authoritative for its own platform. This file governs Mission Control only.

- **IDX CLAUDE.md:** `/Users/ryanrodenbeck/clawd/spyglass-idx/CLAUDE.md`
- **MC CLAUDE.md (this file):** `/Users/ryanrodenbeck/clawd/AgentHubPortal/CLAUDE.md`

Rules:
- For IDX work, paste prompts in the IDX terminal (`~/clawd/spyglass-idx`). Never mix repos in a single session.
- Cross-platform tasks (rare) require BOTH CLAUDE.mds read first, and ship as **separate commits per platform** — never a combined commit.
- Architect must explicitly note "MC-only" or "IDX-only" or "cross-platform (separate commits)" at the top of every spec.

---

## Three-Platform Architecture

| Platform | Hosting | URL | Local Path |
|---|---|---|---|
| Spyglass IDX (consumer frontend) | Vercel | `spyglass-idx.vercel.app` | `~/clawd/spyglass-idx/` |
| Vercel CMS (same repo, `/admin`) | Vercel | `spyglass-idx.vercel.app/admin` | `~/clawd/spyglass-idx/` |
| **Mission Control / Agent Hub Portal** | **Render** | `missioncontrol-tjfm.onrender.com` | `~/clawd/AgentHubPortal/` ← **THIS REPO** |

### Mission Control specifics
- Render service ID: `srv-d5vc5od6ubrc73cbslag`
- Stack: Express.js + Vite + React 19 + TypeScript + PostgreSQL
- Deploy: auto-deploy on push to `main` (no separate deploy step)
- Verification dashboard: https://dashboard.render.com/web/srv-d5vc5od6ubrc73cbslag/events

### Vercel CMS context (relevant to MC — content migration in flight)
- Caleb's build at `spyglass-idx.vercel.app/admin`. Source of truth for IDX content as of **April 15, 2026**.
- Tables: `cms_blog_posts`, `community_pages`, `cms_site_settings`.
- Some MC content (community pages) is migrating to Vercel CMS incrementally. MC remains source of truth until each surface is explicitly cut over.

### Shared Postgres database
- Render Postgres `dpg-d5em253e5dus73bvtkhg-a` — used by **BOTH** platforms.
- External connection: `psql` with `PGPASSWORD` on the Mac Mini.
- Render Postgres MCP tool (`query_render_postgres`) is **read-only** (wraps in transaction). All `UPDATE` / `DELETE` / `INSERT` must use `psql`.

### Consumer page render chain for `/[slug]` (IDX renders, MC must know)
- **Step 0.5** — Vercel CMS `community_pages`
- **Step 1** — `communities-polygons.ts` static (4,194 entries)
- **Steps 2–4** — `area-communities.ts` intermediate
- **Step 5** — MC API `communities` table (1,594 rows) ← **MC SERVES THIS**
- **Step 6** — `idx_pages` (Caleb's specialty pages, 48 rows)
- **Step 7** — `notFound()`

### What stays in MC permanently
- Polygon Manager (source of truth for polygon data)
- Agents directory (171 records, 167 photos in IDX `/public/agent-photos/`)
- CMA tool (`cma.tsx`, `cma-builder`, `cma-presentation`, `components/cma-presentation/`)
- Call Duty
- FUB Dashboard
- Email Stats
- IDX Leads

---

## Agent Routing — Always @-mention

Every prompt must start with an @-mention:

```
@.claude/agents/qa-auditor.md            → audits, greps, read-only checks
@.claude/agents/spyglass-architect.md    → specs, plans, analysis only
@.claude/agents/spyglass-code-builder.md → all code changes, commits, pushes
@.claude/agents/infosec-auditor.md       → security review (auth, secrets, injection vectors)
```

**Terminal workflow (current):**
- Mission Control prompts → paste into terminal at `~/clawd/AgentHubPortal`
- Spyglass IDX prompts → paste into terminal at `~/clawd/spyglass-idx`
- Never paste an MC prompt into the IDX terminal and vice versa

---

## Database

- ORM: Drizzle (schema at `shared/schema.ts`)
- DB credentials must NEVER appear in output
- Connection: Render Postgres `dpg-d5em253e5dus73bvtkhg-a` (shared with IDX)

### Key Tables
- `communities` — 1,594 rows. Key columns: slug, name, meta_title, meta_description, focus_keyword, page_title, about_heading_level, description, sections, polygon, hero_image, published
- `community_content_blocks` — content blocks with title, content (RTE), image_url, video_url, iframe_url, background, media_position, cta_buttons (jsonb), sort_order

---

## Community Editor — Current Section Order (Mar 26)

1. **Header** — Community name (read-only), slug, View on Site, Unpublish, Save
2. **SEO** (inline card) — Meta Title, Meta Description, Focus Keyword, URL Slug (editable, warning dialog on change), Google Preview
3. **About Section** — About Title (H1-H5 dropdown) + About Description RTE
4. **Content Blocks Editor** — drag/drop with CTA toggle (on/off per block)
5. **Tags** — Highlights, Best For, Nearby Landmarks
6. **Featured Image** — upload via Vercel Blob
7. **Status Panel** — Published/Featured toggles

### Removed (no longer in editor):
- SeoPanel ("SEO Settings") — removed Mar 26, was duplicate
- Content Sections — removed Mar 26, replaced by Content Blocks

---

## Key Files

```
server/communityPublicRoutes.ts                          — Public API for IDX
server/communityEditorRoutes.ts                          — Admin API for community CRUD
server/communityContentBlocksRoutes.ts                   — Content blocks CRUD
shared/schema.ts                                         — Drizzle ORM schema
client/src/pages/admin/CommunityEditor.tsx               — Community edit page
client/src/pages/admin/PolygonManager.tsx                — Polygon drawing/editing
client/src/pages/admin/SpyglassSnippets.tsx              — IDX snippet builder
client/src/components/community/ContentBlocksEditor.tsx  — Content blocks UI
```

---

## Commit Message Format

```
[TASK-ID] Target - Short description
```

---

## Workflow (SOP v2.1)

1. **Audit** — targeted file reads only, no full codebase scans, post findings
2. **Draft** — post full proposed diff/change
3. **Review** — Daryl/Claude reviews, may push back
4. **Wait** — no commits until explicit ✅ Go signal from Daryl (HIGH-RISK only — see Agent Chaining Policy)
5. **Commit** — one fix at a time, `npm run build` must pass first
6. **Verify** — run `git log -1`, paste actual CLI output
7. **Report** — SHA + deploy ID + READY

---

## Agent Chaining Policy

### Token efficiency rationale
- **Claude Desktop** = persistent brain (long-lived chat per project, cross-session memory).
- **Claude Code** = executor (every prompt must be self-contained — Code never reads chat history).

### Chained-approval flow

```
Architect (writes spec)
    ↓
QA Auditor (reviews for dependencies, risk, criticality)
    ↓
[Daryl gate ONLY if HIGH-RISK]
    ↓
Builder (implements + commits + pushes)
    ↓
[Daryl manually confirms Render deploy LIVE before verification curl]
```

### Risk tiers

**LOW-RISK** — auto-flow Architect → QA → Builder (no Daryl gate):
- CSS / styling / copy / formatting changes
- Config-only changes (`CLAUDE.md`, `.claude/agents/*`)
- `console.log` adds / debug log removes
- Comment changes, import reordering
- Documentation updates

**HIGH-RISK** — gated Architect → QA → Daryl ✅ → Builder:
- Auth routes or session logic
- DB schema changes or migrations
- API route logic (POST/PUT/DELETE handlers in `server/`)
- FUB event pipeline changes
- Cross-platform coordination (MC + IDX in same conceptual change)
- New feature implementations
- Any file in `server/` that handles requests
- Environment variable changes (Render dashboard or via MCP)
- Destructive operations (delete, remove, drop)
- Anything touching admin auth, agent CRUD, or polygon data
- Schema changes to shared DB tables

**When in doubt** → Builder defaults to HIGH-RISK and stops for Daryl.

### Per-tool edit prompts
Once QA-approved, Builder answers option **2** ("Yes, allow all edits during this session") to per-tool edit prompts.

### Render-specific deploy flow (DIFFERENT FROM VERCEL)
- Render auto-deploys on push to `main`. Builder **cannot** poll Render API from a Claude Code session.
- After `git push`, Builder posts SHA and **STOPS**.
- Daryl manually checks the Render dashboard (https://dashboard.render.com/web/srv-d5vc5od6ubrc73cbslag/events), confirms LIVE in chat, **THEN** Builder runs production verification curl.
- Standard verification curl: `curl -sI https://missioncontrol-tjfm.onrender.com/<path>`

---

## Session Handoff Protocol

Three layers of persistence:

**Layer 1 — CLAUDE.md (this file)**
Standing rules, architecture, parked tasks, recent decisions. Read by every new Claude Code session automatically.

**Layer 2 — `docs/handoffs/SESSION_HANDOFF_<YYYY-MM-DD>.md`**
End-of-session snapshot: SHAs shipped, parked tasks, current state, what's next.
- First prompt of next session: "Read `docs/handoffs/SESSION_HANDOFF_<latest>.md` before doing anything."
- Old handoffs archive to `docs/handoffs/archive/` after 7 days.

**Layer 3 — Claude Desktop (long-lived chat per project)**
Holds full conversational context. Drafts every Code prompt with context inline. Code never reads chat history.

**Hard rule:** Never paste a Code prompt that depends on Code remembering a previous chat. If the agent needs context, embed it in the prompt itself.

---

## Mobile + Tablet Optimization

MC is an admin backend, primarily desktop usage. Trisha and other admins occasionally use MC on iPad in the field.

### Required device matrix for MC admin UI
- **Mobile portrait:** 375px (informational only — admin UI rarely usable here)
- **Tablet portrait:** 768px (iPad Mini — Trisha uses this), 834px (iPad Pro 11")
- **Tablet landscape:** 1024px (iPad Pro landscape — primary tablet target)
- **Desktop:** 1280px+ (primary target)

### iPad-specific gotchas
- iPad Pro 13" reports 1024px portrait — still a touch device. Touch targets 44×44px even at desktop-equivalent widths.
- iPad Safari treats `:hover` as sticky after first tap — scope hover to `@media (hover: hover)` for mouse-only.
- Split View reduces window width arbitrarily — admin tables must scroll horizontally rather than break.
- File upload on iPad: confirm photo upload flow works (Polygon Manager, agent photos, hero images).

**Hard rule:** For new admin UI, verify on iPad portrait (768px) before marking READY. **Trisha is the iPad sign-off.**

---

## Hard Rules

- **Never commit without explicit ✅ Go signal** (HIGH-RISK only — LOW-RISK follows auto-flow)
- **Never stack commits** — one fix at a time, wait for approval between each
- **`npm run build` must pass before committing**
- **Render deploys take 7–10 min** — don't report READY before live status confirmed by Daryl
- **Migrations don't auto-run** — must be run manually via `node -e` or `psql`
- **DB credentials must NEVER appear in output**
- **Never cross-deploy** — this repo is Render only

---

## Pitfalls

### General
- **Repliers polygon POST — strip `boardId`** — `boardId` must NOT be included with polygon map body (POST). Returns 0 results. Strip before POST call.
- **Repliers `/locations?type=schoolDistrict` — strip `boardId`** — `boardId` has no meaning for school district lookups. Always strip `boardId` from schoolDistrict queries.
- **Never cross-deploy** — this repo is Render only. IDX changes go through `~/clawd/spyglass-idx`.

### Render-specific
- **A. Deploy queue clogging** — Render auto-deploys on push to `main`. Rapid pushes can clog the deploy queue. Batch related fixes when possible.
- **B. Ephemeral disk** — anything written to local disk wipes on every deploy. Photos/uploads MUST go to Vercel Blob or DB.
- **C. Env var changes require manual save + redeploy** in the Render dashboard. MCP tool `render:update_environment_variables` exists but **never invoke without explicit Daryl instruction**.
- **D. Postgres MCP is read-only** — `query_render_postgres` wraps queries in a transaction. All writes via `psql` with `PGPASSWORD` on the Mac Mini.
- **E. Service ID is critical** — `srv-d5vc5od6ubrc73cbslag`. Never use a different service ID without Daryl confirmation.
- **F. Cold-start delay** — first request after idle on free/starter tier has cold-start delay. Production tier does not. Verify which tier MC is on before testing.
- **G. Deploy state source of truth** — `dashboard.render.com/web/srv-d5vc5od6ubrc73cbslag/events`. Code session **cannot poll it**.

---

## Hard Deadline

**April 3, 2026** — DNS flip from REW to Vercel. REW access ends. No extensions.

> Note (2026-04-28): Deadline has passed. Retain for historical context until Daryl confirms removal.
