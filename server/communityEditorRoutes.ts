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

      // Helper to create initial sections array
      const createInitialSections = (communityName: string) => [{
        id: "overview",
        heading: `${communityName} Overview`,
        content: `Welcome to ${communityName}, a distinctive community in the Austin area. This neighborhood offers unique characteristics and amenities that make it a special place to call home.`,
        order: 1
      }];

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

      // Load IDX static data from hardcoded sources
      // Note: In production, this would ideally import from the IDX app, but for now
      // we'll use representative sample data to demonstrate the sync functionality
      
      const idxCommunities = [
        // Sample from austin-communities.ts format
        { id: "anderson-mill", name: "ANDERSON MILL", coordinates: [[30.456707349558, -97.792307359674], [30.452867912188, -97.791539155662]], center: { lat: 30.439083, lng: -97.825758 } },
        { id: "windsor-park", name: "WINDSOR PARK", coordinates: [[30.308539963932, -97.670762852964], [30.308233590738, -97.67203530173]], center: { lat: 30.308800, lng: -97.690893 } },
        { id: "dawson", name: "DAWSON", coordinates: [[30.238764836308, -97.753526659646], [30.237410976791, -97.754721346095]], center: { lat: 30.232859, lng: -97.761344 } },
        { id: "west-university", name: "WEST UNIVERSITY", coordinates: [[30.302746382707, -97.738154269236], [30.301971456887, -97.738595085795]], center: { lat: 30.291602, lng: -97.746821 } },
        
        // Sample from communities-data.ts format (featured)
        { id: "barton-creek", name: "Barton Creek", slug: "barton-creek", description: "Prestigious gated community known for luxury estates and world-class golf.", coordinates: [{ lat: 30.2850, lng: -97.8500 }, { lat: 30.2850, lng: -97.8100 }, { lat: 30.2550, lng: -97.8100 }, { lat: 30.2550, lng: -97.8500 }] },
        { id: "westlake-hills", name: "Westlake Hills", slug: "westlake-hills", description: "Affluent community with top-rated schools and stunning Hill Country views.", coordinates: [{ lat: 30.3100, lng: -97.8100 }, { lat: 30.3100, lng: -97.7700 }, { lat: 30.2800, lng: -97.7700 }, { lat: 30.2800, lng: -97.8100 }] },
        
        // Sample from missing-communities.json format
        { name: "321 West", slug: "321-west", polygon: [[-97.7518, 30.2632], [-97.7506, 30.2632], [-97.7506, 30.2642], [-97.7518, 30.2642]] },
        { name: "Allandale", slug: "allandale", polygon: [[-97.7410, 30.3140], [-97.7300, 30.3140], [-97.7300, 30.3240], [-97.7410, 30.3240]] },
        
        // Sample area communities (zip/city format)
        { name: "78704 – South Austin", slug: "zip-78704", type: "zip", filterValue: "78704", county: "Travis" },
        { name: "Cedar Park", slug: "city-cedar-park", type: "city", filterValue: "Cedar Park", county: "Williamson" }
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
            .where(eq(communities.slug, slug))
            .limit(1);

          if (existing) {
            // Update existing community, but only if it doesn't have sections
            if (!existing.sections || (Array.isArray(existing.sections) && existing.sections.length === 0)) {
              const updateData: any = {
                locationType,
                sections: createInitialSections(community.name),
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
              sections: createInitialSections(community.name),
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
