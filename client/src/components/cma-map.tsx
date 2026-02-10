// CMA Map Component - Contract Conduit compatibility
// Basic Mapbox integration for CMA presentations

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { CmaProperty } from './cma-presentation/types';
import { formatCurrency } from '@/lib/cma-data-utils';

// Mapbox access token - using the one from existing CMA preview
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3B5Z2xhc3NyZWFsdHkiLCJhIjoiY21sYmJjYjR5MG5teDNkb29oYnlldGJ6bCJ9.h6al6oHtIP5YiiIW97zhDw';

interface CMAMapProps {
  properties: CmaProperty[];
  subjectProperty?: CmaProperty;
  selectedPropertyId?: string;
  onPropertyClick?: (property: CmaProperty) => void;
  className?: string;
  height?: string;
}

export function CMAMap({
  properties,
  subjectProperty,
  selectedPropertyId,
  onPropertyClick,
  className = '',
  height = '400px'
}: CMAMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map>();
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate center point
    const allProperties = subjectProperty ? [subjectProperty, ...properties] : properties;
    const propertiesWithCoords = allProperties.filter(p => p.latitude && p.longitude);
    
    if (propertiesWithCoords.length === 0) {
      return;
    }

    let centerLat = propertiesWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / propertiesWithCoords.length;
    let centerLng = propertiesWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / propertiesWithCoords.length;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 11
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add subject property marker
    if (subjectProperty?.latitude && subjectProperty?.longitude) {
      const el = document.createElement('div');
      el.className = 'marker subject-property';
      el.style.cssText = `
        background-color: #EF4923;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      `;
      el.innerHTML = 'S';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([subjectProperty.longitude, subjectProperty.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-2">Subject Property</h3>
                <p class="text-xs mb-1">${subjectProperty.address}</p>
                <p class="text-xs mb-1">${subjectProperty.beds} bed, ${subjectProperty.baths} bath</p>
                <p class="text-xs mb-1">${subjectProperty.sqft.toLocaleString()} sqft</p>
                <p class="font-semibold text-sm text-orange-600">${formatCurrency(subjectProperty.listPrice || subjectProperty.price)}</p>
              </div>
            `)
        )
        .addTo(map.current);

      if (onPropertyClick) {
        el.addEventListener('click', () => onPropertyClick(subjectProperty));
      }

      markers.current.push(marker);
    }

    // Add comparable property markers
    properties.forEach((property, index) => {
      if (!property.latitude || !property.longitude) return;

      const isSelected = property.id === selectedPropertyId;
      
      const el = document.createElement('div');
      el.className = `marker comparable-property ${isSelected ? 'selected' : ''}`;
      el.style.cssText = `
        background-color: ${isSelected ? '#10B981' : '#3B82F6'};
        width: 25px;
        height: 25px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 10px;
      `;
      el.innerHTML = (index + 1).toString();

      const marker = new mapboxgl.Marker(el)
        .setLngLat([property.longitude, property.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-2">Comparable ${index + 1}</h3>
                <p class="text-xs mb-1">${property.address}</p>
                <p class="text-xs mb-1">${property.beds} bed, ${property.baths} bath</p>
                <p class="text-xs mb-1">${property.sqft.toLocaleString()} sqft</p>
                <p class="text-xs mb-1">${property.daysOnMarket} DOM</p>
                <p class="font-semibold text-sm text-blue-600">${formatCurrency(property.soldPrice || property.listPrice || property.price)}</p>
                <p class="text-xs text-gray-600">${property.status}</p>
              </div>
            `)
        )
        .addTo(map.current);

      if (onPropertyClick) {
        el.addEventListener('click', () => onPropertyClick(property));
      }

      markers.current.push(marker);
    });

    // Fit map to show all markers
    if (markers.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [properties, subjectProperty, selectedPropertyId, mapLoaded, onPropertyClick]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg overflow-hidden"
        style={{ height }}
      />
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#EF4923] rounded-full border-2 border-white flex items-center justify-center text-white font-bold" style={{fontSize: '8px'}}>
              S
            </div>
            <span>Subject Property</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#3B82F6] rounded-full border border-white"></div>
            <span>Comparables</span>
          </div>
          {selectedPropertyId && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#10B981] rounded-full border border-white"></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}