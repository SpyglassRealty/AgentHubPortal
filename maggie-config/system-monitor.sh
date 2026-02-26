#!/bin/bash

# Maggie System Status Monitor
# Ultimate Transaction Coordinator Health Check

echo "🔍 MAGGIE SYSTEM STATUS CHECK"
echo "=============================="
date

# Core Clawdbot Status
echo "🤖 Clawdbot Core Status:"
if pgrep -f "clawdbot" > /dev/null; then
    echo "   ✅ Clawdbot process running"
else
    echo "   ❌ Clawdbot not running"
fi

# Gateway Status
echo "🌐 Gateway Status:"
if curl -f http://localhost:3333/health > /dev/null 2>&1; then
    echo "   ✅ Gateway responding"
else
    echo "   ❌ Gateway not responding"
fi

# Contract Conduit Status  
echo "📋 Contract Conduit Status:"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ Contract Conduit API responding"
else
    echo "   ❌ Contract Conduit not responding"
fi

# BlueBubbles Status
echo "📱 BlueBubbles Status:"
if pgrep -f "BlueBubbles" > /dev/null; then
    echo "   ✅ BlueBubbles Server running"
else
    echo "   ❌ BlueBubbles Server not running"
fi

# Slack Integration Status
echo "💬 Slack Integration:"
SLACK_STATUS=$(clawdbot config get channels.slack.enabled 2>/dev/null)
if [ "$SLACK_STATUS" = "true" ]; then
    echo "   ✅ Slack integration enabled"
else
    echo "   ⚠️  Slack integration not enabled"
fi

# Email Integration Status
echo "📧 Email Integration:"
GMAIL_STATUS=$(clawdbot config get integrations.gmail.enabled 2>/dev/null)
if [ "$GMAIL_STATUS" = "true" ]; then
    echo "   ✅ Gmail integration enabled"
else
    echo "   ⚠️  Gmail integration not enabled"
fi

# Skills Status
echo "🏠 Transaction Coordinator Skills:"
CONTRACT_REVIEW=$(clawdbot config get skills.contract_review 2>/dev/null)
DEADLINE_TRACKING=$(clawdbot config get skills.deadline_tracking 2>/dev/null)
CLIENT_COMM=$(clawdbot config get skills.automated_updates 2>/dev/null)

if [ "$CONTRACT_REVIEW" = "true" ]; then
    echo "   ✅ Contract Review active"
else
    echo "   ❌ Contract Review not active"
fi

if [ "$DEADLINE_TRACKING" = "true" ]; then
    echo "   ✅ Deadline Tracking active"
else
    echo "   ❌ Deadline Tracking not active"  
fi

if [ "$CLIENT_COMM" = "true" ]; then
    echo "   ✅ Client Communication active"
else
    echo "   ❌ Client Communication not active"
fi

# System Resources
echo "💻 System Resources:"
echo "   Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "   Disk: $(df -h / | awk 'NR==2{print $5}')"
echo "   Load: $(uptime | awk -F'load average:' '{ print $2 }')"

# Network Connectivity
echo "🌐 Network Status:"
if ping -c 1 google.com > /dev/null 2>&1; then
    echo "   ✅ Internet connectivity"
else
    echo "   ❌ No internet connectivity"
fi

# Recent Transactions (if Contract Conduit is running)
echo "📋 Recent Activity:"
if curl -f http://localhost:3000/api/contracts/count > /dev/null 2>&1; then
    CONTRACT_COUNT=$(curl -s http://localhost:3000/api/contracts/count)
    echo "   📄 Active contracts: $CONTRACT_COUNT"
else
    echo "   ⚠️  Unable to fetch contract data"
fi

echo "=============================="
echo "✅ Status check complete - $(date)"

# Performance Metrics
echo "📊 Performance Metrics:"
echo "   🎯 Uptime: $(uptime -p)"
echo "   💰 Savings target: \$158,000/year"
echo "   🤖 Replacing: 4 Virtual Assistants"
echo "   ⏱️  Response time: <30 seconds (vs 2-4 hours with VAs)"