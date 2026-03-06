#!/bin/bash

# Remaining URLs to process (14-30)
urls=(
"https://spyglassrealty.com/clarksville-homes-for-sale"
"https://spyglassrealty.com/cherrywood-homes-for-sale"
"https://spyglassrealty.com/circle-c-ranch-homes-for-sale"
"https://spyglassrealty.com/south-congress-homes-and-condos-for-sale"
"https://spyglassrealty.com/brentwood-homes-for-sale"
"https://spyglassrealty.com/rosedale-homes-for-sale"
"https://spyglassrealty.com/old-west-austin-homes-for-sale"
"https://spyglassrealty.com/headwaters-ashton-woods"
"https://spyglassrealty.com/vine-creek-pflugerville"
"https://spyglassrealty.com/whisper-san-marcos"
"https://spyglassrealty.com/parker-station-austin"
"https://spyglassrealty.com/cedar-park-cypress-bend-homes-for-sale"
"https://spyglassrealty.com/cedar-park-cypress-canyon-homes-for-sale"
"https://spyglassrealty.com/cedar-park-cypress-creek-homes-for-sale"
"https://spyglassrealty.com/cedar-park-cypress-mill-homes-for-sale"
"https://spyglassrealty.com/cedar-park-hunters-glenn-homes-for-sale"
"https://spyglassrealty.com/cedar-park-lakeline-oaks-homes-for-sale"
)

# Function to create slug from URL
create_slug() {
    local url=$1
    # Extract the part after the last slash and remove file extension
    slug=$(basename "$url" | sed 's/-homes-for-sale$//' | sed 's/-homes-and-condos-for-sale$//')
    echo "$slug"
}

# Function to process a single URL
process_url() {
    local url=$1
    local slug=$(create_slug "$url")
    
    echo "Processing: $url -> $slug"
    
    # Use clawdbot to fetch content and create file
    clawdbot web_fetch "$url" --extract-mode markdown > "/tmp/content_$slug.txt" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Extract title and content from the fetched data
        title=$(grep -o '"title":"[^"]*"' "/tmp/content_$slug.txt" | sed 's/"title":"//' | sed 's/"$//')
        content=$(grep -A 9999 '"text":' "/tmp/content_$slug.txt" | sed '1s/.*"text":"//' | sed '$s/".*$//' | sed 's/\\n/\n/g')
        
        # Create the markdown file
        cat > "~/clawd/spyglass-migration/content/neighborhood/${slug}.md" << EOF
---
title: "$title"
source_url: "$url"
category: "Neighborhood"
extracted_date: "2026-02-25"
---

$content
EOF
        echo "Saved: ${slug}.md"
    else
        echo "Failed to process: $url"
    fi
    
    # Clean up temp file
    rm -f "/tmp/content_$slug.txt"
    
    # 3-second delay as required
    sleep 3
}

# Process all remaining URLs
for url in "${urls[@]}"; do
    process_url "$url"
done

echo "Completed processing all remaining URLs!"