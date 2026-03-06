# Randi's Clawdbot Setup Guide

**Date:** February 15, 2026  
**Target:** Mac Mini for Randi White (Head Transaction Coordinator, Spyglass Realty)  
**Tech Level:** Non-technical user (must be dead simple)

## Pre-Saturday Checklist ✅

### 1. Mac Mini Decisions (Pre-arrival)
- [ ] **Hostname:** `randi-spyglass-mini` (professional, identifiable)
- [ ] **Apple ID:** Decide if Randi uses her personal Apple ID or if you create a work-specific one
- [ ] **Admin Account:** Create `randi` as admin user, simple password she'll remember
- [ ] **macOS Version:** Ensure latest stable macOS (avoid betas)

### 2. Accounts to Create/Prep
- [ ] **Anthropic API Key:** Create separate account for Randi or use your key initially
- [ ] **iMessage/Phone:** Ensure Randi's phone number works with iMessage for messaging
- [ ] **Email:** Confirm if Randi has `randi@spyglassrealty.com` or similar
- [ ] **Calendar:** Google Calendar access if she uses one

### 3. Software Requirements
- [ ] Homebrew (package manager)
- [ ] Node.js 18+ (via nvm for version management)
- [ ] Clawdbot (`npm install -g clawdbot`)
- [ ] Xcode Command Line Tools (for compilation)

### 4. Messaging Channel Recommendation
**Best Option for Non-Tech User:** **iMessage via BlueBubbles**
- Familiar interface (she already uses iMessage)
- No new apps to learn
- Works on her existing phone
- Most reliable for real-estate workers

*Alternative:* WhatsApp (if iMessage setup fails)

---

## Saturday Setup Steps 🚀

### Phase 1: Physical & Basic Setup (30 mins)

#### 1. Mac Mini Physical Setup
```bash
# Connect peripherals
1. Power cable → wall outlet
2. HDMI → monitor
3. USB-C → keyboard/mouse hub
4. Ethernet cable (optional but recommended for stability)
5. Power on
```

#### 2. macOS First-Run Config
- Select region/language
- Connect to WiFi (SpyglassRealty or her network)
- Create user account: `randi` (admin privileges)
- Skip Apple ID initially (can add later)
- Disable Siri for now (reduce complexity)
- Enable FileVault encryption (security)

### Phase 2: Developer Environment (20 mins)

#### 3. Install Homebrew + Node.js
```bash
# Open Terminal (/Applications/Utilities/Terminal)

# Install Xcode Command Line Tools (may take 10-15 mins)
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH (follow the terminal instructions after install)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile

# Verify Homebrew
brew --version
```

#### 4. Install Node.js & Clawdbot
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source the profile
source ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verify installation
node --version  # Should show v18.x.x or newer
npm --version

# Install Clawdbot globally
npm install -g clawdbot

# Verify Clawdbot
clawdbot --version
```

### Phase 3: Clawdbot Configuration (45 mins)

#### 5. Initialize Clawdbot Workspace
```bash
# Create workspace
mkdir -p ~/clawd
cd ~/clawd

# Initialize
clawdbot init

# This creates basic structure:
# ~/clawd/
#   ├── AGENTS.md
#   ├── SOUL.md
#   ├── USER.md
#   └── memory/
```

#### 6. Configure Gateway & API Keys
```bash
# Start gateway setup
clawdbot gateway start

# Configure API key
clawdbot config set anthropic.api_key "YOUR_ANTHROPIC_API_KEY_HERE"

# Set default model (cheaper option)
clawdbot config set model "anthropic/claude-sonnet-4"

# Test API connection
clawdbot test
```

#### 7. Set Up Messaging Channel

**Option A: iMessage via BlueBubbles (Recommended)**
```bash
# Install BlueBubbles server (follow their macOS setup guide)
# https://bluebubbles.app/downloads

# Configure BlueBubbles:
1. Enable iMessage on Mac
2. Install BlueBubbles server
3. Set up port forwarding or ngrok
4. Note the server URL and password

# Configure Clawdbot channel
clawdbot channel add bluebubbles --url "YOUR_BLUEBUBBLES_URL" --password "PASSWORD"
```

**Option B: WhatsApp (Fallback)**
```bash
# Install WhatsApp Desktop
brew install --cask whatsapp

