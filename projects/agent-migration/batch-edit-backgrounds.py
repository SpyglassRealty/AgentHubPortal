#!/usr/bin/env python3
"""
Batch process agent headshots to standardize backgrounds using Gemini 3 Pro Image
"""

import os
import sys
import subprocess
import time
from pathlib import Path
import json

# Configuration
INPUT_DIR = Path("agent-photos")
OUTPUT_DIR = Path("agent-photos-edited")
FAILURES_DIR = Path("agent-photos-failed")
PROGRESS_FILE = Path("edit-progress.json")

# Background style prompts (customize based on Ryan's choice)
BACKGROUND_PROMPTS = {
    "professional_gray": "Replace the background with a professional light gray to white gradient background, keeping the person exactly as they are. Ensure clean edges around the person.",
    "modern_office": "Replace the background with a soft-focus modern office environment, keeping the person exactly as they are with clean edges.",
    "austin_skyline": "Replace the background with a subtle, blurred Austin skyline, keeping the person exactly as they are. Professional real estate agent look.",
    "solid_brand": "Replace the background with a solid professional light blue background (#E8F4F8), keeping the person exactly as they are with clean edges.",
    "white_studio": "Replace the background with a clean white studio background with subtle shadowing, professional headshot style, keeping the person exactly as they are."
}

def load_progress():
    """Load progress from file to resume if interrupted"""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed": [], "failed": []}

def save_progress(progress):
    """Save progress to file"""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def process_image(input_path, output_path, prompt, resolution="2K"):
    """Process a single image using Nano Banana Pro"""
    cmd = [
        "uv", "run",
        "/opt/homebrew/lib/node_modules/clawdbot/skills/nano-banana-pro/scripts/generate_image.py",
        "--prompt", prompt,
        "--filename", str(output_path),
        "--input-image", str(input_path),
        "--resolution", resolution
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0 and output_path.exists():
            return True, "Success"
        else:
            return False, result.stderr or "Unknown error"
    except subprocess.TimeoutExpired:
        return False, "Timeout (>60s)"
    except Exception as e:
        return False, str(e)

def main():
    # Get background style from command line or use default
    style = sys.argv[1] if len(sys.argv) > 1 else "professional_gray"
    if style not in BACKGROUND_PROMPTS:
        print(f"Unknown style: {style}")
        print(f"Available styles: {', '.join(BACKGROUND_PROMPTS.keys())}")
        sys.exit(1)
    
    prompt = BACKGROUND_PROMPTS[style]
    print(f"Using background style: {style}")
    print(f"Prompt: {prompt}")
    print()
    
    # Create output directories
    OUTPUT_DIR.mkdir(exist_ok=True)
    FAILURES_DIR.mkdir(exist_ok=True)
    
    # Load progress
    progress = load_progress()
    
    # Get all image files
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    all_images = [f for f in INPUT_DIR.iterdir() 
                  if f.suffix.lower() in image_extensions]
    
    print(f"Found {len(all_images)} images to process")
    print(f"Already completed: {len(progress['completed'])}")
    print(f"Previously failed: {len(progress['failed'])}")
    print()
    
    # Process images
    for i, input_path in enumerate(all_images):
        # Skip if already processed
        if str(input_path.name) in progress['completed']:
            continue
            
        # Skip if previously failed (unless retrying)
        if str(input_path.name) in progress['failed'] and '--retry-failed' not in sys.argv:
            continue
        
        # Output path (convert webp to png)
        output_name = input_path.stem + '.png'
        output_path = OUTPUT_DIR / output_name
        
        print(f"[{i+1}/{len(all_images)}] Processing {input_path.name}...", end='', flush=True)
        
        # Process the image
        success, message = process_image(input_path, output_path, prompt)
        
        if success:
            print(f" ✓ Done")
            progress['completed'].append(str(input_path.name))
            # Remove from failed if it was there
            if str(input_path.name) in progress['failed']:
                progress['failed'].remove(str(input_path.name))
        else:
            print(f" ✗ Failed: {message}")
            if str(input_path.name) not in progress['failed']:
                progress['failed'].append(str(input_path.name))
            # Copy original to failures dir for manual review
            failure_path = FAILURES_DIR / input_path.name
            subprocess.run(['cp', str(input_path), str(failure_path)])
        
        # Save progress after each image
        save_progress(progress)
        
        # Rate limit (be nice to the API)
        time.sleep(2)
    
    # Summary
    print()
    print("=" * 50)
    print(f"Batch processing complete!")
    print(f"✓ Successfully processed: {len(progress['completed'])}")
    print(f"✗ Failed: {len(progress['failed'])}")
    
    if progress['failed']:
        print(f"\nFailed images copied to: {FAILURES_DIR}")
        print("To retry failed images, run with --retry-failed flag")

if __name__ == "__main__":
    main()