# Austin Neighborhoods Map

A web application that displays Austin, TX neighborhood boundaries using official City of Austin data.

## Features

- Interactive map showing all 95 Austin neighborhood planning areas
- Color-coded neighborhoods by planning status:
  - **Green**: Plan Approved
  - **Orange**: Suspended
  - **Gray**: Non-Neighborhood Planning Area
- Click on neighborhoods to see detailed information
- Responsive design that works on desktop and mobile

## Data Source

This application uses official neighborhood boundary data from the City of Austin's Open Data Portal:
- **Dataset**: Boundaries: City of Austin Neighborhoods
- **URL**: https://data.austintexas.gov/Locations-and-Maps/Boundaries-City-of-Austin-Neighborhoods/inrm-c3ee
- **Format**: GeoJSON with MultiPolygon geometries
- **Total Neighborhoods**: 95

## Technical Stack

- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **Mapping**: Leaflet.js
- **Database**: SQLite
- **Deployment**: Vercel

## Running Locally

1. Clone the repository
2. Create virtual environment: `python3 -m venv venv`
3. Activate virtual environment: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run the application: `python app.py`
6. Open http://localhost:9000 in your browser

## API Endpoints

- `GET /` - Main map interface
- `GET /api/neighborhoods` - Returns all neighborhoods as GeoJSON
- `GET /api/neighborhoods/<name>` - Returns specific neighborhood details

## Files

- `app.py` - Flask application
- `import_data.py` - Script to import GeoJSON data into SQLite
- `austin_neighborhoods.geojson` - Original data from City of Austin
- `austin_neighborhoods.db` - SQLite database with imported data
- `templates/index.html` - Main web interface
- `vercel.json` - Vercel deployment configuration

## Development Notes

This is a testing application created to evaluate the quality of Austin neighborhood boundary polygons for potential use in the Spyglass real estate platform. The polygon data appears to be high quality with detailed boundaries that would be suitable for MLS integration.

## Next Steps

- Evaluate polygon accuracy for real estate applications
- Consider integration with MLS property data
- Assess performance with larger datasets
- Evaluate user interface for real estate professionals

## License

Data provided by City of Austin under Open Data License.
Code available under MIT License.// deploy trigger Thu Feb 19 04:51:18 CST 2026
