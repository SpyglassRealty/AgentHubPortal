// IDX Site Area Options - Ready for Dropdowns and Search
// Austin Metro Area: Neighborhoods, Cities, and Zip Codes

const IDX_AREA_OPTIONS = {
  
  // Dropdown options for lead capture forms
  neighborhood_options: [
    { value: "allandale", label: "Allandale", city: "Austin", price_range: "$500K-$900K" },
    { value: "barton-hills", label: "Barton Hills", city: "Austin", price_range: "$600K-$1.5M" },
    { value: "bouldin-creek", label: "Bouldin Creek", city: "Austin", price_range: "$400K-$800K" },
    { value: "clarksville", label: "Clarksville", city: "Austin", price_range: "$600K-$2M" },
    { value: "crestview", label: "Crestview", city: "Austin", price_range: "$400K-$700K" },
    { value: "east-6th", label: "East 6th Street", city: "Austin", price_range: "$350K-$650K" },
    { value: "french-place", label: "French Place", city: "Austin", price_range: "$450K-$800K" },
    { value: "govalle", label: "Govalle", city: "Austin", price_range: "$300K-$600K" },
    { value: "holly", label: "Holly", city: "Austin", price_range: "$350K-$650K" },
    { value: "hyde-park", label: "Hyde Park", city: "Austin", price_range: "$500K-$1M" },
    { value: "kenwood", label: "Kenwood", city: "Austin", price_range: "$550K-$950K" },
    { value: "mueller", label: "Mueller", city: "Austin", price_range: "$500K-$800K" },
    { value: "north-loop", label: "North Loop", city: "Austin", price_range: "$450K-$800K" },
    { value: "rosedale", label: "Rosedale", city: "Austin", price_range: "$600K-$1.2M" },
    { value: "south-lamar", label: "South Lamar", city: "Austin", price_range: "$500K-$1M" },
    { value: "south-park-meadows", label: "South Park Meadows", city: "Austin", price_range: "$300K-$500K" },
    { value: "tarrytown", label: "Tarrytown", city: "Austin", price_range: "$700K-$2M+" },
    { value: "travis-heights", label: "Travis Heights", city: "Austin", price_range: "$500K-$1.2M" },
    { value: "westlake-hills", label: "Westlake Hills", city: "Westlake Hills", price_range: "$1M-$5M+" },
    { value: "zilker", label: "Zilker", city: "Austin", price_range: "$600K-$1.5M" }
  ],

  city_options: [
    { value: "austin", label: "Austin", type: "primary", population: "1M+" },
    { value: "cedar-park", label: "Cedar Park", type: "suburb", distance: "20 miles NW" },
    { value: "leander", label: "Leander", type: "suburb", distance: "25 miles NW" },
    { value: "round-rock", label: "Round Rock", type: "suburb", distance: "20 miles N" },
    { value: "georgetown", label: "Georgetown", type: "suburb", distance: "30 miles N" },
    { value: "pflugerville", label: "Pflugerville", type: "suburb", distance: "15 miles NE" },
    { value: "hutto", label: "Hutto", type: "suburb", distance: "25 miles NE" },
    { value: "lakeway", label: "Lakeway", type: "lake_community", distance: "20 miles W" },
    { value: "bee-cave", label: "Bee Cave", type: "upscale", distance: "15 miles W" },
    { value: "dripping-springs", label: "Dripping Springs", type: "hill_country", distance: "25 miles W" },
    { value: "buda", label: "Buda", type: "small_town", distance: "15 miles S" },
    { value: "kyle", label: "Kyle", type: "growing", distance: "20 miles S" },
    { value: "san-marcos", label: "San Marcos", type: "university", distance: "30 miles S" },
    { value: "bastrop", label: "Bastrop", type: "historic", distance: "30 miles E" },
    { value: "elgin", label: "Elgin", type: "rural", distance: "25 miles E" },
    { value: "manor", label: "Manor", type: "emerging", distance: "12 miles E" }
  ],

  // Price range filters for search
  price_ranges: [
    { value: "under-300k", label: "Under $300K", min: 0, max: 300000 },
    { value: "300k-500k", label: "$300K - $500K", min: 300000, max: 500000 },
    { value: "500k-700k", label: "$500K - $700K", min: 500000, max: 700000 },
    { value: "700k-1m", label: "$700K - $1M", min: 700000, max: 1000000 },
    { value: "1m-2m", label: "$1M - $2M", min: 1000000, max: 2000000 },
    { value: "over-2m", label: "Over $2M", min: 2000000, max: 999999999 }
  ],

  // School district filters
  school_districts: [
    { value: "austin-isd", label: "Austin ISD", zip_codes: ["78701", "78703", "78704", "78705", "78751", "78752", "78756", "78757"] },
    { value: "leander-isd", label: "Leander ISD", zip_codes: ["78613", "78630", "78641", "78645"] },
    { value: "round-rock-isd", label: "Round Rock ISD", zip_codes: ["78664", "78665", "78681"] },
    { value: "lake-travis-isd", label: "Lake Travis ISD", zip_codes: ["78734", "78738", "78746"] },
    { value: "hays-cisd", label: "Hays CISD", zip_codes: ["78610", "78640"] },
    { value: "pflugerville-isd", label: "Pflugerville ISD", zip_codes: ["78660"] }
  ],

  // Area groupings for marketing
  market_segments: {
    luxury: {
      name: "Luxury Communities",
      areas: ["Westlake Hills", "Tarrytown", "Bee Cave", "Lakeway"],
      min_price: 700000,
      keywords: ["luxury", "upscale", "premium", "exclusive"]
    },
    family_friendly: {
      name: "Family-Friendly Areas", 
      areas: ["Cedar Park", "Leander", "Round Rock", "Georgetown", "Kyle"],
      min_price: 300000,
      keywords: ["family", "schools", "safe", "suburban"]
    },
    urban_core: {
      name: "Urban Living",
      areas: ["Downtown Austin", "South Lamar", "East 6th", "Mueller"],
      min_price: 400000,
      keywords: ["walkable", "restaurants", "nightlife", "condos"]
    },
    emerging: {
      name: "Up-and-Coming",
      areas: ["Crestview", "Govalle", "Holly", "Manor"],
      min_price: 300000,
      keywords: ["emerging", "trendy", "investment", "growth"]
    },
    hill_country: {
      name: "Hill Country",
      areas: ["Dripping Springs", "Bee Cave", "Westlake Hills"],
      min_price: 500000,
      keywords: ["hill country", "scenic", "nature", "views"]
    }
  },

  // Complete zip code database
  all_zip_codes: [
    // Central Austin
    { zip: "78701", area: "Downtown Austin", city: "Austin", type: "urban_core" },
    { zip: "78703", area: "Tarrytown/Clarksville", city: "Austin", type: "upscale" },
    { zip: "78704", area: "South Austin", city: "Austin", type: "trendy" },
    { zip: "78705", area: "UT/Hyde Park", city: "Austin", type: "university" },
    
    // East Austin
    { zip: "78702", area: "East Austin", city: "Austin", type: "emerging" },
    { zip: "78721", area: "East Austin", city: "Austin", type: "affordable" },
    { zip: "78722", area: "East Austin", city: "Austin", type: "historic" },
    { zip: "78723", area: "Mueller", city: "Austin", type: "new_development" },
    { zip: "78724", area: "East Austin", city: "Austin", type: "affordable" },
    
    // North Austin
    { zip: "78751", area: "North Central", city: "Austin", type: "established" },
    { zip: "78752", area: "North Austin", city: "Austin", type: "diverse" },
    { zip: "78753", area: "North Austin", city: "Austin", type: "affordable" },
    { zip: "78756", area: "Rosedale/Allandale", city: "Austin", type: "mid_century" },
    { zip: "78757", area: "Crestview", city: "Austin", type: "emerging" },
    { zip: "78758", area: "North Austin", city: "Austin", type: "suburban" },
    { zip: "78759", area: "North Austin", city: "Austin", type: "tech_corridor" },
    
    // South Austin  
    { zip: "78745", area: "South Austin", city: "Austin", type: "family" },
    { zip: "78748", area: "South Park Meadows", city: "Austin", type: "suburban" },
    { zip: "78749", area: "Circle C", city: "Austin", type: "family" },
    
    // West Austin
    { zip: "78733", area: "Steiner Ranch", city: "Austin", type: "luxury" },
    { zip: "78735", area: "Sunset Valley", city: "Austin", type: "family" },
    { zip: "78746", area: "Westlake Hills", city: "Westlake Hills", type: "luxury" },
    
    // Surrounding Cities
    { zip: "78610", area: "Buda", city: "Buda", type: "small_town" },
    { zip: "78613", area: "Cedar Park", city: "Cedar Park", type: "family_suburban" },
    { zip: "78620", area: "Dripping Springs", city: "Dripping Springs", type: "hill_country" },
    { zip: "78621", area: "Elgin", city: "Elgin", type: "rural" },
    { zip: "78626", area: "Georgetown", city: "Georgetown", type: "historic_charm" },
    { zip: "78628", area: "Georgetown", city: "Georgetown", type: "historic_charm" },
    { zip: "78630", area: "Cedar Park", city: "Cedar Park", type: "family_suburban" },
    { zip: "78633", area: "Georgetown", city: "Georgetown", type: "historic_charm" },
    { zip: "78634", area: "Hutto", city: "Hutto", type: "new_development" },
    { zip: "78640", area: "Kyle", city: "Kyle", type: "fast_growing" },
    { zip: "78641", area: "Leander", city: "Leander", type: "affordable_family" },
    { zip: "78645", area: "Leander", city: "Leander", type: "affordable_family" },
    { zip: "78653", area: "Manor", city: "Manor", type: "emerging" },
    { zip: "78660", area: "Pflugerville", city: "Pflugerville", type: "growing_suburban" },
    { zip: "78664", area: "Round Rock", city: "Round Rock", type: "tech_corridor" },
    { zip: "78665", area: "Round Rock", city: "Round Rock", type: "tech_corridor" },
    { zip: "78666", area: "San Marcos", city: "San Marcos", type: "university_town" },
    { zip: "78681", area: "Round Rock", city: "Round Rock", type: "tech_corridor" },
    { zip: "78734", area: "Lakeway", city: "Lakeway", type: "lake_community" },
    { zip: "78738", area: "Bee Cave", city: "Bee Cave", type: "upscale_suburban" },
    { zip: "78602", area: "Bastrop", city: "Bastrop", type: "historic_small_town" }
  ]
};

