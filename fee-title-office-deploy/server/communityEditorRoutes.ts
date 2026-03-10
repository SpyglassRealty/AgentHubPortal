import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { communities } from "@shared/schema";
import { eq, ilike, and, or, sql, desc, asc, count } from "drizzle-orm";
import type { User } from "@shared/schema";

// ── Helper: get DB user ──────────────────────────────
async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

// ── Helper: require super admin ──────────────────────
async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

export function registerCommunityEditorRoutes(app: Express) {
  // ── GET /api/admin/communities/with-polygons — list communities with polygon data ──
  app.get("/api/admin/communities/with-polygons", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const rows = await db
        .select({
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          locationType: communities.locationType,
          filterValue: communities.filterValue,
          polygon: communities.polygon,
          centroid: communities.centroid,
          published: communities.published,
          county: communities.county,
        })
        .from(communities)
        .orderBy(asc(communities.name));

      res.json(rows);
    } catch (error) {
      console.error("[Community Editor] Error listing polygons:", error);
      res.status(500).json({ message: "Failed to list community polygons" });
    }
  });

  // ── POST /api/admin/communities/polygon — create community with polygon ──
  app.post("/api/admin/communities/polygon", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { name, slug, locationType, filterValue, polygon, centroid } = req.body;
      const user = req.dbUser;

      if (!name || !slug || !polygon || polygon.length < 3) {
        return res.status(400).json({ message: "Name, slug, and polygon (min 3 points) are required" });
      }

      // Check slug uniqueness
      const [existing] = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.slug, slug))
        .limit(1);

      if (existing) {
        return res.status(409).json({ message: "A community with this slug already exists" });
      }

      const [created] = await db
        .insert(communities)
        .values({
          name,
          slug,
          locationType: locationType || "polygon",
          filterValue: filterValue || null,
          polygon,
          centroid,
          updatedBy: user?.email || "admin",
        })
        .returning();

      console.log(`[Community Editor] Created polygon for ${slug} by ${user?.email}`);
      res.json(created);
    } catch (error) {
      console.error("[Community Editor] Error creating polygon:", error);
      res.status(500).json({ message: "Failed to create community polygon" });
    }
  });

  // ── PUT /api/admin/communities/:id/polygon — update polygon data ──
  app.put("/api/admin/communities/:id/polygon", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, slug, locationType, filterValue, polygon, centroid } = req.body;
      const user = req.dbUser;

      if (!polygon || polygon.length < 3) {
        return res.status(400).json({ message: "Polygon must have at least 3 points" });
      }

      const updateData: Record<string, any> = {
        polygon,
        centroid,
        updatedAt: new Date(),
        updatedBy: user?.email || "admin",
      };

      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (locationType) updateData.locationType = locationType;
      if (filterValue !== undefined) updateData.filterValue = filterValue || null;

      const [updated] = await db
        .update(communities)
        .set(updateData)
        .where(eq(communities.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Community not found" });
      }

      console.log(`[Community Editor] Updated polygon for ${updated.slug} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      console.error("[Community Editor] Error updating polygon:", error);
      res.status(500).json({ message: "Failed to update polygon" });
    }
  });

  // ── DELETE /api/admin/communities/:id/polygon — clear polygon data ──
  app.delete("/api/admin/communities/:id/polygon", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.dbUser;

      const [updated] = await db
        .update(communities)
        .set({
          polygon: null,
          centroid: null,
          updatedAt: new Date(),
          updatedBy: user?.email || "admin",
        })
        .where(eq(communities.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Community not found" });
      }

      console.log(`[Community Editor] Deleted polygon for ${updated.slug} by ${user?.email}`);
      res.json({ message: "Polygon deleted", community: updated });
    } catch (error) {
      console.error("[Community Editor] Error deleting polygon:", error);
      res.status(500).json({ message: "Failed to delete polygon" });
    }
  });

  // ── GET /api/admin/communities — paginated list with search & filter ──
  app.get("/api/admin/communities", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const filter = (req.query.filter as string) || "all"; // all | published | draft
      const county = (req.query.county as string) || "";
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "50", 10)), 200);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(communities.name, `%${search}%`),
            ilike(communities.slug, `%${search}%`),
            ilike(communities.county, `%${search}%`)
          )
        );
      }

      if (filter === "published") {
        conditions.push(eq(communities.published, true));
      } else if (filter === "draft") {
        conditions.push(eq(communities.published, false));
      }

      if (county) {
        conditions.push(eq(communities.county, county));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select({
            id: communities.id,
            slug: communities.slug,
            name: communities.name,
            county: communities.county,
            published: communities.published,
            featured: communities.featured,
            updatedAt: communities.updatedAt,
            metaTitle: communities.metaTitle,
          })
          .from(communities)
          .where(whereClause)
          .orderBy(asc(communities.name))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(communities)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total || 0;

      // Get distinct counties for the filter dropdown
      const countyRows = await db
        .selectDistinct({ county: communities.county })
        .from(communities)
        .where(sql`${communities.county} IS NOT NULL`)
        .orderBy(asc(communities.county));

      res.json({
        communities: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(Number(total) / limit),
        },
        counties: countyRows.map((r) => r.county).filter(Boolean),
      });
    } catch (error) {
      console.error("[Community Editor] Error listing communities:", error);
      res.status(500).json({ message: "Failed to list communities" });
    }
  });

  // ── GET /api/admin/communities/:slug — single community ──
  app.get("/api/admin/communities/:slug", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const [community] = await db
        .select()
        .from(communities)
        .where(eq(communities.slug, slug))
        .limit(1);

      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      res.json(community);
    } catch (error) {
      console.error("[Community Editor] Error getting community:", error);
      res.status(500).json({ message: "Failed to get community" });
    }
  });

  // ── PUT /api/admin/communities/:slug — update community ──
  app.put("/api/admin/communities/:slug", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const user = req.dbUser;
      const {
        metaTitle,
        metaDescription,
        focusKeyword,
        description,
        highlights,
        bestFor,
        nearbyLandmarks,
        sections,
        published,
        featured,
      } = req.body;

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: user?.email || user?.id || "admin",
      };

      if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
      if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
      if (focusKeyword !== undefined) updateData.focusKeyword = focusKeyword;
      if (description !== undefined) updateData.description = description;
      if (highlights !== undefined) updateData.highlights = highlights;
      if (bestFor !== undefined) updateData.bestFor = bestFor;
      if (nearbyLandmarks !== undefined) updateData.nearbyLandmarks = nearbyLandmarks;
      if (sections !== undefined) updateData.sections = sections;
      if (published !== undefined) updateData.published = published;
      if (featured !== undefined) updateData.featured = featured;

      const [updated] = await db
        .update(communities)
        .set(updateData)
        .where(eq(communities.slug, slug))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Community not found" });
      }

      console.log(`[Community Editor] Updated ${slug} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      console.error("[Community Editor] Error updating community:", error);
      res.status(500).json({ message: "Failed to update community" });
    }
  });

  // ── POST /api/admin/communities/:slug/publish — toggle publish ──
  app.post("/api/admin/communities/:slug/publish", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { slug } = req.params;
      const user = req.dbUser;

      // Get current state
      const [current] = await db
        .select({ published: communities.published })
        .from(communities)
        .where(eq(communities.slug, slug))
        .limit(1);

      if (!current) {
        return res.status(404).json({ message: "Community not found" });
      }

      const newState = !current.published;

      const [updated] = await db
        .update(communities)
        .set({
          published: newState,
          updatedAt: new Date(),
          updatedBy: user?.email || "admin",
        })
        .where(eq(communities.slug, slug))
        .returning();

      console.log(`[Community Editor] ${slug} ${newState ? "published" : "unpublished"} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      console.error("[Community Editor] Error toggling publish:", error);
      res.status(500).json({ message: "Failed to toggle publish status" });
    }
  });

  // ── GET /api/listings/by-polygon — fetch Repliers listings within a community polygon ──
  // Public route (no auth) — used by published CMS pages
  app.get("/api/listings/by-polygon", async (req: any, res) => {
    try {
      const communityId = parseInt(req.query.communityId as string, 10);
      if (!communityId || isNaN(communityId)) {
        return res.status(400).json({ message: "communityId is required" });
      }

      const apiKey = process.env.IDX_GRID_API_KEY || process.env.REPLIERS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "Listings API not configured" });
      }

      // Look up community polygon
      const [community] = await db
        .select({ polygon: communities.polygon, name: communities.name, locationType: communities.locationType, filterValue: communities.filterValue })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      if (!community.polygon || community.polygon.length < 3) {
        return res.status(400).json({ message: "Community does not have a valid polygon" });
      }

      // Import the proven Repliers API client
      const { searchByPolygon } = await import("../lib/repliers-api.js");

      // Build search filters
      const type = (req.query.type as string) || "Sale";
      const sort = (req.query.sort as string) || "date-desc";
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "12", 10)), 50);
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));

      // Optional filters
      const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string, 10) : undefined;
      const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
      const minBeds = req.query.minBeds ? parseInt(req.query.minBeds as string, 10) : undefined;
      const minBaths = req.query.minBaths ? parseInt(req.query.minBaths as string, 10) : undefined;
      const status = (req.query.status as string) || "Active";

      // Convert polygon format from [lng, lat] to the format expected by our API
      const polygon: Array<[number, number]> = community.polygon as Array<[number, number]>;

      console.log(`[Listings by Polygon] Fetching for community "${community.name}" (${polygon.length} pts) using proven API`);

      // Use the proven searchByPolygon function
      const results = await searchByPolygon(polygon, {
        type: type as 'Sale' | 'Rent' | 'Sold',
        status: [status],
        minPrice,
        maxPrice,
        minBeds,
        minBaths,
        sort: sort as 'price-asc' | 'price-desc' | 'date-desc' | 'sqft-desc',
        page,
        pageSize: limit,
      });

      // Transform to the expected response format for backwards compatibility
      const listings = results.listings.map((listing) => ({
        mlsNumber: listing.mlsNumber,
        listPrice: listing.price,
        address: listing.address.street,
        city: listing.address.city,
        state: listing.address.state,
        postalCode: listing.address.zip,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.sqft,
        photo: listing.photos[0] || null,
        photos: listing.photos.slice(0, 6),
        status: listing.status,
        daysOnMarket: listing.daysOnMarket,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType,
        listDate: listing.listDate,
      }));

      res.json({
        listings,
        count: results.total,
        page: results.page,
        limit: results.pageSize,
        communityName: community.name,
      });
    } catch (error) {
      console.error("[Listings by Polygon] Error:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  // ── GET /api/communities/:slug — spyglass-idx compatible community endpoint ──
  // This endpoint matches the format that spyglass-idx IDX widgets expect
  app.get("/api/communities/:slug", async (req: any, res) => {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const pageSize = parseInt(req.query.pageSize || '20', 10);
      const includeLiveData = req.query.live === 'true';

      console.log(`[Community API] Fetching community: ${slug}, live: ${includeLiveData}`);

      // Look up community by slug
      const [community] = await db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          county: communities.county,
          polygon: communities.polygon,
          centroid: communities.centroid,
          published: communities.published,
          description: communities.description,
          featured: communities.featured,
        })
        .from(communities)
        .where(eq(communities.slug, slug))
        .limit(1);

      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }

      if (!community.polygon || community.polygon.length < 3) {
        return res.status(400).json({ error: "Community does not have a valid polygon" });
      }

      console.log(`[Community API] Found community: ${community.name} with ${community.polygon.length} polygon points`);

      // Import the proven Repliers API client
      const { searchByPolygon } = await import("../lib/repliers-api.js");

      // Convert polygon format from [lng, lat] to the format expected by our API
      const polygon: Array<[number, number]> = community.polygon as Array<[number, number]>;

      // Use the proven searchByPolygon function
      const results = await searchByPolygon(polygon, {
        type: 'Sale',
        status: ['Active'],
        page,
        pageSize,
      });

      console.log(`[Community API] Found ${results.total} listings for ${community.name}`);

      // Transform to spyglass-idx compatible format
      const listings = results.listings.map((listing) => ({
        id: listing.id,
        mlsNumber: listing.mlsNumber,
        address: listing.address,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.sqft,
        lotSize: listing.lotSize,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType,
        status: listing.status,
        daysOnMarket: listing.daysOnMarket,
        photos: listing.photos,
        description: listing.description,
        coordinates: listing.coordinates,
        listDate: listing.listDate,
        updatedAt: listing.updatedAt,
      }));

      // Calculate basic stats
      const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
      const sqftListings = listings.filter(l => l.sqft > 0);

      const stats = {
        activeListings: results.total,
        medianPrice: prices.length > 0
          ? prices[Math.floor(prices.length / 2)]
          : 0,
        avgPricePerSqft: sqftListings.length > 0
          ? Math.round(sqftListings.reduce((sum, l) => sum + (l.price / l.sqft), 0) / sqftListings.length)
          : 0,
        avgDaysOnMarket: listings.length > 0
          ? Math.round(listings.reduce((sum, l) => sum + (l.daysOnMarket || 0), 0) / listings.length)
          : 0,
      };

      res.json({
        community: {
          name: community.name,
          slug: community.slug,
          county: community.county || 'Travis',
          featured: community.featured || false,
          polygon: community.polygon,
          displayPolygon: community.polygon, // Use same polygon for display
        },
        listings,
        stats,
        total: results.total,
        page: results.page,
        pageSize: results.pageSize,
        source: 'mission-control',
      });

    } catch (error) {
      console.error(`[Community API] Error for ${req.params.slug}:`, error);
      res.status(500).json({ error: "Failed to fetch community listings" });
    }
  });
}
