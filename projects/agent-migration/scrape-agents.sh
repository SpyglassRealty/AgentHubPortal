#!/bin/bash
# Scrape all agent pages from old Spyglass Realty site
# Outputs JSON array to stdout

OUTPUT_DIR="/Users/ryanrodenbeck/clawd/projects/agent-migration/raw-pages"
mkdir -p "$OUTPUT_DIR"

# Collect all agent slugs
SLUGS=()
for p in $(seq 1 11); do
  while IFS= read -r line; do
    slug=$(echo "$line" | sed 's/href="\/agent\///;s/\/"$//')
    SLUGS+=("$slug")
  done < <(curl -s "https://www.spyglassrealty.com/agents.php?p=$p" | grep -o 'href="/agent/[^"]*"' | sort -u)
  sleep 0.5
done

echo "Found ${#SLUGS[@]} agents" >&2

# Download each agent page
for slug in "${SLUGS[@]}"; do
  if [ ! -f "$OUTPUT_DIR/$slug.html" ]; then
    echo "Fetching: $slug" >&2
    curl -s "https://www.spyglassrealty.com/agent/$slug/" -o "$OUTPUT_DIR/$slug.html"
    sleep 0.3
  else
    echo "Already have: $slug" >&2
  fi
done

echo "Done fetching all agent pages" >&2
