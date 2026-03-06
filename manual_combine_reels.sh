#!/bin/bash

OUTPUT_DIR="projects/realtyhack-reels/output/mixed_reels"

echo "🎬 Manually creating mixed reels from existing segments"

# Function to combine segments for a reel
combine_reel() {
    local reel_num=$1
    echo "Creating mixed_reel_$(printf "%02d" $reel_num).mp4..."
    
    # Create concat file
    local concat_file="$OUTPUT_DIR/manual_concat_${reel_num}.txt"
    {
        echo "file '$(realpath $OUTPUT_DIR/hook_${reel_num}.mp4)'"
        echo "file '$(realpath $OUTPUT_DIR/broll1_${reel_num}.mp4)'"
        echo "file '$(realpath $OUTPUT_DIR/body_${reel_num}.mp4)'"
        echo "file '$(realpath $OUTPUT_DIR/broll2_${reel_num}.mp4)'"
        echo "file '$(realpath $OUTPUT_DIR/closer_${reel_num}.mp4)'"
    } > "$concat_file"
    
    # Combine segments
    local output_file="$OUTPUT_DIR/mixed_reel_$(printf "%02d" $reel_num).mp4"
    ffmpeg -f concat -safe 0 -i "$concat_file" \
        -c:v libx264 -preset fast -crf 20 \
        -c:a aac -b:a 128k \
        -movflags +faststart \
        -y "$output_file" >/dev/null 2>&1
    
    if [ -f "$output_file" ]; then
        local duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$output_file" 2>/dev/null | cut -d. -f1)
        local size=$(ls -lh "$output_file" | awk '{print $5}')
        echo "  ✅ SUCCESS! Created mixed_reel_$(printf "%02d" $reel_num).mp4 (${duration}s, ${size})"
        rm -f "$concat_file"
        return 0
    else
        echo "  ❌ Failed"
        return 1
    fi
}

# Check which reels have all required segments
for reel in 1 2; do
    if [ -f "$OUTPUT_DIR/hook_${reel}.mp4" ] && \
       [ -f "$OUTPUT_DIR/broll1_${reel}.mp4" ] && \
       [ -f "$OUTPUT_DIR/body_${reel}.mp4" ] && \
       [ -f "$OUTPUT_DIR/broll2_${reel}.mp4" ] && \
       [ -f "$OUTPUT_DIR/closer_${reel}.mp4" ]; then
        combine_reel $reel
    else
        echo "Reel $reel: Missing segments"
    fi
done

echo ""
echo "🎯 Creating additional mixed reels with different combinations..."

# Create 3 more reels using different testimonial combinations
create_quick_reel() {
    local reel_num=$3
    local test1="$1"
    local test2="$2"
    
    echo "Creating mixed_reel_$(printf "%02d" $reel_num).mp4 with $test1 + $test2..."
    
    local output_file="$OUTPUT_DIR/mixed_reel_$(printf "%02d" $reel_num).mp4"
    
    # Quick mix: testimonial + B-roll + testimonial + B-roll
    ffmpeg \
        -i "media/clips/$test1" \
        -i "mission-control-tour.mp4" \
        -i "media/clips/$test2" \
        -i "walkthrough.mp4" \
        -filter_complex "
            [0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS-STARTPTS[v0];
            [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS-STARTPTS[v1];
            [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS-STARTPTS[v2];
            [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=PTS-STARTPTS[v3];
            [v0][0:a][v1]anullsrc=d=4[v2][2:a][v3]anullsrc=d=5
            concat=n=4:v=1:a=1[outv][outa]
        " \
        -map "[outv]" -map "[outa]" \
        -t 45 -c:v libx264 -preset fast -crf 20 \
        -c:a aac -b:a 128k -movflags +faststart \
        -y "$output_file" >/dev/null 2>&1
    
    if [ -f "$output_file" ] && [ -s "$output_file" ]; then
        local size=$(ls -lh "$output_file" | awk '{print $5}')
        echo "  ✅ SUCCESS! Created mixed_reel_$(printf "%02d" $reel_num).mp4 (${size})"
    else
        echo "  ❌ Failed"
    fi
}

# Create additional reels
create_quick_reel "clip3-better-agents.mp4" "clip5-bottom-five-percent.mp4" 3
create_quick_reel "clip4-ai-wont-replace.mp4" "clip1-austin-recovery.mp4" 4
create_quick_reel "clip2-nobody-cares-production.mp4" "clip3-better-agents.mp4" 5

echo ""
echo "🎉 FINAL RESULTS:"
ls -lh "$OUTPUT_DIR"/mixed_reel_*.mp4 2>/dev/null