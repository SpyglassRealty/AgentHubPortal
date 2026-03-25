import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { communities } from "@shared/schema";
import { eq, ilike, and, or, sql, desc, asc, count } from "drizzle-orm";
import type { User } from "@shared/schema";
import { makeRepliersRequest } from "./lib/repliers-api";

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
          livebyLocationId: communities.livebyLocationId,
          source: communities.source,
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
      const { name, slug, locationType, filterValue, polygon, centroid, livebyLocationId } = req.body;
      const user = req.dbUser;

      // Normalize slug to lowercase
      const normalizedSlug = slug ? slug.toLowerCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      if (!name || !normalizedSlug || !polygon || polygon.length < 3) {
        return res.status(400).json({ message: "Name, slug, and polygon (min 3 points) are required" });
      }

      // Check slug uniqueness
      const [existing] = await db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.slug, normalizedSlug))
        .limit(1);

      if (existing) {
        return res.status(409).json({ message: "A community with this slug already exists" });
      }

      const [created] = await db
        .insert(communities)
        .values({
          name,
          slug: normalizedSlug,
          locationType: locationType || "polygon",
          filterValue: filterValue || null,
          polygon,
          centroid,
          livebyLocationId: livebyLocationId || null,
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
      const { name, slug, locationType, filterValue, polygon, centroid, livebyLocationId } = req.body;
      const user = req.dbUser;

      if (!polygon || polygon.length < 3) {
        return res.status(400).json({ message: "Polygon must have at least 3 points" });
      }

      const updateData: Record<string, any> = {
        polygon,
        centroid,
        livebyLocationId: livebyLocationId || null,
        updatedAt: new Date(),
        updatedBy: user?.email || "admin",
      };

      if (name) updateData.name = name;
      if (slug) updateData.slug = slug.toLowerCase();
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

      // Block delete for LiveBy neighborhood communities
      const community = await db.query.communities.findFirst({
        where: eq(communities.id, id)
      });
      if (!community) return res.status(404).json({ message: "Community not found" });
      if (community.locationType === 'neighborhood') {
        return res.status(403).json({ message: "Cannot delete polygon for LiveBy neighborhood communities" });
      }

      // Use raw SQL — Drizzle ORM unreliable for JSONB null updates
      await db.execute(
        sql`UPDATE communities SET polygon = '[]'::jsonb, display_polygon = '[]'::jsonb, centroid = NULL, updated_at = NOW(), updated_by = ${user?.email || 'admin'} WHERE id = ${id}`
      );

      console.log(`[Community Editor] Deleted polygon for id=${id} by ${user?.email}`);
      res.json({ message: "Polygon deleted" });
    } catch (error) {
      console.error("[Community Editor] Error deleting polygon:", error);
      res.status(500).json({ message: "Failed to delete polygon" });
    }
  });

  // ── DELETE /api/admin/communities/:id — delete entire community (polygon/snippet only) ──
  app.delete("/api/admin/communities/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.dbUser;

      // Block delete for LiveBy neighborhood communities
      const community = await db.query.communities.findFirst({
        where: eq(communities.id, id)
      });
      if (!community) return res.status(404).json({ message: "Community not found" });
      if (community.locationType === 'neighborhood') {
        return res.status(403).json({ message: "Cannot delete LiveBy neighborhood communities" });
      }

      // Only allow delete for manually created communities
      if (!['polygon', 'snippet'].includes(community.locationType)) {
        return res.status(403).json({ message: "Can only delete polygon or snippet communities" });
      }

      // Use raw SQL for reliable deletion
      await db.execute(
        sql`DELETE FROM communities WHERE id = ${id}`
      );

      console.log(`[Community Editor] Deleted community ${community.slug} (${community.locationType}) by ${user?.email}`);
      res.json({ message: "Community deleted successfully" });
    } catch (error) {
      console.error("[Community Editor] Error deleting community:", error);
      res.status(500).json({ message: "Failed to delete community" });
    }
  });

  // ── GET /api/admin/liveby/autocomplete — LiveBy location search ──
  app.get("/api/admin/liveby/autocomplete", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { search } = req.query;
      
      if (!search || typeof search !== 'string' || search.trim().length < 2) {
        return res.json([]);
      }

      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || '127.0.0.1';

      const results = await makeRepliersRequest({
        endpoint: '/locations/autocomplete',
        params: {
          search: search.trim(),
          source: 'LiveBy',
          type: 'neighborhood',
          fields: 'locationId,name,type,map,address,subType,size'
        },
        headers: {
          'X-Repliers-Forwarded-For': clientIp
        }
      });

      // Return simplified format for frontend
      const simplified = results.map((item: any) => ({
        locationId: item.locationId,
        name: item.name,
        type: item.type || 'neighborhood',
        subType: item.subType,
        address: item.address,
        map: item.map, // Contains polygon coordinates
        size: item.size
      }));

      res.json(simplified);
    } catch (error) {
      console.error("[LiveBy Autocomplete] Error:", error);
      res.status(500).json({ message: "Failed to search LiveBy locations" });
    }
  });

  // ── GET /api/admin/communities — paginated list with search & filter ──
  app.get("/api/admin/communities", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const filter = (req.query.filter as string) || "all"; // all | published | draft
      const county = (req.query.county as string) || "";
      const hasContent = req.query.hasContent as string; // "true" | "false" | undefined
      const seoFilter = req.query.seoFilter as string; // "good" | "poor" | undefined
      const sortBy = (req.query.sortBy as string) || "name"; // name | updated | seo_score
      const sortDir = (req.query.sortDir as string) || "asc"; // asc | desc
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

      if (hasContent === "true") {
        conditions.push(
          and(
            sql`${communities.sections} IS NOT NULL`,
            sql`jsonb_array_length(${communities.sections}) > 0`
          )
        );
      } else if (hasContent === "false") {
        conditions.push(
          or(
            sql`${communities.sections} IS NULL`,
            sql`jsonb_array_length(${communities.sections}) = 0`
          )
        );
      }

      // SEO filter logic
      if (seoFilter === "good") {
        conditions.push(
          and(
            sql`${communities.metaTitle} IS NOT NULL`,
            sql`length(${communities.metaTitle}) <= 60`,
            sql`${communities.metaDescription} IS NOT NULL`,
            sql`length(${communities.metaDescription}) <= 160`,
            sql`${communities.focusKeyword} IS NOT NULL`,
            sql`${communities.description} IS NOT NULL`,
            sql`length(${communities.description}) >= 100`
          )
        );
      } else if (seoFilter === "poor") {
        conditions.push(
          or(
            sql`${communities.metaTitle} IS NULL`,
            sql`length(${communities.metaTitle}) > 60`,
            sql`${communities.metaDescription} IS NULL`,
            sql`length(${communities.metaDescription}) > 160`,
            sql`${communities.focusKeyword} IS NULL`,
            sql`${communities.description} IS NULL`,
            sql`length(${communities.description}) < 100`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build order clause based on sortBy and sortDir
      let orderClause;
      const direction = sortDir === "desc" ? desc : asc;
      
      switch (sortBy) {
        case "updated":
          orderClause = direction(communities.updatedAt);
          break;
        case "seo_score":
          // Calculate SEO score in SQL - closer to frontend logic
          orderClause = direction(
            sql`CASE 
              WHEN ${communities.metaTitle} IS NULL THEN 75
              WHEN length(${communities.metaTitle}) > 60 THEN 75
              ELSE 100
            END +
            CASE 
              WHEN ${communities.metaDescription} IS NULL THEN 75
              WHEN length(${communities.metaDescription}) > 160 THEN 75
              ELSE 100
            END +
            CASE 
              WHEN ${communities.focusKeyword} IS NULL THEN 75
              ELSE 100
            END +
            CASE 
              WHEN ${communities.description} IS NULL OR length(${communities.description}) < 100 THEN 75
              ELSE 100
            END`
          );
          break;
        default: // name
          orderClause = direction(communities.name);
      }

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
            metaDescription: communities.metaDescription,
            focusKeyword: communities.focusKeyword,
            description: communities.description,
          })
          .from(communities)
          .where(whereClause)
          .orderBy(orderClause)
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
        .where(eq(communities.slug, slug.toLowerCase()))
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
        pageTitle,
        aboutHeadingLevel,
        description,
        highlights,
        bestFor,
        nearbyLandmarks,
        sections,
        published,
        featured,
        featuredImageUrl,
        heroImage,
        customSlug,
      } = req.body;

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
        updatedBy: user?.email || user?.id || "admin",
      };

      if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
      if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
      if (focusKeyword !== undefined) updateData.focusKeyword = focusKeyword;
      if (pageTitle !== undefined) updateData.pageTitle = pageTitle;
      if (aboutHeadingLevel !== undefined) updateData.aboutHeadingLevel = aboutHeadingLevel;
      if (description !== undefined) updateData.description = description;
      if (highlights !== undefined) updateData.highlights = highlights;
      if (bestFor !== undefined) updateData.bestFor = bestFor;
      if (nearbyLandmarks !== undefined) updateData.nearbyLandmarks = nearbyLandmarks;
      if (sections !== undefined) updateData.sections = sections;
      if (published !== undefined) updateData.published = published;
      if (featured !== undefined) updateData.featured = featured;
      if (featuredImageUrl !== undefined) updateData.featuredImageUrl = featuredImageUrl;
      if (heroImage !== undefined) updateData.heroImage = heroImage;
      if (customSlug !== undefined) updateData.customSlug = customSlug;

      const [updated] = await db
        .update(communities)
        .set(updateData)
        .where(eq(communities.slug, slug.toLowerCase()))
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
        .where(eq(communities.slug, slug.toLowerCase()))
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
        .where(eq(communities.slug, slug.toLowerCase()))
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

      // Polygon is stored as [lng, lat][] — keep in that format for Repliers POST body
      // Ensure polygon is closed (first point === last point)
      const polyCoords = [...community.polygon];
      const first = polyCoords[0];
      const last = polyCoords[polyCoords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        polyCoords.push(first);
      }

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
        listings: "true",
        type,
        class: searchClass,
        status: status === "Active" ? "A" : status,
        sortBy: sort,
        resultsPerPage: limit.toString(),
        pageNum: page.toString(),
      });

      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (minBeds) params.append("minBeds", minBeds);
      if (minBaths) params.append("minBaths", minBaths);

      const url = `https://api.repliers.io/listings?${params.toString()}`;
      console.log(`[Listings by Polygon] Fetching for community "${community.name}" (${polyCoords.length} pts) via POST`);

      // Use POST with JSON body for polygon search (same format as CMA search)
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "REPLIERS-API-KEY": apiKey,
        },
        body: JSON.stringify({ map: [polyCoords] }),
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

  // ── POST /api/admin/communities/bulk-sync — sync all IDX communities to Mission Control ──
  app.post("/api/admin/communities/bulk-sync", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      console.log("[Community Bulk Sync] Starting bulk sync from IDX static data...");
      const user = req.dbUser;
      
      // Summary counters
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors: string[] = [];

      // Helper to create sections from IDX community content
      const createSectionsFromContent = (communityName: string, communityData: any): any[] => {
        const sections: any[] = [];
        let order = 1;

        // Overview section - always include for all communities
        sections.push({
          id: `section-${Date.now()}-overview`,
          order: order++,
          heading: `${communityName} Overview`,
          content: communityData.description ? 
            `<p>${communityData.description}</p>` : 
            `<p>Welcome to ${communityName}, a distinctive community in the Austin area. This neighborhood offers unique characteristics and amenities that make it a special place to call home.</p>`
        });

        // Highlights section - if highlights exist
        if (communityData.highlights && Array.isArray(communityData.highlights) && communityData.highlights.length > 0) {
          const highlightsList = communityData.highlights.map((highlight: string) => `<li>${highlight}</li>`).join('');
          sections.push({
            id: `section-${Date.now()}-highlights`,
            order: order++,
            heading: `${communityName} Highlights`,
            content: `<ul>${highlightsList}</ul>`
          });
        }

        // Best For section - if bestFor exists
        if (communityData.bestFor && Array.isArray(communityData.bestFor) && communityData.bestFor.length > 0) {
          const bestForList = communityData.bestFor.map((item: string) => `<li>${item}</li>`).join('');
          sections.push({
            id: `section-${Date.now()}-best-for`,
            order: order++,
            heading: `Perfect For`,
            content: `<p>${communityName} is particularly well-suited for:</p><ul>${bestForList}</ul>`
          });
        }

        // Nearby Landmarks section - if nearbyLandmarks exists
        if (communityData.nearbyLandmarks && Array.isArray(communityData.nearbyLandmarks) && communityData.nearbyLandmarks.length > 0) {
          const landmarksList = communityData.nearbyLandmarks.map((landmark: string) => `<li>${landmark}</li>`).join('');
          sections.push({
            id: `section-${Date.now()}-landmarks`,
            order: order++,
            heading: `Nearby Landmarks & Attractions`,
            content: `<ul>${landmarksList}</ul>`
          });
        }

        // Real estate section - add for all communities
        sections.push({
          id: `section-${Date.now()}-real-estate`,
          order: order++,
          heading: `${communityName} Real Estate`,
          content: `<p>Interested in buying a home in ${communityName}? Our Austin real estate experts are ready to help you navigate the local market. <a href="/contact.php">Contact Spyglass Realty</a> to learn more about buyer representation and to schedule tours of available properties.</p><p><a href="/home-evaluation.php">Get a free market analysis</a> if you're considering selling your ${communityName} property.</p>`
        });

        return sections;
      };

      // Helper to convert coordinates from IDX format to Mission Control format
      const convertCoordinates = (coordinates: any[]): [number, number][] => {
        if (!coordinates || !Array.isArray(coordinates)) return [];
        
        return coordinates.map(coord => {
          if (Array.isArray(coord)) {
            // Handle [lat, lng] or [lng, lat] format
            if (coord.length >= 2) {
              // IDX uses [lat, lng], Mission Control expects [lng, lat]
              return [coord[1], coord[0]] as [number, number];
            }
          } else if (coord && typeof coord === 'object' && coord.lat !== undefined && coord.lng !== undefined) {
            // Handle {lat, lng} objects
            return [coord.lng, coord.lat] as [number, number];
          }
          return [0, 0] as [number, number];
        });
      };

      // Helper to calculate centroid from coordinates
      const calculateCentroid = (coordinates: [number, number][]): { lat: number; lng: number } | null => {
        if (!coordinates || coordinates.length === 0) return null;
        
        const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
        const sumLng = coordinates.reduce((sum, coord) => sum + coord[0], 0);
        
        return {
          lat: sumLat / coordinates.length,
          lng: sumLng / coordinates.length
        };
      };

      // Helper to create slug from ID or name
      const createSlug = (idOrName: string): string => {
        return idOrName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      // Load IDX static community data - real content from community-descriptions.ts
      const idxCommunities = [
        // From community-descriptions.ts - rich, locally-informed descriptions
        {
          slug: 'zilker',
          name: 'Zilker',
          description: `Zilker is the crown jewel of central Austin living. Nestled between Barton Creek and Lady Bird Lake, this neighborhood delivers an unbeatable combination of outdoor access, walkability, and old Austin charm. Residents wake up minutes from Barton Springs Pool, the hike-and-bike trail, and the sprawling 351-acre Zilker Metropolitan Park — the same park that hosts Austin City Limits Music Festival every October.

Homes in Zilker range from lovingly maintained 1940s bungalows on tree-lined streets to sleek modern builds that have popped up along Kinney Avenue and Rabb Road. The housing stock is diverse, but demand is fierce — properties here rarely sit on market for long. Zilker Elementary is a beloved neighborhood school, and the area's central location means easy access to both downtown and South Lamar's restaurant row.

Day-to-day life in Zilker revolves around the outdoors. You'll see neighbors paddleboarding on the lake, running the Butler Trail, or grabbing tacos at Torchy's on South 1st. Barton Springs Road serves as the neighborhood's main artery, lined with local favorites like Shady Grove and Chuy's. If you want the quintessential Austin lifestyle with real community roots, Zilker is it.`,
          highlights: [
            'Walk or bike to Barton Springs Pool and Zilker Park year-round',
            'Zilker Elementary consistently rated among Austin\'s top public schools',
            'Minutes from South Lamar dining, SoCo shopping, and downtown',
            'Butler Hike-and-Bike Trail access at multiple trailheads',
            'Strong home values with consistent appreciation over the past decade',
          ],
          bestFor: ['Outdoor enthusiasts', 'Young professionals', 'Families', 'Dog owners'],
          nearbyLandmarks: [
            'Zilker Metropolitan Park',
            'Barton Springs Pool',
            'Lady Bird Lake / Butler Trail',
            'Austin City Limits at Zilker Park',
            'Umlauf Sculpture Garden',
          ],
        },
        {
          slug: 'barton-hills',
          name: 'Barton Hills',
          description: `Barton Hills is one of Austin's best-kept secrets — a quiet, wooded enclave tucked between Zilker Park and the Barton Creek Greenbelt. The neighborhood has a distinctly unhurried, almost rural feel despite being just minutes from downtown. Streets wind through mature live oaks and cedar elms, and it's not uncommon to spot deer on your morning walk along Barton Hills Drive.

The housing stock is predominantly mid-century ranch homes from the 1950s and '60s, many of which have been thoughtfully updated while retaining their original character. Larger lots are common here — you won't feel like you're on top of your neighbors. Newer custom homes have filled in along Robert E. Lee Road and Homedale Drive, but strict neighborhood covenants keep development in check.

What makes Barton Hills truly special is the greenbelt access. Residents can walk to some of Austin's best swimming holes, including Campbell's Hole and Twin Falls, via trails that connect directly from neighborhood streets. Barton Hills Elementary anchors the community, and the neighborhood pool is a popular summer gathering spot. For groceries, the Barton Hills Market on South Lamar has been a fixture for decades.`,
          highlights: [
            'Direct access to the Barton Creek Greenbelt and swimming holes',
            'Large lots with mature trees and a quiet, wooded character',
            'Barton Hills Elementary — a strong neighborhood school',
            'Community pool and neighborhood association events',
            'Short drive to Zilker Park, South Lamar, and downtown',
          ],
          bestFor: ['Families with children', 'Outdoor enthusiasts', 'Dog owners', 'Those seeking peace and quiet'],
          nearbyLandmarks: [
            'Barton Creek Greenbelt',
            'Campbell\'s Hole',
            'Twin Falls',
            'Zilker Park',
            'Barton Hills Market',
          ],
        },
        {
          slug: 'downtown-austin',
          name: 'Downtown Austin',
          description: `Downtown Austin is the beating heart of the city, where gleaming high-rises stand beside historic buildings and every block pulses with energy. From the Texas State Capitol to the shores of Lady Bird Lake, downtown encompasses multiple distinct districts — the Warehouse District, Rainey Street, the Entertainment District, and the Central Business District.

Living downtown means trading suburban space for urban sophistication. High-rise condominiums offer skyline views and walkable access to Austin's best restaurants, live music venues, and cultural attractions. Whether it's catching a show at the legendary Moody Theater, grabbing breakfast tacos from a food truck, or taking an evening stroll along the Lady Bird Lake boardwalk, downtown residents live at the center of Austin's cultural universe.

The housing stock is primarily condominiums and luxury apartments, with options ranging from converted warehouse lofts in the Warehouse District to ultra-modern high-rises along the lake. Prices reflect the premium location, but for those who want to be in the thick of Austin's action, downtown delivers an unmatched urban experience.`,
          highlights: [
            'Walkable access to world-class dining, music venues, and nightlife',
            'Lady Bird Lake and Butler Hike-and-Bike Trail at your doorstep',
            'High-rise living with panoramic city and lake views',
            'Home to major employers, government offices, and cultural institutions',
            'Unparalleled public transportation and rideshare connectivity',
          ],
          bestFor: ['Urban professionals', 'Empty nesters', 'Music lovers', 'Car-free lifestyle seekers'],
          nearbyLandmarks: [
            'Texas State Capitol',
            'Lady Bird Lake',
            'Rainey Street Historic District',
            'Sixth Street Entertainment District',
            'Austin Convention Center',
          ],
        },
        // Area communities - zip codes with real descriptions  
        {
          slug: 'zip-78704',
          name: '78704 – South Austin',
          type: 'zip',
          filterValue: '78704',
          county: 'Travis',
          description: `78704 is South Austin in all its eclectic glory — a zip code that captures the neighborhood's creative spirit, diverse housing stock, and unbeatable food scene. Stretching from South Lamar to Congress and down to Slaughter Lane, this area includes iconic neighborhoods like Zilker, Barton Hills, and South Lamar.

The real estate landscape is wonderfully varied. You'll find everything from charming 1940s cottages near Zilker Park to modern condos along South Lamar, from mid-century ranches with swimming pools to new construction townhomes. The area's popularity has driven significant appreciation, but the diversity of housing types means options exist across a range of price points.

What makes 78704 special is the lifestyle. This is where you'll find Franklin Barbecue (yes, it's worth the line), South Lamar's restaurant row, and Zilker Park hosting everything from morning yoga to Austin City Limits. The area strikes that perfect Austin balance between laid-back and sophisticated, outdoorsy and cultural.`,
          highlights: [
            'Home to Franklin Barbecue, South Lamar dining, and Zilker Park',
            'Diverse housing stock from vintage cottages to modern condos',
            'Central location with easy access to downtown and the airport',
            'Butler Hike-and-Bike Trail and Lady Bird Lake access',
            'Strong sense of community with active neighborhood associations',
          ],
          bestFor: ['Foodies', 'Outdoor enthusiasts', 'Young professionals', 'Families'],
          nearbyLandmarks: [
            'Zilker Metropolitan Park',
            'South Lamar Boulevard',
            'Franklin Barbecue',
            'Lady Bird Lake',
            'Barton Springs Pool',
          ],
        },
        {
          slug: 'city-cedar-park',
          name: 'Cedar Park',
          type: 'city',
          filterValue: 'Cedar Park',
          county: 'Williamson',
          description: `Cedar Park has earned its reputation as one of Central Texas's premier family destinations. Located just northwest of Austin, this city of roughly 80,000 residents offers the perfect blend of suburban amenities, top-rated schools, and small-town charm, all while maintaining easy access to Austin's employment centers.

The housing market in Cedar Park is robust and diverse, featuring everything from established neighborhoods with mature trees to master-planned communities with resort-style amenities. Many homes were built in the 1990s and 2000s, offering solid construction and floor plans designed for modern family living. Newer developments continue to push the boundaries with energy-efficient homes and smart home technology.

What sets Cedar Park apart is its commitment to quality of life. The city boasts excellent parks, including the popular Milburn Park with its swimming pool and sports facilities, and the scenic Brushy Creek Regional Trail. The HEB Center at Cedar Park brings major concerts and Texas Stars hockey games to residents' backyard. Combined with Leander ISD schools that consistently rank among the state's best, Cedar Park represents an ideal choice for families seeking suburban excellence.`,
          highlights: [
            'Leander ISD schools consistently rated among Texas\'s best',
            'HEB Center at Cedar Park hosting major concerts and sporting events',
            'Master-planned communities with resort-style amenities',
            'Brushy Creek Regional Trail for hiking and biking',
            '25-30 minute commute to downtown Austin',
          ],
          bestFor: ['Families with school-age children', 'Commuters to Austin', 'Sports and entertainment lovers', 'Suburban lifestyle seekers'],
          nearbyLandmarks: [
            'HEB Center at Cedar Park',
            'Brushy Creek Regional Trail',
            'Milburn Park',
            'Hill Country Galleria',
            'Salt Traders Coastal Cooking',
          ],
        }
      ];

      // Process each community from all sources
      for (const community of idxCommunities) {
        try {
          // Handle different slug sources
          const slug = (community as any).slug || 
                      ((community as any).id ? createSlug((community as any).id) : createSlug(community.name));
          
          // Handle different coordinate formats
          let polygon: [number, number][] = [];
          let centroid: { lat: number; lng: number } | null = null;
          
          const communityData = community as any;
          
          if (communityData.coordinates) {
            polygon = convertCoordinates(communityData.coordinates);
            centroid = calculateCentroid(polygon);
          } else if (communityData.polygon) {
            // Handle missing-communities.json format (already in [lng, lat])
            polygon = communityData.polygon.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
            centroid = calculateCentroid(polygon);
          }
          
          // Use provided center if available
          if (communityData.center) {
            centroid = { lat: communityData.center.lat, lng: communityData.center.lng };
          }
          
          // Handle area communities (zip/city) - no polygon data
          const locationType = communityData.type === 'zip' ? 'zip' : 
                             communityData.type === 'city' ? 'city' : 'polygon';
          
          // Check if community already exists
          const [existing] = await db
            .select()
            .from(communities)
            .where(eq(communities.slug, slug.toLowerCase()))
            .limit(1);

          if (existing) {
            // Update existing community, but only if it doesn't have sections
            if (!existing.sections || (Array.isArray(existing.sections) && existing.sections.length === 0)) {
              const updateData: any = {
                locationType,
                sections: createSectionsFromContent(community.name, communityData),
                description: communityData.description || null,
                metaTitle: `${community.name} Homes for Sale | Austin Real Estate | Spyglass Realty`,
                metaDescription: `Explore homes for sale in ${community.name}. View listings, market stats, and neighborhood insights with Spyglass Realty's local Austin experts.`,
                updatedAt: new Date(),
                updatedBy: user?.email || "admin"
              };

              // Add polygon data only for polygon-type communities
              if (locationType === 'polygon' && polygon.length > 0) {
                updateData.polygon = polygon;
                updateData.centroid = centroid;
              } else if (locationType === 'zip' || locationType === 'city') {
                updateData.filterValue = communityData.filterValue;
                updateData.county = communityData.county || null;
              }

              await db
                .update(communities)
                .set(updateData)
                .where(eq(communities.id, existing.id));
              
              updated++;
              console.log(`[Bulk Sync] Updated: ${community.name} (${slug})`);
            } else {
              skipped++;
              console.log(`[Bulk Sync] Skipped: ${community.name} (${slug}) - already has sections`);
            }
          } else {
            // Create new community
            const newCommunity: any = {
              slug,
              name: community.name,
              locationType,
              sections: createSectionsFromContent(community.name, communityData),
              description: communityData.description || null,
              metaTitle: `${community.name} Homes for Sale | Austin Real Estate | Spyglass Realty`,
              metaDescription: `Explore homes for sale in ${community.name}. View listings, market stats, and neighborhood insights with Spyglass Realty's local Austin experts.`,
              published: false, // Default to draft
              featured: false,
              updatedBy: user?.email || "admin"
            };

            // Add polygon data only for polygon-type communities
            if (locationType === 'polygon' && polygon.length > 0) {
              newCommunity.polygon = polygon;
              newCommunity.centroid = centroid;
            } else if (locationType === 'zip' || locationType === 'city') {
              newCommunity.filterValue = communityData.filterValue;
              newCommunity.county = communityData.county || null;
            }

            await db.insert(communities).values(newCommunity);
            created++;
            console.log(`[Bulk Sync] Created: ${community.name} (${slug})`);
          }
        } catch (error: any) {
          const errorMsg = `${community.name}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[Bulk Sync] Error processing ${community.name}:`, error);
        }
      }

      const summary = {
        total: idxCommunities.length,
        created,
        updated, 
        skipped,
        errors: errors.length,
        errorDetails: errors
      };

      console.log(`[Bulk Sync] Complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

      res.json({
        success: true,
        message: `Bulk sync completed: ${created} created, ${updated} updated, ${skipped} skipped`,
        summary
      });

    } catch (error) {
      console.error("[Community Bulk Sync] Error:", error);
      res.status(500).json({ message: "Failed to bulk sync communities" });
    }
  });
}
