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
import { nanoid } from "nanoid";
import { isAuthenticated, isAdmin } from "./replitAuth";

const router = Router();

// ── File Upload Configuration ────────────────────────────────────────────

// Configuration for spyglass-idx upload endpoint (Vercel Blob proxy)
const SPYGLASS_IDX_URL = process.env.SPYGLASS_IDX_URL || 'https://spyglass-idx.vercel.app';
const UPLOAD_ENDPOINT = `${SPYGLASS_IDX_URL}/api/upload`;

/**
 * Upload agent photo to Vercel Blob via spyglass-idx proxy
 */
async function uploadAgentPhotoToVercelBlob(file: Express.Multer.File): Promise<{ url: string; size: number }> {
  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  formData.append('file', blob, file.originalname);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-upload-secret': process.env.REVALIDATE_SECRET || '',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to Vercel Blob: ${response.status} ${error}`);
  }

  return await response.json();
}

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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ── Validation Schemas ──────────────────────────────────────────────────

const createAgentProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  fubEmail: z.string().optional().nullable().refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Must be a valid email address"
  }),
  officeLocation: z.string().min(1, "At least one office location is required"),
  bio: z.string().optional().nullable(),
  professionalTitle: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable().refine((val) => !val || /^https?:\/\/.+/.test(val), {
    message: "Must be a valid URL"
  }),
  headshotUrl: z.string().optional().nullable(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
  }).optional().nullable(),
  subdomain: z.string().optional().nullable().refine((val) => !val || /^[a-z0-9-]+$/.test(val), {
    message: "Subdomain must be lowercase with dashes"
  }),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  yearsOfExperience: z.number().int().min(0).max(100).optional().nullable(),
  languages: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  indexingDirective: z.string().default('index,follow'),
  customSchema: z.record(z.any()).optional().nullable(),
  videoUrl: z.string().optional().nullable().refine((val) => !val || /^https?:\/\/.+/.test(val), {
    message: "Must be a valid URL"
  }),
  repliersAgentId: z.string().max(50).optional().nullable(),
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
router.get("/admin/agents", isAuthenticated, isAdmin, async (req, res) => {
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
router.get("/admin/agents/:id", isAuthenticated, isAdmin, async (req, res) => {
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
router.post("/admin/agents", isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Preprocess data to convert empty strings to null/undefined
    const preprocessedData = {
      ...req.body,
      fubEmail: req.body.fubEmail || null,
      websiteUrl: req.body.websiteUrl || null,
      videoUrl: req.body.videoUrl || null,
      licenseNumber: req.body.licenseNumber || null,
      subdomain: req.body.subdomain || null,
      bio: req.body.bio || null,
      professionalTitle: req.body.professionalTitle || null,
      metaTitle: req.body.metaTitle || null,
      metaDescription: req.body.metaDescription || null,
      repliersAgentId: req.body.repliersAgentId || null,
      phone: req.body.phone || null,
      yearsOfExperience: req.body.yearsOfExperience || null,
    };
    
    const validatedData = createAgentProfileSchema.parse(preprocessedData);
    
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
router.put("/admin/agents/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Preprocess data to convert empty strings to null/undefined
    const preprocessedData = {
      ...req.body,
      id,
      fubEmail: req.body.fubEmail || null,
      websiteUrl: req.body.websiteUrl || null,
      videoUrl: req.body.videoUrl || null,
      licenseNumber: req.body.licenseNumber || null,
      subdomain: req.body.subdomain || null,
      bio: req.body.bio || null,
      professionalTitle: req.body.professionalTitle || null,
      metaTitle: req.body.metaTitle || null,
      metaDescription: req.body.metaDescription || null,
      repliersAgentId: req.body.repliersAgentId || null,
      phone: req.body.phone || null,
      yearsOfExperience: req.body.yearsOfExperience || null,
    };
    
    const validatedData = updateAgentProfileSchema.parse(preprocessedData);
    
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
router.delete("/admin/agents/:id", isAuthenticated, isAdmin, async (req, res) => {
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
router.patch("/admin/agents/bulk-visibility", isAuthenticated, isAdmin, async (req, res) => {
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

// POST /api/admin/agents/upload-photo - Upload agent photo to Vercel Blob
router.post("/admin/agents/upload-photo", isAuthenticated, isAdmin, uploadPhoto.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { agentId } = req.body;

    console.log(`[Agent Photo] Uploading photo: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB) for agent: ${agentId || 'new'}`);

    // Upload to Vercel Blob via spyglass-idx proxy
    const blobResult = await uploadAgentPhotoToVercelBlob(req.file);
    const permanentUrl = blobResult.url;

    console.log(`[Agent Photo] Uploaded to Vercel Blob: ${req.file.originalname} → ${permanentUrl}`);

    // For new agents (agentId === 'new'), just return the URL
    // The actual agent creation will happen separately
    if (agentId === 'new') {
      return res.json({
        url: permanentUrl,
        filename: req.file.originalname,
        message: "Photo uploaded to Vercel Blob. It will be associated with the agent when you save."
      });
    }

    // For existing agents, update their profile with the permanent Blob URL
    if (agentId && agentId !== 'new') {
      const [existingAgent] = await db
        .select()
        .from(agentDirectoryProfiles)
        .where(eq(agentDirectoryProfiles.id, agentId));

      if (!existingAgent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Update agent with permanent Vercel Blob URL
      await db
        .update(agentDirectoryProfiles)
        .set({
          headshotUrl: permanentUrl,
          updatedAt: new Date()
        })
        .where(eq(agentDirectoryProfiles.id, agentId));

      console.log(`[Agent Photo] Updated DB for agent ${agentId}: ${permanentUrl}`);
    }

    res.json({ url: permanentUrl, filename: req.file.originalname });
  } catch (error) {
    console.error("[Agent Photo] Upload error:", error);
    res.status(500).json({
      error: "Failed to upload photo",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────

// GET /api/agents/search - MLS Grid-based agent search with Repliers enrichment
router.get("/agents/search", async (req, res) => {
  const query = req.query.q || req.query.name || '';
  
  if (!query || query.length < 2) {
    return res.status(400).json({
      agents: [],
      message: 'Query must be at least 2 characters long',
      source: 'mls-grid'
    });
  }

  console.log(`[Agent Search] Starting search for: "${query}"`);

  try {
    const results: any[] = [];
    const processedAgents = new Set<string>();

    // Rate limiting constants for MLS Grid compliance
    const MLS_GRID_BBO = process.env.MLS_GRID_BBO || 'c6bb3e07-6d5c-4c0d-a9c3-0f088f0ad717';
    const MLS_GRID_BASE_URL = process.env.MLS_GRID_BASE_URL || 'https://api-prod.mlsgrid.com/v2';
    const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY || 'sSOnHkc9wVilKtkd7N2qRs2R2WMH00';
    const RATE_LIMIT_DELAY = 700; // 1.43 RPS compliance

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Step 1: Try MLS Grid Members search first
    try {
      console.log(`[MLS Grid] Searching members for: "${query}"`);
      await sleep(RATE_LIMIT_DELAY);
      
      const response = await fetch(
        `${MLS_GRID_BASE_URL}/Members?$filter=contains(MemberFullName,'${encodeURIComponent(query)}')&$top=50`,
        {
          headers: {
            'Authorization': `Bearer ${MLS_GRID_BBO}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const members = data.value || [];
        console.log(`[MLS Grid] Found ${members.length} members`);
        
        for (const member of members) {
          if (processedAgents.has(member.MemberMlsId)) continue;
          
          const agent = {
            id: member.MemberKey,
            name: member.MemberFullName,
            email: member.MemberEmail,
            phone: member.MemberPhoneNumber,
            office: member.MemberOfficeKey,
            officeName: member.MemberOfficeName,
            licenseNumber: member.MemberLicenseNumber,
            mlsId: member.MemberMlsId,
            source: 'mls-grid'
          };
          
          // Enrich with Repliers transaction stats
          try {
            await sleep(RATE_LIMIT_DELAY);
            const statsResponse = await fetch(
              `https://api.repliers.io/listings?agentId=${encodeURIComponent(member.MemberMlsId || member.MemberFullName)}&status=U&lastStatus=Sld&statistics=cnt-closed,sum-soldPrice,avg-soldPrice&resultsPerPage=1`,
              {
                headers: {
                  'REPLIERS-API-KEY': REPLIERS_API_KEY,
                },
              }
            );

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              const stats = statsData.statistics || {};
              
              agent.stats = {
                totalSold: statsData.count || 0,
                totalVolume: stats.soldPrice?.sum || 0,
                averagePrice: stats.soldPrice?.avg || 0,
                yearsActive: stats.closed?.yr ? Object.keys(stats.closed.yr).sort() : [],
              };
            }
          } catch (enrichError) {
            console.log(`[Repliers] Enrichment skipped for ${member.MemberFullName}`);
          }
          
          results.push(agent);
          processedAgents.add(member.MemberMlsId);
        }
      } else {
        console.log(`[MLS Grid] Members search failed: ${response.status}`);
      }
    } catch (mlsError) {
      console.log(`[MLS Grid] Members search error: ${mlsError.message}`);
    }

    // Step 2: Fallback - Search via Repliers property listings for agent names
    if (results.length === 0) {
      console.log(`[Agent Search] No MLS Grid results, trying Repliers property search`);
      
      try {
        await sleep(RATE_LIMIT_DELAY);
        const queryParts = query.toLowerCase().split(' ').filter(part => part.length > 2);
        
        if (queryParts.length > 0) {
          // Search for properties where listing agent name might contain our query
          const searchPattern = queryParts.join('*');
          const listingsResponse = await fetch(
            `https://api.repliers.io/listings?raw.ListAgentFullName=*${encodeURIComponent(searchPattern)}*&resultsPerPage=100`,
            {
              headers: {
                'REPLIERS-API-KEY': REPLIERS_API_KEY,
              },
            }
          );

          if (listingsResponse.ok) {
            const listingsData = await listingsResponse.json();
            const listings = listingsData.listings || [];
            console.log(`[Repliers] Found ${listings.length} listings to scan for agents`);
            
            // Extract unique agents from listings  
            const agentsFromListings = new Map();
            
            for (const listing of listings) {
              const agentName = listing.raw?.ListAgentFullName;
              const agentId = listing.raw?.ListAgentMlsId || listing.raw?.ListAgentID;
              const office = listing.raw?.ListOfficeName;
              
              if (agentName) {
                const agentNameLower = agentName.toLowerCase();
                const queryLower = query.toLowerCase();
                
                // Check if all query parts are in the agent name
                const matchesAll = queryParts.every(part => agentNameLower.includes(part));
                
                if (matchesAll && !processedAgents.has(agentId || agentName)) {
                  const key = agentId || agentName;
                  if (!agentsFromListings.has(key)) {
                    agentsFromListings.set(key, {
                      id: agentId || agentName,
                      name: agentName,
                      mlsId: agentId,
                      officeName: office,
                      source: 'mls-grid',
                      properties: []
                    });
                  }
                  
                  agentsFromListings.get(key).properties.push({
                    address: listing.raw?.UnparsedAddress,
                    price: listing.raw?.ClosePrice || listing.raw?.ListPrice,
                    closeDate: listing.raw?.CloseDate,
                    status: listing.raw?.StandardStatus
                  });
                }
              }
            }

            // Convert to final format and calculate stats
            for (const [key, agentData] of agentsFromListings) {
              const closedProperties = agentData.properties.filter(p => p.price && p.closeDate);
              
              const agent = {
                id: agentData.id,
                name: agentData.name,
                mlsId: agentData.mlsId,
                officeName: agentData.officeName,
                source: 'mls-grid'
              };

              if (closedProperties.length > 0) {
                const totalVolume = closedProperties.reduce((sum, p) => sum + (p.price || 0), 0);
                const averagePrice = totalVolume / closedProperties.length;
                
                const years = [...new Set(closedProperties.map(p => {
                  if (!p.closeDate) return null;
                  try {
                    return new Date(p.closeDate).getFullYear().toString();
                  } catch {
                    return null;
                  }
                }).filter(Boolean))].sort();
                
                agent.stats = {
                  totalSold: closedProperties.length,
                  totalVolume: Math.round(totalVolume),
                  averagePrice: Math.round(averagePrice),
                  yearsActive: years,
                  lastTransactionDate: closedProperties
                    .map(p => p.closeDate)
                    .filter(Boolean)
                    .sort()
                    .reverse()[0]
                };
              }

              results.push(agent);
              processedAgents.add(key);
            }
            
            console.log(`[Repliers] Found ${agentsFromListings.size} unique agents`);
          }
        }
      } catch (repliersError) {
        console.log(`[Repliers] Property search error: ${repliersError.message}`);
      }
    }

    console.log(`[Agent Search] Completed. Found ${results.length} agents`);
    
    res.json({
      agents: results,
      count: results.length,
      query: query,
      source: 'mls-grid',
      message: results.length === 0 ? 'No agents found matching your search' : `Found ${results.length} agent(s)`
    });

  } catch (error) {
    console.error('[Agent Search] Error:', error);
    
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      agents: [],
      count: 0
    });
  }
});

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
        fubEmail: agentDirectoryProfiles.fubEmail,
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
        fubEmail: agentDirectoryProfiles.fubEmail,
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
router.post("/admin/migrate-agent-photos", isAuthenticated, isAdmin, async (req, res) => {
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

export default router;