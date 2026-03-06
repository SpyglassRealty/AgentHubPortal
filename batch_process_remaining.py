#!/usr/bin/env python3
"""
Batch processing script for remaining Spyglass Realty URLs
This script generates the commands needed to process the remaining 35 URLs
"""

import time
from urllib.parse import urlparse

# Remaining URLs (35 total)
remaining_urls = [
    "https://spyglassrealty.com/austin-shadowridge-crossing-homes-for-sale",
    "https://spyglassrealty.com/austin-shady-hollow-homes-for-sale", 
    "https://spyglassrealty.com/austin-smithfield-condos-for-sale",
    "https://spyglassrealty.com/austin-southwest-hills-homes-for-sale",
    "https://spyglassrealty.com/downtown-austin-sgr",
    "https://spyglassrealty.com/whisper-valley-austin",
    "https://spyglassrealty.com/lakeside-tessera-on-lake-travis",
    "https://spyglassrealty.com/galindo-homes-for-sale",
    "https://spyglassrealty.com/dawson-homes-for-sale",
    "https://spyglassrealty.com/south-lamar-homes-for-sale",
    "https://spyglassrealty.com/sweetwater-homes",
    "https://spyglassrealty.com/arrowhead-ranch-dripping-springs",
    "https://spyglassrealty.com/lake-pointe-austin",
    "https://spyglassrealty.com/rocky-creek-austin",
    "https://spyglassrealty.com/spanish-oaks-homes-for-sale",
    "https://spyglassrealty.com/santa-rita-ranch-austin",
    "https://spyglassrealty.com/austin-farms-for-sale",
    "https://spyglassrealty.com/homes-with-pools",
    "https://spyglassrealty.com/new-homes-for-sale-austin",
    "https://spyglassrealty.com/land-for-sale-austin",
    "https://spyglassrealty.com/new-build-homes-in-austin",
    "https://spyglassrealty.com/idx",
    "https://spyglassrealty.com/listings",
    "https://spyglassrealty.com/sunrise-beach-homes-for-sale",
    "https://spyglassrealty.com/blue-lake-homes-for-sale",
    "https://spyglassrealty.com/north-shoal-creek-homes-for-sale",
    "https://spyglassrealty.com/four-seasons-private-residences-lake-austin",
    "https://spyglassrealty.com/leander-lost-woods-preserve",
    "https://spyglassrealty.com/austin-the-waller",
    "https://spyglassrealty.com/georgetown-wolf-ranch",
    "https://spyglassrealty.com/pflugerville-sorento-homes-for-sale.php",
    "https://spyglassrealty.com/austin-homes-under-500k.php",
    "https://spyglassrealty.com/austin-new-homes-under-500k.php",
    "https://spyglassrealty.com/austin-apartments.php",
    "https://spyglassrealty.com/hays-county-real-estate"
]

def extract_slug(url):
    """Extract slug from URL"""
    parsed = urlparse(url)
    path = parsed.path.lstrip('/')
    # Remove .php extension if present
    if path.endswith('.php'):
        path = path[:-4]
    return path

print(f"Processing {len(remaining_urls)} remaining URLs...")
print("=" * 50)

for i, url in enumerate(remaining_urls, start=10):  # Start at 10 since we've done 9
    slug = extract_slug(url)
    print(f"URL {i}/44: {url}")
    print(f"Slug: {slug}")
    print(f"Output: ~/clawd/spyglass-migration/content/neighborhood/{slug}.md")
    print()

print("=" * 50)
print(f"Total URLs to process: {len(remaining_urls)}")
print("Ready for batch processing with agent tools!")