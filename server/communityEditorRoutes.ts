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

      const apiKey = process.env.IDX_GRID_API_KEY;
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

      // Convert DB format [lng, lat][] to Repliers format "lat,lng|lat,lng|..."
      // Also close the polygon (first and last point must be the same)
      const polygonCoords = community.polygon.map(([lng, lat]: [number, number]) => `${lat},${lng}`);
      // Close the ring
      const firstCoord = polygonCoords[0];
      const lastCoord = polygonCoords[polygonCoords.length - 1];
      if (firstCoord !== lastCoord) {
        polygonCoords.push(firstCoord);
      }
      const polygonParam = polygonCoords.join("|");

      // Build query params
      const type = (req.query.type as string) || "Sale";
      const searchClass = (req.query.class as string) || "residential";
      const sort = (req.query.sort as string) || "createdOnDesc";
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "12", 10)), 50);
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));

      // Optional filters
      const minPrice = req.query.minPrice as string;
      const maxPrice = req.query.maxPrice as string;
      const minBeds = req.query.minBeds as string;
      const minBaths = req.query.minBaths as string;
      const status = (req.query.status as string) || "Active";

      const params = new URLSearchParams({
        type,
        class: searchClass,
        status: status === "Active" ? "A" : status,
        sortBy: sort,
        resultsPerPage: limit.toString(),
        pageNum: page.toString(),
        map: polygonParam,
      });

      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (minBeds) params.append("minBeds", minBeds);
      if (minBaths) params.append("minBaths", minBaths);

      const url = `https://api.repliers.io/listings?${params.toString()}`;
      console.log(`[Listings by Polygon] Fetching for community "${community.name}" (${community.polygon.length} pts)`);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "REPLIERS-API-KEY": apiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Listings by Polygon] Repliers API error ${response.status}:`, errText.substring(0, 500));
        return res.status(response.status).json({ message: "Failed to fetch listings from MLS" });
      }

      const data = await response.json();
      const listings = (data.listings || []).map((listing: any) => ({
        mlsNumber: listing.mlsNumber,
        listPrice: listing.listPrice,
        address: listing.address?.unparsedAddress || listing.address?.streetName || "Address unavailable",
        city: listing.address?.city || "",
        state: listing.address?.state || "TX",
        postalCode: listing.address?.postalCode || "",
        bedrooms: listing.details?.numBedrooms || listing.details?.numBedroomsTotal || 0,
        bathrooms: listing.details?.numBathrooms || listing.details?.numBathroomsFull || 0,
        sqft: listing.details?.sqft || listing.details?.livingArea || 0,
        photo: listing.images?.[0] || null,
        photos: (listing.images || []).slice(0, 6),
        status: listing.standardStatus || listing.status || "Active",
        daysOnMarket: listing.daysOnMarket || 0,
        yearBuilt: listing.details?.yearBuilt || null,
        propertyType: listing.details?.propertyType || listing.type || "",
        listDate: listing.listDate || null,
      }));

      res.json({
        listings,
        count: data.count || listings.length,
        page,
        limit,
        communityName: community.name,
      });
    } catch (error) {
      console.error("[Listings by Polygon] Error:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });
}
