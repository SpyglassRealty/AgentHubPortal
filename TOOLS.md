# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

### SSH
- Maggie Mac Mini → 192.168.1.184, user: mangetransaction (key auth set up)
  - Hostname: manges-Mac-mini.lan / manges-Mac-mini.local
  - macOS 15.3.1, Node v25.6.1, NPM 11.9.0
  - Clawdbot 2026.1.24-3 (gateway running)
  - Has: claude-code, playwright, gemini-cli, gh, ffmpeg, tesseract, whisper, sag
  - NOTE: SSH PATH is minimal — always prefix commands with: export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"
  - Node ID: c56cf964ef3d3c5223ed7d4bad3f029b5fab8cbc986e61cc1c16f32832d63d67

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

### Slack Channels
- #qa-reports → C0AH800FPJ7 (Maggie posts QA reviews here)
- #spyglass-app-projects → C0A8GL16D0A (dev coordination)
- #spyglass-vercel-site → C0AH288E89E (Vercel deployment updates)

### Mission Control Tracking Scripts
When Trisha adds tracking scripts, verify at:
- API: https://missioncontrol-tjfm.onrender.com/api/global-scripts?position=head
- Live sites: spyglassrealty.com & spyglass-idx.vercel.app
- See: ~/clawd/memory/mission-control-tracking-scripts-process.md
