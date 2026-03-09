#!/usr/bin/env tsx
/**
 * Import communities from Spyglass IDX data into Mission Control
 * This script imports both polygon-based communities and area communities (zip/city)
 * Run: npx tsx scripts/import-idx-communities.ts
 */

import { db } from '../server/db';
import { communities, type InsertCommunity } from '@shared/schema';
import { eq, count } from 'drizzle-orm';

// Import IDX data using ESM imports
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getIdxCommunities = () => {
  try {
    const dataPath = path.resolve(__dirname, 'idx-communities-data.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    
    return {
      polygonCommunities: data.polygonCommunities,
      areaCommunities: data.areaCommunities,
    };
  } catch (error) {
    console.error('[Import] Error loading IDX community data:', error);
    throw error;
  }
};

interface PolygonCommunity {
  id: string;
  name: string;
  coordinates: [number, number][];
  center: { lat: number; lng: number };
}

interface AreaCommunity {
  slug: string;
  name: string;
  type: 'zip' | 'city';
  filterValue: string;
  county: string;
  description: string;
}

async function importIdxCommunities() {
  try {
    console.log('[Import] Starting IDX communities import...');
    
    // Get IDX data
    const { polygonCommunities, areaCommunities } = getIdxCommunities();
    
    console.log(`[Import] Found ${polygonCommunities.length} polygon communities`);
    console.log(`[Import] Found ${areaCommunities.length} area communities`);
    
    // Get existing communities from database
    const existingCommunities = await db.select({ slug: communities.slug })
      .from(communities);
    const existingSlugs = new Set(existingCommunities.map(c => c.slug));
    
    console.log(`[Import] Found ${existingSlugs.size} existing communities in database`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // ─── Import Polygon-based Communities ──────────────────────────────────
    console.log('[Import] Processing polygon communities...');
    
    for (const polyComm of polygonCommunities) {
      const slug = polyComm.id;
      
      // Convert polygon coordinates from [lng, lat] to [lat, lng] for displayPolygon
      const displayPolygon: [number, number][] = polyComm.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      
      const communityData: Omit<InsertCommunity, 'id'> = {
        slug,
        name: formatCommunityName(polyComm.name),
        county: 'Travis', // Most Austin communities are in Travis County
        locationType: 'polygon',
        polygon: polyComm.coordinates, // Keep original [lng, lat] format for API
        displayPolygon, // [lat, lng] format for frontend maps
        centroid: polyComm.center,
        description: `${formatCommunityName(polyComm.name)} is a neighborhood in Austin, Texas. This community offers a unique blend of amenities and lifestyle options for residents.`,
        published: false, // Import as drafts initially
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'import-script',
      };
      
      if (existingSlugs.has(slug)) {
        // Update existing community (preserve manually edited content)
        try {
          await db.update(communities)
            .set({
              // Only update location data and basic info, preserve content
              locationType: communityData.locationType,
              polygon: communityData.polygon,
              displayPolygon: communityData.displayPolygon,
              centroid: communityData.centroid,
              county: communityData.county,
              updatedAt: new Date(),
              updatedBy: 'import-script',
            })
            .where(eq(communities.slug, slug));
          updatedCount++;
        } catch (error) {
          console.warn(`[Import] Failed to update ${slug}:`, error);
          skippedCount++;
        }
      } else {
        // Insert new community
        try {
          await db.insert(communities).values(communityData);
          importedCount++;
        } catch (error) {
          console.warn(`[Import] Failed to insert ${slug}:`, error);
          skippedCount++;
        }
      }
    }
    
    // ─── Import Area-based Communities (Zip/City) ─────────────────────────
    console.log('[Import] Processing area communities...');
    
    for (const areComm of areaCommunities) {
      const slug = areComm.slug;
      
      const communityData: Omit<InsertCommunity, 'id'> = {
        slug,
        name: areComm.name,
        county: areComm.county || 'Travis',
        locationType: areComm.type, // 'zip' or 'city'
        filterValue: areComm.filterValue,
        description: areComm.description,
        published: false, // Import as drafts initially
        featured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'import-script',
      };
      
      if (existingSlugs.has(slug)) {
        // Update existing community (preserve manually edited content)
        try {
          await db.update(communities)
            .set({
              // Only update basic info and type, preserve content
              locationType: communityData.locationType,
              filterValue: communityData.filterValue,
              county: communityData.county,
              updatedAt: new Date(),
              updatedBy: 'import-script',
            })
            .where(eq(communities.slug, slug));
          updatedCount++;
        } catch (error) {
          console.warn(`[Import] Failed to update ${slug}:`, error);
          skippedCount++;
        }
      } else {
        // Insert new community
        try {
          await db.insert(communities).values(communityData);
          importedCount++;
        } catch (error) {
          console.warn(`[Import] Failed to insert ${slug}:`, error);
          skippedCount++;
        }
      }
    }
    
    // ─── Final Report ─────────────────────────────────────────────────────
    const totalCount = await db.select({ count: count() }).from(communities);
    
    console.log('\n[Import] ✅ Import completed!');
    console.log(`[Import] 📊 Results:`);
    console.log(`[Import]   - Imported: ${importedCount} new communities`);
    console.log(`[Import]   - Updated: ${updatedCount} existing communities`);
    console.log(`[Import]   - Skipped: ${skippedCount} failed imports`);
    console.log(`[Import]   - Total in database: ${totalCount[0].count}`);
    console.log(`[Import] 🎯 All communities are imported as DRAFTS`);
    console.log(`[Import] 📝 Review and publish communities in Mission Control admin panel`);
    
  } catch (error) {
    console.error('[Import] ❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Helper function to format community names (convert from ALL CAPS)
function formatCommunityName(name: string): string {
  if (!name) return name;
  
  // Handle special cases first
  const specialCases: Record<string, string> = {
    'MLK': 'MLK',
    'MLK-183': 'MLK-183',
    'UT': 'UT',
    'SOUTH RIVER CITY': 'South River City',
    'PECAN SPRINGS-SPRINGDALE': 'Pecan Springs-Springdale',
    'ST. EDWARDS': 'St. Edwards',
  };
  
  if (specialCases[name]) {
    return specialCases[name];
  }
  
  // Convert from ALL CAPS to Title Case
  return name
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bIn\b/g, 'in');
}

// Run the import
importIdxCommunities()
  .then(() => {
    console.log('[Import] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Import] Script failed:', error);
    process.exit(1);
  });

export { importIdxCommunities };