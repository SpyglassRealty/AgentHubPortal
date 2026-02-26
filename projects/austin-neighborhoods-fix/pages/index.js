import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [savedPolygons, setSavedPolygons] = useState([]);
  const [drawing, setDrawing] = useState(false);

  const neighborhoods = [
    { name: 'East Austin', description: 'East of IH-35, diverse and growing area' },
    { name: 'Central Austin', description: 'Downtown and UT campus area' },
    { name: 'Westlake Hills', description: 'Premium area near Lake Austin' },
    { name: 'Southwest Austin', description: 'Circle C and Oak Hill areas' },
    { name: 'North Austin', description: 'Domain and Arboretum area' }
  ];

  useEffect(() => {
    // Initialize map after component mounts
    const initMap = () => {
      if (typeof window !== 'undefined' && window.L && !window.austinMap) {
        const L = window.L;
        const map = L.map('map').setView([30.2672, -97.7431], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        window.austinMap = map;
        
        // Add click handler
        map.on('click', (e) => {
          if (drawing) {
            const newPoint = [e.latlng.lat, e.latlng.lng];
            setCurrentPolygon(prev => [...prev, newPoint]);
            
            // Add visual marker
            L.circleMarker([e.latlng.lat, e.latlng.lng], {
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 0.5,
              radius: 5
            }).addTo(map);
          }
        });
      }
    };

    // Try immediate initialization
    initMap();
    
    // Also try after a delay in case Leaflet is still loading
    setTimeout(initMap, 1000);
  }, [drawing]);

  const startDrawing = () => {
    if (!selectedNeighborhood) {
      alert('Please select a neighborhood first');
      return;
    }
    setDrawing(true);
    setCurrentPolygon([]);
    
    if (window.austinMap) {
      window.austinMap.getContainer().style.cursor = 'crosshair';
    }
  };

  const finishPolygon = () => {
    if (currentPolygon.length >= 3) {
      const newPolygon = {
        neighborhood: selectedNeighborhood,
        coordinates: [...currentPolygon, currentPolygon[0]],
        createdAt: new Date().toISOString()
      };
      
      // Draw the completed polygon
      if (window.austinMap && window.L) {
        const L = window.L;
        L.polygon(currentPolygon, {
          color: 'blue',
          fillColor: '#30f',
          fillOpacity: 0.2
        }).addTo(window.austinMap).bindPopup(`${selectedNeighborhood} Boundary`);
      }
      
      setSavedPolygons(prev => [...prev, newPolygon]);
      clearDrawing();
    }
  };

  const clearDrawing = () => {
    setCurrentPolygon([]);
    setDrawing(false);
    
    if (window.austinMap) {
      window.austinMap.getContainer().style.cursor = '';
      // Clear all markers and polygons
      window.austinMap.eachLayer((layer) => {
        if (layer instanceof window.L.CircleMarker || layer instanceof window.L.Polygon) {
          window.austinMap.removeLayer(layer);
        }
      });
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>Austin Neighborhood Polygon Mapper</title>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
        />
      </Head>

      <div style={{ padding: '20px' }}>
        <h1>🗺️ Austin Neighborhood Polygon Mapper</h1>
        <p>Create neighborhood boundaries based on visual analysis of Maps of Austin and consumer mapping services.</p>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <label htmlFor="neighborhood-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
            Select Neighborhood:
          </label>
          <select
            id="neighborhood-select"
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            style={{ padding: '8px', marginRight: '10px', minWidth: '200px' }}
          >
            <option value="">Choose a neighborhood...</option>
            {neighborhoods.map((n, i) => (
              <option key={i} value={n.name}>{n.name}</option>
            ))}
          </select>

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={startDrawing}
              disabled={!selectedNeighborhood || drawing}
              style={{
                padding: '10px 20px',
                marginRight: '10px',
                backgroundColor: drawing ? '#6c757d' : '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: drawing ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {drawing ? '✏️ Drawing...' : '📍 Start Drawing Polygon'}
            </button>

            {drawing && (
              <>
                <button
                  onClick={finishPolygon}
                  disabled={currentPolygon.length < 3}
                  style={{
                    padding: '10px 20px',
                    marginRight: '10px',
                    backgroundColor: currentPolygon.length >= 3 ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  ✅ Finish ({currentPolygon.length} points)
                </button>
                
                <button
                  onClick={clearDrawing}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Clear
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <h3>🔗 Reference Links (Open in New Tabs):</h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <a 
              href="https://www.mapsofaustin.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}
            >
              📍 Maps of Austin
            </a>
            <a 
              href="https://www.google.com/maps/place/Austin,+TX" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}
            >
              🗺️ Google Maps
            </a>
            <a 
              href="https://www.zillow.com/austin-tx/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}
            >
              🏠 Zillow Austin
            </a>
          </div>
        </div>

        <div 
          id="map" 
          style={{ 
            height: '500px', 
            width: '100%', 
            border: '2px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#6c757d'
          }}>
            📍 Loading Map...
          </div>
        </div>

        {savedPolygons.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>💾 Saved Polygons:</h3>
            {savedPolygons.map((polygon, index) => (
              <div key={index} style={{ 
                padding: '15px', 
                border: '1px solid #ddd', 
                marginBottom: '10px',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa'
              }}>
                <strong>🏘️ {polygon.neighborhood}</strong> - {polygon.coordinates.length - 1} boundary points
                <br />
                <small>📅 Created: {new Date(polygon.createdAt).toLocaleString()}</small>
                <br />
                <small>📍 Coordinates: {JSON.stringify(polygon.coordinates.slice(0, 3))}... (truncated)</small>
              </div>
            ))}
          </div>
        )}

        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <h4>📋 Instructions:</h4>
          <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>📝 Select a neighborhood from the dropdown</li>
            <li>🔗 Open the reference links above in separate tabs</li>
            <li>🔍 Study the neighborhood boundaries on those maps</li>
            <li>📍 Click "Start Drawing Polygon" to begin tracing</li>
            <li>🖱️ Click on the map to trace the neighborhood boundary</li>
            <li>✅ Click "Finish Polygon" when you've outlined the area</li>
          </ol>
          <p style={{ margin: '10px 0', fontSize: '14px', color: '#856404' }}>
            💡 <strong>Tip:</strong> Focus on boundaries that match real estate market perception, not official city planning areas.
          </p>
        </div>
      </div>

      {/* Script removed - map now initialized in useEffect */}
    </div>
  );
}