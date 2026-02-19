import type { Express } from "express";
import { db } from "./db";
import { communities } from "@shared/schema";
import { eq, ilike, and, or, desc, asc } from "drizzle-orm";

/**
 * Public API routes for communities (used by IDX site)
 * These routes are open access for the IDX frontend to consume
 */
export function registerCommunityPublicRoutes(app: Express) {
  
  // ── GET /api/public/communities — paginated list for IDX frontend ──
  app.get("/api/public/communities", async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const county = (req.query.county as string) || "";
      const featured = req.query.featured === "true";
      const published = req.query.published !== "false"; // default to true
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "100", 10)), 500);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      // Only show published communities by default (unless explicitly requesting unpublished)
      if (published) {
        conditions.push(eq(communities.published, true));
      }

      if (search) {
        conditions.push(
          or(
            ilike(communities.name, `%${search}%`),
            ilike(communities.slug, `%${search}%`),
            ilike(communities.county, `%${search}%`)
          )
        );
      }

      if (county) {
        conditions.push(eq(communities.county, county));
      }

      if (featured) {
        conditions.push(eq(communities.featured, true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          name: communities.name,
          slug: communities.slug,
          county: communities.county,
          locationType: communities.locationType,
          filterValue: communities.filterValue,
          polygon: communities.polygon,
          displayPolygon: communities.displayPolygon,
          centroid: communities.centroid,
          heroImage: communities.heroImage,
          metaTitle: communities.metaTitle,
          metaDescription: communities.metaDescription,
          description: communities.description,
          highlights: communities.highlights,
          bestFor: communities.bestFor,
          nearbyLandmarks: communities.nearbyLandmarks,
          featured: communities.featured,
          published: communities.published,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .where(whereClause)
        .orderBy(
          featured ? desc(communities.featured) : undefined,
          asc(communities.name)
        )
        .limit(limit)
        .offset(offset);

      // Transform to match IDX site's expected format
      const transformedCommunities = rows.map(community => ({
        name: community.name,
        slug: community.slug,
        polygon: community.polygon || [],
        displayPolygon: community.displayPolygon || [],
        county: community.county || "Travis",
        featured: community.featured || false,
        // Additional fields for IDX compatibility
        locationType: community.locationType,
        filterValue: community.filterValue,
        centroid: community.centroid,
        heroImage: community.heroImage,
        metaTitle: community.metaTitle,
        metaDescription: community.metaDescription,
        description: community.description,
        highlights: community.highlights || [],
        bestFor: community.bestFor || [],
        nearbyLandmarks: community.nearbyLandmarks || [],
      }));

      res.json({
        communities: transformedCommunities,
        total: transformedCommunities.length,
        page,
        limit,
      });

    } catch (error) {
      console.error("[Public Communities API] Error listing communities:", error);
      res.status(500).json({ error: "Failed to fetch communities" });
    }
  });

  // ── GET /api/public/communities/:slug — single community for IDX detail pages ──
  app.get("/api/public/communities/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const [community] = await db
        .select()
        .from(communities)
        .where(and(
          eq(communities.slug, slug),
          eq(communities.published, true)
        ))
        .limit(1);

      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }

      // Transform to IDX format
      const transformedCommunity = {
        name: community.name,
        slug: community.slug,
        polygon: community.polygon || [],
        displayPolygon: community.displayPolygon || [],
        county: community.county || "Travis",
        featured: community.featured || false,
        // Extended content for detail pages
        locationType: community.locationType,
        filterValue: community.filterValue,
        centroid: community.centroid,
        heroImage: community.heroImage,
        metaTitle: community.metaTitle,
        metaDescription: community.metaDescription,
        description: community.description,
        highlights: community.highlights || [],
        bestFor: community.bestFor || [],
        nearbyLandmarks: community.nearbyLandmarks || [],
        sections: community.sections || [],
      };

      res.json({
        community: transformedCommunity,
      });

    } catch (error) {
      console.error(`[Public Communities API] Error getting community ${req.params.slug}:`, error);
      res.status(500).json({ error: "Failed to fetch community" });
    }
  });

  // ── POST /api/public/communities/sync — endpoint for syncing static data to database ──
  app.post("/api/public/communities/sync", async (req, res) => {
    try {
      // This endpoint allows the IDX site to push static community data to Mission Control
      const { apiKey, communities: communitiesData } = req.body;

      // Verify API key (should match PULSE_API_KEY from IDX site)
      const expectedApiKey = process.env.PULSE_API_KEY;
      if (!expectedApiKey || apiKey !== expectedApiKey) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      if (!Array.isArray(communitiesData)) {
        return res.status(400).json({ error: "communities must be an array" });
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const communityData of communitiesData) {
        try {
          // Transform static data format to database format
          const dbCommunity = {
            slug: communityData.slug,
            name: communityData.name,
            county: communityData.county || "Travis",
            locationType: 'polygon' as const,
            polygon: communityData.polygon,
            displayPolygon: communityData.displayPolygon,
            featured: communityData.featured || false,
            published: true, // Auto-publish synced communities
            updatedBy: 'system-sync',
          };

          // Insert or update
          await db
            .insert(communities)
            .values(dbCommunity)
            .onConflictDoUpdate({
              target: communities.slug,
              set: {
                name: dbCommunity.name,
                county: dbCommunity.county,
                polygon: dbCommunity.polygon,
                displayPolygon: dbCommunity.displayPolygon,
                featured: dbCommunity.featured,
                updatedAt: new Date(),
                updatedBy: 'system-sync',
              },
            });

          syncedCount++;
        } catch (error) {
          console.error(`Error syncing community ${communityData.slug}:`, error);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Synced ${syncedCount} communities successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        synced: syncedCount,
        errors: errorCount,
      });

    } catch (error) {
      console.error("[Public Communities API] Error syncing communities:", error);
      res.status(500).json({ error: "Failed to sync communities" });
    }
  });

  // ── GET /api/public/communities/counties — list available counties ──
  app.get("/api/public/communities/counties", async (req, res) => {
    try {
      const rows = await db
        .selectDistinct({ county: communities.county })
        .from(communities)
        .where(eq(communities.published, true))
        .orderBy(asc(communities.county));

      const counties = rows.map(r => r.county).filter(Boolean);

      res.json({ counties });

    } catch (error) {
      console.error("[Public Communities API] Error listing counties:", error);
      res.status(500).json({ error: "Failed to fetch counties" });
    }
  });
}