import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

function ClickHandler({ onMapClick, isDrawingMode }) {
  useMapEvents({
    click: (e) => {
      if (isDrawingMode && onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

export default function NeighborhoodMap({ neighborhoods, selectedNeighborhood, onNeighborhoodUpdate }) {
  const [drawingMode, setDrawingMode] = useState(false);
  const [tempPoints, setTempPoints] = useState([]);
  const [neighborhoodPolygons, setNeighborhoodPolygons] = useState({});

  // Austin center coordinates
  const austinCenter = [30.2672, -97.7431];

  useEffect(() => {
    // Load existing polygons for all neighborhoods
    neighborhoods.forEach(neighborhood => {
      if (neighborhood.polygon_geojson) {
        try {
          const geoJSON = JSON.parse(neighborhood.polygon_geojson);
          if (geoJSON.geometry && geoJSON.geometry.coordinates) {
            const coords = geoJSON.geometry.coordinates[0];
            // Convert from [lng, lat] to [lat, lng] for leaflet
            const leafletCoords = coords.map(([lng, lat]) => [lat, lng]);
            setNeighborhoodPolygons(prev => ({
              ...prev,
              [neighborhood.name]: leafletCoords
            }));
          }
        } catch (e) {
          console.error('Error parsing GeoJSON for', neighborhood.name, e);
        }
      }
    });
  }, [neighborhoods]);

  const handleMapClick = (latlng) => {
    if (drawingMode && selectedNeighborhood) {
      setTempPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
    }
  };

  const startDrawing = () => {
    if (!selectedNeighborhood) {
      alert('Please select a neighborhood first');
      return;
    }
    setDrawingMode(true);
    setTempPoints([]);
  };

  const finishDrawing = async () => {
    if (tempPoints.length < 3) {
      alert('Need at least 3 points to create a polygon');
      return;
    }

    try {
      // Save points to database
      const response = await fetch('/api/neighborhoods/save-polygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neighborhoodName: selectedNeighborhood.name,
          points: tempPoints
        })
      });

      if (response.ok) {
        setNeighborhoodPolygons(prev => ({
          ...prev,
          [selectedNeighborhood.name]: [...tempPoints, tempPoints[0]] // Close the polygon
        }));
        setDrawingMode(false);
        setTempPoints([]);
        onNeighborhoodUpdate();
        alert('Polygon saved successfully!');
      } else {
        throw new Error('Failed to save polygon');
      }
    } catch (error) {
      console.error('Error saving polygon:', error);
      alert('Error saving polygon: ' + error.message);
    }
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setTempPoints([]);
  };

  const clearPolygon = async () => {
    if (!selectedNeighborhood) return;
    if (!confirm(`Clear polygon for ${selectedNeighborhood.name}?`)) return;

    try {
      const response = await fetch(`/api/neighborhoods/clear-polygon?name=${encodeURIComponent(selectedNeighborhood.name)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNeighborhoodPolygons(prev => {
          const newPolygons = { ...prev };
          delete newPolygons[selectedNeighborhood.name];
          return newPolygons;
        });
        onNeighborhoodUpdate();
        alert('Polygon cleared!');
      }
    } catch (error) {
      console.error('Error clearing polygon:', error);
      alert('Error clearing polygon');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Drawing controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '1rem',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Drawing Tools</strong>
        </div>
        
        {!drawingMode ? (
          <>
            <button onClick={startDrawing} style={{ marginRight: '0.5rem' }}>
              Start Drawing Polygon
            </button>
            <button onClick={clearPolygon} disabled={!selectedNeighborhood}>
              Clear Polygon
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.9em' }}>
              Drawing: {selectedNeighborhood?.name}<br/>
              Points: {tempPoints.length}<br/>
              Click on map to add points
            </div>
            <button onClick={finishDrawing} style={{ marginRight: '0.5rem' }}>
              Finish Polygon
            </button>
            <button onClick={cancelDrawing}>
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Reference links */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '1rem',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        maxWidth: '300px'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Reference Maps</strong>
        </div>
        <div style={{ fontSize: '0.9em' }}>
          <a href="https://www.mapsofaustin.com" target="_blank" rel="noopener">Maps of Austin</a><br/>
          <a href="https://www.google.com/maps/@30.2672,-97.7431,11z" target="_blank" rel="noopener">Google Maps</a><br/>
          <a href="https://maps.apple.com/?ll=30.2672,-97.7431&z=11" target="_blank" rel="noopener">Apple Maps</a><br/>
          <a href="https://www.zillow.com/austin-tx/" target="_blank" rel="noopener">Zillow Austin</a>
        </div>
      </div>

      <MapContainer 
        center={austinCenter} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ClickHandler onMapClick={handleMapClick} isDrawingMode={drawingMode} />
        
        {/* Existing neighborhood polygons */}
        {Object.entries(neighborhoodPolygons).map(([name, coords]) => (
          <Polygon
            key={name}
            positions={coords}
            pathOptions={{
              color: selectedNeighborhood?.name === name ? '#ff0000' : '#3388ff',
              weight: selectedNeighborhood?.name === name ? 3 : 2,
              fillOpacity: 0.2
            }}
          >
            <Popup>{name}</Popup>
          </Polygon>
        ))}
        
        {/* Temporary points while drawing */}
        {tempPoints.map((point, index) => (
          <Marker key={index} position={point}>
            <Popup>Point {index + 1}</Popup>
          </Marker>
        ))}
        
        {/* Preview polygon while drawing */}
        {tempPoints.length > 2 && (
          <Polygon
            positions={tempPoints}
            pathOptions={{
              color: '#ff8800',
              weight: 2,
              fillOpacity: 0.3,
              dashArray: '5, 5'
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}