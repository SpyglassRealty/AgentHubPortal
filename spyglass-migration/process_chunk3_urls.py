#!/usr/bin/env python3
import requests
import time
import os
from urllib.parse import urlparse
from readability import Document

def extract_content(url):
    """Fetch and extract content from URL using readability"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Use readability to extract main content
        doc = Document(response.text)
        title = doc.title()
        content = doc.summary()
        
        # Convert HTML to markdown-like format (basic conversion)
        # Remove HTML tags and format as markdown
        import re
        content = re.sub(r'<h([1-6])[^>]*>', lambda m: '#' * int(m.group(1)) + ' ', content)
        content = re.sub(r'</h[1-6]>', '\n\n', content)
        content = re.sub(r'<p[^>]*>', '', content)
        content = re.sub(r'</p>', '\n\n', content)
        content = re.sub(r'<a\s+href="([^"]*)"[^>]*>', r'[', content)
        content = re.sub(r'</a>', lambda m: f']({m.string[m.start()-100:m.start()].split("href=\"")[1].split("\"")[0] if "href=\"" in m.string[m.start()-100:m.start()] else ""})', content)
        content = re.sub(r'<[^>]+>', '', content)
        content = re.sub(r'\n\n+', '\n\n', content)
        
        return title.strip(), content.strip()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None, None

def create_markdown_file(url, title, content, output_dir):
    """Create markdown file with YAML front matter"""
    # Extract slug from URL
    slug = url.rstrip('/').split('/')[-1].replace('.php', '')
    filename = f"{slug}.md"
    filepath = os.path.join(output_dir, filename)
    
    # Create content with YAML front matter
    markdown_content = f"""---
title: "{title}"
url: "{url}"
---

{content}"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    print(f"✅ Saved: {filename}")
    return filename

def main():
    # Read URLs from todo list
    todo_file = '/tmp/chunk3-todo.txt'
    output_dir = os.path.expanduser('~/clawd/spyglass-migration/content/neighborhood')
    
    if not os.path.exists(todo_file):
        print("❌ Todo file not found. Please run the initial command first.")
        return
    
    with open(todo_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    print(f"📋 Processing {len(urls)} URLs...")
    
    processed = 0
    for i, url in enumerate(urls, 1):
        print(f"\n🔄 [{i}/{len(urls)}] Processing: {url}")
        
        # Check if already exists
        slug = url.rstrip('/').split('/')[-1].replace('.php', '')
        filename = f"{slug}.md"
        filepath = os.path.join(output_dir, filename)
        
        if os.path.exists(filepath):
            print(f"⏭️  Skipping: {filename} (already exists)")
            continue
        
        # Fetch and process
        title, content = extract_content(url)
        
        if title and content:
            create_markdown_file(url, title, content, output_dir)
            processed += 1
        else:
            print(f"❌ Failed to process: {url}")
        
        # Wait 3 seconds between requests (except for the last one)
        if i < len(urls):
            print("⏳ Waiting 3 seconds...")
            time.sleep(3)
    
    print(f"\n✨ Completed! Processed {processed} URLs")

if __name__ == "__main__":
    main()