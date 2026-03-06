#!/usr/bin/env python3

import requests
import time
import os
from datetime import datetime
from bs4 import BeautifulSoup
import re

# Read the URLs from the file
with open('/Users/ryanrodenbeck/clawd/spyglass-migration/urls-condo.txt', 'r') as f:
    urls = [line.strip() for line in f.readlines() if line.strip()]

# Track processed URLs
processed = []
errors = []

# Already processed URLs (first 4)
already_done = [
    'https://spyglassrealty.com/austin-bridges-on-the-park-condos-for-sale',
    'https://spyglassrealty.com/austin-westgate-tower-condos-for-sale',
    'https://spyglassrealty.com/austin-6th-and-brushy-for-sale',
    'https://spyglassrealty.com/austin-caswell-lofts-for-sale'
]

def extract_slug(url):
    """Extract slug from URL for filename"""
    slug = url.split('/')[-1]
    if slug.endswith('.php'):
        slug = slug[:-4]
    return slug.replace('austin-', '').replace('-for-sale', '').replace('-condos', '').replace('-lofts', '')

def clean_content(text):
    """Clean extracted content removing navigation and disclaimers"""
    lines = text.split('\n')
    cleaned_lines = []
    in_nav_section = False
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
            
        # Skip navigation links (they start with '- [' and have common patterns)
        if line.startswith('- [') and any(x in line.lower() for x in ['lofts', 'condos', 'tower', 'residences']):
            continue
            
        # Skip MLS disclaimers
        if 'mls' in line.lower() and any(x in line.lower() for x in ['disclaimer', 'accuracy', 'guaranteed']):
            break
            
        # Skip "Back to Austin Real Estate" and similar
        if 'back to' in line.lower() or 'search [' in line:
            continue
            
        cleaned_lines.append(line)
    
    return '\n\n'.join(cleaned_lines)

def process_url(url):
    """Process a single URL"""
    try:
        print(f"Processing: {url}")
        
        # Make request with headers to mimic browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title_tag = soup.find('title')
        title = title_tag.text.strip() if title_tag else "No Title"
        
        # Extract main content (look for common content containers)
        content_selectors = [
            '.main-content',
            '#main',
            '.content',
            'main',
            '.post-content',
            '.entry-content'
        ]
        
        content_div = None
        for selector in content_selectors:
            content_div = soup.select_one(selector)
            if content_div:
                break
        
        if not content_div:
            # Fallback: get body content and remove nav/footer
            content_div = soup.find('body')
            
        # Remove unwanted elements
        if content_div:
            for unwanted in content_div.find_all(['nav', 'header', 'footer', 'aside', '.nav', '.navigation', '.footer', '.header']):
                unwanted.decompose()
        
        # Extract text content
        if content_div:
            # Get text and convert to markdown-like format
            text_content = []
            
            for element in content_div.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'div']):
                tag_name = element.name
                text = element.get_text(strip=True)
                
                if text and len(text) > 10:  # Only include substantial text
                    if tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        level = int(tag_name[1])
                        prefix = '#' * level
                        text_content.append(f"{prefix} {text}")
                    else:
                        text_content.append(text)
            
            content = '\n\n'.join(text_content)
        else:
            content = "No content found"
        
        # Clean content
        content = clean_content(content)
        
        # Check if content is substantial (not just MLS disclaimer)
        if len(content) < 1000:
            print(f"  Warning: Short content ({len(content)} chars), might need browser extraction")
            
        # Generate slug for filename
        slug = extract_slug(url)
        
        # Create markdown with front matter
        markdown_content = f"""---
title: "{title}"
source_url: "{url}"
category: "Condo"
extracted_date: "{datetime.now().strftime('%Y-%m-%d')}"
---

{content}
"""
        
        # Save to file
        filename = f"/Users/ryanrodenbeck/clawd/spyglass-migration/content/condo/{slug}.md"
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"  ✓ Saved as {slug}.md ({len(content)} chars)")
        return {'url': url, 'status': 'success', 'filename': f"{slug}.md", 'content_length': len(content)}
        
    except Exception as e:
        print(f"  ✗ Error: {str(e)}")
        return {'url': url, 'status': 'error', 'error': str(e)}

# Process remaining URLs
remaining_urls = [url for url in urls if url not in already_done]

print(f"Processing {len(remaining_urls)} remaining URLs...")
print(f"Already completed: {len(already_done)}")

for i, url in enumerate(remaining_urls):
    result = process_url(url)
    
    if result['status'] == 'success':
        processed.append(result)
    else:
        errors.append(result)
    
    # Wait 3 seconds between requests
    if i < len(remaining_urls) - 1:
        print("  Waiting 3 seconds...")
        time.sleep(3)

print(f"\n=== PROCESSING COMPLETE ===")
print(f"Total URLs: {len(urls)}")
print(f"Already done: {len(already_done)}")
print(f"Successfully processed: {len(processed)}")
print(f"Errors: {len(errors)}")

if errors:
    print(f"\nErrors encountered:")
    for error in errors:
        print(f"  - {error['url']}: {error['error']}")