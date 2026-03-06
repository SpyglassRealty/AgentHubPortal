import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import map component dynamically to avoid SSR issues
const MapComponent = dynamic(() => import('../components/NeighborhoodMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});

export default function Home() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);

  useEffect(() => {
    // Load neighborhoods from API
    fetch('/api/neighborhoods')
      .then(res => res.json())
      .then(data => setNeighborhoods(data))
      .catch(err => console.error('Error loading neighborhoods:', err));
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem', background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <h1>Austin Neighborhood Polygons - Visual Analysis</h1>
        <p>Community-recognized boundaries based on mapsofaustin.com and consumer mapping services</p>
        
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="neighborhood-select">Select Neighborhood: </label>
          <select 
            id="neighborhood-select"
            value={selectedNeighborhood?.name || ''}
            onChange={(e) => {
              const neighborhood = neighborhoods.find(n => n.name === e.target.value);
              setSelectedNeighborhood(neighborhood);
            }}
            style={{ padding: '0.5rem', marginLeft: '0.5rem' }}
          >
            <option value="">-- Select a neighborhood --</option>
            {neighborhoods.map(n => (
              <option key={n.name} value={n.name}>
                {n.name} ({n.point_count} points)
              </option>
            ))}
          </select>
        </div>

        {selectedNeighborhood && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '4px' }}>
            <h3>{selectedNeighborhood.name}</h3>
            <p><strong>Source:</strong> {selectedNeighborhood.source}</p>
            <p><strong>Boundaries:</strong> {selectedNeighborhood.boundaries_description}</p>
            <p><strong>Description:</strong> {selectedNeighborhood.description}</p>
            <p><strong>Points defined:</strong> {selectedNeighborhood.point_count}</p>
          </div>
        )}
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <MapComponent 
          neighborhoods={neighborhoods}
          selectedNeighborhood={selectedNeighborhood}
          onNeighborhoodUpdate={() => {
            // Reload neighborhoods after update
            fetch('/api/neighborhoods')
              .then(res => res.json())
              .then(data => setNeighborhoods(data));
          }}
        />
      </main>
    </div>
  );
}