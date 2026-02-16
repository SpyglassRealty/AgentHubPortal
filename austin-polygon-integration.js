// Austin Neighborhood Polygons - Ready for IDX Integration
// Based on Zillow boundaries and real estate market perception

const austinNeighborhoods = [
  {
    name: "East Austin",
    description: "East of IH-35, includes East 6th Street, Mueller, and Airport corridor",
    coordinates: [
      [30.3074, -97.7164], [30.3074, -97.6900], [30.2950, -97.6800],
      [30.2800, -97.6600], [30.2600, -97.6500], [30.2400, -97.6600],
      [30.2200, -97.6800], [30.2100, -97.7000], [30.2200, -97.7164],
      [30.3074, -97.7164]
    ],
    zipCodes: ["78702", "78721", "78724", "78741"],
    color: "#FF6B6B",
    marketSegment: "Emerging/Trendy",
    priceRange: "$300K-$600K"
  },
  {
    name: "Central Austin", 
    description: "Downtown, UT campus, South Lamar, Zilker Park area",
    coordinates: [
      [30.3200, -97.7600], [30.3200, -97.7164], [30.2900, -97.7164],
      [30.2700, -97.7200], [30.2500, -97.7300], [30.2400, -97.7400],
      [30.2300, -97.7500], [30.2400, -97.7600], [30.2600, -97.7650],
      [30.2800, -97.7650], [30.3000, -97.7620], [30.3200, -97.7600]
    ],
    zipCodes: ["78701", "78703", "78704", "78705"],
    color: "#4ECDC4",
    marketSegment: "Urban Core",
    priceRange: "$400K-$1M+"
  },
  {
    name: "Westlake Hills",
    description: "Premium area near Lake Austin, Westlake High School district", 
    coordinates: [
      [30.2900, -97.8200], [30.2900, -97.7800], [30.2800, -97.7700],
      [30.2700, -97.7650], [30.2600, -97.7650], [30.2500, -97.7700],
      [30.2400, -97.7800], [30.2300, -97.7900], [30.2200, -97.8000],
      [30.2200, -97.8200], [30.2300, -97.8300], [30.2500, -97.8350],
      [30.2700, -97.8300], [30.2900, -97.8200]
    ],
    zipCodes: ["78746", "78733"],
    color: "#45B7D1",
    marketSegment: "Luxury",
    priceRange: "$800K-$3M+"
  },
  {
    name: "Southwest Austin",
    description: "Circle C, Oak Hill, Sunset Valley, Barton Hills area",
    coordinates: [
      [30.2400, -97.8200], [30.2400, -97.7164], [30.2200, -97.7164],
      [30.2000, -97.7200], [30.1800, -97.7300], [30.1600, -97.7500],
      [30.1500, -97.7800], [30.1600, -97.8000], [30.1800, -97.8100],
      [30.2000, -97.8150], [30.2200, -97.8200], [30.2400, -97.8200]
    ],
    zipCodes: ["78739", "78745", "78749", "78735"],
    color: "#96CEB4",
    marketSegment: "Family/Suburban", 
    priceRange: "$400K-$800K"
  },
  {
    name: "North Austin",
    description: "Domain, Arboretum, Cedar Park corridor, tech hub area",
    coordinates: [
      [30.4200, -97.8000], [30.4200, -97.6800], [30.4000, -97.6700],
      [30.3800, -97.6700], [30.3600, -97.6800], [30.3400, -97.6900],
      [30.3200, -97.7000], [30.3100, -97.7200], [30.3200, -97.7400],
      [30.3400, -97.7600], [30.3600, -97.7700], [30.3800, -97.7800],
      [30.4000, -97.7900], [30.4200, -97.8000]
    ],
    zipCodes: ["78727", "78729", "78750", "78759"],
    color: "#FECA57",
    marketSegment: "Tech/Professional",
    priceRange: "$500K-$1.2M"
  },
  {
    name: "South Austin",
    description: "South of the River, including Bouldin Creek, Travis Heights",
    coordinates: [
      [30.2500, -97.7700], [30.2500, -97.7164], [30.2200, -97.7164],
      [30.2000, -97.7200], [30.1800, -97.7300], [30.1700, -97.7400],
      [30.1600, -97.7500], [30.1700, -97.7600], [30.1900, -97.7650],
      [30.2100, -97.7700], [30.2300, -97.7720], [30.2500, -97.7700]
    ],
    zipCodes: ["78704", "78745"],
    color: "#FF9FF3",
    marketSegment: "Hip/Creative",
    priceRange: "$450K-$900K"
  },
  {
    name: "Mueller",
    description: "New development on former airport site, mixed-use community",
    coordinates: [
      [30.3000, -97.7000], [30.3000, -97.6800], [30.2900, -97.6700],
      [30.2800, -97.6700], [30.2700, -97.6800], [30.2700, -97.7000],
      [30.2800, -97.7100], [30.2900, -97.7100], [30.3000, -97.7000]
    ],
    zipCodes: ["78723"],
    color: "#54A0FF",
    marketSegment: "New Development",
    priceRange: "$500K-$800K"
  },
  {
    name: "Tarrytown",
    description: "Upscale central neighborhood west of downtown",
    coordinates: [
      [30.2900, -97.7700], [30.2900, -97.7500], [30.2800, -97.7450],
      [30.2700, -97.7450], [30.2600, -97.7500], [30.2600, -97.7700],
      [30.2700, -97.7750], [30.2800, -97.7750], [30.2900, -97.7700]
    ],
    zipCodes: ["78703"],
    color: "#5F27CD",
    marketSegment: "Upscale Central",
    priceRange: "$700K-$2M+"
  }
];

