import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { redirects } from "@shared/schema";
import { eq, ilike, and, or, sql, desc, asc, count } from "drizzle-orm";
import type { User } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

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

// ── Validation schemas ────────────────────────────────
const createRedirectSchema = z.object({
  sourceUrl: z.string().min(1).max(500).refine(url => url.startsWith('/'), { message: 'Source URL must start with /' }),
  destinationUrl: z.string().min(1).max(500),
  redirectType: z.enum(['301', '302']).default('301'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateRedirectSchema = z.object({
  sourceUrl: z.string().min(1).max(500).refine(url => url.startsWith('/'), { message: 'Source URL must start with /' }).optional(),
  destinationUrl: z.string().min(1).max(500).optional(),
  redirectType: z.enum(['301', '302']).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export function registerRedirectsRoutes(app: Express) {
  // ── GET /api/admin/redirects — paginated list with search & filter ──
  app.get("/api/admin/redirects", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const filter = (req.query.filter as string) || "all"; // all | active | inactive
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || "50", 10)), 200);
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(redirects.sourceUrl, `%${search}%`),
            ilike(redirects.destinationUrl, `%${search}%`),
            ilike(redirects.description, `%${search}%`)
          )
        );
      }

      if (filter === "active") {
        conditions.push(eq(redirects.isActive, true));
      } else if (filter === "inactive") {
        conditions.push(eq(redirects.isActive, false));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(redirects)
          .where(whereClause)
          .orderBy(desc(redirects.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(redirects)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.total || 0;

      res.json({
        redirects: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(Number(total) / limit),
        },
      });
    } catch (error) {
      console.error("[Redirects] Error listing redirects:", error);
      res.status(500).json({ message: "Failed to list redirects" });
    }
  });

  // ── GET /api/admin/redirects/:id — single redirect ──
  app.get("/api/admin/redirects/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [redirect] = await db
        .select()
        .from(redirects)
        .where(eq(redirects.id, id))
        .limit(1);

      if (!redirect) {
        return res.status(404).json({ message: "Redirect not found" });
      }

      res.json(redirect);
    } catch (error) {
      console.error("[Redirects] Error getting redirect:", error);
      res.status(500).json({ message: "Failed to get redirect" });
    }
  });

  // ── POST /api/admin/redirects — create redirect ──
  app.post("/api/admin/redirects", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const validatedData = createRedirectSchema.parse(req.body);

      // Check for conflicting active redirect with same source URL
      const existing = await db
        .select()
        .from(redirects)
        .where(and(
          eq(redirects.sourceUrl, validatedData.sourceUrl),
          eq(redirects.isActive, true)
        ))
        .limit(1);

      if (existing.length > 0 && validatedData.isActive) {
        return res.status(409).json({ 
          message: "An active redirect already exists for this source URL" 
        });
      }

      const [created] = await db
        .insert(redirects)
        .values({
          ...validatedData,
          createdBy: user?.email || user?.id || "admin",
        })
        .returning();

      console.log(`[Redirects] Created redirect ${validatedData.sourceUrl} -> ${validatedData.destinationUrl} by ${user?.email}`);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Redirects] Error creating redirect:", error);
      res.status(500).json({ message: "Failed to create redirect" });
    }
  });

  // ── PUT /api/admin/redirects/:id — update redirect ──
  app.put("/api/admin/redirects/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;
      const validatedData = updateRedirectSchema.parse(req.body);

      // If updating sourceUrl and isActive, check for conflicts
      if (validatedData.sourceUrl && validatedData.isActive !== false) {
        const existing = await db
          .select()
          .from(redirects)
          .where(and(
            eq(redirects.sourceUrl, validatedData.sourceUrl),
            eq(redirects.isActive, true),
            sql`${redirects.id} != ${id}` // exclude current redirect
          ))
          .limit(1);

        if (existing.length > 0) {
          return res.status(409).json({ 
            message: "An active redirect already exists for this source URL" 
          });
        }
      }

      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(redirects)
        .set(updateData)
        .where(eq(redirects.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Redirect not found" });
      }

      console.log(`[Redirects] Updated redirect ${id} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Redirects] Error updating redirect:", error);
      res.status(500).json({ message: "Failed to update redirect" });
    }
  });

  // ── DELETE /api/admin/redirects/:id — delete redirect ──
  app.delete("/api/admin/redirects/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;

      const [deleted] = await db
        .delete(redirects)
        .where(eq(redirects.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Redirect not found" });
      }

      console.log(`[Redirects] Deleted redirect ${id} by ${user?.email}`);
      res.json({ message: "Redirect deleted", redirect: deleted });
    } catch (error) {
      console.error("[Redirects] Error deleting redirect:", error);
      res.status(500).json({ message: "Failed to delete redirect" });
    }
  });

  // ── POST /api/admin/redirects/:id/toggle — toggle active status ──
  app.post("/api/admin/redirects/:id/toggle", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;

      // Get current state
      const [current] = await db
        .select()
        .from(redirects)
        .where(eq(redirects.id, id))
        .limit(1);

      if (!current) {
        return res.status(404).json({ message: "Redirect not found" });
      }

      const newState = !current.isActive;

      // If activating, check for conflicts
      if (newState) {
        const existing = await db
          .select()
          .from(redirects)
          .where(and(
            eq(redirects.sourceUrl, current.sourceUrl),
            eq(redirects.isActive, true),
            sql`${redirects.id} != ${id}`
          ))
          .limit(1);

        if (existing.length > 0) {
          return res.status(409).json({ 
            message: "Cannot activate: an active redirect already exists for this source URL" 
          });
        }
      }

      const [updated] = await db
        .update(redirects)
        .set({
          isActive: newState,
          updatedAt: new Date(),
        })
        .where(eq(redirects.id, id))
        .returning();

      console.log(`[Redirects] ${current.sourceUrl} ${newState ? "activated" : "deactivated"} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      console.error("[Redirects] Error toggling redirect:", error);
      res.status(500).json({ message: "Failed to toggle redirect" });
    }
  });

  // ── Public redirect lookup route (used by frontend router) ──
  app.get("/api/redirect-lookup", async (req: any, res) => {
    try {
      const path = req.query.path as string;
      if (!path) {
        return res.status(400).json({ message: "Path parameter required" });
      }

      const [redirect] = await db
        .select()
        .from(redirects)
        .where(and(
          eq(redirects.sourceUrl, path),
          eq(redirects.isActive, true)
        ))
        .limit(1);

      if (!redirect) {
        return res.status(404).json({ message: "No redirect found" });
      }

      // Update hit count and last accessed
      await db
        .update(redirects)
        .set({
          hitCount: sql`${redirects.hitCount} + 1`,
          lastAccessed: new Date(),
        })
        .where(eq(redirects.id, redirect.id));

      res.json({
        redirectTo: redirect.destinationUrl,
        redirectType: redirect.redirectType,
      });
    } catch (error) {
      console.error("[Redirects] Error looking up redirect:", error);
      res.status(500).json({ message: "Failed to lookup redirect" });
    }
  });

  // ── Configure multer for file uploads ──
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept CSV, XLSX, and XLS files
      const allowedTypes = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files are allowed'), false);
      }
    }
  });

  // ── Helper function to normalize URL paths ──
  function normalizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '';
    let normalized = url.trim();
    
    // Ensure source URLs start with /
    if (!normalized.startsWith('/') && !normalized.startsWith('http')) {
      normalized = '/' + normalized;
    }
    
    return normalized;
  }

  // ── Helper function to parse uploaded file data ──
  function parseFileData(buffer: Buffer, filename: string): { old: string; new: string }[] {
    const ext = filename.toLowerCase().split('.').pop();
    let data: any[] = [];

    if (ext === 'csv') {
      // Parse CSV
      const csvData = buffer.toString('utf-8');
      data = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      throw new Error('Unsupported file format');
    }

    // Normalize column names and validate structure
    return data.map((row: any) => {
      // Support various column name formats
      const oldUrl = row['old'] || row['Old'] || row['OLD'] || row['source'] || row['Source'] || row['SOURCE_URL'] || '';
      const newUrl = row['new'] || row['New'] || row['NEW'] || row['destination'] || row['Destination'] || row['DESTINATION_URL'] || '';
      
      if (!oldUrl || !newUrl) {
        throw new Error(`Missing required columns. Expected 'old' and 'new' columns. Got: ${Object.keys(row).join(', ')}`);
      }

      return {
        old: normalizeUrl(oldUrl),
        new: normalizeUrl(newUrl)
      };
    });
  }

  // ── POST /api/admin/redirects/bulk-upload — bulk upload CSV/XLSX ──
  app.post("/api/admin/redirects/bulk-upload", isAuthenticated, requireSuperAdmin, upload.single('file'), async (req: any, res) => {
    try {
      const user = req.dbUser;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log(`[Redirects] Processing bulk upload: ${file.originalname} (${file.size} bytes) by ${user?.email}`);

      // Parse file data
      let redirectsData: { old: string; new: string }[];
      try {
        redirectsData = parseFileData(file.buffer, file.originalname);
      } catch (parseError) {
        console.error("[Redirects] File parsing error:", parseError);
        return res.status(400).json({ 
          message: "Failed to parse file", 
          error: parseError instanceof Error ? parseError.message : "Unknown parsing error"
        });
      }

      if (redirectsData.length === 0) {
        return res.status(400).json({ message: "No valid redirect data found in file" });
      }

      // Validate and process redirects
      const results = {
        total: redirectsData.length,
        created: 0,
        skipped: 0,
        errors: [] as string[]
      };

      const createdRedirects = [];

      for (let i = 0; i < redirectsData.length; i++) {
        const { old: sourceUrl, new: destinationUrl } = redirectsData[i];

        try {
          // Validate URLs
          if (!sourceUrl || !destinationUrl) {
            results.errors.push(`Row ${i + 1}: Missing source or destination URL`);
            results.skipped++;
            continue;
          }

          if (!sourceUrl.startsWith('/')) {
            results.errors.push(`Row ${i + 1}: Source URL must start with / (got: ${sourceUrl})`);
            results.skipped++;
            continue;
          }

          // Check for existing active redirect with same source URL
          const existing = await db
            .select()
            .from(redirects)
            .where(and(
              eq(redirects.sourceUrl, sourceUrl),
              eq(redirects.isActive, true)
            ))
            .limit(1);

          if (existing.length > 0) {
            results.errors.push(`Row ${i + 1}: Active redirect already exists for ${sourceUrl}`);
            results.skipped++;
            continue;
          }

          // Create redirect
          const [created] = await db
            .insert(redirects)
            .values({
              sourceUrl,
              destinationUrl,
              redirectType: '301',
              description: `Bulk upload from ${file.originalname}`,
              isActive: true,
              createdBy: user?.email || user?.id || "admin",
            })
            .returning();

          createdRedirects.push(created);
          results.created++;

        } catch (error) {
          console.error(`[Redirects] Error creating redirect for row ${i + 1}:`, error);
          results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.skipped++;
        }
      }

      console.log(`[Redirects] Bulk upload completed: ${results.created} created, ${results.skipped} skipped by ${user?.email}`);
      
      res.json({
        message: `Bulk upload completed: ${results.created} redirects created, ${results.skipped} skipped`,
        results,
        created: createdRedirects
      });

    } catch (error) {
      console.error("[Redirects] Error processing bulk upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  // ── Google Sheets import validation schema ──
  const googleSheetsImportSchema = z.object({
    spreadsheetUrl: z.string().url("Please enter a valid Google Sheets URL"),
    sheetName: z.string().optional(),
    range: z.string().optional(),
  });

  // ── POST /api/admin/redirects/google-sheets-import — import from Google Sheets ──
  app.post("/api/admin/redirects/google-sheets-import", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const validatedData = googleSheetsImportSchema.parse(req.body);

      console.log(`[Redirects] Processing Google Sheets import: ${validatedData.spreadsheetUrl} by ${user?.email}`);

      // Extract spreadsheet ID from URL
      const match = validatedData.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return res.status(400).json({ message: "Invalid Google Sheets URL format" });
      }

      const spreadsheetId = match[1];
      const sheetName = validatedData.sheetName || 'Sheet1';
      const range = validatedData.range || 'A:B';

      // Construct CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${encodeURIComponent(range)}`;

      // Fetch CSV data
      const response = await fetch(csvUrl);
      if (!response.ok) {
        return res.status(400).json({ message: "Failed to fetch data from Google Sheets. Make sure the sheet is publicly viewable or shared." });
      }

      const csvData = await response.text();

      // Parse CSV data
      let redirectsData: { old: string; new: string }[];
      try {
        const parsedData = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        redirectsData = parsedData.map((row: any) => {
          // Support various column name formats
          const oldUrl = row['old'] || row['Old'] || row['OLD'] || row['source'] || row['Source'] || row['SOURCE_URL'] || '';
          const newUrl = row['new'] || row['New'] || row['NEW'] || row['destination'] || row['Destination'] || row['DESTINATION_URL'] || '';
          
          if (!oldUrl || !newUrl) {
            throw new Error(`Missing required columns. Expected 'old' and 'new' columns. Got: ${Object.keys(row).join(', ')}`);
          }

          return {
            old: normalizeUrl(oldUrl),
            new: normalizeUrl(newUrl)
          };
        });
      } catch (parseError) {
        console.error("[Redirects] Google Sheets parsing error:", parseError);
        return res.status(400).json({ 
          message: "Failed to parse Google Sheets data", 
          error: parseError instanceof Error ? parseError.message : "Unknown parsing error"
        });
      }

      if (redirectsData.length === 0) {
        return res.status(400).json({ message: "No valid redirect data found in Google Sheet" });
      }

      // Validate and process redirects (same logic as file upload)
      const results = {
        total: redirectsData.length,
        created: 0,
        skipped: 0,
        errors: [] as string[]
      };

      const createdRedirects = [];

      for (let i = 0; i < redirectsData.length; i++) {
        const { old: sourceUrl, new: destinationUrl } = redirectsData[i];

        try {
          // Validate URLs
          if (!sourceUrl || !destinationUrl) {
            results.errors.push(`Row ${i + 1}: Missing source or destination URL`);
            results.skipped++;
            continue;
          }

          if (!sourceUrl.startsWith('/')) {
            results.errors.push(`Row ${i + 1}: Source URL must start with / (got: ${sourceUrl})`);
            results.skipped++;
            continue;
          }

          // Check for existing active redirect with same source URL
          const existing = await db
            .select()
            .from(redirects)
            .where(and(
              eq(redirects.sourceUrl, sourceUrl),
              eq(redirects.isActive, true)
            ))
            .limit(1);

          if (existing.length > 0) {
            results.errors.push(`Row ${i + 1}: Active redirect already exists for ${sourceUrl}`);
            results.skipped++;
            continue;
          }

          // Create redirect
          const [created] = await db
            .insert(redirects)
            .values({
              sourceUrl,
              destinationUrl,
              redirectType: '301',
              description: `Google Sheets import from ${validatedData.spreadsheetUrl}`,
              isActive: true,
              createdBy: user?.email || user?.id || "admin",
            })
            .returning();

          createdRedirects.push(created);
          results.created++;

        } catch (error) {
          console.error(`[Redirects] Error creating redirect for row ${i + 1}:`, error);
          results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.skipped++;
        }
      }

      console.log(`[Redirects] Google Sheets import completed: ${results.created} created, ${results.skipped} skipped by ${user?.email}`);
      
      res.json({
        message: `Google Sheets import completed: ${results.created} redirects created, ${results.skipped} skipped`,
        results,
        created: createdRedirects
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Redirects] Error processing Google Sheets import:", error);
      res.status(500).json({ message: "Failed to process Google Sheets import" });
    }
  });
}