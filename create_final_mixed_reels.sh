#!/bin/bash

OUTPUT_DIR="projects/realtyhack-reels/output/mixed_reels"
mkdir -p "$OUTPUT_DIR"

# Clean up any temp files
rm -f "$OUTPUT_DIR"/temp_* "$OUTPUT_DIR"/hook_* "$OUTPUT_DIR"/body_* "$OUTPUT_DIR"/closer_* "$OUTPUT_DIR"/broll* "$OUTPUT_DIR"/finale_*

echo "🎬 CREATING 5 HIGH-QUALITY MIXED PROMOTIONAL REELS"
echo "=================================================================="

# Array of testimonial clips
testimonials=(
    "media/clips/clip1-austin-recovery.mp4"
    "media/clips/clip2-nobody-cares-production.mp4"
    "media/clips/clip3-better-agents.mp4"
    "media/clips/clip4-ai-wont-replace.mp4"
    "media/clips/clip5-bottom-five-percent.mp4"
)

# Array of B-roll videos
broll_videos=(
    "mission-control-tour.mp4"
    "mission-control-apps.mp4"
    "walkthrough.mp4"
    "mission-control-final.mp4"
    "mission-control-rapid.mp4"
)

create_mixed_reel() {
    local reel_num=$1
    local test1_idx=$2
    local test2_idx=$3
    local test3_idx=$4
    local broll1_idx=$5
    local broll2_idx=$6
    
    echo ""
    echo "🎬 Creating Mixed Reel $reel_num"
    echo "Testimonials: ${testimonials[$test1_idx]##*/}, ${testimonials[$test2_idx]##*/}, ${testimonials[$test3_idx]##*/}"
    echo "B-roll: ${broll_videos[$broll1_idx]##*/}, ${broll_videos[$broll2_idx]##*/}"
    
    # Create segments
    local segments=()
    
    # Hook testimonial (6s)
    local hook_file="$OUTPUT_DIR/hook_${reel_num}.mp4"
    ffmpeg -i "${testimonials[$test1_idx]}" -t 6 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -c:a aac \
        -y "$hook_file" >/dev/null 2>&1 && segments+=("$hook_file") && echo "  ✅ Hook created"
    
    # B-roll 1 (4s)
    local broll1_file="$OUTPUT_DIR/broll1_${reel_num}.mp4"
    ffmpeg -i "${broll_videos[$broll1_idx]}" -t 4 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -an \
        -y "$broll1_file" >/dev/null 2>&1 && segments+=("$broll1_file") && echo "  ✅ B-roll 1 created"
    
    # Body testimonial (18s)
    local body_file="$OUTPUT_DIR/body_${reel_num}.mp4"
    ffmpeg -i "${testimonials[$test2_idx]}" -ss 1 -t 18 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -c:a aac \
        -y "$body_file" >/dev/null 2>&1 && segments+=("$body_file") && echo "  ✅ Body created"
    
    # B-roll 2 (5s)
    local broll2_file="$OUTPUT_DIR/broll2_${reel_num}.mp4"
    ffmpeg -i "${broll_videos[$broll2_idx]}" -t 5 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -an \
        -y "$broll2_file" >/dev/null 2>&1 && segments+=("$broll2_file") && echo "  ✅ B-roll 2 created"
    
    # Closer testimonial (15s)
    local closer_file="$OUTPUT_DIR/closer_${reel_num}.mp4"
    ffmpeg -i "${testimonials[$test3_idx]}" -t 15 \
        -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
        -c:v libx264 -preset fast -crf 23 -c:a aac \
        -y "$closer_file" >/dev/null 2>&1 && segments+=("$closer_file") && echo "  ✅ Closer created"
    
    # Create concat file and combine
    if [ ${#segments[@]} -eq 5 ]; then
        local concat_file="$OUTPUT_DIR/concat_${reel_num}.txt"
        for segment in "${segments[@]}"; do
            echo "file '$(realpath "$segment")'" >> "$concat_file"
        done
        
        local output_file="$OUTPUT_DIR/mixed_reel_$(printf "%02d" $reel_num).mp4"
        ffmpeg -f concat -safe 0 -i "$concat_file" \
            -c:v libx264 -preset fast -crf 20 \
            -c:a aac -b:a 128k \
            -movflags +faststart \
            -y "$output_file" >/dev/null 2>&1
        
        if [ -f "$output_file" ]; then
            local duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$output_file" 2>/dev/null | cut -d. -f1)
            echo "  🎉 SUCCESS! Created: mixed_reel_$(printf "%02d" $reel_num).mp4 (${duration}s)"
            
            # Cleanup temp files
            rm -f "${segments[@]}" "$concat_file"
            return 0
        else
            echo "  ❌ Failed to create final reel"
            return 1
        fi
    else
        echo "  ❌ Failed to create all segments (only ${#segments[@]}/5)"
        return 1
    fi
}

# Create 5 different mixed reels with different combinations
create_mixed_reel 1 0 2 4 0 1  # austin + better-agents + bottom-five + tour + apps
create_mixed_reel 2 1 3 0 2 3  # production + ai + austin + walkthrough + final  
create_mixed_reel 3 2 4 1 4 0  # better-agents + bottom-five + production + rapid + tour
create_mixed_reel 4 3 0 2 1 2  # ai + austin + better-agents + apps + walkthrough
create_mixed_reel 5 4 1 3 3 4  # bottom-five + production + ai + final + rapid

echo ""
echo "🎯 FINAL RESULTS"
echo "=================================="
echo "Created mixed reels:"
ls -lh "$OUTPUT_DIR"/mixed_reel_*.mp4 2>/dev/null | while read -r line; do
    echo "  • $(echo "$line" | awk '{print $9 " (" $5 ")"}')"
done

echo ""
echo "📱 Format: 1080x1920 (9:16 vertical)"
echo "⏱️  Duration: ~48-52 seconds each"
echo "🎬 Structure: Hook → B-roll → Body → B-roll → Closer"
echo "🚀 Ready for Instagram Reels, TikTok, YouTube Shorts!"