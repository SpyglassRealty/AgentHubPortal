---
title: "Agent Onboarding Automation — Design Spec"
date: "2026-02-14"
tags: ["operations", "automation", "onboarding", "mission-control"]
---

# 🚀 Agent Onboarding Automation

## The Problem

Every new agent hire requires 15-25 manual steps across multiple systems. With 179 → 300 agents as the 2026 goal, that's ~121 new agents. At ~2 hours per onboard (conservative), that's **242 hours of admin time** — or 6 full work weeks.

Current onboarding likely involves:
- Creating accounts in Follow Up Boss, ReZen, Mission Control
- Setting up email, phone forwarding
- Adding to Slack, group chats, distribution lists
- Ordering business cards, signs, lockboxes
- Scheduling training sessions
- Compliance paperwork (TREC, E&O insurance, MLS access)
- Website bio/profile page creation
- Headshot scheduling
- Welcome communications

**Most of this can be automated or turned into a guided checklist.**

---

## Proposed Solution: Mission Control Onboarding Module

### Architecture

```
┌─────────────────────────────────────────────┐
│           Mission Control Admin              │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │   New Agent Onboarding Dashboard        │ │
│  │                                          │ │
│  │  [+ Start New Onboarding]               │ │
│  │                                          │ │
│  │  Agent Name: ____________               │ │
│  │  Email: ____________                     │ │
│  │  Phone: ____________                     │ │
│  │  Office: [Austin ▼] [Houston ▼]         │ │
│  │  Start Date: ____________               │ │
│  │  License #: ____________                 │ │
│  │  Recruiting Source: [Beacon ▼]          │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │   Automated Checklist                    │ │
│  │                                          │ │
│  │   Phase 1: Pre-Start (Admin Tasks)      │ │
│  │   ☑ Create FUB account                  │ │
│  │   ☑ Create ReZen profile                │ │
│  │   ☑ Add to Mission Control              │ │
│  │   ☐ Set up email forwarding             │ │
│  │   ☐ Add to Slack channels               │ │
│  │   ☐ Order business cards                │ │
│  │                                          │ │
│  │   Phase 2: Day 1 (Welcome)              │ │
│  │   ☐ Send welcome email                  │ │
│  │   ☐ Schedule headshot                   │ │
│  │   ☐ Schedule training orientation       │ │
│  │   ☐ Assign mentor/buddy                 │ │
│  │                                          │ │
│  │   Phase 3: Week 1 (Ramp Up)             │ │
│  │   ☐ Complete FUB training               │ │
│  │   ☐ Complete Mission Control tour        │ │
│  │   ☐ Set up IDX profile                  │ │
│  │   ☐ First team meeting attended          │ │
│  │                                          │ │
│  │   Phase 4: Month 1 (Activation)         │ │
│  │   ☐ First listing or buyer agreement    │ │
│  │   ☐ 30-day check-in with manager        │ │
│  │   ☐ Review initial goals                │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Features

#### 1. Intake Form → Auto-Provisioning
When admin enters a new agent:
- **Auto-create** FUB contact via API
- **Auto-create** Mission Control user
- **Auto-generate** IDX agent profile page
- **Auto-send** welcome email with login credentials
- **Auto-add** to appropriate Slack channels via webhook
- **Auto-schedule** orientation training (calendar API)

#### 2. Smart Checklist Engine
- Pre-built checklist templates per office (Austin vs Houston)
- Auto-check items as APIs confirm completion
- Manual check for physical tasks (business cards, headshot)
- SLA alerts: "Business cards not ordered after 3 days"
- Progress percentage per agent
- Admin dashboard showing all agents in onboarding pipeline

#### 3. Welcome Sequence (Automated Emails)
```
Day 0:  Welcome email + credentials + what to expect
Day 1:  "Your first week" guide + training schedule
Day 3:  "Have you set up your FUB?" nudge
Day 7:  "How's your first week?" check-in from Ryan (personal)
Day 14: "2-week wins" celebration + next steps
Day 30: "First month review" schedule
Day 60: "How can we help you grow?" survey
Day 90: "90-day milestone" celebration
```

#### 4. Onboarding Analytics
- Average time to complete onboarding
- Bottleneck identification (which steps take longest)
- Conversion rate: onboarded agents → first transaction
- Time-to-first-deal by office, source, experience level
- Correlation between onboarding completion and retention

### Database Schema

```sql
-- Onboarding templates
CREATE TABLE onboarding_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  office TEXT DEFAULT 'all', -- 'austin', 'houston', 'all'
  steps JSONB NOT NULL, -- Array of checklist steps
  welcome_sequence JSONB, -- Email sequence config
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active onboarding processes
CREATE TABLE agent_onboarding (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_phone TEXT,
  office TEXT NOT NULL,
  license_number TEXT,
  start_date DATE,
  template_id INTEGER REFERENCES onboarding_templates(id),
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, paused, cancelled
  checklist_state JSONB NOT NULL, -- Current state of all checklist items
  completed_at TIMESTAMPTZ,
  created_by TEXT, -- Admin who started it
  notes TEXT,
  recruiting_source TEXT, -- beacon, referral, walk-in, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding activity log
CREATE TABLE onboarding_activity (
  id SERIAL PRIMARY KEY,
  onboarding_id INTEGER REFERENCES agent_onboarding(id),
  action TEXT NOT NULL, -- 'step_completed', 'email_sent', 'note_added', etc.
  step_id TEXT, -- Which checklist step
  performed_by TEXT, -- 'system' or admin email
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

```
POST   /api/admin/onboarding              — Start new onboarding
GET    /api/admin/onboarding              — List all active onboardings
GET    /api/admin/onboarding/:id          — Get onboarding detail
PATCH  /api/admin/onboarding/:id          — Update onboarding
PATCH  /api/admin/onboarding/:id/step     — Toggle checklist step
POST   /api/admin/onboarding/:id/note     — Add note
DELETE /api/admin/onboarding/:id          — Cancel onboarding

GET    /api/admin/onboarding/templates    — List templates
POST   /api/admin/onboarding/templates    — Create template
PATCH  /api/admin/onboarding/templates/:id — Update template

GET    /api/admin/onboarding/analytics    — Dashboard metrics
```

---

## Implementation Plan

### Phase 1: Foundation (1 night)
- Database schema + migration
- Server routes (CRUD)
- Basic admin UI: list, create, checklist view
- Default Austin + Houston templates

### Phase 2: Automation (1-2 nights)
- FUB auto-provisioning
- Welcome email sequence (using clawd@spyglassrealty.com)
- IDX profile auto-creation
- Slack webhook notifications

### Phase 3: Analytics (1 night)
- Onboarding dashboard with metrics
- Bottleneck alerts
- Time-to-first-deal tracking

### Phase 4: Agent Self-Service (1 night)
- New agent portal view (what they need to do)
- Progress tracker visible to the agent
- Document upload (headshot, license, E&O)

---

## ROI Estimate

| Metric | Current (Manual) | Automated | Savings |
|--------|-----------------|-----------|---------|
| Admin time per onboard | ~2 hours | ~20 min | 1h 40min |
| 121 new agents in 2026 | 242 hours | 40 hours | **202 hours** |
| Cost at $25/hr | $6,050 | $1,000 | **$5,050** |
| Drop-off (incomplete onboard) | ~15% | ~5% | **10% more retention** |
| Time to first deal | ~45 days | ~30 days | **15 days faster** |

The real ROI is in retention. Agents who have a smooth, professional onboarding experience are significantly less likely to leave in the first year. At $5K average commission per deal and 10 transactions/year, losing one agent = $50K in brokerage revenue.

---

## Priority

**HIGH** — This directly supports the 179 → 300 goal and is a tangible differentiator in recruiting conversations ("We have an automated onboarding system that gets you productive in days, not weeks").

*Ready for Ryan's review. Can build Phase 1 in a single nightly session.*