// Helper functions for IDX integration

function getNeighborhoodsByCity(city) {
  return IDX_AREA_OPTIONS.neighborhood_options.filter(n => n.city.toLowerCase() === city.toLowerCase());
}

function getZipCodesByArea(area) {
  return IDX_AREA_OPTIONS.all_zip_codes.filter(z => z.area.toLowerCase().includes(area.toLowerCase()));
}

function getAreasByPriceRange(minPrice, maxPrice) {
  return IDX_AREA_OPTIONS.neighborhood_options.filter(n => {
    const priceRange = n.price_range;
    // Parse price range string to numbers for comparison
    const min = parseInt(priceRange.match(/\$(\d+)K/)?.[1]) * 1000 || 0;
    return min >= minPrice && min <= maxPrice;
  });
}

function getMarketSegmentAreas(segment) {
  return IDX_AREA_OPTIONS.market_segments[segment] || null;
}

// Generate dropdown HTML
function generateAreaDropdown(includeNeighborhoods = true, includeCities = true) {
  let options = '<option value="">Select an Area</option>';
  
  if (includeCities) {
    options += '<optgroup label="Cities">';
    IDX_AREA_OPTIONS.city_options.forEach(city => {
      options += `<option value="${city.value}">${city.label}</option>`;
    });
    options += '</optgroup>';
  }
  
  if (includeNeighborhoods) {
    options += '<optgroup label="Austin Neighborhoods">';
    IDX_AREA_OPTIONS.neighborhood_options.forEach(neighborhood => {
      options += `<option value="${neighborhood.value}">${neighborhood.label}</option>`;
    });
    options += '</optgroup>';
  }
  
  return options;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IDX_AREA_OPTIONS,
    getNeighborhoodsByCity,
    getZipCodesByArea,
    getAreasByPriceRange,
    getMarketSegmentAreas,
    generateAreaDropdown
  };
}

// Example usage:
// const familyAreas = getMarketSegmentAreas('family_friendly');
// const muellerZips = getZipCodesByArea('Mueller');
// const luxuryNeighborhoods = getAreasByPriceRange(700000, 5000000);