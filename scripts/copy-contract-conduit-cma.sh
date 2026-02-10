#!/bin/bash

# Script to copy CMA presentation files from Contract Conduit
# Usage: ./copy-contract-conduit-cma.sh /path/to/contract-conduit-source

set -e

SOURCE_DIR="$1"
TARGET_DIR="$(pwd)/client/src/components/cma-presentation"

if [ -z "$SOURCE_DIR" ]; then
    echo "Usage: $0 /path/to/contract-conduit-source"
    echo "Example: $0 /Users/ryan/contract-conduit/client/src/components/cma"
    exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR does not exist"
    exit 1
fi

echo "🚀 Copying CMA presentation files from Contract Conduit..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

# Create target directories if they don't exist
mkdir -p "$TARGET_DIR"/{widgets,pdf,components,hooks,constants,types}

echo "📁 Copying widget implementations..."
if [ -d "$SOURCE_DIR/widgets" ]; then
    cp -r "$SOURCE_DIR/widgets/"* "$TARGET_DIR/widgets/" 2>/dev/null || echo "No widgets found in $SOURCE_DIR/widgets"
fi

echo "📄 Copying PDF generation..."
if [ -d "$SOURCE_DIR/pdf" ]; then
    cp -r "$SOURCE_DIR/pdf/"* "$TARGET_DIR/pdf/" 2>/dev/null || echo "No PDF files found in $SOURCE_DIR/pdf"
fi

echo "🧩 Copying components..."
if [ -d "$SOURCE_DIR/components" ]; then
    cp -r "$SOURCE_DIR/components/"* "$TARGET_DIR/components/" 2>/dev/null || echo "No components found in $SOURCE_DIR/components"
fi

echo "🪝 Copying hooks..."
if [ -d "$SOURCE_DIR/hooks" ]; then
    cp -r "$SOURCE_DIR/hooks/"* "$TARGET_DIR/hooks/" 2>/dev/null || echo "No hooks found in $SOURCE_DIR/hooks"
fi

echo "⚙️ Copying constants..."
if [ -d "$SOURCE_DIR/constants" ]; then
    cp -r "$SOURCE_DIR/constants/"* "$TARGET_DIR/constants/" 2>/dev/null || echo "No constants found in $SOURCE_DIR/constants"
fi

echo "📝 Copying types..."
if [ -d "$SOURCE_DIR/types" ]; then
    cp -r "$SOURCE_DIR/types/"* "$TARGET_DIR/types/" 2>/dev/null || echo "No types found in $SOURCE_DIR/types"
fi

echo "🔍 Looking for main CMA presentation files..."
# Copy any CMA-related TypeScript/JSX files from the source root
find "$SOURCE_DIR" -maxdepth 1 -name "*cma*.tsx" -o -name "*cma*.ts" -o -name "*presentation*.tsx" -o -name "*presentation*.ts" | while read file; do
    if [ -f "$file" ]; then
        echo "📋 Copying $(basename "$file")"
        cp "$file" "$TARGET_DIR/components/"
    fi
done

echo "✨ Copy complete!"
echo ""
echo "📊 Files copied:"
find "$TARGET_DIR" -name "*.ts" -o -name "*.tsx" | wc -l | sed 's/^[[:space:]]*//'
echo ""
echo "🔧 Next steps:"
echo "1. Update import paths in copied files"
echo "2. Update type definitions for AgentHubPortal"
echo "3. Test individual widgets"
echo "4. Update main CMA presentation page"
echo "5. Test complete integration"
echo ""
echo "📁 Files located at: $TARGET_DIR"