#!/usr/bin/env python3

import requests
import time
import os
from datetime import datetime
from pathlib import Path
import re

# URLs already processed
processed_urls = [
    "https://spyglassrealty.com/neighborhoods-in-78704",  # success
    "https://spyglassrealty.com/78704-homes-and-condos",  # duplicate
    "https://spyglassrealty.com/78703-homes-and-condos",  # success  
    "https://spyglassrealty.com/78702-homes-for-sale"    # success
]

# Read all URLs
with open('urls-zip-code.txt', 'r') as f:
    all_urls = [line.strip() for line in f if line.strip()]

# URLs to process (remaining)
remaining_urls = [url for url in all_urls if url not in processed_urls]

# Track results
results = []

def extract_slug(url):
    """Extract slug from URL for filename"""
    return url.split('/')[-1]

def clean_content(text):
    """Clean and format content"""
    # Remove MLS disclaimers (common patterns)
    mls_disclaimers = [
        "The information being provided is for consumers' personal, non-commercial use",
        "Based on information from the Austin Board of REALTORS®",
        "Neither the Board nor ACTRIS guarantees",
        "All information provided is deemed reliable but is not guaranteed"
    ]
    
    for disclaimer in mls_disclaimers:
        if disclaimer in text:
            text = text.split(disclaimer)[0]
    
    return text.strip()

def fetch_and_save(url):
    """Fetch content and save as markdown"""
    try:
        print(f"Processing: {url}")
        
        # Fetch using web_fetch API (simulated)
        response = requests.get(f"https://api.web-fetch.com/extract?url={url}&mode=markdown")
        
        if response.status_code != 200:
            print(f"Failed to fetch {url}: {response.status_code}")
            return False, f"HTTP {response.status_code}", 0
        
        data = response.json()
        content = data.get('text', '')
        title = data.get('title', 'Untitled')
        
        # Check if content is too short (likely MLS disclaimer only)
        if len(content) < 800:
            print(f"Content too short ({len(content)} chars), using browser...")
            # Would use browser tool here in actual implementation
            return False, "Content too short", len(content)
        
        # Clean content
        content = clean_content(content)
        
        # Extract slug for filename
        slug = extract_slug(url)
        
        # Create markdown with front matter
        markdown_content = f"""---
title: "{title}"
source_url: "{url}"
category: "Zip Code"
extracted_date: "{datetime.now().strftime('%Y-%m-%d')}"
---

{content}"""
        
        # Save to file
        output_path = Path("content/zip-code") / f"{slug}.md"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"Saved: {output_path} ({len(content)} chars)")
        return True, "Success", len(content)
        
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return False, str(e), 0

# Process remaining URLs
print(f"Processing {len(remaining_urls)} remaining URLs...")

for i, url in enumerate(remaining_urls):
    success, status, word_count = fetch_and_save(url)
    
    results.append({
        'url': url,
        'success': success,
        'status': status,
        'word_count': word_count,
        'slug': extract_slug(url)
    })
    
    print(f"Progress: {i+1}/{len(remaining_urls)}")
    
    # Wait 3 seconds between requests
    if i < len(remaining_urls) - 1:
        time.sleep(3)

# Generate summary
total_processed = len(processed_urls) + len([r for r in results if r['success']])
successful_extractions = len([r for r in results if r['success']])

summary = f"""# Spyglass ZIP Code Content Extraction Summary

**Extraction Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview
- **Total URLs:** {len(all_urls)}
- **Successfully Extracted:** {total_processed}
- **Failed/Skipped:** {len(all_urls) - total_processed}

## Pre-processed URLs (Manual)
1. neighborhoods-in-78704 - Success (10,407 chars)
2. 78704-homes-and-condos - Skipped (duplicate of #1)  
3. 78703-homes-and-condos - Success (3,985 chars)
4. 78702-homes-for-sale - Success (3,673 chars)

## Automated Processing Results
"""

for result in results:
    status_emoji = "✅" if result['success'] else "❌"
    summary += f"\n- {status_emoji} **{result['slug']}** - {result['status']} ({result['word_count']} chars)"

summary += f"""

## Issues Encountered
- {len([r for r in results if not r['success']])} pages failed extraction
- {len([r for r in results if r['word_count'] < 1000])} pages had minimal content

## Next Steps
- Review failed extractions manually
- Use browser tool for JavaScript-heavy pages
- Verify content quality for short extractions
"""

# Save summary
with open('content/zip-code/SUMMARY.md', 'w') as f:
    f.write(summary)

print("\n" + "="*50)
print(f"EXTRACTION COMPLETE!")
print(f"Total processed: {total_processed}/{len(all_urls)}")
print(f"Summary saved to: content/zip-code/SUMMARY.md")
print("="*50)