import type { Express } from "express";
import { db } from "./db";
import { communities } from "@shared/schema";
import { eq, and, sql, asc, count } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Middleware to check API key for public endpoints
function checkApiKey(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.PULSE_API_KEY;
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

export function registerPublicCommunityRoutes(app: Express) {
  // ── GET /api/public/communities — list all published communities ──
  app.get("/api/public/communities", checkApiKey, async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "50", 10)), 200);
      const county = (req.query.county as string) || "";

      const conditions: any[] = [eq(communities.published, true)];
      
      if (county) {
        conditions.push(eq(communities.county, county));
      }

      const whereClause = and(...conditions);

      const rows = await db
        .select({
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          county: communities.county,
          locationType: communities.locationType,
          filterValue: communities.filterValue,
          polygon: communities.polygon,
          displayPolygon: communities.displayPolygon,
          centroid: communities.centroid,
          heroImage: communities.heroImage,
          metaTitle: communities.metaTitle,
          metaDescription: communities.metaDescription,
          focusKeyword: communities.focusKeyword,
          description: communities.description,
          highlights: communities.highlights,
          bestFor: communities.bestFor,
          nearbyLandmarks: communities.nearbyLandmarks,
          sections: communities.sections,
          featured: communities.featured,
          updatedAt: communities.updatedAt,
        })
        .from(communities)
        .where(whereClause)
        .orderBy(asc(communities.name))
        .limit(limit);

      res.json({
        status: "success",
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error("[Public API] Error listing communities:", error);
      res.status(500).json({ error: "Failed to list communities" });
    }
  });

  // ── GET /api/public/communities/:slug — get individual community ──
  app.get("/api/public/communities/:slug", checkApiKey, async (req: any, res) => {
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

      res.json({
        status: "success",
        data: community
      });
    } catch (error) {
      console.error("[Public API] Error getting community:", error);
      res.status(500).json({ error: "Failed to get community" });
    }
  });

  // ── GET /api/public/communities/counties — list available counties ──
  app.get("/api/public/communities/counties", checkApiKey, async (req: any, res) => {
    try {
      const countyRows = await db
        .selectDistinct({ county: communities.county })
        .from(communities)
        .where(and(
          sql`${communities.county} IS NOT NULL`,
          eq(communities.published, true)
        ))
        .orderBy(asc(communities.county));

      const countiesList = countyRows.map((r) => r.county).filter(Boolean);

      res.json({
        status: "success",
        data: countiesList,
        count: countiesList.length
      });
    } catch (error) {
      console.error("[Public API] Error listing counties:", error);
      res.status(500).json({ error: "Failed to list counties" });
    }
  });

  // ── POST /api/public/communities/sync — sync static data to database ──
  app.post("/api/public/communities/sync", checkApiKey, async (req: any, res) => {
    try {
      const staticDataPath = path.join(process.cwd(), "static-data", "communities.json");
      
      if (!fs.existsSync(staticDataPath)) {
        return res.status(400).json({ error: "Static communities data not found" });
      }

      const staticData = JSON.parse(fs.readFileSync(staticDataPath, "utf-8"));
      let syncedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const communityData of staticData) {
        try {
          // Check if community already exists
          const [existing] = await db
            .select({ id: communities.id })
            .from(communities)
            .where(eq(communities.slug, communityData.slug))
            .limit(1);

          if (existing) {
            // Update existing community (preserve manual edits by only updating basic data)
            await db
              .update(communities)
              .set({
                name: communityData.name,
                county: communityData.county,
                locationType: communityData.locationType || "polygon",
                filterValue: communityData.filterValue,
                polygon: communityData.polygon,
                displayPolygon: communityData.displayPolygon,
                centroid: communityData.centroid,
                heroImage: communityData.heroImage,
                updatedAt: new Date(),
                updatedBy: "sync-script",
                // Only set published to true if it's not already set
                ...(existing && { published: true })
              })
              .where(eq(communities.slug, communityData.slug));
          } else {
            // Insert new community
            await db.insert(communities).values({
              slug: communityData.slug,
              name: communityData.name,
              county: communityData.county,
              locationType: communityData.locationType || "polygon",
              filterValue: communityData.filterValue,
              polygon: communityData.polygon,
              displayPolygon: communityData.displayPolygon,
              centroid: communityData.centroid,
              heroImage: communityData.heroImage,
              metaTitle: communityData.metaTitle || communityData.name,
              metaDescription: communityData.metaDescription || `Explore ${communityData.name} real estate`,
              focusKeyword: communityData.focusKeyword || communityData.name.toLowerCase(),
              description: communityData.description || "",
              highlights: communityData.highlights || [],
              bestFor: communityData.bestFor || [],
              nearbyLandmarks: communityData.nearbyLandmarks || [],
              sections: communityData.sections || [],
              published: true,
              featured: communityData.featured || false,
              createdAt: new Date(),
              updatedAt: new Date(),
              updatedBy: "sync-script"
            });
          }
          syncedCount++;
        } catch (err: any) {
          errorCount++;
          errors.push(`Error syncing ${communityData.slug}: ${err.message}`);
          console.error(`Error syncing community ${communityData.slug}:`, err);
        }
      }

      res.json({
        status: "success",
        message: `Sync completed. ${syncedCount} communities synced, ${errorCount} errors.`,
        synced: syncedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10) // Limit error details in response
      });
    } catch (error: any) {
      console.error("[Public API] Error syncing communities:", error);
      res.status(500).json({ 
        error: "Failed to sync communities", 
        details: error.message 
      });
    }
  });
}