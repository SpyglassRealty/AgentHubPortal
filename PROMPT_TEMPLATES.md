# Mission Control — Claude Code Prompt Templates
**Last updated: April 9, 2026**

## TERMINAL WORKFLOW
cd ~/clawd/AgentHubPortal && claude
OR use alias: mc

## AGENT ROUTING
@.claude/agents/qa-auditor.md          → audits, greps, read-only
@.claude/agents/spyglass-architect.md  → specs, plans, analysis
@.claude/agents/spyglass-code-builder.md → code, commits, pushes

## AGENT CHAINING
Use @.claude/agents/qa-auditor.md to audit first, then use
@.claude/agents/spyglass-architect.md to analyze and write fix plan,
then use @.claude/agents/spyglass-code-builder.md to implement.
STOP before each commit — wait for go signal.

## SHARED MAC MINI LOCK (post in #qa-spyglass-idx)
LOCK — [Name] | Repo: AgentHubPortal | Op: [what] | ETA: [time]
CLEAR — [Name] — AgentHubPortal unlocked
