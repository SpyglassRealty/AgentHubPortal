import { Router } from "express";
import { eq, desc, asc, ilike, and, or, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  agentDirectoryProfiles,
  type AgentDirectoryProfile,
  type InsertAgentDirectoryProfile
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

const router = Router();

// ── File Upload Configuration ────────────────────────────────────────────

// Ensure agent-photos directory exists
const agentPhotosDir = path.join(process.cwd(), "public", "agent-photos");
if (!fs.existsSync(agentPhotosDir)) {
  fs.mkdirSync(agentPhotosDir, { recursive: true });
}

// Configure multer for agent photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, agentPhotosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: agentId_timestamp_random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const agentId = req.body.agentId || 'temp';
    const filename = `${agentId}_${Date.now()}_${nanoid(6)}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// ── Validation Schemas ──────────────────────────────────────────────────

const createAgentProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  fubEmail: z.string().email().optional().or(z.literal('')),
  officeLocation: z.string().min(1, "At least one office location is required"),
  bio: z.string().optional(),
  professionalTitle: z.string().optional(),
  licenseNumber: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  headshotUrl: z.string().optional().or(z.literal('')),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
  }).optional(),
  subdomain: z.string().regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase with dashes").optional().or(z.literal('')),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  languages: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  indexingDirective: z.string().default('index,follow'),
  customSchema: z.record(z.any()).optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  repliersAgentId: z.string().max(50).optional().or(z.literal('')),
});

const updateAgentProfileSchema = createAgentProfileSchema.partial().extend({
  id: z.string(),
});

// ── Utility Functions ────────────────────────────────────────────────────

function generateSubdomain(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
}

function calculateSeoScore(profile: Partial<AgentDirectoryProfile>): number {
  let score = 0;
  const maxScore = 100;
  
  // Basic info (40 points)
  if (profile.firstName) score += 5;
  if (profile.lastName) score += 5;
  if (profile.bio && profile.bio.length >= 100) score += 15;
  if (profile.professionalTitle) score += 5;
  if (profile.headshotUrl) score += 10;
  
  // SEO fields (35 points)
  if (profile.metaTitle) score += 15;
  if (profile.metaDescription && profile.metaDescription.length >= 120) score += 15;
  if (profile.customSchema) score += 5;
  
  // Social presence (15 points)
  if (profile.socialLinks) {
    const socialCount = Object.values(profile.socialLinks).filter(Boolean).length;
    score += Math.min(socialCount * 3, 15);
  }
  
  // Additional content (10 points)
  if (profile.videoUrl) score += 5;
  if (profile.websiteUrl) score += 5;
  
  return Math.min(score, maxScore);
}

// ── ADMIN ROUTES: Agent Profiles ──────────────────────────────────────────

// GET /api/admin/agents - List all agent profiles (with filters)
router.get("/admin/agents", async (req, res) => {
  try {
    const { search, office, visibility, sortBy = 'firstName', order = 'asc' } = req.query;
    
    let query = db
      .select()
      .from(agentDirectoryProfiles);

    // Apply filters
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          ilike(agentDirectoryProfiles.firstName, `%${search}%`),
          ilike(agentDirectoryProfiles.lastName, `%${search}%`),
          ilike(agentDirectoryProfiles.email, `%${search}%`),
          ilike(agentDirectoryProfiles.professionalTitle, `%${search}%`)
        )
      );
    }
    
    if (office && office !== 'all') {
      conditions.push(eq(agentDirectoryProfiles.officeLocation, office as string));
    }
    
    if (visibility && visibility !== 'all') {
      const isVisible = visibility === 'visible';
      conditions.push(eq(agentDirectoryProfiles.isVisible, isVisible));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderDirection = order === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'lastName':
        query = query.orderBy(orderDirection(agentDirectoryProfiles.lastName));
        break;
      case 'office':
        query = query.orderBy(orderDirection(agentDirectoryProfiles.officeLocation));
        break;
      case 'updatedAt':
        query = query.orderBy(orderDirection(agentDirectoryProfiles.updatedAt));
        break;
      case 'seoScore':
        query = query.orderBy(orderDirection(agentDirectoryProfiles.seoScore));
        break;
      default:
        query = query.orderBy(orderDirection(agentDirectoryProfiles.firstName));
    }

    const agents = await query;
    
    res.json({ agents });
  } catch (error) {
    console.error("Error fetching agent profiles:", error);
    res.status(500).json({ error: "Failed to fetch agent profiles" });
  }
});

// GET /api/admin/agents/:id - Get single agent profile
router.get("/admin/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [agent] = await db
      .select()
      .from(agentDirectoryProfiles)
      .where(eq(agentDirectoryProfiles.id, id));

    if (!agent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    res.json({ agent });
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({ error: "Failed to fetch agent profile" });
  }
});

// POST /api/admin/agents - Create new agent profile
router.post("/admin/agents", async (req, res) => {
  try {
    const validatedData = createAgentProfileSchema.parse(req.body);
    
    // Auto-generate subdomain if not provided
    if (!validatedData.subdomain) {
      validatedData.subdomain = generateSubdomain(validatedData.firstName, validatedData.lastName);
    }
    
    // Calculate SEO score
    const seoScore = calculateSeoScore(validatedData);
    
    const [newAgent] = await db
      .insert(agentDirectoryProfiles)
      .values({
        ...validatedData,
        seoScore,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({ agent: newAgent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating agent profile:", error);
    res.status(500).json({ error: "Failed to create agent profile" });
  }
});

// PUT /api/admin/agents/:id - Update agent profile
router.put("/admin/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateAgentProfileSchema.parse({ ...req.body, id });
    
    // Check if agent exists
    const [existingAgent] = await db
      .select()
      .from(agentDirectoryProfiles)
      .where(eq(agentDirectoryProfiles.id, id));

    if (!existingAgent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    // Calculate updated SEO score
    const mergedData = { ...existingAgent, ...validatedData };
    const seoScore = calculateSeoScore(mergedData);

    const [updatedAgent] = await db
      .update(agentDirectoryProfiles)
      .set({
        ...validatedData,
        seoScore,
        updatedAt: new Date(),
      })
      .where(eq(agentDirectoryProfiles.id, id))
      .returning();

    res.json({ agent: updatedAgent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error updating agent profile:", error);
    res.status(500).json({ error: "Failed to update agent profile" });
  }
});

// DELETE /api/admin/agents/:id - Delete agent profile
router.delete("/admin/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deletedAgent] = await db
      .delete(agentDirectoryProfiles)
      .where(eq(agentDirectoryProfiles.id, id))
      .returning();

    if (!deletedAgent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent profile:", error);
    res.status(500).json({ error: "Failed to delete agent profile" });
  }
});

// PATCH /api/admin/agents/bulk-visibility - Bulk update visibility
router.patch("/admin/agents/bulk-visibility", async (req, res) => {
  try {
    const { agentIds, isVisible } = req.body;
    
    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ error: "Agent IDs array is required" });
    }
    
    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({ error: "isVisible must be a boolean" });
    }

    const updatedAgents = await db
      .update(agentDirectoryProfiles)
      .set({ 
        isVisible,
        updatedAt: new Date()
      })
      .where(sql`${agentDirectoryProfiles.id} = ANY(${agentIds})`)
      .returning();

    res.json({ 
      success: true, 
      updatedCount: updatedAgents.length,
      agents: updatedAgents
    });
  } catch (error) {
    console.error("Error updating agent visibility:", error);
    res.status(500).json({ error: "Failed to update agent visibility" });
  }
});

// POST /api/admin/agents/upload-photo - Upload agent photo
router.post("/admin/agents/upload-photo", uploadPhoto.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { agentId } = req.body;
    
    // For new agents (agentId === 'new'), just return the URL
    // The actual agent creation will happen separately
    if (agentId === 'new') {
      const baseUrl = process.env.MISSION_CONTROL_URL || `https://${req.get('host')}`;
      const url = `${baseUrl}/agent-photos/${req.file.filename}`;
      return res.json({ 
        url,
        filename: req.file.filename,
        message: "Photo uploaded. It will be associated with the agent when you save."
      });
    }

    // For existing agents, update their profile
    if (agentId && agentId !== 'new') {
      const [existingAgent] = await db
        .select()
        .from(agentDirectoryProfiles)
        .where(eq(agentDirectoryProfiles.id, agentId));

      if (!existingAgent) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Agent not found" });
      }

      // Delete old photo if it exists and is in our directory
      if (existingAgent.headshotUrl && existingAgent.headshotUrl.includes('/agent-photos/')) {
        const oldFilename = existingAgent.headshotUrl.split('/').pop();
        const oldPath = path.join(agentPhotosDir, oldFilename!);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update agent with new photo URL (use full URL for production)
      const baseUrl = process.env.MISSION_CONTROL_URL || `https://${req.get('host')}`;
      const url = `${baseUrl}/agent-photos/${req.file.filename}`;
      await db
        .update(agentDirectoryProfiles)
        .set({ 
          headshotUrl: url,
          updatedAt: new Date()
        })
        .where(eq(agentDirectoryProfiles.id, agentId));
    }

    // Return full URL for production
    const baseUrl = process.env.MISSION_CONTROL_URL || `https://${req.get('host')}`;
    const url = `${baseUrl}/agent-photos/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (error) {
    console.error("Photo upload error:", error);
    
    // Clean up file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: "Failed to upload photo",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────

// GET /api/agents - Public agent directory (visible agents only)
router.get("/agents", async (req, res) => {
  try {
    const { office, search } = req.query;
    
    let query = db
      .select({
        id: agentDirectoryProfiles.id,
        firstName: agentDirectoryProfiles.firstName,
        lastName: agentDirectoryProfiles.lastName,
        email: agentDirectoryProfiles.email,
        phone: agentDirectoryProfiles.phone,
        officeLocation: agentDirectoryProfiles.officeLocation,
        bio: agentDirectoryProfiles.bio,
        professionalTitle: agentDirectoryProfiles.professionalTitle,
        licenseNumber: agentDirectoryProfiles.licenseNumber,
        websiteUrl: agentDirectoryProfiles.websiteUrl,
        headshotUrl: agentDirectoryProfiles.headshotUrl,
        socialLinks: agentDirectoryProfiles.socialLinks,
        subdomain: agentDirectoryProfiles.subdomain,
        videoUrl: agentDirectoryProfiles.videoUrl,
      })
      .from(agentDirectoryProfiles)
      .where(eq(agentDirectoryProfiles.isVisible, true));

    // Apply filters
    const conditions = [eq(agentDirectoryProfiles.isVisible, true)];
    
    if (office && office !== 'all') {
      conditions.push(eq(agentDirectoryProfiles.officeLocation, office as string));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(agentDirectoryProfiles.firstName, `%${search}%`),
          ilike(agentDirectoryProfiles.lastName, `%${search}%`),
          ilike(agentDirectoryProfiles.professionalTitle, `%${search}%`)
        )
      );
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(
      asc(agentDirectoryProfiles.sortOrder),
      asc(agentDirectoryProfiles.firstName),
      asc(agentDirectoryProfiles.lastName)
    );

    const agents = await query;
    
    res.json({ agents });
  } catch (error) {
    console.error("Error fetching public agents:", error);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// GET /api/agents/:subdomain - Public single agent profile by subdomain
router.get("/agents/:subdomain", async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const [agent] = await db
      .select({
        id: agentDirectoryProfiles.id,
        firstName: agentDirectoryProfiles.firstName,
        lastName: agentDirectoryProfiles.lastName,
        email: agentDirectoryProfiles.email,
        phone: agentDirectoryProfiles.phone,
        officeLocation: agentDirectoryProfiles.officeLocation,
        bio: agentDirectoryProfiles.bio,
        professionalTitle: agentDirectoryProfiles.professionalTitle,
        licenseNumber: agentDirectoryProfiles.licenseNumber,
        websiteUrl: agentDirectoryProfiles.websiteUrl,
        headshotUrl: agentDirectoryProfiles.headshotUrl,
        socialLinks: agentDirectoryProfiles.socialLinks,
        subdomain: agentDirectoryProfiles.subdomain,
        videoUrl: agentDirectoryProfiles.videoUrl,
        metaTitle: agentDirectoryProfiles.metaTitle,
        metaDescription: agentDirectoryProfiles.metaDescription,
        customSchema: agentDirectoryProfiles.customSchema,
      })
      .from(agentDirectoryProfiles)
      .where(and(
        eq(agentDirectoryProfiles.subdomain, subdomain),
        eq(agentDirectoryProfiles.isVisible, true)
      ));

    if (!agent) {
      return res.status(404).json({ error: "Agent profile not found" });
    }

    res.json({ agent });
  } catch (error) {
    console.error("Error fetching public agent profile:", error);
    res.status(500).json({ error: "Failed to fetch agent profile" });
  }
});

// ── Photo Migration Route ────────────────────────────────────────────

// POST /api/admin/migrate-agent-photos - Migrate agent photos from REW to Mission Control
router.post("/admin/migrate-agent-photos", async (req, res) => {
  try {
    console.log("Starting agent photo URL migration...");
    
    // Get all agents with REW photo URLs
    const agentsWithREWPhotos = await db
      .select()
      .from(agentDirectoryProfiles)
      .where(
        or(
          ilike(agentDirectoryProfiles.headshotUrl, '%rew.spyglassrealty.com%'),
          ilike(agentDirectoryProfiles.headshotUrl, '%realestatewebmasters%')
        )
      );
    
    console.log(`Found ${agentsWithREWPhotos.length} agents with REW photo URLs`);
    
    let updated = 0;
    const updates = [];
    
    for (const agent of agentsWithREWPhotos) {
      if (!agent.headshotUrl) continue;
      
      // Extract filename from REW URL
      const urlParts = agent.headshotUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      // New Mission Control URL
      const newUrl = `https://missioncontrol-tjfm.onrender.com/agent-photos/${filename}`;
      
      // Update the agent
      await db
        .update(agentDirectoryProfiles)
        .set({ 
          headshotUrl: newUrl,
          updatedAt: new Date()
        })
        .where(eq(agentDirectoryProfiles.id, agent.id));
      
      updated++;
      updates.push({
        agent: `${agent.firstName} ${agent.lastName}`,
        oldUrl: agent.headshotUrl,
        newUrl: newUrl
      });
    }
    
    res.json({
      success: true,
      message: `Successfully migrated ${updated} agent photo URLs`,
      totalAgents: agentsWithREWPhotos.length,
      updated: updated,
      updates: updates.slice(0, 10), // Show first 10 as examples
      moreUpdates: updates.length > 10 ? `...and ${updates.length - 10} more` : null
    });
  } catch (error) {
    console.error("Photo migration error:", error);
    res.status(500).json({ 
      error: "Photo migration failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ── Database Migration Route ────────────────────────────────────────────

// POST /api/admin/run-agent-migration - Run the agent fields migration
router.post("/admin/run-agent-migration", async (req, res) => {
  try {
    console.log("Running agent fields migration...");
    
    // Add new columns if they don't exist
    await db.execute(sql`
      ALTER TABLE agent_directory_profiles
      ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
      ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::jsonb
    `);
    
    // Verify the migration worked
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'agent_directory_profiles' 
      AND column_name IN ('years_of_experience', 'languages', 'specialties')
      ORDER BY ordinal_position
    `);
    
    res.json({
      success: true,
      message: "Agent fields migration completed successfully",
      addedColumns: result.rows
    });
  } catch (error) {
    console.error("Migration error:", error);
    
    // Check if columns already exist
    if (error instanceof Error && error.message.includes('already exists')) {
      res.json({
        success: true,
        message: "Migration already applied - columns exist",
        alreadyExists: true
      });
    } else {
      res.status(500).json({ 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

export default router;