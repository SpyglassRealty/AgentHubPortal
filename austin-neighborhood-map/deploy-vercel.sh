#!/bin/bash

echo "Preparing Austin Neighborhood Polygons for Vercel deployment..."

# Ensure all dependencies are installed
npm install

# Build the application
echo "Building application..."
npm run build

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "Deployment complete!"
echo ""
echo "Your Austin Neighborhood Polygons application should now be live on Vercel."
echo ""
echo "Features available:"
echo "✓ Interactive map with drawing tools"
echo "✓ 5 Austin neighborhoods from mapsofaustin.com analysis"
echo "✓ Reference links to Google Maps, Apple Maps, Zillow"
echo "✓ JSON-based polygon storage"
echo "✓ Community-focused boundary tracing"
echo ""
echo "To use the application:"
echo "1. Select a neighborhood from the dropdown"
echo "2. Click 'Start Drawing Polygon'"
echo "3. Use reference maps to trace boundaries"
echo "4. Click on the map to add points"
echo "5. Click 'Finish Polygon' when complete"