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
}
