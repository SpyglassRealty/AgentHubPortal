import fs from 'fs';
import path from 'path';

function loadData() {
  const dataPath = path.join(process.cwd(), 'data', 'neighborhoods-data.json');
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveData(data) {
  const dataPath = path.join(process.cwd(), 'data', 'neighborhoods-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { neighborhoodName, points } = req.body;
      
      if (!neighborhoodName || !points || points.length < 3) {
        return res.status(400).json({ error: 'Invalid neighborhood name or points' });
      }

      const data = loadData();
      const neighborhood = data.neighborhoods.find(n => n.name === neighborhoodName);
      
      if (!neighborhood) {
        return res.status(404).json({ error: 'Neighborhood not found' });
      }

      // Create GeoJSON
      const coordinates = points.map(point => [point[1], point[0]]); // [lng, lat] for GeoJSON
      coordinates.push(coordinates[0]); // Close the polygon

      const geoJSON = {
        type: "Feature",
        properties: {
          name: neighborhoodName
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates]
        }
      };

      // Update neighborhood
      neighborhood.points = points.map((point, index) => ({
        latitude: point[0],
        longitude: point[1],
        order: index + 1
      }));
      neighborhood.polygon = geoJSON;

      saveData(data);
      
      res.status(200).json({ success: true, message: 'Polygon saved successfully' });
    } catch (error) {
      console.error('Error saving polygon:', error);
      res.status(500).json({ error: 'Failed to save polygon' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}