# Spyglass AI Team — Org Chart

```
                    ┌─────────────┐
                    │    CLAWD    │
                    │     CEO     │
                    │  (Opus/S4)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │   CODY    │   │   LETTY   │   │  MAGGIE   │
    │  Coder    │   │ Research  │   │    QA     │
    │(Codex/Op) │   │  (Grok)   │   │  (Codex) │
    └───────────┘   └───────────┘   └───────────┘
```

## Team Roles

### Clawd — CEO / Lead
- **Model:** Claude Opus 4 / Sonnet 4.5
- **Role:** Orchestrates all projects, communicates with Ryan and staff, delegates to team
- **Channels:** WhatsApp, Slack, iMessage
- **Workspace:** ~/clawd (Ryan's Mac Mini)

### Cody — Coding Agent
- **Model:** Codex CLI / Claude Opus 4
- **Role:** Dedicated coding agent for heavy development tasks
- **Spawned by:** Clawd (via sessions_spawn)
- **Specialty:** Building features, refactoring, debugging, full-stack development

### Letty — Research Agent
- **Model:** Grok (xAI)
- **Role:** Research, market analysis, content research, competitor analysis
- **Spawned by:** Clawd (via sessions_spawn)
- **Specialty:** Web research, data gathering, report writing, Austin real estate market intel

### Maggie — QA Lead
- **Model:** Codex CLI (on Mac Mini node)
- **Role:** Code review, testing, quality assurance for all projects
- **Location:** Maggie Mac Mini (192.168.1.184)
- **Reports to:** #qa-reports Slack channel (C0AH800FPJ7)
- **Workflow:** Clawd sends work → Maggie reviews → Posts PASS/FAIL report → Clawd deploys

## Communication Flow
```
Ryan (WhatsApp/Slack)
  ↓
Clawd (orchestrates)
  ├→ Cody (coding tasks) → code committed
  ├→ Letty (research tasks) → findings reported
  └→ Maggie (QA review) → #qa-reports
        ↓
     Ryan (approves) → Deploy
```
