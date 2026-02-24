import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { storage } from "./storage";
import {
  onboardingTemplates,
  agentOnboardings,
  onboardingActivity,
  type User,
  type AgentOnboarding,
  type OnboardingTemplate,
} from "@shared/schema";
import { eq, desc, asc, sql, and, count } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────────

async function getDbUser(req: any): Promise<User | undefined> {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) {
    user = await storage.getUserByEmail(email);
  }
  return user;
}

async function requireSuperAdmin(req: any, res: any, next: any) {
  const user = await getDbUser(req);
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }
  req.dbUser = user;
  next();
}

/** Recalculate progress percentage from checklist state and template phases */
function calculateProgress(checklistState: any, phases: any[]): number {
  if (!phases || !Array.isArray(phases) || phases.length === 0) return 0;

  let totalSteps = 0;
  let completedSteps = 0;

  for (const phase of phases) {
    if (!phase.steps) continue;
    for (const step of phase.steps) {
      totalSteps++;
      const phaseState = checklistState?.[phase.id];
      if (phaseState?.[step.id]?.completed) {
        completedSteps++;
      }
    }
  }

  return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
}

// ── Route Registration ───────────────────────────────────

export function registerOnboardingRoutes(app: Express) {
  // ═══════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════

  // List all templates
  app.get("/api/admin/onboarding/templates", isAuthenticated, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(onboardingTemplates)
        .orderBy(asc(onboardingTemplates.name));
      res.json(templates);
    } catch (error: any) {
      console.error("[Onboarding] Error fetching templates:", error.message);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get single template
  app.get("/api/admin/onboarding/templates/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const [template] = await db
        .select()
        .from(onboardingTemplates)
        .where(eq(onboardingTemplates.id, parseInt(req.params.id)));
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error: any) {
      console.error("[Onboarding] Error fetching template:", error.message);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Create template
  app.post("/api/admin/onboarding/templates", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, office, agentType, phases, welcomeSequence } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      const [template] = await db
        .insert(onboardingTemplates)
        .values({
          name,
          description: description || null,
          office: office || "all",
          agentType: agentType || "experienced",
          phases: phases || [],
          welcomeSequence: welcomeSequence || [],
          isActive: true,
        })
        .returning();

      res.status(201).json(template);
    } catch (error: any) {
      console.error("[Onboarding] Error creating template:", error.message);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Update template
  app.patch("/api/admin/onboarding/templates/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates: any = { updatedAt: new Date() };
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.office !== undefined) updates.office = req.body.office;
      if (req.body.agentType !== undefined) updates.agentType = req.body.agentType;
      if (req.body.phases !== undefined) updates.phases = req.body.phases;
      if (req.body.welcomeSequence !== undefined) updates.welcomeSequence = req.body.welcomeSequence;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

      const [template] = await db
        .update(onboardingTemplates)
        .set(updates)
        .where(eq(onboardingTemplates.id, id))
        .returning();

      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error: any) {
      console.error("[Onboarding] Error updating template:", error.message);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // ═══════════════════════════════════════════════════════
  // ONBOARDINGS (CRUD)
  // ═══════════════════════════════════════════════════════

  // List all onboardings with optional filters
  app.get("/api/admin/onboarding", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { status, office } = req.query;

      let query = db
        .select({
          onboarding: agentOnboardings,
          templateName: onboardingTemplates.name,
        })
        .from(agentOnboardings)
        .leftJoin(onboardingTemplates, eq(agentOnboardings.templateId, onboardingTemplates.id))
        .orderBy(desc(agentOnboardings.createdAt));

      // Apply filters
      const conditions: any[] = [];
      if (status && status !== "all") {
        conditions.push(eq(agentOnboardings.status, status as string));
      }
      if (office && office !== "all") {
        conditions.push(eq(agentOnboardings.office, office as string));
      }

      let results;
      if (conditions.length > 0) {
        results = await query.where(and(...conditions));
      } else {
        results = await query;
      }

      const formatted = results.map((r) => ({
        ...r.onboarding,
        templateName: r.templateName,
      }));

      res.json(formatted);
    } catch (error: any) {
      console.error("[Onboarding] Error fetching onboardings:", error.message);
      res.status(500).json({ message: "Failed to fetch onboardings" });
    }
  });

  // Get single onboarding with activity log
  app.get("/api/admin/onboarding/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const [result] = await db
        .select({
          onboarding: agentOnboardings,
          template: onboardingTemplates,
        })
        .from(agentOnboardings)
        .leftJoin(onboardingTemplates, eq(agentOnboardings.templateId, onboardingTemplates.id))
        .where(eq(agentOnboardings.id, id));

      if (!result) return res.status(404).json({ message: "Onboarding not found" });

      // Get recent activity
      const activity = await db
        .select()
        .from(onboardingActivity)
        .where(eq(onboardingActivity.onboardingId, id))
        .orderBy(desc(onboardingActivity.createdAt))
        .limit(50);

      res.json({
        ...result.onboarding,
        template: result.template,
        activity,
      });
    } catch (error: any) {
      console.error("[Onboarding] Error fetching onboarding:", error.message);
      res.status(500).json({ message: "Failed to fetch onboarding" });
    }
  });

  // Start new onboarding
  app.post("/api/admin/onboarding", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { agentName, agentEmail, agentPhone, office, licenseNumber, startDate, templateId, recruitingSource, notes } = req.body;

      if (!agentName || !agentEmail) {
        return res.status(400).json({ message: "Agent name and email are required" });
      }

      // Get template to initialize checklist state
      let template: OnboardingTemplate | undefined;
      if (templateId) {
        const [t] = await db
          .select()
          .from(onboardingTemplates)
          .where(eq(onboardingTemplates.id, templateId));
        template = t;
      }

      // Initialize checklist state from template phases
      const checklistState: Record<string, Record<string, any>> = {};
      if (template?.phases && Array.isArray(template.phases)) {
        for (const phase of template.phases as any[]) {
          checklistState[phase.id] = {};
          if (phase.steps) {
            for (const step of phase.steps) {
              checklistState[phase.id][step.id] = {
                completed: false,
                completedAt: null,
                completedBy: null,
                notes: "",
              };
            }
          }
        }
      }

      const adminUser = (req as any).dbUser;

      const [onboarding] = await db
        .insert(agentOnboardings)
        .values({
          agentName,
          agentEmail,
          agentPhone: agentPhone || null,
          office: office || "austin",
          licenseNumber: licenseNumber || null,
          startDate: startDate ? new Date(startDate) : null,
          templateId: templateId || null,
          status: "in_progress",
          checklistState,
          progressPct: 0,
          createdBy: adminUser?.email || "admin",
          recruitingSource: recruitingSource || null,
          notes: notes || null,
          metadata: {},
        })
        .returning();

      // Log activity
      await db.insert(onboardingActivity).values({
        onboardingId: onboarding.id,
        action: "created",
        performedBy: adminUser?.email || "admin",
        details: { agentName, agentEmail, office, templateId },
      });

      res.status(201).json(onboarding);
    } catch (error: any) {
      console.error("[Onboarding] Error creating onboarding:", error.message);
      res.status(500).json({ message: "Failed to create onboarding" });
    }
  });

  // Update onboarding metadata
  app.patch("/api/admin/onboarding/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const adminUser = (req as any).dbUser;

      const updates: any = { updatedAt: new Date() };
      const allowedFields = ["agentName", "agentEmail", "agentPhone", "office", "licenseNumber", "startDate", "status", "recruitingSource", "notes", "metadata"];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === "startDate" && req.body[field]) {
            updates[field] = new Date(req.body[field]);
          } else {
            updates[field] = req.body[field];
          }
        }
      }

      // Handle status changes
      if (updates.status === "completed") {
        updates.completedAt = new Date();
        updates.progressPct = 100;
      }

      const [onboarding] = await db
        .update(agentOnboardings)
        .set(updates)
        .where(eq(agentOnboardings.id, id))
        .returning();

      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });

      // Log status change
      if (req.body.status) {
        await db.insert(onboardingActivity).values({
          onboardingId: id,
          action: "status_changed",
          performedBy: adminUser?.email || "admin",
          details: { newStatus: req.body.status },
        });
      }

      res.json(onboarding);
    } catch (error: any) {
      console.error("[Onboarding] Error updating onboarding:", error.message);
      res.status(500).json({ message: "Failed to update onboarding" });
    }
  });

  // Toggle a checklist step
  app.patch("/api/admin/onboarding/:id/step", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { phaseId, stepId, completed, notes: stepNotes } = req.body;
      const adminUser = (req as any).dbUser;

      if (!phaseId || !stepId) {
        return res.status(400).json({ message: "phaseId and stepId are required" });
      }

      // Get current state
      const [current] = await db
        .select({
          onboarding: agentOnboardings,
          template: onboardingTemplates,
        })
        .from(agentOnboardings)
        .leftJoin(onboardingTemplates, eq(agentOnboardings.templateId, onboardingTemplates.id))
        .where(eq(agentOnboardings.id, id));

      if (!current) return res.status(404).json({ message: "Onboarding not found" });

      // Update checklist state
      const checklistState = { ...(current.onboarding.checklistState as any) };
      if (!checklistState[phaseId]) checklistState[phaseId] = {};

      const isCompleted = completed !== undefined ? completed : !checklistState[phaseId][stepId]?.completed;

      checklistState[phaseId][stepId] = {
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
        completedBy: isCompleted ? (adminUser?.email || "admin") : null,
        notes: stepNotes || checklistState[phaseId][stepId]?.notes || "",
      };

      // Recalculate progress
      const phases = (current.template?.phases || []) as any[];
      const progressPct = calculateProgress(checklistState, phases);

      // Check if all steps are complete
      const isFullyComplete = progressPct === 100;

      const updates: any = {
        checklistState,
        progressPct,
        updatedAt: new Date(),
      };

      if (isFullyComplete) {
        updates.status = "completed";
        updates.completedAt = new Date();
      } else if (current.onboarding.status === "completed" && !isFullyComplete) {
        // Unchecking something on a completed onboarding
        updates.status = "in_progress";
        updates.completedAt = null;
      }

      const [onboarding] = await db
        .update(agentOnboardings)
        .set(updates)
        .where(eq(agentOnboardings.id, id))
        .returning();

      // Log activity
      await db.insert(onboardingActivity).values({
        onboardingId: id,
        action: isCompleted ? "step_completed" : "step_unchecked",
        phaseId,
        stepId,
        performedBy: adminUser?.email || "admin",
        details: { completed: isCompleted, notes: stepNotes },
      });

      res.json(onboarding);
    } catch (error: any) {
      console.error("[Onboarding] Error toggling step:", error.message);
      res.status(500).json({ message: "Failed to toggle step" });
    }
  });

  // Add note to onboarding
  app.post("/api/admin/onboarding/:id/note", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { note } = req.body;
      const adminUser = (req as any).dbUser;

      if (!note) return res.status(400).json({ message: "Note is required" });

      await db.insert(onboardingActivity).values({
        onboardingId: id,
        action: "note_added",
        performedBy: adminUser?.email || "admin",
        details: { note },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Onboarding] Error adding note:", error.message);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  // Cancel/delete onboarding
  app.delete("/api/admin/onboarding/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      // Soft delete: mark as cancelled
      const [onboarding] = await db
        .update(agentOnboardings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(agentOnboardings.id, id))
        .returning();

      if (!onboarding) return res.status(404).json({ message: "Onboarding not found" });

      const adminUser = (req as any).dbUser;
      await db.insert(onboardingActivity).values({
        onboardingId: id,
        action: "status_changed",
        performedBy: adminUser?.email || "admin",
        details: { newStatus: "cancelled" },
      });

      res.json({ success: true, message: "Onboarding cancelled" });
    } catch (error: any) {
      console.error("[Onboarding] Error cancelling onboarding:", error.message);
      res.status(500).json({ message: "Failed to cancel onboarding" });
    }
  });

  // ═══════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════

  app.get("/api/admin/onboarding/analytics", isAuthenticated, requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      // Get counts by status
      const statusCounts = await db
        .select({
          status: agentOnboardings.status,
          count: count(),
        })
        .from(agentOnboardings)
        .groupBy(agentOnboardings.status);

      // Get counts by office
      const officeCounts = await db
        .select({
          office: agentOnboardings.office,
          count: count(),
        })
        .from(agentOnboardings)
        .groupBy(agentOnboardings.office);

      // Get counts by recruiting source
      const sourceCounts = await db
        .select({
          source: agentOnboardings.recruitingSource,
          count: count(),
        })
        .from(agentOnboardings)
        .where(sql`${agentOnboardings.recruitingSource} IS NOT NULL`)
        .groupBy(agentOnboardings.recruitingSource);

      // Average progress of in-progress onboardings
      const [avgProgress] = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${agentOnboardings.progressPct}), 0)`,
        })
        .from(agentOnboardings)
        .where(eq(agentOnboardings.status, "in_progress"));

      // Recently completed
      const recentlyCompleted = await db
        .select()
        .from(agentOnboardings)
        .where(eq(agentOnboardings.status, "completed"))
        .orderBy(desc(agentOnboardings.completedAt))
        .limit(5);

      // Total onboarded this year
      const [yearTotal] = await db
        .select({ count: count() })
        .from(agentOnboardings)
        .where(
          and(
            eq(agentOnboardings.status, "completed"),
            sql`EXTRACT(YEAR FROM ${agentOnboardings.completedAt}) = EXTRACT(YEAR FROM NOW())`
          )
        );

      res.json({
        statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, Number(s.count)])),
        officeCounts: Object.fromEntries(officeCounts.map((o) => [o.office, Number(o.count)])),
        sourceCounts: Object.fromEntries(sourceCounts.map((s) => [s.source || "unknown", Number(s.count)])),
        averageProgress: Math.round(Number(avgProgress?.avg || 0)),
        recentlyCompleted,
        onboardedThisYear: Number(yearTotal?.count || 0),
      });
    } catch (error: any) {
      console.error("[Onboarding] Error fetching analytics:", error.message);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  console.log("[Onboarding] Routes registered ✓");
}
