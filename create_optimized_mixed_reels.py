#!/usr/bin/env python3

import subprocess
import os
import random
from pathlib import Path

def run_ffmpeg(cmd, description=""):
    """Run ffmpeg command with error handling"""
    print(f"  {description}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    ❌ Error: {result.stderr}")
        return False
    print(f"    ✅ Success")
    return True

def create_mixed_reel(reel_num):
    """Create a single mixed promotional reel"""
    
    OUTPUT_DIR = "projects/realtyhack-reels/output/mixed_reels"
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Testimonial clips
    testimonials = [
        "media/clips/clip1-austin-recovery.mp4",
        "media/clips/clip2-nobody-cares-production.mp4", 
        "media/clips/clip3-better-agents.mp4",
        "media/clips/clip4-ai-wont-replace.mp4",
        "media/clips/clip5-bottom-five-percent.mp4"
    ]
    
    # B-roll footage (use existing videos)
    broll_videos = [
        "mission-control-apps.mp4",
        "mission-control-tour.mp4", 
        "mission-control-final.mp4",
        "mission-control-rapid.mp4",
        "walkthrough.mp4"
    ]
    
    print(f"\n🎬 Creating Mixed Reel {reel_num}")
    print("=" * 50)
    
    # Randomly select testimonials and B-roll for variety
    selected_testimonials = random.sample(testimonials, 3)
    selected_broll = random.sample(broll_videos, 3)
    
    print(f"Testimonials: {[os.path.basename(t) for t in selected_testimonials]}")
    print(f"B-roll: {[os.path.basename(b) for b in selected_broll]}")
    
    segments = []
    
    # 1. HOOK: Strong testimonial opening (5 seconds)
    print("\\n1. Creating hook testimonial (5s)...")
    hook_file = f"{OUTPUT_DIR}/hook_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_testimonials[0], "-t", "5",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", hook_file
    ]
    if run_ffmpeg(cmd, "Extracting hook testimonial"):
        segments.append(hook_file)
    
    # 2. B-ROLL: Professional footage (4 seconds)
    print("\\n2. Creating B-roll segment (4s)...")
    broll_file = f"{OUTPUT_DIR}/broll1_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_broll[0], "-t", "4",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", broll_file
    ]
    if run_ffmpeg(cmd, "Processing B-roll footage"):
        segments.append(broll_file)
    
    # 3. BODY: Second testimonial (15 seconds)  
    print("\\n3. Creating body testimonial (15s)...")
    body_file = f"{OUTPUT_DIR}/body_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_testimonials[1], "-ss", "2", "-t", "15",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", body_file
    ]
    if run_ffmpeg(cmd, "Extracting body testimonial"):
        segments.append(body_file)
    
    # 4. B-ROLL: More professional footage (5 seconds)
    print("\\n4. Creating second B-roll (5s)...")
    broll2_file = f"{OUTPUT_DIR}/broll2_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_broll[1], "-t", "5",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", broll2_file
    ]
    if run_ffmpeg(cmd, "Processing second B-roll"):
        segments.append(broll2_file)
    
    # 5. CLOSER: Final powerful testimonial (12 seconds)
    print("\\n5. Creating closer testimonial (12s)...")
    closer_file = f"{OUTPUT_DIR}/closer_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_testimonials[2], "-t", "12",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-y", closer_file
    ]
    if run_ffmpeg(cmd, "Extracting closer testimonial"):
        segments.append(closer_file)
    
    # 6. FINALE: Final B-roll with impact (6 seconds)
    print("\\n6. Creating finale B-roll (6s)...")
    finale_file = f"{OUTPUT_DIR}/finale_{reel_num}.mp4"
    cmd = [
        "ffmpeg", "-i", selected_broll[2], "-t", "6",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an", "-y", finale_file
    ]
    if run_ffmpeg(cmd, "Processing finale B-roll"):
        segments.append(finale_file)
    
    if not segments:
        print("❌ No segments created successfully")
        return None
    
    # Combine all segments
    print("\\n7. 🎬 Combining all segments...")
    concat_file = f"{OUTPUT_DIR}/concat_{reel_num}.txt"
    with open(concat_file, 'w') as f:
        for segment in segments:
            f.write(f"file '{os.path.abspath(segment)}'\\n")
    
    output_file = f"{OUTPUT_DIR}/mixed_reel_{reel_num:02d}.mp4"
    cmd = [
        "ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_file,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", output_file
    ]
    
    if run_ffmpeg(cmd, "Combining all segments into final reel"):
        # Get duration
        result = subprocess.run([
            "ffprobe", "-v", "quiet", "-show_entries", "format=duration", 
            "-of", "csv=p=0", output_file
        ], capture_output=True, text=True)
        
        duration = float(result.stdout.strip()) if result.stdout.strip() else 0
        
        print(f"\\n✅ SUCCESS! Created: {output_file}")
        print(f"   Duration: {duration:.1f} seconds")
        print(f"   Format: 1080x1920 (9:16 vertical)")
        print(f"   Structure: Hook → B-roll → Body → B-roll → Closer → Finale")
        
        # Cleanup temp files
        for temp_file in segments + [concat_file]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        return output_file
    
    return None

def main():
    print("🎬 CREATING 10 MIXED PROMOTIONAL REELS")
    print("=" * 60)
    print("📱 Format: 9:16 vertical for Instagram/TikTok")
    print("⏱️  Duration: 30-60 seconds each")
    print("🎯 Structure: Testimonial → B-roll → Testimonial → B-roll")
    print("=" * 60)
    
    # Create all 10 reels
    created_reels = []
    for i in range(1, 11):
        try:
            reel_file = create_mixed_reel(i)
            if reel_file:
                created_reels.append(reel_file)
        except Exception as e:
            print(f"❌ Error creating reel {i}: {e}")
    
    print(f"\\n\\n🎉 FINAL RESULTS")
    print("=" * 50)
    print(f"✅ Successfully created {len(created_reels)} mixed reels!")
    
    print("\\n📁 Output files:")
    for reel in created_reels:
        print(f"  • {os.path.basename(reel)}")
    
    print(f"\\n📂 Location: {os.path.dirname(created_reels[0]) if created_reels else 'N/A'}")
    
    print(f"\\n🎯 Each reel features:")
    print(f"   • Dynamic mix of testimonial clips")
    print(f"   • Professional B-roll footage interwoven") 
    print(f"   • Optimized pacing for social media")
    print(f"   • 9:16 vertical format")
    print(f"   • 30-60 second duration")
    
    print(f"\\n🚀 Ready to upload to Instagram, TikTok, or other platforms!")

if __name__ == "__main__":
    main()