// IDX Integration Functions

function addNeighborhoodsToMap(map) {
  austinNeighborhoods.forEach(neighborhood => {
    const polygon = L.polygon(neighborhood.coordinates, {
      color: neighborhood.color,
      fillColor: neighborhood.color,
      fillOpacity: 0.3,
      weight: 2
    }).addTo(map);

    // Add popup with neighborhood info
    const popupContent = `
      <div style="font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: ${neighborhood.color};">
          ${neighborhood.name}
        </h3>
        <p style="margin: 0 0 6px 0; font-size: 12px;">
          ${neighborhood.description}
        </p>
        <div style="font-size: 11px; color: #666;">
          <strong>Price Range:</strong> ${neighborhood.priceRange}<br>
          <strong>Market:</strong> ${neighborhood.marketSegment}<br>
          <strong>Zip Codes:</strong> ${neighborhood.zipCodes.join(', ')}
        </div>
      </div>
    `;
    
    polygon.bindPopup(popupContent);
    
    // Add click handler for search integration
    polygon.on('click', () => {
      searchPropertiesInNeighborhood(neighborhood);
    });
  });
}

function searchPropertiesInNeighborhood(neighborhood) {
  // Integration with MLS/IDX search
  const searchParams = {
    polygon: neighborhood.coordinates,
    zipCodes: neighborhood.zipCodes,
    neighborhood: neighborhood.name,
    priceMin: extractMinPrice(neighborhood.priceRange),
    priceMax: extractMaxPrice(neighborhood.priceRange)
  };
  
  console.log('Searching properties in:', neighborhood.name, searchParams);
  
  // Your IDX search function here
  // performMLSSearch(searchParams);
}

function extractMinPrice(priceRange) {
  const match = priceRange.match(/\$(\d+)K/);
  return match ? parseInt(match[1]) * 1000 : null;
}

function extractMaxPrice(priceRange) {
  const match = priceRange.match(/\$(\d+)K-\$(\d+(?:\.\d+)?)[MK]/);
  if (match) {
    const num = parseFloat(match[2]);
    const unit = match[0].includes('M') ? 1000000 : 1000;
    return num * unit;
  }
  return null;
}

// Neighborhood filtering for lead capture forms
function getNeighborhoodOptions() {
  return austinNeighborhoods.map(n => ({
    value: n.name,
    label: n.name,
    description: n.description,
    priceRange: n.priceRange
  }));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    austinNeighborhoods,
    addNeighborhoodsToMap,
    searchPropertiesInNeighborhood,
    getNeighborhoodOptions
  };
}

// Example usage:
// const map = L.map('map').setView([30.2672, -97.7431], 11);
// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
// addNeighborhoodsToMap(map);