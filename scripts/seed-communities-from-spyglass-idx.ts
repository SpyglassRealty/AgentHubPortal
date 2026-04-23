#!/usr/bin/env tsx
/**
 * Seed the communities table with Austin-area polygons from
 * spyglass-idx's communities-polygons.ts.
 *
 * Upsert strategy (by slug):
 *   Existing rows  → update polygon / displayPolygon / centroid / county only.
 *                    All CMS-authored fields (metaTitle, description, published, …)
 *                    are intentionally preserved.
 *   New rows       → insert with published=false, source='spyglass-idx-seed'.
 *
 * Usage:
 *   npx tsx scripts/seed-communities-from-spyglass-idx.ts [--dry-run]
 *
 * The --dry-run flag prints what would happen without writing to the DB.
 */

import { db, pool } from '../server/db';
import { communities, type InsertCommunity } from '@shared/schema';
import { eq, count } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');
const SPYGLASS_IDX_POLYGONS_PATH =
  '/Users/ryanrodenbeck/clawd/spyglass-idx/src/data/communities-polygons.ts';
const INSERT_BATCH_SIZE = 100;

// ── Types ─────────────────────────────────────────────────────────────────

interface CommunityPolygon {
  name: string;
  slug: string;
  polygon: [number, number][]; // [lng, lat]
  displayPolygon: [number, number][]; // [lat, lng]
  county: string;
  featured: boolean;
  locationType?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function computeCentroid(polygon: [number, number][]): { lat: number; lng: number } {
  const n = polygon.length;
  if (n === 0) return { lat: 30.267, lng: -97.743 }; // Austin fallback
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of polygon) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / n, lng: sumLng / n };
}

function separator() {
  console.log('='.repeat(64));
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  separator();
  console.log(`Communities seed from spyglass-idx${DRY_RUN ? '  [DRY RUN — no writes]' : ''}`);
  console.log(`Source: ${SPYGLASS_IDX_POLYGONS_PATH}`);
  separator();

  // ── 1. Load source data ────────────────────────────────────────────────
  console.log('\nLoading polygon data from spyglass-idx...');
  const mod = (await import(SPYGLASS_IDX_POLYGONS_PATH)) as { COMMUNITIES: CommunityPolygon[] };
  const SOURCE: CommunityPolygon[] = mod.COMMUNITIES;
  console.log(`  Loaded ${SOURCE.length} entries.`);

  // ── 2. Load existing slugs from DB ─────────────────────────────────────
  console.log('\nQuerying existing slugs from DB...');
  const existingRows = await db.select({ slug: communities.slug }).from(communities);
  const existingSlugs = new Set(existingRows.map((r) => r.slug));
  console.log(`  ${existingSlugs.size} existing rows found.`);

  // ── 3. Categorise ──────────────────────────────────────────────────────
  const toInsert: CommunityPolygon[] = [];
  const toUpdate: CommunityPolygon[] = [];
  let skipped = 0;

  for (const entry of SOURCE) {
    if (!entry.slug || !entry.polygon || entry.polygon.length < 3) {
      skipped++;
      continue;
    }
    if (existingSlugs.has(entry.slug)) {
      toUpdate.push(entry);
    } else {
      toInsert.push(entry);
    }
  }

  console.log('\nPlan:');
  console.log(`  Insert (new)          : ${toInsert.length}`);
  console.log(`  Update (polygon only) : ${toUpdate.length}`);
  console.log(`  Skipped (bad data)    : ${skipped}`);

  // ── 4. Dry-run output ──────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n--- Sample INSERTs (first 5) ---');
    for (const c of toInsert.slice(0, 5)) {
      const cen = computeCentroid(c.polygon);
      console.log(
        `  INSERT  slug="${c.slug}"  name="${c.name}"` +
          `  county="${c.county}"  coords=${c.polygon.length}` +
          `  centroid=(${cen.lat.toFixed(4)}, ${cen.lng.toFixed(4)})`,
      );
    }
    console.log('  ...');
    console.log('\n--- Sample UPDATEs (first 5) ---');
    for (const c of toUpdate.slice(0, 5)) {
      const cen = computeCentroid(c.polygon);
      console.log(
        `  UPDATE  slug="${c.slug}"  coords=${c.polygon.length}` +
          `  centroid=(${cen.lat.toFixed(4)}, ${cen.lng.toFixed(4)})`,
      );
    }
    console.log('\n[DRY RUN] No writes performed. Remove --dry-run to apply.');
    await pool.end();
    process.exit(0);
  }

  // ── 5. Inserts (batched) ───────────────────────────────────────────────
  let inserted = 0;
  let insertFailed = 0;

  if (toInsert.length > 0) {
    console.log(`\nInserting ${toInsert.length} new communities…`);
    for (let i = 0; i < toInsert.length; i += INSERT_BATCH_SIZE) {
      const batch = toInsert.slice(i, i + INSERT_BATCH_SIZE);
      const values: Omit<InsertCommunity, 'id'>[] = batch.map((c) => ({
        slug: c.slug,
        name: c.name,
        county: c.county || 'Travis',
        locationType: 'polygon',
        polygon: c.polygon,
        displayPolygon: c.displayPolygon,
        centroid: computeCentroid(c.polygon),
        featured: c.featured ?? false,
        published: false,
        source: 'spyglass-idx-seed',
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'seed-communities-from-spyglass-idx',
      }));
      try {
        // onConflictDoNothing is a safety guard; categorisation already separates new vs existing
        await db.insert(communities).values(values).onConflictDoNothing();
        inserted += batch.length;
      } catch (err) {
        console.warn(`  Batch ${i}–${i + INSERT_BATCH_SIZE - 1} failed:`, err);
        insertFailed += batch.length;
      }
      process.stdout.write(`  ${Math.min(i + INSERT_BATCH_SIZE, toInsert.length)} / ${toInsert.length}\r`);
    }
    console.log(`\n  Done. inserted=${inserted}  failed=${insertFailed}`);
  }

  // ── 6. Updates (row-by-row to preserve CMS content) ───────────────────
  let updated = 0;
  let updateFailed = 0;

  if (toUpdate.length > 0) {
    console.log(`\nUpdating ${toUpdate.length} existing communities (polygon/centroid only)…`);
    for (const c of toUpdate) {
      try {
        await db
          .update(communities)
          .set({
            polygon: c.polygon,
            displayPolygon: c.displayPolygon,
            centroid: computeCentroid(c.polygon),
            // Refresh county only when the source has a non-empty value
            ...(c.county ? { county: c.county } : {}),
            updatedAt: new Date(),
            updatedBy: 'seed-communities-from-spyglass-idx',
          })
          .where(eq(communities.slug, c.slug));
        updated++;
      } catch (err) {
        console.warn(`  Update failed slug="${c.slug}":`, err);
        updateFailed++;
      }
      if (updated % 200 === 0) {
        process.stdout.write(`  ${updated} / ${toUpdate.length}\r`);
      }
    }
    console.log(`\n  Done. updated=${updated}  failed=${updateFailed}`);
  }

  // ── 7. Final report ────────────────────────────────────────────────────
  const [{ count: totalCount }] = await db.select({ count: count() }).from(communities);

  separator();
  console.log('Seed complete.');
  console.log(`  Inserted : ${inserted}  (failed: ${insertFailed})`);
  console.log(`  Updated  : ${updated}  (failed: ${updateFailed})`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Total rows in communities table: ${totalCount}`);
  separator();

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
