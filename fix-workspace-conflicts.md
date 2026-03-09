# Workspace Conflicts Fix Plan

## Issues Identified:

1. **Multiple Workspaces**: 
   - Main: ~/clawd (current, active)
   - Cody: ~/clawd-cody (outdated)
   - Letty: ~/clawd-letty (outdated)

2. **Cody's Confusion**: He's running from ~/clawd-cody with empty/outdated config files

3. **Date Issue**: Files show 2026 dates (but it IS 2026 - March 7, 2026)

4. **Project Path Duplicates**:
   - Mission Control at multiple locations
   - Need to standardize on one path

## Fix Actions:

### 1. Consolidate Workspaces
- Keep ~/clawd as the ONLY workspace
- Archive/remove ~/clawd-cody and ~/clawd-letty
- Update agent configs to all use ~/clawd

### 2. Fix Agent Configuration
- Update clawdbot config to ensure ALL agents use ~/clawd
- Remove workspace confusion

### 3. Standardize Project Paths
- Mission Control: ~/clawd/projects/AgentHubPortal (canonical)
- Remove duplicate references

### 4. Update Agent Roles
- Clawd: Main agent (me)
- Cody: Coding sub-agent (not separate workspace)
- Letty: Research sub-agent (not separate workspace)
- All share ~/clawd workspace

### 5. Fix MEMORY.md References
- Update any incorrect paths
- Remove duplicate project references
- Clarify agent roles