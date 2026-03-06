#!/usr/bin/env python3

import subprocess
import os
import sys
from pathlib import Path

def run_ffmpeg(cmd, description=""):
    """Run ffmpeg command with error handling"""
    print(f"  {description}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ❌ Error: {result.stderr}")
        return False
    return True

def create_mixed_reel(reel_num):
    """Create a single mixed promotional reel"""
    
    OUTPUT_DIR = "projects/realtyhack-reels/output/mixed_reels"
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Testimonial clips
    testimonials = [
        "media/clips/clip1-austin-recovery.mp4",
        "media/clips/clip3-better-agents.mp4", 
        "media/clips/clip4-ai-wont-replace.mp4"
    ]
    
    # Use main camera for B-roll
    broll_source = "projects/realtyhack-reels/downloads/RH Summit Seg 1/RH PM Seg 1 Cam 1.mp4"
    
    print(f"\n🎬 Creating Mixed Reel {reel_num}")
    print("=" * 40)
    
    segments = []
    
    # 1. HOOK: Testimonial clip (8 seconds)
    print("1. Creating hook testimonial...")
    hook_file = f"{OUTPUT_DIR}/hook_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", testimonials[0], "-t", "8",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", hook_file
    ]
    if run_ffmpeg(cmd, "Extracting hook testimonial"):
        segments.append(hook_file)
    
    # 2. B-ROLL: Event footage (5 seconds)
    print("2. Creating B-roll segment...")
    broll_file = f"{OUTPUT_DIR}/broll_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", broll_source, "-ss", "120", "-t", "5",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", broll_file
    ]
    if run_ffmpeg(cmd, "Extracting B-roll footage"):
        segments.append(broll_file)
    
    # 3. BODY: Second testimonial (12 seconds)  
    print("3. Creating body testimonial...")
    body_file = f"{OUTPUT_DIR}/body_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", testimonials[1], "-ss", "2", "-t", "12",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", body_file
    ]
    if run_ffmpeg(cmd, "Extracting body testimonial"):
        segments.append(body_file)
    
    # 4. B-ROLL: More event footage (4 seconds)
    print("4. Creating second B-roll...")
    broll2_file = f"{OUTPUT_DIR}/broll2_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", broll_source, "-ss", "300", "-t", "4",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", broll2_file
    ]
    if run_ffmpeg(cmd, "Extracting second B-roll"):
        segments.append(broll2_file)
    
    # 5. CLOSER: Final testimonial (10 seconds)
    print("5. Creating closer testimonial...")
    closer_file = f"{OUTPUT_DIR}/closer_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", testimonials[2], "-t", "10",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", closer_file
    ]
    if run_ffmpeg(cmd, "Extracting closer testimonial"):
        segments.append(closer_file)
    
    # 6. FINALE: Final B-roll (6 seconds)
    print("6. Creating finale B-roll...")
    finale_file = f"{OUTPUT_DIR}/finale_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", broll_source, "-ss", "500", "-t", "6",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", finale_file
    ]
    if run_ffmpeg(cmd, "Extracting finale B-roll"):
        segments.append(finale_file)
    
    if not segments:
        print("❌ No segments created successfully")
        return None
    
    # Combine all segments
    print("7. Combining segments...")
    concat_file = f"{OUTPUT_DIR}/concat_{reel_num}.txt"
    with open(concat_file, 'w') as f:
        for segment in segments:
            f.write(f"file '{os.path.abspath(segment)}'\n")
    
    output_file = f"{OUTPUT_DIR}/mixed_reel_{reel_num:02d}.mp4"
    cmd = [
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_file,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", output_file
    ]
    
    if run_ffmpeg(cmd, "Combining segments"):
        print(f"✅ Created: {output_file}")
        
        # Cleanup temp files
        for temp_file in segments + [concat_file]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        return output_file
    
    return None

if __name__ == "__main__":
    reel_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    create_mixed_reel(reel_num)