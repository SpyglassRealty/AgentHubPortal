#!/bin/bash

echo "Setting up Austin Neighborhood Polygons project..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Create data and public directories
mkdir -p data
mkdir -p public/leaflet

# Copy Leaflet assets (with error handling)
echo "Setting up Leaflet assets..."
if [ -d "node_modules/leaflet/dist/images" ]; then
  cp node_modules/leaflet/dist/images/* public/leaflet/ 2>/dev/null || echo "Note: Leaflet images will be loaded from CDN"
else
  echo "Note: Leaflet images will be loaded from CDN"
fi

echo "Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "The application will be available at http://localhost:3000"
echo ""
echo "Data is stored in JSON format at data/neighborhoods-data.json"