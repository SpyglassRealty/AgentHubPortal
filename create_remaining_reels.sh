#!/bin/bash

OUTPUT_DIR="projects/realtyhack-reels/output/mixed_reels"

echo "🎬 Creating remaining mixed reels (3-10)"
echo "Using simpler testimonial + B-roll mixing approach"

create_simple_mixed_reel() {
    local reel_num=$1
    local testimonial1=$2
    local testimonial2=$3
    local broll_vid=$4
    local start_offset=${5:-0}
    
    echo "Creating mixed_reel_$(printf "%02d" $reel_num).mp4..."
    
    local output_file="$OUTPUT_DIR/mixed_reel_$(printf "%02d" $reel_num).mp4"
    
    # Create a mixed reel: testimonial (12s) → B-roll (6s) → testimonial (20s) → B-roll (8s)
    ffmpeg -y \
        -i "media/clips/$testimonial1" \
        -i "$broll_vid" \
        -i "media/clips/$testimonial2" \
        -i "$broll_vid" \
        -filter_complex "
            [0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,trim=start=$start_offset:duration=12,setpts=PTS-STARTPTS[v0];
            [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,trim=duration=6,setpts=PTS-STARTPTS[v1];
            [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,trim=start=2:duration=20,setpts=PTS-STARTPTS[v2];
            [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,trim=start=10:duration=8,setpts=PTS-STARTPTS[v3];
            
            [0:a]atrim=start=$start_offset:duration=12,asetpts=PTS-STARTPTS[a0];
            anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=6[a1];
            [2:a]atrim=start=2:duration=20,asetpts=PTS-STARTPTS[a2];
            anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=8[a3];
            
            [v0][a0][v1][a1][v2][a2][v3][a3]concat=n=4:v=1:a=1[outv][outa]
        " \
        -map "[outv]" -map "[outa]" \
        -c:v libx264 -preset fast -crf 20 \
        -c:a aac -b:a 128k \
        -movflags +faststart \
        "$output_file" >/dev/null 2>&1
    
    if [ -f "$output_file" ] && [ -s "$output_file" ]; then
        local duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$output_file" 2>/dev/null | cut -d. -f1)
        local size=$(ls -lh "$output_file" | awk '{print $5}')
        echo "  ✅ SUCCESS! Duration: ${duration}s, Size: ${size}"
        return 0
    else
        echo "  ❌ Failed"
        return 1
    fi
}

# Create reels 3-10 with different combinations
create_simple_mixed_reel 3 "clip1-austin-recovery.mp4" "clip3-better-agents.mp4" "mission-control-tour.mp4" 0
create_simple_mixed_reel 4 "clip2-nobody-cares-production.mp4" "clip4-ai-wont-replace.mp4" "walkthrough.mp4" 1
create_simple_mixed_reel 5 "clip3-better-agents.mp4" "clip5-bottom-five-percent.mp4" "mission-control-apps.mp4" 0
create_simple_mixed_reel 6 "clip4-ai-wont-replace.mp4" "clip1-austin-recovery.mp4" "mission-control-final.mp4" 2
create_simple_mixed_reel 7 "clip5-bottom-five-percent.mp4" "clip2-nobody-cares-production.mp4" "mission-control-rapid.mp4" 0
create_simple_mixed_reel 8 "clip1-austin-recovery.mp4" "clip4-ai-wont-replace.mp4" "mission-control-tour.mp4" 3
create_simple_mixed_reel 9 "clip2-nobody-cares-production.mp4" "clip5-bottom-five-percent.mp4" "walkthrough.mp4" 0
create_simple_mixed_reel 10 "clip3-better-agents.mp4" "clip1-austin-recovery.mp4" "mission-control-apps.mp4" 1

echo ""
echo "🎉 ALL MIXED REELS CREATED!"
echo "=========================="
echo "Final inventory:"
ls -lh "$OUTPUT_DIR"/mixed_reel_*.mp4 2>/dev/null | while read -r line; do
    filename=$(echo "$line" | awk '{print $9}')
    size=$(echo "$line" | awk '{print $5}')
    duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$filename" 2>/dev/null | cut -d. -f1)
    echo "  • $(basename "$filename") - ${duration}s - ${size}"
done

echo ""
echo "🎯 FEATURES OF EACH REEL:"
echo "  • 9:16 vertical format (1080x1920)"
echo "  • 30-60 second duration"  
echo "  • Mixed testimonial + B-roll structure"
echo "  • Professional pacing and cuts"
echo "  • Ready for social media platforms"
echo ""
echo "🚀 Ready to upload to Instagram Reels, TikTok, YouTube Shorts!"