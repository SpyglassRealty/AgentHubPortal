#!/bin/bash

OUTPUT_DIR="projects/realtyhack-reels/output/mixed_reels"

echo "🎬 Creating remaining reels with simple approach"

create_basic_mixed_reel() {
    local reel_num=$1
    local testimonial=$2
    local broll_video=$3
    
    echo "Creating mixed_reel_$(printf "%02d" $reel_num).mp4..."
    
    # Create segments first
    local test_segment="${OUTPUT_DIR}/test_${reel_num}.mp4"
    local broll_segment="${OUTPUT_DIR}/broll_${reel_num}.mp4"
    local test2_segment="${OUTPUT_DIR}/test2_${reel_num}.mp4"
    local broll2_segment="${OUTPUT_DIR}/broll2_${reel_num}.mp4"
    
    # Extract testimonial segment (20s)
    ffmpeg -i "media/clips/$testimonial" -t 20 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -c:a aac \
        -y "$test_segment" >/dev/null 2>&1
    
    # Extract B-roll segment (8s)
    ffmpeg -i "$broll_video" -t 8 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -an \
        -y "$broll_segment" >/dev/null 2>&1
    
    # Extract second testimonial segment (15s, offset start)
    ffmpeg -i "media/clips/$testimonial" -ss 5 -t 15 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -c:a aac \
        -y "$test2_segment" >/dev/null 2>&1
    
    # Extract final B-roll segment (5s, offset)
    ffmpeg -i "$broll_video" -ss 10 -t 5 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -an \
        -y "$broll2_segment" >/dev/null 2>&1
    
    # Check if all segments were created
    if [ -f "$test_segment" ] && [ -f "$broll_segment" ] && [ -f "$test2_segment" ] && [ -f "$broll2_segment" ]; then
        # Create concat file
        local concat_file="${OUTPUT_DIR}/concat_${reel_num}.txt"
        {
            echo "file '$(realpath "$test_segment")'"
            echo "file '$(realpath "$broll_segment")'"
            echo "file '$(realpath "$test2_segment")'"
            echo "file '$(realpath "$broll2_segment")'"
        } > "$concat_file"
        
        # Combine segments
        local output_file="$OUTPUT_DIR/mixed_reel_$(printf "%02d" $reel_num).mp4"
        ffmpeg -f concat -safe 0 -i "$concat_file" \
            -c:v libx264 -preset fast -crf 20 \
            -c:a aac -b:a 128k \
            -movflags +faststart \
            -y "$output_file" >/dev/null 2>&1
        
        if [ -f "$output_file" ] && [ -s "$output_file" ]; then
            local duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$output_file" 2>/dev/null | cut -d. -f1)
            local size=$(ls -lh "$output_file" | awk '{print $5}')
            echo "  ✅ SUCCESS! Duration: ${duration}s, Size: ${size}"
            
            # Cleanup temp files
            rm -f "$test_segment" "$broll_segment" "$test2_segment" "$broll2_segment" "$concat_file"
            return 0
        fi
    fi
    
    echo "  ❌ Failed"
    # Cleanup temp files on failure
    rm -f "$test_segment" "$broll_segment" "$test2_segment" "$broll2_segment" "$concat_file"
    return 1
}

# Create reels 3-10 with different combinations
create_basic_mixed_reel 3 "clip1-austin-recovery.mp4" "mission-control-tour.mp4"
create_basic_mixed_reel 4 "clip2-nobody-cares-production.mp4" "walkthrough.mp4"  
create_basic_mixed_reel 5 "clip3-better-agents.mp4" "mission-control-apps.mp4"
create_basic_mixed_reel 6 "clip4-ai-wont-replace.mp4" "mission-control-final.mp4"
create_basic_mixed_reel 7 "clip5-bottom-five-percent.mp4" "mission-control-rapid.mp4"
create_basic_mixed_reel 8 "clip1-austin-recovery.mp4" "mission-control-tour.mp4"
create_basic_mixed_reel 9 "clip2-nobody-cares-production.mp4" "walkthrough.mp4"
create_basic_mixed_reel 10 "clip3-better-agents.mp4" "mission-control-apps.mp4"

# Clean up any 0-byte files from previous attempts
find "$OUTPUT_DIR" -name "mixed_reel_*.mp4" -size 0 -delete

echo ""
echo "🎉 FINAL MIXED REELS INVENTORY"
echo "=============================="
reel_count=0
total_duration=0

for reel_file in "$OUTPUT_DIR"/mixed_reel_*.mp4; do
    if [ -f "$reel_file" ] && [ -s "$reel_file" ]; then
        filename=$(basename "$reel_file")
        size=$(ls -lh "$reel_file" | awk '{print $5}')
        duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$reel_file" 2>/dev/null | cut -d. -f1)
        total_duration=$((total_duration + duration))
        reel_count=$((reel_count + 1))
        echo "  • $filename - ${duration}s - $size"
    fi
done

echo ""
echo "📊 SUMMARY:"
echo "  🎬 Total Reels Created: $reel_count"
echo "  ⏱️  Total Duration: ${total_duration}s ($(($total_duration/60))m $(($total_duration%60))s)"
echo "  📱 Format: 1080x1920 (9:16 vertical)"
echo "  🎯 Structure: Testimonial → B-roll → Testimonial → B-roll"
echo ""
echo "🚀 All reels are ready for social media upload!"