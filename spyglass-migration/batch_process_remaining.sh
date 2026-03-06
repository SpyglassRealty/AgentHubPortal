#!/bin/bash

# Spyglass Realty Neighborhood Batch B Processing Script
# Processes remaining URLs with 3-second delays

# Define the URLs that are already completed
declare -a completed_urls=(
    "wildleaf-leander"
    "larkspur-leander"
    "lakeway-majestic-hills-ranchettes-homes-for-sale"
    "lakeway-maravilla-homes-for-sale"
    "lakeway-palomba-at-flintrock-homes-for-sale"
    "lakeway-ridge-at-alta-vista-homes-for-sale"
    "lakeway-st-andrews-homes-for-sale"
    "lakeway-terrace-at-the-preserve-homes-for-sale"
)

# Read all URLs and filter out completed ones
mapfile -t all_urls < ~/clawd/spyglass-migration/urls-hood-batch-ab

# Process each remaining URL
echo "Starting batch processing of remaining neighborhood URLs..."
count=0
total_remaining=0

# First, count how many we need to process
for url in "${all_urls[@]}"; do
    slug=$(basename "$url")
    is_completed=false
    
    for completed in "${completed_urls[@]}"; do
        if [[ "$slug" == "$completed" ]]; then
            is_completed=true
            break
        fi
    done
    
    if [[ "$is_completed" == "false" ]]; then
        ((total_remaining++))
    fi
done

echo "Found $total_remaining URLs to process"

# Now process the remaining URLs
for url in "${all_urls[@]}"; do
    slug=$(basename "$url")
    is_completed=false
    
    # Check if this URL is already completed
    for completed in "${completed_urls[@]}"; do
        if [[ "$slug" == "$completed" ]]; then
            is_completed=true
            break
        fi
    done
    
    if [[ "$is_completed" == "false" ]]; then
        ((count++))
        echo "Processing $count/$total_remaining: $url"
        
        # Create a temporary script to call web_fetch via clawdbot
        cat > /tmp/fetch_url.py << EOF
import json
import sys
from datetime import datetime

# This would be called via the clawdbot web_fetch function
# For now, we'll create a placeholder that shows the process
url = "$url"
slug = "$slug"

print(f"Would fetch: {url}")
print(f"Would save to: ~/clawd/spyglass-migration/content/neighborhood/{slug}.md")

# In a real implementation, this would call web_fetch and process the content
# For now, we'll mark this as a TODO
EOF

        # Note: This is a placeholder - the actual implementation would need
        # to call the web_fetch function through the proper clawdbot API
        echo "TODO: Implement web_fetch call for $url"
        
        # 3-second delay between requests (except for the last one)
        if [[ $count -lt $total_remaining ]]; then
            echo "Waiting 3 seconds..."
            sleep 3
        fi
    fi
done

echo "Batch processing complete!"
echo "Note: This script creates a framework. Each URL still needs to be processed"
echo "through the web_fetch function with proper YAML front matter."