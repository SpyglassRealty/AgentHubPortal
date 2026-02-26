/**
 * Migrate communities from spyglass-idx data files into the communities DB table.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/migrate-communities.ts
 *
 * Data sources:
 *   ~/clawd/spyglass-idx/src/data/communities-polygons.ts  — 3,667 communities (name, slug, county)
 *   ~/clawd/spyglass-idx/src/data/community-descriptions.ts — 42 communities with rich content
 */

import pg from "pg";
import * as fs from "fs";
import * as path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── Parse polygons file (regex-based, no TS compilation needed) ──────

function parsePolygonsFile(filePath: string): Array<{ name: string; slug: string; county: string }> {
  console.log(`[Migrate] Reading polygons from: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");

  // Each community entry looks like:
  // {"name":"Zilker","slug":"zilker","polygon":[...],"displayPolygon":[...],"county":"Travis","featured":false},
  const regex = /\{"name":"([^"]+)","slug":"([^"]+)","polygon":\[.*?\],"displayPolygon":\[.*?\],"county":"([^"]+)","featured":(true|false)\}/g;

  const results: Array<{ name: string; slug: string; county: string }> = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({
      name: match[1],
      slug: match[2],
      county: match[3],
    });
  }

  console.log(`[Migrate] Parsed ${results.length} communities from polygons file`);
  return results;
}

// ── Parse descriptions file ──────────────────────────────────────────

interface CommunityContent {
  slug: string;
  description: string;
  highlights: string[];
  bestFor: string[];
  nearbyLandmarks: string[];
}

function parseDescriptionsFile(filePath: string): CommunityContent[] {
  console.log(`[Migrate] Reading descriptions from: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract the array contents between communityDescriptions: CommunityContent[] = [ ... ]
  // We'll use a regex to find each object block
  const results: CommunityContent[] = [];

  // Match each slug entry
  const slugRegex = /\{\s*slug:\s*'([^']+)'/g;
  let slugMatch;
  const slugPositions: Array<{ slug: string; index: number }> = [];

  while ((slugMatch = slugRegex.exec(content)) !== null) {
    slugPositions.push({ slug: slugMatch[1], index: slugMatch.index });
  }

  for (let i = 0; i < slugPositions.length; i++) {
    const start = slugPositions[i].index;
    const end = i < slugPositions.length - 1 ? slugPositions[i + 1].index : content.length;
    const block = content.substring(start, end);

    // Extract description (backtick-delimited multiline or single-quoted)
    let description = "";
    const descBacktickMatch = block.match(/description:\s*`([\s\S]*?)`/);
    if (descBacktickMatch) {
      description = descBacktickMatch[1].trim();
    }

    // Extract arrays
    const highlights = extractStringArray(block, "highlights");
    const bestFor = extractStringArray(block, "bestFor");
    const nearbyLandmarks = extractStringArray(block, "nearbyLandmarks");

    results.push({
      slug: slugPositions[i].slug,
      description,
      highlights,
      bestFor,
      nearbyLandmarks,
    });
  }

  console.log(`[Migrate] Parsed ${results.length} community descriptions`);
  return results;
}

function extractStringArray(block: string, fieldName: string): string[] {
  const regex = new RegExp(`${fieldName}:\\s*\\[([\\s\\S]*?)\\]`);
  const match = block.match(regex);
  if (!match) return [];

  const arrayContent = match[1];
  const items: string[] = [];

  // Match single-quoted strings
  const itemRegex = /'([^']*(?:\\'[^']*)*)'/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
    items.push(itemMatch[1].replace(/\\'/g, "'"));
  }

  return items;
}

// ── Main migration ───────────────────────────────────────────────────

async function migrate() {
  console.log("[Migrate] Starting community migration...");

  // Resolve file paths
  const polygonsPath = path.resolve(__dirname, "../../../spyglass-idx/src/data/communities-polygons.ts");
  const descriptionsPath = path.resolve(__dirname, "../../../spyglass-idx/src/data/community-descriptions.ts");

  if (!fs.existsSync(polygonsPath)) {
    console.error(`ERROR: Polygons file not found: ${polygonsPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(descriptionsPath)) {
    console.error(`ERROR: Descriptions file not found: ${descriptionsPath}`);
    process.exit(1);
  }

  // Parse data
  const polygonCommunities = parsePolygonsFile(polygonsPath);
  const descriptions = parseDescriptionsFile(descriptionsPath);

  // Build description lookup by slug
  const descMap = new Map<string, CommunityContent>();
  for (const desc of descriptions) {
    descMap.set(desc.slug, desc);
  }

  // Ensure the table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS communities (
      id serial PRIMARY KEY,
      slug varchar(255) NOT NULL UNIQUE,
      name varchar(255) NOT NULL,
      county varchar(100),
      meta_title varchar(255),
      meta_description text,
      focus_keyword varchar(255),
      description text,
      highlights jsonb,
      best_for jsonb,
      nearby_landmarks jsonb,
      sections jsonb,
      published boolean DEFAULT false,
      featured boolean DEFAULT false,
      created_at timestamp DEFAULT NOW(),
      updated_at timestamp DEFAULT NOW(),
      updated_by varchar(255)
    )
  `);

  // Upsert communities in batches
  let inserted = 0;
  let updated = 0;
  let withContent = 0;

  for (const community of polygonCommunities) {
    const desc = descMap.get(community.slug);
    const hasContent = !!desc && !!desc.description;

    if (hasContent) withContent++;

    try {
      const result = await pool.query(
        `INSERT INTO communities (slug, name, county, description, highlights, best_for, nearby_landmarks, published, created_at, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), 'migration')
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           county = EXCLUDED.county,
           description = COALESCE(EXCLUDED.description, communities.description),
           highlights = COALESCE(EXCLUDED.highlights, communities.highlights),
           best_for = COALESCE(EXCLUDED.best_for, communities.best_for),
           nearby_landmarks = COALESCE(EXCLUDED.nearby_landmarks, communities.nearby_landmarks),
           published = COALESCE(EXCLUDED.published, communities.published),
           updated_at = NOW(),
           updated_by = 'migration'
         RETURNING (xmax = 0) AS is_insert`,
        [
          community.slug,
          community.name,
          community.county,
          desc?.description || null,
          desc?.highlights ? JSON.stringify(desc.highlights) : null,
          desc?.bestFor ? JSON.stringify(desc.bestFor) : null,
          desc?.nearbyLandmarks ? JSON.stringify(desc.nearbyLandmarks) : null,
          hasContent, // published = true for communities with descriptions
        ]
      );

      if (result.rows[0]?.is_insert) {
        inserted++;
      } else {
        updated++;
      }
    } catch (error: any) {
      console.error(`[Migrate] Error upserting ${community.slug}:`, error.message);
    }
  }

  // Verify
  const countResult = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published = true) as published FROM communities");
  const { total, published: publishedCount } = countResult.rows[0];

  console.log("\n[Migrate] ✅ Migration complete!");
  console.log(`  Total communities in DB: ${total}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  With rich content: ${withContent}`);
  console.log(`  Published: ${publishedCount}`);

  await pool.end();
}

migrate().catch((err) => {
  console.error("[Migrate] Fatal error:", err);
  process.exit(1);
});
