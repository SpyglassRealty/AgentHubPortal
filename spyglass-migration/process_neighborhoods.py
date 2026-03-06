#!/usr/bin/env python3
"""
Process neighborhood URLs for Spyglass Realty migration.
Batch B processing script with 3-second delays.
"""

import time
import re
import requests
from datetime import datetime
from readability import Document
import sys

def extract_slug(url):
    """Extract slug from URL for filename"""
    return url.split('/')[-1]

def fetch_content(url):
    """Fetch and extract content using web scraping"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    doc = Document(response.content)
    title = doc.title()
    content = doc.summary()
    
    return title, content

def html_to_markdown_basic(html_content):
    """Basic HTML to markdown conversion"""
    # Remove extra whitespace
    content = re.sub(r'\s+', ' ', html_content.strip())
    # Convert basic HTML elements
    content = re.sub(r'<h([1-6]).*?>(.*?)</h[1-6]>', r'#\1 \2', content)
    content = re.sub(r'<p.*?>(.*?)</p>', r'\1\n\n', content)
    content = re.sub(r'<br.*?/?>', '\n', content)
    content = re.sub(r'<a.*?href=["\']([^"\']*)["\'].*?>(.*?)</a>', r'[\2](\1)', content)
    # Clean up remaining HTML tags
    content = re.sub(r'<[^>]+>', '', content)
    return content.strip()

def create_content_file(url, title, content, slug):
    """Create markdown file with YAML front matter"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    yaml_front = f"""---
title: "{title}"
source_url: "{url}"
category: "Neighborhood"
extracted_date: "{today}"
---

"""
    
    # Convert content to basic markdown
    markdown_content = html_to_markdown_basic(content)
    
    full_content = yaml_front + markdown_content
    
    filename = f"~/clawd/spyglass-migration/content/neighborhood/{slug}.md"
    
    with open(filename.replace('~', '/Users/ryanrodenbeck'), 'w', encoding='utf-8') as f:
        f.write(full_content)
    
    return filename

def process_remaining_urls():
    """Process all remaining URLs from the batch"""
    
    # Read the URLs
    with open('/Users/ryanrodenbeck/clawd/spyglass-migration/urls-hood-batch-ab', 'r') as f:
        all_urls = [line.strip() for line in f if line.strip()]
    
    # Skip the first 6 already processed
    processed_slugs = [
        'wildleaf-leander',
        'larkspur-leander', 
        'lakeway-majestic-hills-ranchettes-homes-for-sale',
        'lakeway-maravilla-homes-for-sale',
        'lakeway-palomba-at-flintrock-homes-for-sale',
        'lakeway-ridge-at-alta-vista-homes-for-sale'
    ]
    
    remaining_urls = []
    for url in all_urls:
        slug = extract_slug(url)
        if slug not in processed_slugs:
            remaining_urls.append(url)
    
    print(f"Processing {len(remaining_urls)} remaining URLs...")
    
    for i, url in enumerate(remaining_urls, 1):
        try:
            print(f"Processing {i}/{len(remaining_urls)}: {url}")
            
            # Fetch content
            title, content = fetch_content(url)
            slug = extract_slug(url)
            
            # Create file
            filename = create_content_file(url, title, content, slug)
            print(f"Created: {filename}")
            
            # 3-second delay between requests
            if i < len(remaining_urls):
                print("Waiting 3 seconds...")
                time.sleep(3)
                
        except Exception as e:
            print(f"Error processing {url}: {e}")
            continue
    
    print("Processing complete!")

if __name__ == "__main__":
    process_remaining_urls()