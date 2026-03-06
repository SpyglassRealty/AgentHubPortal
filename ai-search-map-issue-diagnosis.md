# AI Search Map Centering Issue - Diagnosis

## Issue Description
When using AI search (e.g., "2 bedroom condos downtown under $2M"), the listings are correctly retrieved and displayed, but the map does not automatically center/zoom to show where these listings are located. The map remains at the default Austin-wide view.

## Root Cause
In `src/components/map/LeafletMap.tsx`, the map only auto-centers in two scenarios:

1. **On initial load**: If a `selectedCommunity` is present (lines 66-82)
2. **Never on listings change**: The listings update effect (starting line 118) only updates markers, but doesn't adjust the map bounds

## Current Behavior Flow
1. User performs AI search: "2 bedroom condos downtown under $2M"
2. API returns listings with coordinates  
3. `handleSearchResults` in `page.tsx` receives results
4. If a community was matched (e.g., "downtown"), it sets `selectedCommunity`
5. LeafletMap receives new listings but only centers if there's a community polygon
6. For searches without explicit community match, map stays at default view

## The Fix
Add map bounds fitting when listings change in LeafletMap.tsx:

```typescript
// In the listings update effect (after line 126)
useEffect(() => {
  if (!isLoaded || !mapRef.current || !L) return;

  const map = mapRef.current;
  
  // Clear old markers
  markersRef.current.forEach(marker => marker.remove());
  markersRef.current.clear();

  // If we have listings, fit map to show all of them
  if (listings.length > 0 && !selectedCommunity) {
    const bounds = L.latLngBounds(
      listings.map(listing => [listing.coordinates.lat, listing.coordinates.lng])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }

  // Add new markers...
  // (rest of the existing code)
```

## Why This Works
- When AI search returns listings, the map will automatically adjust to show all results
- If a community is selected, it takes precedence (existing behavior)  
- If no community but listings exist, fit to listings bounds
- Padding ensures markers aren't cut off at edges
- maxZoom prevents over-zooming for single listings

## Safe Implementation
The fix is minimal and safe:
- Only affects map view, not data or search logic
- Preserves existing community-based centering
- Falls back gracefully if no listings
- Uses existing Leaflet APIs