import { pool } from "../db";
import { resolveContainingZip } from "../pulseV2Routes";

export async function getCommunityPolygon(slug: string): Promise<{
  polygon: number[][];
  name: string;
  containingZip: string | null;
} | null> {
  const { rows } = await pool.query(
    `SELECT c.name, c.polygon, c.centroid
     FROM communities c
     INNER JOIN pulse_community_allowlist a ON c.slug = a.slug
     WHERE c.slug = $1
     LIMIT 1`,
    [slug]
  );

  if (rows.length === 0 || !rows[0].polygon || rows[0].polygon.length < 3) {
    return null;
  }

  const ring: number[][] = [...rows[0].polygon];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  const centroid = rows[0].centroid as { lat: number; lng: number } | null;
  return {
    polygon: ring,
    name: rows[0].name as string,
    containingZip: resolveContainingZip(centroid),
  };
}
