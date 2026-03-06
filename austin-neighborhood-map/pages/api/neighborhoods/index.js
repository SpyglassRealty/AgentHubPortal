import fs from 'fs';
import path from 'path';

function loadData() {
  const dataPath = path.join(process.cwd(), 'data', 'neighborhoods-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return data.neighborhoods.map(n => ({
    ...n,
    boundaries_description: n.boundaries,
    polygon_geojson: n.polygon ? JSON.stringify(n.polygon) : null,
    point_count: n.points ? n.points.length : 0
  }));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const neighborhoods = loadData();
      res.status(200).json(neighborhoods);
    } catch (error) {
      console.error('Error loading neighborhoods:', error);
      res.status(500).json({ error: 'Failed to fetch neighborhoods' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}