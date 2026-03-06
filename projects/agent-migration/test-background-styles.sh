#!/bin/bash
# Test different background styles on Ryan's headshot

echo "Testing background styles on Ryan's headshot..."
echo "This will create 5 versions with different backgrounds"
echo

# Create test output directory
mkdir -p test-backgrounds

# Test each style
for style in professional_gray modern_office austin_skyline solid_brand white_studio; do
    echo "Testing style: $style"
    
    output_file="test-backgrounds/ryan-rodenbeck-${style}.png"
    
    # Get the prompt for this style
    case $style in
        professional_gray)
            prompt="Replace the background with a professional light gray to white gradient background, keeping the person exactly as they are. Ensure clean edges around the person."
            ;;
        modern_office)
            prompt="Replace the background with a soft-focus modern office environment, keeping the person exactly as they are with clean edges."
            ;;
        austin_skyline)
            prompt="Replace the background with a subtle, blurred Austin skyline, keeping the person exactly as they are. Professional real estate agent look."
            ;;
        solid_brand)
            prompt="Replace the background with a solid professional light blue background (#E8F4F8), keeping the person exactly as they are with clean edges."
            ;;
        white_studio)
            prompt="Replace the background with a clean white studio background with subtle shadowing, professional headshot style, keeping the person exactly as they are."
            ;;
    esac
    
    # Process the image
    uv run /opt/homebrew/lib/node_modules/clawdbot/skills/nano-banana-pro/scripts/generate_image.py \
        --prompt "$prompt" \
        --filename "$output_file" \
        --input-image "agent-photos/ryan-rodenbeck.png" \
        --resolution 2K
    
    echo "Saved to: $output_file"
    echo
    
    # Small delay between requests
    sleep 2
done

echo "All styles complete! Check the test-backgrounds/ directory"
echo "Once you pick a style, run:"
echo "  python3 batch-edit-backgrounds.py [style_name]"
echo
echo "Available styles:"
echo "  - professional_gray (default)"
echo "  - modern_office" 
echo "  - austin_skyline"
echo "  - solid_brand"
echo "  - white_studio"