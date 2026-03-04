#!/bin/bash

echo "🕐 Waiting for deployment to complete..."
echo "Checking endpoint availability..."

# Function to check if endpoint exists
check_endpoint() {
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://missioncontrol-tjfm.onrender.com/api/admin/populate-agents-from-photos \
        -H "Content-Type: application/json" \
        -H "X-Populate-Key: populate-agents-2024" \
        -d '{"clearExisting": false}' \
        --max-time 5)
    
    if [ "$response" = "401" ]; then
        echo "✅ Endpoint is ready (got 401 unauthorized - correct behavior)"
        return 0
    elif [ "$response" = "404" ]; then
        echo "⏳ Endpoint not deployed yet (404)..."
        return 1
    else
        echo "⏳ Server response: $response"
        return 1
    fi
}

# Wait for endpoint to be available
max_attempts=40
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if check_endpoint; then
        echo ""
        echo "🚀 Deployment complete! Populating agents..."
        
        # Now run the actual populate command
        response=$(curl -s -X POST https://missioncontrol-tjfm.onrender.com/api/admin/populate-agents-from-photos \
            -H "Content-Type: application/json" \
            -H "X-Populate-Key: populate-agents-2024" \
            -d '{"clearExisting": true}')
        
        echo "Response:"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        
        exit 0
    fi
    
    attempt=$((attempt + 1))
    echo "Attempt $attempt of $max_attempts..."
    sleep 30
done

echo "❌ Timeout: Deployment did not complete within 20 minutes"
exit 1