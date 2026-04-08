# Mission Control (Agent Hub Portal) — CLAUDE.md
**Admin CMS backend | Hosted on Render | Last updated: March 26, 2026**

---

## Project Overview

Admin CMS for Spyglass Realty. Express + React frontend. This repo is ONLY for the Render-hosted backend. The consumer IDX frontend is a separate repo (`~/clawd/spyglass-idx/`) on Vercel — never cross-deploy.

| Detail | Value |
|---|---|
| Framework | Express (API) + React (Vite, admin UI) |
| Hosting | Render |
| Service ID | `srv-d5vc5od6ubrc73cbslag` |
| URL | `missioncontrol-tjfm.onrender.com/admin` |
| Local Path | `~/clawd/AgentHubPortal/` |
| DB | Render Postgres (Drizzle ORM) |

---

## Agent Routing — Always @-mention

Every prompt must start with an @-mention:

```
@.claude/agents/qa-auditor.md          → audits, greps, read-only checks
@.claude/agents/spyglass-architect.md  → specs, plans, analysis only
@.claude/agents/spyglass-code-builder.md → all code changes, commits, pushes
```

**Terminal workflow (current):**
- Mission Control prompts → paste into terminal at `~/clawd/AgentHubPortal`
- Spyglass IDX prompts → paste into terminal at `~/clawd/spyglass-idx`
- Never paste an MC prompt into the IDX terminal and vice versa

---

## Database

- ORM: Drizzle (schema at `shared/schema.ts`)
- DB credentials must NEVER appear in output

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
server/communityPublicRoutes.ts      — Public API for IDX
server/communityEditorRoutes.ts      — Admin API for community CRUD
server/communityContentBlocksRoutes.ts — Content blocks CRUD
shared/schema.ts                     — Drizzle ORM schema
client/src/pages/admin/CommunityEditor.tsx — Community edit page
client/src/pages/admin/PolygonManager.tsx  — Polygon drawing/editing
client/src/pages/admin/SpyglassSnippets.tsx — IDX snippet builder
client/src/components/community/ContentBlocksEditor.tsx — Content blocks UI
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
4. **Wait** — no commits until explicit ✅ Go signal from Daryl
5. **Commit** — one fix at a time, `npm run build` must pass first
6. **Verify** — run `git log -1`, paste actual CLI output
7. **Report** — SHA + deploy ID + READY

---

## Hard Rules

- **Never commit without explicit ✅ Go signal**
- **Never stack commits** — one fix at a time, wait for approval between each
- **`npm run build` must pass before committing**
- **Render deploys take 7-10 min** — don't report READY before live status
- **Migrations don't auto-run** — must be run manually via `node -e`
- **DB credentials must NEVER appear in output**

---

## Pitfalls

- **Repliers polygon POST — strip boardId** — boardId must NOT be included with polygon map body (POST). Returns 0 results. Strip before POST call.
- **Repliers /locations?type=schoolDistrict — strip boardId** — boardId has no meaning for school district lookups. Always strip boardId from schoolDistrict queries.
- **Never cross-deploy** — this repo is Render only. IDX changes go through `~/clawd/spyglass-idx`.

---

## Hard Deadline

**April 3, 2026** — DNS flip from REW to Vercel. REW access ends. No extensions.