# Use whatsapp-web.js integration (more complex setup)
# Follow Clawdbot WhatsApp channel documentation
```

### Phase 4: Customization for Transaction Coordinator (30 mins)

#### 8. Create Custom SOUL.md
*Copy the template from `~/clawd/projects/randi-setup/templates/SOUL.md`*

#### 9. Update USER.md
*Copy the template from `~/clawd/projects/randi-setup/templates/USER.md`*

#### 10. Configure HEARTBEAT.md
*Copy the template from `~/clawd/projects/randi-setup/templates/HEARTBEAT.md`*

### Phase 5: Email & Calendar Integration (30 mins)

#### 11. Set Up Email Access (if applicable)
```bash
# If Randi has randi@spyglassrealty.com:
# Create app password in Google Workspace
# Store credentials securely

mkdir -p ~/clawd/.credentials
# Create gmail.json with credentials (use template)
```

#### 12. Calendar Integration
```bash
# If Randi uses Google Calendar:
# Set up service account or OAuth
# Store calendar access credentials
```

### Phase 6: Automation & Testing (45 mins)

#### 13. Set Up Morning Brief Cron Job
```bash
# Create morning brief script
crontab -e

# Add line (9 AM weekdays):
0 9 * * 1-5 /usr/local/bin/clawdbot cron morning-brief --channel bluebubbles --target "Randi's Phone"
```

#### 14. Test Everything End-to-End
```bash
# Test basic chat
clawdbot chat "Hello, this is a test message"

# Test heartbeat
clawdbot heartbeat

# Test morning brief
clawdbot cron morning-brief --dry-run

# Test email check (if configured)
clawdbot email list --limit 5

# Test calendar (if configured)  
clawdbot calendar events --days 7
```

---

## Randi-Specific Customizations 🏠

### SOUL.md Focus Areas
- **Primary Role:** Transaction coordination assistant
- **Tone:** Professional but friendly, real estate industry aware
- **Expertise:** Contract deadlines, closing coordination, agent communication
- **Personality:** Detail-oriented, proactive, helpful without being pushy

### Morning Brief Content
- [ ] Upcoming closings (next 7 days)
- [ ] Contract deadlines (contingencies, financing, inspection)
- [ ] Pending document requests
- [ ] Agent follow-ups needed
- [ ] Weather (if affects showings/inspections)

### Heartbeat Checks (Every 2 Hours, 9 AM - 6 PM)
- [ ] Email for urgent contract items
- [ ] Calendar for today's closings
- [ ] Follow-up reminders
- [ ] Document deadlines approaching

### TC-Specific Use Cases
Document these examples in QUICK_REFERENCE.md:

**Email Drafting:**
- "Help me draft an email to Sarah about missing earnest money receipt for 123 Main St"
- "Write a reminder to the buyer's agent about inspection deadlines"

**Schedule Management:**
- "What closings do I have this week?"
- "When is the financing contingency deadline for the Johnson file?"

**Task Management:**
- "Remind me to follow up on the Smith file tomorrow at 2 PM"
- "Check if the appraisal came in for 456 Oak Avenue"

**Communication Templates:**
- "Create a closing timeline email for first-time buyers"
- "Draft a status update for the listing agent on pending sale"

---

## Cost Considerations 💰

### API Usage Estimates
**Anthropic Claude Sonnet:**
- Cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Estimated TC usage: 50-100 conversations/day during busy season
- Average conversation: 1,000 input + 500 output tokens
- **Monthly estimate: $30-60** (busy season), $15-30 (normal season)

### Billing Recommendation
- Set up separate Anthropic account for Randi
- Monthly budget alert at $75
- Ryan can monitor usage initially
- Consider upgrading to Claude Opus only for complex contract review

---

## Troubleshooting 🔧

### Common Issues
1. **Gateway won't start:** Check port 8080 is free, restart with `clawdbot gateway restart`
2. **iMessage not working:** Verify BlueBubbles server is running and accessible
3. **API key errors:** Check key is valid and has sufficient credits
4. **Node.js issues:** Ensure latest LTS version, reinstall if needed

### Health Checks
```bash
# Run these commands if something seems wrong:
clawdbot status
clawdbot gateway status
clawdbot test
node --version
npm list -g clawdbot
```

### Emergency Contacts
- **Primary:** Ryan (your phone number)
- **Clawdbot Issues:** GitHub Issues or Discord
- **API Issues:** Anthropic support

---

## Success Criteria ✅

Before leaving on Saturday, ensure:
- [ ] Randi can send/receive messages via her preferred channel
- [ ] Morning brief sends successfully to her phone
- [ ] She can ask basic questions and get helpful responses
- [ ] Heartbeat is working and checking email/calendar
- [ ] Quick reference card is printed and explained
- [ ] Emergency contact info is saved in her phone
- [ ] First week of API usage is pre-funded

**Remember: If Randi has to Google how to use something, we failed. Keep it simple!**