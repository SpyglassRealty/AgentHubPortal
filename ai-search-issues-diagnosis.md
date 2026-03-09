# AI Search Issues - Complete Diagnosis

## Issue 1: Map Doesn't Update Location on New Search

### Problem
1. First search: "homes in South Austin" → map centers on South Austin ✓
2. Second search: "2 bedroom condos downtown" → listings update but map stays in South Austin ✗

### Root Cause
The map component doesn't re-center when a new AI search is performed unless a community polygon is explicitly matched. The `selectedCommunity` state might persist from the previous search.

### Why It Happens
In `src/app/page.tsx`, `handleSearchResults`:
```typescript
if (results.matchedCommunity?.name) {
  // Sets new community
  const matched = austinCommunities.find(...);
  setSelectedCommunity(matched);
} else {
  setSelectedCommunity(null); // Clears it, but map doesn't react
}
```

Even when `selectedCommunity` is cleared, the map doesn't know to fit bounds to the new listings.

### The Fix
Add a "search version" or "search ID" that changes with each search, and make the map react to it:

```typescript
// In page.tsx
const [searchVersion, setSearchVersion] = useState(0);

const handleSearchResults = (results) => {
  setSearchVersion(prev => prev + 1); // Increment on each new search
  // ... rest of logic
};

// In LeafletMap.tsx useEffect
useEffect(() => {
  if (!isLoaded || !mapRef.current || !L) return;
  
  // Fit to listings whenever searchVersion changes
  if (listings.length > 0 && !selectedCommunity) {
    const bounds = L.latLngBounds(
      listings.map(listing => [listing.coordinates.lat, listing.coordinates.lng])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
}, [listings, selectedCommunity, searchVersion]); // Add searchVersion as dependency
```

## Issue 2: Suggested Prompts Don't Always Work

### Problem
The suggested prompt "Modern condo downtown with a view" returns no results, even though it should find condos.

### Current Suggestions
```javascript
const [propertySuggestions] = useState([
  "3 bed house in South Austin under $600k",       // ✓ Specific
  "Modern condo downtown with a view",              // ✗ Too vague
  "Family home near good schools in Round Rock",    // ✓ Specific location
  "Luxury property in Westlake with pool",          // ✓ Specific area
  "Fixer-upper under $400k with big yard",         // ✗ No location
]);
```

### Root Cause
The Repliers NLP API (external service) returns 406 "not_real_estate" for prompts it considers too vague. It wants:
- Specific locations (neighborhood, zip, city)
- Price ranges
- Concrete property features

"Modern condo downtown with a view" lacks:
- No price range
- "Downtown" might be ambiguous without "Austin"
- "With a view" is subjective

### The Fix
Update suggestions to be more specific and reliable:

```javascript
const [propertySuggestions] = useState([
  "3 bedroom house in South Austin under $600k",
  "2 bedroom condo in downtown Austin under $500k",  // More specific
  "Family home near good schools in Round Rock under $800k",
  "Luxury home in Westlake Hills with pool under $2M",
  "3 bed 2 bath home in 78704 under $700k",  // Zip code specific
]);
```

### Additional Improvement
Add fallback handling when Repliers rejects a prompt:

```typescript
// In nlp-search/route.ts
if (response.status === 406) {
  // Try to extract location and add specificity
  const enhancedPrompt = enhanceVaguePrompt(sanitizedPrompt);
  if (enhancedPrompt !== sanitizedPrompt) {
    // Retry with enhanced prompt
    // ... retry logic
  }
}

function enhanceVaguePrompt(prompt: string): string {
  // Add "in Austin" if no city mentioned
  // Add "under $1M" if no price mentioned
  // etc.
}
```

## Summary
Both issues stem from the AI search feature not being "sticky" enough:
1. Map view doesn't follow the search results
2. Suggested prompts aren't guaranteed to work with the NLP service

The fixes are straightforward and would significantly improve the AI search UX.