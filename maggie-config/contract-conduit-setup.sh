#!/bin/bash

# Contract Conduit Integration Setup for Maggie
# Ultimate Transaction Coordinator System

echo "📋 Setting up Contract Conduit Integration..."

# Create Contract Conduit workspace
mkdir -p /Users/randi-assistant/clawd-workspace/contract-conduit
cd /Users/randi-assistant/clawd-workspace

# Clone Contract Conduit (adjust URL as needed)
echo "📥 Downloading Contract Conduit system..."
# git clone [contract-conduit-repo] contract-conduit
# For now, copy from existing installation
cp -r /Users/ryanrodenbeck/clawd/projects/contract-conduit ./

# Install dependencies
cd contract-conduit
npm install

# Configure Contract Conduit for Maggie
echo "⚙️ Configuring Contract Conduit for Transaction Coordinator..."

# Database setup for Maggie
clawdbot config set contract_conduit.db.host "localhost"
clawdbot config set contract_conduit.db.name "maggie_contracts"
clawdbot config set contract_conduit.db.user "maggie_tc"

# API Configuration
clawdbot config set contract_conduit.api.endpoint "http://localhost:3000"
clawdbot config set contract_conduit.api.auth_token "maggie-tc-token-2026"

# Contract Processing Capabilities
clawdbot config set contract_conduit.capabilities.review true
clawdbot config set contract_conduit.capabilities.deadline_tracking true
clawdbot config set contract_conduit.capabilities.status_updates true
clawdbot config set contract_conduit.capabilities.client_notifications true
clawdbot config set contract_conduit.capabilities.agent_alerts true

# Integration with existing systems
clawdbot config set contract_conduit.integrations.spyglass_crm true
clawdbot config set contract_conduit.integrations.docusign true
clawdbot config set contract_conduit.integrations.title_companies true
clawdbot config set contract_conduit.integrations.mls_sync true

# Automation Rules
clawdbot config set contract_conduit.automation.new_contract_processing true
clawdbot config set contract_conduit.automation.deadline_monitoring true
clawdbot config set contract_conduit.automation.status_broadcasting true
clawdbot config set contract_conduit.automation.completion_tracking true

echo "✅ Contract Conduit Integration Complete!"

# Start the Contract Conduit service
echo "🚀 Starting Contract Conduit service..."
npm run start &
CONDUIT_PID=$!
echo "📋 Contract Conduit running on PID: $CONDUIT_PID"

# Verify integration
echo "🔍 Verifying Contract Conduit integration..."
sleep 3
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Contract Conduit API responding"
else
    echo "❌ Contract Conduit API not responding - check configuration"
fi

echo "📋 Contract Conduit Setup Complete!"
echo "🏠 Maggie is now ready to manage transactions like a pro!"