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
  if (req.method === 'DELETE') {
    try {
      const { name } = req.query;
      
      if (!name) {
        return res.status(400).json({ error: 'Neighborhood name is required' });
      }

      const data = loadData();
      const neighborhood = data.neighborhoods.find(n => n.name === name);
      
      if (!neighborhood) {
        return res.status(404).json({ error: 'Neighborhood not found' });
      }

      // Clear polygon data
      neighborhood.points = [];
      neighborhood.polygon = null;

      saveData(data);
      
      res.status(200).json({ success: true, message: 'Polygon cleared successfully' });
    } catch (error) {
      console.error('Error clearing polygon:', error);
      res.status(500).json({ error: 'Failed to clear polygon' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}