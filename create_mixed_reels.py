#!/usr/bin/env python3

import subprocess
import os
import random
from pathlib import Path

# Configuration
OUTPUT_DIR = "projects/realtyhack-reels/output/mixed_reels"
TESTIMONIAL_DIR = "media/clips"
BROLL_MAIN = "projects/realtyhack-reels/downloads/RH Summit Seg 1/RH PM Seg 1 Cam 1.mp4"
BROLL_RIGHT = "projects/realtyhack-reels/downloads/RH Summit Seg 1/RH PM Seg1 Cam Right.mp4"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Testimonial clips with descriptive names
testimonial_clips = [
    "media/clips/clip1-austin-recovery.mp4",
    "media/clips/clip2-nobody-cares-production.mp4", 
    "media/clips/clip3-better-agents.mp4",
    "media/clips/clip4-ai-wont-replace.mp4",
    "media/clips/clip5-bottom-five-percent.mp4"
]

# B-roll time segments (start_time, duration) - varied segments for visual interest
broll_segments = [
    (30, 4),   # Opening ceremony/setup
    (120, 3),  # Audience reaction
    (200, 5),  # Speaker moment
    (350, 4),  # Networking
    (500, 3),  # Professional atmosphere
    (650, 4),  # Venue shots
    (800, 5),  # More audience
    (950, 3),  # Speaker close-up
    (1100, 4), # Event atmosphere
    (1250, 3), # Final networking
    (60, 4),   # Early audience
    (180, 3),  # Mid-event energy
    (300, 5),  # Speaker presentation
    (450, 4),  # Professional interactions
    (600, 3),  # Venue ambiance
]

def create_mixed_reel(reel_num):
    """Create a single mixed reel with testimonials and B-roll"""
    
    # Randomly select 2-3 testimonial clips for this reel
    selected_testimonials = random.sample(testimonial_clips, random.randint(2, 3))
    
    # Select B-roll segments for this reel
    selected_broll = random.sample(broll_segments, 4)  # 4 B-roll segments per reel
    
    # Randomly choose between main cam and right cam for variety
    broll_source = random.choice([BROLL_MAIN, BROLL_RIGHT])
    
    print(f"\n=== Creating Mixed Reel {reel_num} ===")
    print(f"Testimonials: {[os.path.basename(t) for t in selected_testimonials]}")
    print(f"B-roll source: {os.path.basename(broll_source)}")
    
    # Extract testimonial segments (first 15-20 seconds of each for variety)
    testimonial_segments = []
    for i, testimonial in enumerate(selected_testimonials):
        segment_file = f"{OUTPUT_DIR}/temp_testimonial_{reel_num}_{i}.mp4"
        
        # Vary the testimonial length (10-20 seconds)
        duration = random.randint(10, 20)
        start_time = random.randint(0, 5)  # Start slightly offset for variety
        
        cmd = [
            "ffmpeg", "-i", testimonial, "-ss", str(start_time), "-t", str(duration),
            "-c", "copy", "-avoid_negative_ts", "make_zero", 
            "-y", segment_file
        ]
        subprocess.run(cmd, capture_output=True)
        testimonial_segments.append(segment_file)
    
    # Extract B-roll segments
    broll_files = []
    for i, (start_time, duration) in enumerate(selected_broll):
        broll_file = f"{OUTPUT_DIR}/temp_broll_{reel_num}_{i}.mp4"
        
        cmd = [
            "ffmpeg", "-i", broll_source, "-ss", str(start_time), "-t", str(duration),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-avoid_negative_ts", "make_zero",
            "-y", broll_file
        ]
        subprocess.run(cmd, capture_output=True)
        broll_files.append(broll_file)
    
    # Create the mixed sequence: testimonial → b-roll → testimonial → b-roll pattern
    mixed_sequence = []
    
    # Start with testimonial hook (first testimonial)
    mixed_sequence.append(testimonial_segments[0])
    
    # Add first B-roll
    mixed_sequence.append(broll_files[0])
    
    # Add remaining testimonials interwoven with B-roll
    for i in range(1, len(testimonial_segments)):
        mixed_sequence.append(testimonial_segments[i])
        if i < len(broll_files):
            mixed_sequence.append(broll_files[i])
    
    # Add any remaining B-roll at the end for finale
    for i in range(len(testimonial_segments), len(broll_files)):
        mixed_sequence.append(broll_files[i])
    
    # Create concat file for seamless mixing
    concat_file = f"{OUTPUT_DIR}/temp_concat_{reel_num}.txt"
    with open(concat_file, 'w') as f:
        for segment in mixed_sequence:
            f.write(f"file '{os.path.abspath(segment)}'\n")
    
    # Final mixed reel
    output_file = f"{OUTPUT_DIR}/mixed_reel_{reel_num:02d}.mp4"
    
    cmd = [
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_file,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", output_file
    ]
    
    subprocess.run(cmd, capture_output=True)
    
    # Cleanup temporary files
    for temp_file in testimonial_segments + broll_files + [concat_file]:
        if os.path.exists(temp_file):
            os.remove(temp_file)
    
    print(f"✅ Created: {output_file}")
    return output_file

def main():
    print("🎬 Creating 10 Mixed Promotional Reels")
    print("=" * 50)
    
    # Create all 10 reels
    created_reels = []
    for i in range(1, 11):
        try:
            reel_file = create_mixed_reel(i)
            created_reels.append(reel_file)
        except Exception as e:
            print(f"❌ Error creating reel {i}: {e}")
    
    print(f"\n🎉 Successfully created {len(created_reels)} mixed reels!")
    print("\nOutput files:")
    for reel in created_reels:
        print(f"  - {reel}")
    
    print(f"\n📁 All files saved to: {OUTPUT_DIR}")
    print("\n🎯 Each reel features:")
    print("   • 2-3 testimonial clips mixed dynamically")
    print("   • Professional B-roll footage interwoven")
    print("   • 30-60 second duration optimized for social")
    print("   • Vertical 9:16 format for Instagram/TikTok")

if __name__ == "__main__":
    main()