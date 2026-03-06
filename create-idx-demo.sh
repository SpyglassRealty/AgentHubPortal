#!/bin/bash

# Create IDX demo page with current hero block (temporary)
curl -X POST "https://missioncontrol-tjfm.onrender.com/api/admin/landing-pages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "IDX Homepage Preview",
    "slug": "idx-homepage-preview-demo",
    "pageType": "core",
    "sections": [
      {
        "id": "hero1",
        "type": "hero",
        "props": {
          "heading": "The Best Austin Real Estate Agents",
          "subtext": "700+ 5-Star Reviews  |  3,000+ Families Helped  |  #1 Independent Brokerage",
          "bgImage": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
          "overlay": true,
          "ctaText": "Search Homes",
          "ctaUrl": "/search",
          "ctaText2": "What'"'"'s My Home Worth?",
          "ctaUrl2": "/sell"
        }
      },
      {
        "id": "stats1", 
        "type": "cards",
        "props": {
          "cards": [
            {"image": "", "title": "3,400+", "description": "Homes For Sale", "link": ""},
            {"image": "", "title": "2,500+", "description": "Homes Sold", "link": ""},
            {"image": "", "title": "200+", "description": "Neighborhoods", "link": ""},
            {"image": "", "title": "$2B+", "description": "In Sales Volume", "link": ""}
          ],
          "columns": 4
        }
      },
      {
        "id": "brings1",
        "type": "heading",
        "props": {
          "level": 2,
          "text": "What brings you here?",
          "alignment": "center",
          "color": "#000000"
        }
      }
    ],
    "metaTitle": "The Best Austin Real Estate Agents | Spyglass Realty",
    "metaDescription": "Find your dream home with Austins top-rated real estate team.",
    "isPublished": false
  }' | jq -r '"Page ID: " + .page.id'