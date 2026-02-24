-- Agent Onboarding System
-- Supports automated checklist-based onboarding for new Spyglass agents
-- Part of the 179 → 300 agent growth initiative

-- Onboarding templates (different flows for Austin vs Houston, experienced vs new)
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  office TEXT DEFAULT 'all', -- 'austin', 'houston', 'all'
  agent_type TEXT DEFAULT 'experienced', -- 'experienced', 'new', 'team_lead', 'all'
  phases JSONB NOT NULL DEFAULT '[]',
  -- phases structure: [{ id, name, description, steps: [{ id, title, description, assignee, autoCheck, dueOffset }] }]
  welcome_sequence JSONB DEFAULT '[]',
  -- welcome_sequence: [{ dayOffset, subject, templateKey }]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active onboarding processes  
CREATE TABLE IF NOT EXISTS agent_onboardings (
  id SERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_phone TEXT,
  office TEXT NOT NULL DEFAULT 'austin',
  license_number TEXT,
  start_date DATE,
  template_id INTEGER REFERENCES onboarding_templates(id),
  status TEXT DEFAULT 'in_progress', -- 'pending', 'in_progress', 'completed', 'paused', 'cancelled'
  checklist_state JSONB NOT NULL DEFAULT '{}',
  -- checklist_state: { phaseId: { stepId: { completed: bool, completedAt, completedBy, notes } } }
  progress_pct INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_by TEXT, -- Admin who initiated
  recruiting_source TEXT, -- 'beacon', 'referral', 'walk-in', 'social', 'event', 'other'
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  -- metadata: { fubId, rezenId, slackId, missionControlId, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS onboarding_activity (
  id SERIAL PRIMARY KEY,
  onboarding_id INTEGER NOT NULL REFERENCES agent_onboardings(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'step_completed', 'step_unchecked', 'email_sent', 'note_added', 'status_changed', 'created'
  phase_id TEXT,
  step_id TEXT,
  performed_by TEXT DEFAULT 'system', -- admin email or 'system'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON agent_onboardings(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_office ON agent_onboardings(office);
CREATE INDEX IF NOT EXISTS idx_onboarding_template ON agent_onboardings(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_activity_onboarding ON onboarding_activity(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_activity_created ON onboarding_activity(created_at);

-- Insert default templates
INSERT INTO onboarding_templates (name, description, office, agent_type, phases, welcome_sequence) VALUES
(
  'Austin - Experienced Agent',
  'Standard onboarding for experienced agents joining the Austin office',
  'austin',
  'experienced',
  '[
    {
      "id": "pre-start",
      "name": "Pre-Start Setup",
      "description": "Admin tasks before the agent''s first day",
      "steps": [
        {"id": "fub-account", "title": "Create Follow Up Boss account", "description": "Set up FUB profile with correct team assignment and lead routing", "assignee": "admin", "autoCheck": false, "dueOffset": -3},
        {"id": "rezen-profile", "title": "Create ReZen profile", "description": "Add agent to ReZen with correct split structure", "assignee": "admin", "autoCheck": false, "dueOffset": -3},
        {"id": "mission-control", "title": "Add to Mission Control", "description": "Create user account in Agent Hub Portal", "assignee": "admin", "autoCheck": false, "dueOffset": -2},
        {"id": "email-setup", "title": "Set up @spyglassrealty.com email", "description": "Create email account and configure forwarding if needed", "assignee": "admin", "autoCheck": false, "dueOffset": -2},
        {"id": "slack-channels", "title": "Add to Slack channels", "description": "Add to #general, #austin-agents, #deals, #training", "assignee": "admin", "autoCheck": false, "dueOffset": -1},
        {"id": "mls-access", "title": "Verify MLS access transfer", "description": "Confirm ACTRIS/HAR MLS membership transfer is complete", "assignee": "admin", "autoCheck": false, "dueOffset": -1},
        {"id": "business-cards", "title": "Order business cards", "description": "Use Spyglass template, confirm agent details before ordering", "assignee": "admin", "autoCheck": false, "dueOffset": -3}
      ]
    },
    {
      "id": "day-one",
      "name": "Day 1 - Welcome",
      "description": "First day essentials and welcome experience",
      "steps": [
        {"id": "welcome-email", "title": "Send welcome email", "description": "Automated welcome with login credentials and first-week guide", "assignee": "system", "autoCheck": false, "dueOffset": 0},
        {"id": "headshot", "title": "Schedule professional headshot", "description": "Book with preferred photographer or coordinate office session", "assignee": "admin", "autoCheck": false, "dueOffset": 0},
        {"id": "orientation", "title": "Schedule orientation meeting", "description": "1-on-1 with team lead or Ryan for culture/expectations", "assignee": "admin", "autoCheck": false, "dueOffset": 0},
        {"id": "mentor-assign", "title": "Assign onboarding buddy/mentor", "description": "Pair with a top-producing agent in same office for first 30 days", "assignee": "admin", "autoCheck": false, "dueOffset": 0},
        {"id": "office-tour", "title": "Office tour & introductions", "description": "Tour the physical office space, introduce to team", "assignee": "admin", "autoCheck": false, "dueOffset": 0}
      ]
    },
    {
      "id": "week-one",
      "name": "Week 1 - Ramp Up",
      "description": "Getting productive in the first week",
      "steps": [
        {"id": "fub-training", "title": "Complete FUB training", "description": "Walk through lead management, pipeline, and automation setup", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "mission-control-tour", "title": "Mission Control walkthrough", "description": "Demo CMA tools, Market Pulse, performance dashboards", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "idx-profile", "title": "Set up IDX agent profile", "description": "Create agent page on Spyglass website with bio and headshot", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "first-team-meeting", "title": "Attend first team meeting", "description": "Introduce yourself to the broader team", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "crm-import", "title": "Import existing contacts to FUB", "description": "Help agent migrate their database from previous brokerage", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "marketing-setup", "title": "Set up marketing materials", "description": "Branded templates, social media kit, email signatures", "assignee": "agent", "autoCheck": false, "dueOffset": 7}
      ]
    },
    {
      "id": "month-one",
      "name": "Month 1 - Activation",
      "description": "First month milestones and check-ins",
      "steps": [
        {"id": "first-listing", "title": "First listing or buyer agreement", "description": "Track first active business under Spyglass", "assignee": "agent", "autoCheck": false, "dueOffset": 30},
        {"id": "30-day-checkin", "title": "30-day check-in with manager", "description": "Review transition, address concerns, set 90-day goals", "assignee": "admin", "autoCheck": false, "dueOffset": 30},
        {"id": "review-goals", "title": "Review and set production goals", "description": "Establish annual GCI target and transaction goals", "assignee": "agent", "autoCheck": false, "dueOffset": 30},
        {"id": "compliance-complete", "title": "All compliance docs submitted", "description": "TREC paperwork, E&O insurance, brokerage agreement signed", "assignee": "agent", "autoCheck": false, "dueOffset": 14},
        {"id": "announce-social", "title": "Social media announcement", "description": "Post agent joining announcement on Spyglass socials", "assignee": "admin", "autoCheck": false, "dueOffset": 7}
      ]
    },
    {
      "id": "month-three",
      "name": "90-Day Milestone",
      "description": "Retention checkpoint and growth planning",
      "steps": [
        {"id": "90-day-review", "title": "90-day performance review", "description": "Formal check-in: deals closed, pipeline, satisfaction", "assignee": "admin", "autoCheck": false, "dueOffset": 90},
        {"id": "retention-survey", "title": "Agent satisfaction survey", "description": "How is the experience? What can we improve?", "assignee": "agent", "autoCheck": false, "dueOffset": 90},
        {"id": "growth-plan", "title": "Create growth plan", "description": "Map out next 9 months: specializations, lead sources, training", "assignee": "agent", "autoCheck": false, "dueOffset": 90}
      ]
    }
  ]',
  '[
    {"dayOffset": 0, "subject": "Welcome to Spyglass Realty! 🏠", "templateKey": "welcome"},
    {"dayOffset": 1, "subject": "Your First Week at Spyglass", "templateKey": "first_week_guide"},
    {"dayOffset": 3, "subject": "Quick Check: Have You Set Up Your Tools?", "templateKey": "tools_nudge"},
    {"dayOffset": 7, "subject": "How Was Your First Week?", "templateKey": "week_one_checkin"},
    {"dayOffset": 14, "subject": "Two Weeks In — Let''s Check Your Progress", "templateKey": "two_week_checkin"},
    {"dayOffset": 30, "subject": "Your First Month at Spyglass 🎉", "templateKey": "month_one_milestone"},
    {"dayOffset": 60, "subject": "How Can We Help You Grow?", "templateKey": "growth_survey"},
    {"dayOffset": 90, "subject": "90 Days of Spyglass! 🏆", "templateKey": "ninety_day_milestone"}
  ]'
),
(
  'Houston - Experienced Agent',
  'Standard onboarding for experienced agents joining the Houston office',
  'houston',
  'experienced',
  '[
    {
      "id": "pre-start",
      "name": "Pre-Start Setup",
      "description": "Admin tasks before the agent''s first day",
      "steps": [
        {"id": "fub-account", "title": "Create Follow Up Boss account", "description": "Set up FUB profile with Houston team assignment", "assignee": "admin", "autoCheck": false, "dueOffset": -3},
        {"id": "rezen-profile", "title": "Create ReZen profile", "description": "Add agent to ReZen with correct Houston split structure", "assignee": "admin", "autoCheck": false, "dueOffset": -3},
        {"id": "mission-control", "title": "Add to Mission Control", "description": "Create user account in Agent Hub Portal", "assignee": "admin", "autoCheck": false, "dueOffset": -2},
        {"id": "email-setup", "title": "Set up @spyglassrealty.com email", "description": "Create email and configure forwarding", "assignee": "admin", "autoCheck": false, "dueOffset": -2},
        {"id": "slack-channels", "title": "Add to Slack channels", "description": "Add to #general, #houston-agents, #deals, #training", "assignee": "admin", "autoCheck": false, "dueOffset": -1},
        {"id": "har-mls", "title": "Verify HAR MLS access", "description": "Confirm HAR membership transfer is complete", "assignee": "admin", "autoCheck": false, "dueOffset": -1},
        {"id": "business-cards", "title": "Order business cards", "description": "Use Spyglass template with Houston office info", "assignee": "admin", "autoCheck": false, "dueOffset": -3}
      ]
    },
    {
      "id": "day-one",
      "name": "Day 1 - Welcome",
      "description": "First day essentials",
      "steps": [
        {"id": "welcome-email", "title": "Send welcome email", "description": "Automated welcome with credentials", "assignee": "system", "autoCheck": false, "dueOffset": 0},
        {"id": "headshot", "title": "Schedule professional headshot", "description": "Book with Houston photographer", "assignee": "admin", "autoCheck": false, "dueOffset": 0},
        {"id": "orientation", "title": "Schedule orientation", "description": "1-on-1 with Houston team lead", "assignee": "admin", "autoCheck": false, "dueOffset": 0},
        {"id": "mentor-assign", "title": "Assign onboarding buddy", "description": "Pair with Houston top producer", "assignee": "admin", "autoCheck": false, "dueOffset": 0}
      ]
    },
    {
      "id": "week-one",
      "name": "Week 1 - Ramp Up",
      "description": "Getting productive",
      "steps": [
        {"id": "fub-training", "title": "Complete FUB training", "description": "Lead management and automation setup", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "mission-control-tour", "title": "Mission Control walkthrough", "description": "CMA, Market Pulse, dashboards", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "idx-profile", "title": "Set up IDX agent profile", "description": "Agent page with bio and headshot", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "first-team-meeting", "title": "Attend first team meeting", "description": "Houston team introduction", "assignee": "agent", "autoCheck": false, "dueOffset": 7},
        {"id": "crm-import", "title": "Import contacts to FUB", "description": "Database migration from previous brokerage", "assignee": "agent", "autoCheck": false, "dueOffset": 7}
      ]
    },
    {
      "id": "month-one",
      "name": "Month 1 - Activation",
      "description": "First month milestones",
      "steps": [
        {"id": "first-listing", "title": "First listing or buyer agreement", "description": "First active business under Spyglass", "assignee": "agent", "autoCheck": false, "dueOffset": 30},
        {"id": "30-day-checkin", "title": "30-day check-in", "description": "Review and set 90-day goals", "assignee": "admin", "autoCheck": false, "dueOffset": 30},
        {"id": "compliance-complete", "title": "All compliance docs submitted", "description": "TREC, E&O, brokerage agreement", "assignee": "agent", "autoCheck": false, "dueOffset": 14}
      ]
    },
    {
      "id": "month-three",
      "name": "90-Day Milestone",
      "description": "Retention checkpoint",
      "steps": [
        {"id": "90-day-review", "title": "90-day performance review", "description": "Formal check-in on deals and satisfaction", "assignee": "admin", "autoCheck": false, "dueOffset": 90},
        {"id": "retention-survey", "title": "Agent satisfaction survey", "description": "Experience feedback", "assignee": "agent", "autoCheck": false, "dueOffset": 90}
      ]
    }
  ]',
  '[
    {"dayOffset": 0, "subject": "Welcome to Spyglass Realty Houston! 🏠", "templateKey": "welcome"},
    {"dayOffset": 1, "subject": "Your First Week at Spyglass Houston", "templateKey": "first_week_guide"},
    {"dayOffset": 7, "subject": "How Was Your First Week?", "templateKey": "week_one_checkin"},
    {"dayOffset": 30, "subject": "Your First Month 🎉", "templateKey": "month_one_milestone"},
    {"dayOffset": 90, "subject": "90 Days of Spyglass! 🏆", "templateKey": "ninety_day_milestone"}
  ]'
);
