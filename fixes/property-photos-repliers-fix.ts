// PREPARED FIX: Repliers Photo URL Handling (Based on Contract Conduit)

const REPLIERS_CDN_BASE = "https://cdn.repliers.io/";

// Enhanced photo mapping function
function normalizePropertyPhotos(comp: any): string[] {
  // 1. Already normalized photos array
  if (comp.photos && Array.isArray(comp.photos) && comp.photos.length > 0) {
    return comp.photos.map(url => normalizeImageUrl(url));
  }
  
  // 2. Repliers images array (most common)
  if (comp.images && Array.isArray(comp.images) && comp.images.length > 0) {
    return comp.images.map(img => normalizeImageUrl(img));
  }
  
  // 3. Single photo field
  if (comp.photo && typeof comp.photo === 'string') {
    return [normalizeImageUrl(comp.photo)];
  }
  
  // 4. Legacy imageUrl field
  if (comp.imageUrl && typeof comp.imageUrl === 'string') {
    return [normalizeImageUrl(comp.imageUrl)];
  }
  
  // 5. Check for other possible field names
  const possiblePhotoFields = ['primaryPhoto', 'mainImage', 'listingPhoto', 'propertyImage'];
  for (const field of possiblePhotoFields) {
    if (comp[field] && typeof comp[field] === 'string') {
      return [normalizeImageUrl(comp[field])];
    }
  }
  
  return [];
}

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative path from Repliers - add CDN base
  return `${REPLIERS_CDN_BASE}${url}`;
}

// Apply to CMA data transformation
const transformedComparables = rawComparables.map((comp, index) => {
  // ... existing transformations ...
  
  const photos = normalizePropertyPhotos(comp);
  
  // Debug first comp
  if (index === 0) {
    console.log('[Photo Debug] Comp fields:', Object.keys(comp));
    console.log('[Photo Debug] Photo fields found:', {
      photos: comp.photos?.length || 0,
      images: comp.images?.length || 0, 
      photo: !!comp.photo,
      imageUrl: !!comp.imageUrl
    });
    console.log('[Photo Debug] Final photos:', photos);
  }
  
  return {
    // ... other fields ...
    photos
  };
});