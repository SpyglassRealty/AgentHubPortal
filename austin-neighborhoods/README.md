# Austin Neighborhood Polygons - Visual Analysis

This project creates neighborhood boundary polygons based on **visual analysis** of community-recognized boundaries from mapsofaustin.com and consumer mapping services, rather than official city planning data.

## Objective

Build polygon coordinates that match what local residents, real estate professionals, and consumers actually consider as neighborhood boundaries - the boundaries that matter for buying, selling, and living decisions.

## Data Sources

### Primary Source: Maps of Austin
- **Website:** https://www.mapsofaustin.com
- **Focus:** Real estate perspective on neighborhoods
- **Data collected:** Boundary descriptions, MLS areas, zip codes

### Cross-Reference Sources
- Google Maps (consumer perception)
- Apple Maps (consumer perception) 
- Zillow neighborhood boundaries
- Local real estate listings

## Neighborhoods Analyzed

Based on initial analysis of mapsofaustin.com:

1. **East Austin**
   - Boundaries: IH-35, Lady Bird Lake, Manor Road, Springdale Road
   - MLS Areas: 3, 3E, 5, 5E
   - Zip Codes: 78702, 78722, 78723, 78724

2. **Central Austin**
   - Description: "Middle of everything" - downtown, Lady Bird Lake, UT campus
   - MLS Areas: 1A, 1B, 2, 4, 6, 7
   - Multiple zip codes covering central area

3. **Downtown Austin**
   - Focus: Walkable downtown core
   - MLS Areas: 1B, DT, UT
   - Zip Codes: 78701, 78702, 78703

4. **Southwest Austin**
   - Includes Circle C, Oak Hill areas
   - MLS Areas: 10, W
   - Zip Codes: 78735, 78736, 78739, 78745, 78748, 78749, 78752

5. **Westlake Hills**
   - Premium area near downtown and Lake Austin
   - MLS Areas: 8E, 8W, LS, SW, W
   - Zip Code: 78746

## Setup Instructions

1. **Install dependencies and initialize:**
   ```bash
   ./setup.sh
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Open http://localhost:3000
   - Interactive map with drawing tools
   - Reference links to source mapping sites

## Manual Polygon Creation Process

### Step 1: Research Phase
For each neighborhood:

1. Visit the reference maps (links provided in app):
   - Maps of Austin page for the neighborhood
   - Google Maps with neighborhood search
   - Apple Maps for comparison
   - Zillow neighborhood boundaries

2. Identify consensus boundaries:
   - Look for consistent boundary markers (roads, waterways, etc.)
   - Note differences between sources
   - Prioritize real estate/consumer perspective

### Step 2: Polygon Tracing

1. **Select neighborhood** from dropdown in the app
2. **Click "Start Drawing Polygon"**
3. **Click on map** to place boundary points
   - Follow major roads, geographic features
   - Aim for 15-30 points for smooth boundaries
   - Close attention to corners and curves

4. **Reference multiple sources** simultaneously:
   - Keep Maps of Austin page open in another tab
   - Cross-check with Google Maps
   - Verify with Zillow boundaries

5. **Finish polygon** when boundary is complete
   - Minimum 3 points required
   - System automatically closes the polygon

### Step 3: Validation

1. **Visual inspection** of created polygon
2. **Compare with reference sources**
3. **Iterate if needed** (clear and redraw)
4. **Save final version**

## Command Line Tools

### Database Operations
```bash
# List all neighborhoods
node scripts/polygon-helper.js list

# Add a single point
node scripts/polygon-helper.js add-point "East Austin" 30.2672 -97.7431 1

# View points for a neighborhood  
node scripts/polygon-helper.js get-points "East Austin"

# Convert points to GeoJSON and save
node scripts/polygon-helper.js save-geojson "East Austin"
```

### Database Schema

```sql
-- Neighborhoods table
neighborhoods (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  description TEXT,
  boundaries_description TEXT,
  polygon_geojson TEXT,
  mls_areas TEXT,
  zip_codes TEXT,
  created_at DATETIME,
  updated_at DATETIME
)

-- Individual polygon points
polygon_points (
  id INTEGER PRIMARY KEY,
  neighborhood_id INTEGER,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  point_order INTEGER NOT NULL,
  source TEXT
)
```

## Output Format

Polygons are stored as GeoJSON Features:

```json
{
  "type": "Feature",
  "properties": {
    "name": "East Austin"
  },
  "geometry": {
    "type": "Polygon", 
    "coordinates": [
      [
        [-97.7431, 30.2672],
        [-97.7329, 30.2695],
        // ... more coordinate pairs
        [-97.7431, 30.2672]
      ]
    ]
  }
}
```

## Deployment

### Quick Vercel Deployment:

```bash
./deploy-vercel.sh
```

### Manual Deployment:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

### Data Storage:
- Uses JSON files for polygon data (vercel-compatible)
- No database compilation issues
- Easy to version control and backup
- Suitable for moderate data volumes

### Live Demo:
After deployment, the application provides:
- Interactive map interface
- 5 pre-loaded Austin neighborhoods
- Visual polygon drawing tools
- Reference links to mapping services
- Real-time polygon validation

## Quality Criteria

**Good polygon criteria:**
- Matches multiple source boundaries closely
- Follows recognizable geographic features (roads, waterways)
- Reflects real estate market perception
- Smooth, reasonable boundary curves
- Appropriate level of detail (not too few/too many points)

**Validation checklist:**
- [ ] Matches mapsofaustin.com description
- [ ] Consistent with Google Maps neighborhood search
- [ ] Aligns with Zillow neighborhood boundaries
- [ ] Uses logical boundary markers (major roads, etc.)
- [ ] Reflects local real estate perspective

## Contributing

1. Research each neighborhood thoroughly
2. Create polygons based on visual analysis
3. Document any discrepancies between sources
4. Prioritize real estate/consumer perspective over official boundaries
5. Test polygon quality against multiple mapping services

## License

This project is for educational and real estate analysis purposes. Boundary data is manually researched and traced based on publicly available mapping services.