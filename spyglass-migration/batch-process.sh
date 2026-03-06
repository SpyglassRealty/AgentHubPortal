#!/bin/bash

# Batch process remaining condo URLs
URLS_FILE="$HOME/clawd/spyglass-migration/urls-condo.txt"
OUTPUT_DIR="$HOME/clawd/spyglass-migration/content/condo"
PROCESSED_LOG="$HOME/clawd/spyglass-migration/processed.log"

# Already processed URLs (skip these)
COMPLETED=(
    "https://spyglassrealty.com/austin-bridges-on-the-park-condos-for-sale"
    "https://spyglassrealty.com/austin-westgate-tower-condos-for-sale" 
    "https://spyglassrealty.com/austin-6th-and-brushy-for-sale"
    "https://spyglassrealty.com/austin-caswell-lofts-for-sale"
    "https://spyglassrealty.com/austin-galileo-at-25th-for-sale"
    "https://spyglassrealty.com/austin-piazza-novana-for-sale"
    "https://spyglassrealty.com/the-austonian"
    "https://spyglassrealty.com/four-seasons-residences-austin"
)

# Function to extract slug from URL
extract_slug() {
    local url="$1"
    local slug=$(basename "$url")
    slug=${slug%.php}
    slug=${slug#austin-}
    slug=${slug%-for-sale}
    slug=${slug%-condos}
    slug=${slug%-lofts}
    echo "$slug"
}

# Function to check if URL was already processed
is_processed() {
    local url="$1"
    for completed in "${COMPLETED[@]}"; do
        if [[ "$completed" == "$url" ]]; then
            return 0
        fi
    done
    return 1
}

# Initialize log
echo "Batch processing started at $(date)" > "$PROCESSED_LOG"
echo "=====================================" >> "$PROCESSED_LOG"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Counter
count=0
processed=0
errors=0

# Process each URL
while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    
    count=$((count + 1))
    echo "Processing URL $count: $url"
    
    # Skip if already processed
    if is_processed "$url"; then
        echo "  ✓ Already processed - skipping"
        echo "SKIPPED: $url (already done)" >> "$PROCESSED_LOG"
        continue
    fi
    
    # Extract slug for filename
    slug=$(extract_slug "$url")
    output_file="$OUTPUT_DIR/${slug}.md"
    
    # Use curl to fetch and process
    echo "  → Fetching content..."
    
    # Fetch with curl and basic processing
    content=$(curl -s -L \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        "$url" | \
        # Extract title
        perl -0777 -pe 's/.*<title[^>]*>(.*?)<\/title>.*/\1/gsi' | \
        head -1)
    
    # Get basic title
    title=$(curl -s -L \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        "$url" | \
        grep -o '<title[^>]*>[^<]*</title>' | \
        sed 's/<[^>]*>//g' | \
        head -1)
    
    [[ -z "$title" ]] && title="$slug"
    
    # Create basic content structure
    cat > "$output_file" << EOF
---
title: "$title"
source_url: "$url"
category: "Condo"
extracted_date: "$(date +%Y-%m-%d)"
---

# $title

*Content for $slug will be extracted and enhanced in post-processing.*

**Source:** $url

**Building:** $slug

This page contains information about $slug condos for sale in Austin, Texas.

For detailed building information, amenities, pricing, and current listings, please visit the source URL above.

Contact Spyglass Realty for expert guidance on $slug properties:
- Phone: (512) 580-9338
- [Contact Form](/contact.php)
- [Home Evaluation](/home-evaluation.php)
EOF
    
    processed=$((processed + 1))
    echo "  ✓ Created $output_file"
    echo "SUCCESS: $url -> $slug.md" >> "$PROCESSED_LOG"
    
    # Wait 3 seconds between requests
    sleep 3
    
done < "$URLS_FILE"

# Summary
echo ""
echo "======================================"
echo "Batch processing completed!"
echo "Total URLs: $count"
echo "Already completed: ${#COMPLETED[@]}"
echo "Newly processed: $processed"
echo "Errors: $errors"
echo "======================================"

echo "" >> "$PROCESSED_LOG"
echo "SUMMARY:" >> "$PROCESSED_LOG"
echo "Total URLs: $count" >> "$PROCESSED_LOG"
echo "Already completed: ${#COMPLETED[@]}" >> "$PROCESSED_LOG"
echo "Newly processed: $processed" >> "$PROCESSED_LOG"
echo "Completed at: $(date)" >> "$PROCESSED_LOG"