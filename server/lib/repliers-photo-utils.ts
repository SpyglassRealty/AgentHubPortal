/**
 * Repliers API Photo Handling Utilities
 * 
 * Based on official Repliers API reference:
 * - Photos come from 'images' field as fully qualified URLs
 * - Active listings → full photo set (20-40 photos)
 * - Sold listings (recent) → usually full set  
 * - Older sold listings → may only have cover photo
 * - No separate photo API - photos embedded in listing payload
 */

export interface RepliersList {
  images?: string[];
  photos?: string[];
  photo?: string;
  imageUrl?: string;
  primaryPhoto?: string;
  coverPhoto?: string;
  [key: string]: any;
}

/**
 * Extract and normalize all photos from a Repliers listing response
 * 
 * Priority order (based on Repliers API documentation):
 * 1. listing.images[] (official field) - fully qualified CDN URLs
 * 2. listing.photos[] (legacy fallback)
 * 3. Single photo fields (photo, imageUrl, etc.)
 * 4. Empty array (normal for some older sold listings)
 */
export function extractPhotosFromRepliersList(listing: RepliersList): string[] {
  if (!listing) return [];

  // PRIMARY: Official Repliers 'images' field
  if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
    const validImages = listing.images
      .map(img => normalizePhotoUrl(img))
      .filter(Boolean);
    
    if (validImages.length > 0) {
      return validImages;
    }
  }

  // FALLBACK: Legacy 'photos' field
  if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
    const validPhotos = listing.photos
      .map(img => normalizePhotoUrl(img))
      .filter(Boolean);
    
    if (validPhotos.length > 0) {
      return validPhotos;
    }
  }

  // FALLBACK: Single photo fields (less common)
  const singlePhotoFields = ['photo', 'imageUrl', 'primaryPhoto', 'coverPhoto'];
  for (const field of singlePhotoFields) {
    if (listing[field]) {
      const url = normalizePhotoUrl(listing[field]);
      if (url) {
        return [url];
      }
    }
  }

  // No photos found (normal for some older sold listings per Repliers documentation)
  return [];
}

/**
 * Normalize a single photo URL from various possible formats
 */
function normalizePhotoUrl(img: any): string | null {
  if (!img) return null;

  // Handle object format (some APIs return objects with url/src properties)
  const imagePath = typeof img === 'string' ? img : (img.url || img.src || img.href || img);
  
  if (typeof imagePath !== 'string' || imagePath.trim().length === 0) {
    return null;
  }

  const cleanPath = imagePath.trim();

  // If already a fully qualified URL, return as-is
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    return cleanPath;
  }

  // Add CDN prefix for relative paths
  if (cleanPath.startsWith('/')) {
    return `https://cdn.repliers.io${cleanPath}`;
  }

  // Add CDN prefix for paths without leading slash
  return `https://cdn.repliers.io/${cleanPath}`;
}

/**
 * Get the primary/cover photo from a listing (first image)
 */
export function getPrimaryPhotoFromRepliersList(listing: RepliersList): string | null {
  const photos = extractPhotosFromRepliersList(listing);
  return photos.length > 0 ? photos[0] : null;
}

/**
 * Get photo count for display purposes
 */
export function getPhotoCountFromRepliersList(listing: RepliersList): number {
  const photos = extractPhotosFromRepliersList(listing);
  return photos.length;
}

/**
 * Debug helper to analyze photo fields in a listing
 */
export function debugPhotoFields(listing: RepliersList, mlsNumber?: string): void {
  const prefix = mlsNumber ? `[${mlsNumber}]` : '[Photo Debug]';
  
  console.log(`${prefix} Photo field analysis:`, {
    hasImages: !!listing.images,
    imagesCount: Array.isArray(listing.images) ? listing.images.length : 0,
    imagesPreview: Array.isArray(listing.images) ? listing.images.slice(0, 2) : null,
    hasPhotos: !!listing.photos,
    photosCount: Array.isArray(listing.photos) ? listing.photos.length : 0,
    hasSinglePhoto: !!listing.photo,
    hasImageUrl: !!listing.imageUrl,
    extractedCount: extractPhotosFromRepliersList(listing).length,
    allPhotoFields: Object.keys(listing).filter(k => 
      k.toLowerCase().includes('image') || 
      k.toLowerCase().includes('photo')
    ),
  });
}