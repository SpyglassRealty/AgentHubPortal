/**
 * Polygon Helper Script
 * This script provides utilities to help manually trace neighborhood boundaries
 * by analyzing visual boundaries from Google Maps, Apple Maps, and real estate sites
 */

const Database = require('better-sqlite3');
const path = require('path');

class PolygonHelper {
  constructor() {
    this.db = new Database(path.join(__dirname, '../data/neighborhoods.db'));
  }

  // Add a polygon point for a neighborhood
  addPolygonPoint(neighborhoodName, latitude, longitude, pointOrder, source = 'manual') {
    const neighborhood = this.db.prepare('SELECT id FROM neighborhoods WHERE name = ?').get(neighborhoodName);
    if (!neighborhood) {
      throw new Error(`Neighborhood '${neighborhoodName}' not found`);
    }

    const insert = this.db.prepare(`
      INSERT INTO polygon_points (neighborhood_id, latitude, longitude, point_order, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(neighborhood.id, latitude, longitude, pointOrder, source);
    console.log(`Added point ${pointOrder} for ${neighborhoodName}: ${latitude}, ${longitude}`);
  }

  // Get all polygon points for a neighborhood
  getPolygonPoints(neighborhoodName) {
    const points = this.db.prepare(`
      SELECT pp.latitude, pp.longitude, pp.point_order, pp.source
      FROM polygon_points pp
      JOIN neighborhoods n ON pp.neighborhood_id = n.id
      WHERE n.name = ?
      ORDER BY pp.point_order
    `).all(neighborhoodName);

    return points;
  }

  // Convert polygon points to GeoJSON
  polygonToGeoJSON(neighborhoodName) {
    const points = this.getPolygonPoints(neighborhoodName);
    if (points.length === 0) return null;

    const coordinates = points.map(p => [p.longitude, p.latitude]);
    // Close the polygon by adding the first point at the end
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    return {
      type: "Feature",
      properties: {
        name: neighborhoodName
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      }
    };
  }

  // Save GeoJSON polygon to database
  savePolygonGeoJSON(neighborhoodName) {
    const geoJSON = this.polygonToGeoJSON(neighborhoodName);
    if (!geoJSON) return;

    const update = this.db.prepare(`
      UPDATE neighborhoods 
      SET polygon_geojson = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `);

    update.run(JSON.stringify(geoJSON), neighborhoodName);
    console.log(`Saved GeoJSON for ${neighborhoodName}`);
  }

  // Get all neighborhoods with their polygon data
  getAllNeighborhoods() {
    return this.db.prepare(`
      SELECT name, source, description, boundaries_description, polygon_geojson,
             (SELECT COUNT(*) FROM polygon_points pp WHERE pp.neighborhood_id = neighborhoods.id) as point_count
      FROM neighborhoods
      ORDER BY name
    `).all();
  }

  close() {
    this.db.close();
  }
}

// Command line interface
if (require.main === module) {
  const helper = new PolygonHelper();
  
  const command = process.argv[2];
  const neighborhoodName = process.argv[3];

  switch (command) {
    case 'add-point':
      const lat = parseFloat(process.argv[4]);
      const lng = parseFloat(process.argv[5]);
      const order = parseInt(process.argv[6]);
      helper.addPolygonPoint(neighborhoodName, lat, lng, order);
      break;

    case 'get-points':
      const points = helper.getPolygonPoints(neighborhoodName);
      console.log(JSON.stringify(points, null, 2));
      break;

    case 'save-geojson':
      helper.savePolygonGeoJSON(neighborhoodName);
      break;

    case 'list':
      const neighborhoods = helper.getAllNeighborhoods();
      console.table(neighborhoods);
      break;

    default:
      console.log(`
Usage: node polygon-helper.js <command> [args]

Commands:
  add-point <neighborhood> <lat> <lng> <order>  Add a polygon point
  get-points <neighborhood>                     Get all points for a neighborhood
  save-geojson <neighborhood>                   Convert points to GeoJSON and save
  list                                          List all neighborhoods

Example:
  node polygon-helper.js add-point "East Austin" 30.2672 -97.7431 1
      `);
  }

  helper.close();
}

module.exports = PolygonHelper;