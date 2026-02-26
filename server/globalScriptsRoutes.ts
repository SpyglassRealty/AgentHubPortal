import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { globalScripts } from "@shared/schema";
import { eq, ilike, and, or, sql, desc, asc, count } from "drizzle-orm";
import type { User } from "@shared/schema";
import { z } from "zod";

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
const scriptConfigSchema = z.record(z.any()).optional();

const createScriptSchema = z.object({
  name: z.string().min(1).max(255),
  scriptType: z.enum(['google_analytics', 'google_tag_manager', 'meta_pixel', 'microsoft_clarity', 'custom']),
  position: z.enum(['head', 'body']).default('head'),
  scriptContent: z.string().min(1),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  description: z.string().optional(),
  configuration: scriptConfigSchema,
});

const updateScriptSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  scriptType: z.enum(['google_analytics', 'google_tag_manager', 'meta_pixel', 'microsoft_clarity', 'custom']).optional(),
  position: z.enum(['head', 'body']).optional(),
  scriptContent: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  description: z.string().optional(),
  configuration: scriptConfigSchema,
});

// ── Script Templates ──────────────────────────────────
const SCRIPT_TEMPLATES = {
  google_analytics: {
    name: 'Google Analytics 4',
    content: `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id={{GA4_ID}}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{GA4_ID}}');
</script>`,
    position: 'head',
    description: 'Google Analytics 4 tracking script with gtag',
  },
  google_tag_manager: {
    name: 'Google Tag Manager',
    content: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','{{GTM_ID}}');</script>
<!-- End Google Tag Manager -->`,
    position: 'head',
    description: 'Google Tag Manager container script (head section)',
  },
  google_tag_manager_noscript: {
    name: 'Google Tag Manager (noscript)',
    content: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={{GTM_ID}}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
    position: 'body',
    description: 'Google Tag Manager noscript fallback (body section)',
  },
  meta_pixel: {
    name: 'Meta Pixel (Facebook)',
    content: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{PIXEL_ID}}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={{PIXEL_ID}}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`,
    position: 'head',
    description: 'Facebook/Meta Pixel for conversion tracking',
  },
  microsoft_clarity: {
    name: 'Microsoft Clarity',
    content: `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "{{CLARITY_ID}}");
</script>`,
    position: 'head',
    description: 'Microsoft Clarity for user behavior analytics',
  },
};

export function registerGlobalScriptsRoutes(app: Express) {
  // ── GET /api/admin/global-scripts — list all scripts ──
  app.get("/api/admin/global-scripts", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const filter = (req.query.filter as string) || "all"; // all | enabled | disabled
      const scriptType = (req.query.type as string) || "";
      const position = (req.query.position as string) || "";

      const conditions: any[] = [];

      if (filter === "enabled") {
        conditions.push(eq(globalScripts.isEnabled, true));
      } else if (filter === "disabled") {
        conditions.push(eq(globalScripts.isEnabled, false));
      }

      if (scriptType) {
        conditions.push(eq(globalScripts.scriptType, scriptType));
      }

      if (position) {
        conditions.push(eq(globalScripts.position, position));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const scripts = await db
        .select()
        .from(globalScripts)
        .where(whereClause)
        .orderBy(desc(globalScripts.priority), asc(globalScripts.name));

      res.json({ scripts });
    } catch (error) {
      console.error("[Global Scripts] Error listing scripts:", error);
      res.status(500).json({ message: "Failed to list scripts" });
    }
  });

  // ── GET /api/admin/global-scripts/templates — get script templates ──
  app.get("/api/admin/global-scripts/templates", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      res.json({ templates: SCRIPT_TEMPLATES });
    } catch (error) {
      console.error("[Global Scripts] Error getting templates:", error);
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  // ── GET /api/admin/global-scripts/:id — single script ──
  app.get("/api/admin/global-scripts/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const [script] = await db
        .select()
        .from(globalScripts)
        .where(eq(globalScripts.id, id))
        .limit(1);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      res.json(script);
    } catch (error) {
      console.error("[Global Scripts] Error getting script:", error);
      res.status(500).json({ message: "Failed to get script" });
    }
  });

  // ── POST /api/admin/global-scripts — create script ──
  app.post("/api/admin/global-scripts", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const validatedData = createScriptSchema.parse(req.body);

      const [created] = await db
        .insert(globalScripts)
        .values({
          ...validatedData,
          createdBy: user?.email || user?.id || "admin",
        })
        .returning();

      console.log(`[Global Scripts] Created script "${validatedData.name}" by ${user?.email}`);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Global Scripts] Error creating script:", error);
      res.status(500).json({ message: "Failed to create script" });
    }
  });

  // ── POST /api/admin/global-scripts/from-template — create script from template ──
  app.post("/api/admin/global-scripts/from-template", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const { templateKey, configuration } = req.body;
      
      if (!templateKey || !SCRIPT_TEMPLATES[templateKey as keyof typeof SCRIPT_TEMPLATES]) {
        return res.status(400).json({ message: "Invalid template key" });
      }

      const template = SCRIPT_TEMPLATES[templateKey as keyof typeof SCRIPT_TEMPLATES];
      
      // Replace placeholders in script content with configuration values
      let scriptContent = template.content;
      if (configuration) {
        Object.entries(configuration).forEach(([key, value]) => {
          scriptContent = scriptContent.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
        });
      }

      const scriptData = {
        name: template.name,
        scriptType: templateKey as any,
        position: template.position as 'head' | 'body',
        scriptContent,
        description: template.description,
        isEnabled: false, // Start disabled for safety
        priority: templateKey === 'google_analytics' ? 100 : 
                 templateKey === 'google_tag_manager' ? 95 : 
                 templateKey === 'meta_pixel' ? 90 : 
                 templateKey === 'microsoft_clarity' ? 85 : 0,
        configuration: configuration || {},
      };

      const validatedData = createScriptSchema.parse(scriptData);

      const [created] = await db
        .insert(globalScripts)
        .values({
          ...validatedData,
          createdBy: user?.email || user?.id || "admin",
        })
        .returning();

      console.log(`[Global Scripts] Created script from template "${templateKey}" by ${user?.email}`);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Global Scripts] Error creating script from template:", error);
      res.status(500).json({ message: "Failed to create script from template" });
    }
  });

  // ── PUT /api/admin/global-scripts/:id — update script ──
  app.put("/api/admin/global-scripts/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;
      const validatedData = updateScriptSchema.parse(req.body);

      const updateData = {
        ...validatedData,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(globalScripts)
        .set(updateData)
        .where(eq(globalScripts.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Script not found" });
      }

      console.log(`[Global Scripts] Updated script ${id} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("[Global Scripts] Error updating script:", error);
      res.status(500).json({ message: "Failed to update script" });
    }
  });

  // ── DELETE /api/admin/global-scripts/:id — delete script ──
  app.delete("/api/admin/global-scripts/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;

      const [deleted] = await db
        .delete(globalScripts)
        .where(eq(globalScripts.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Script not found" });
      }

      console.log(`[Global Scripts] Deleted script ${id} by ${user?.email}`);
      res.json({ message: "Script deleted", script: deleted });
    } catch (error) {
      console.error("[Global Scripts] Error deleting script:", error);
      res.status(500).json({ message: "Failed to delete script" });
    }
  });

  // ── POST /api/admin/global-scripts/:id/toggle — toggle enabled status ──
  app.post("/api/admin/global-scripts/:id/toggle", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.dbUser;

      // Get current state
      const [current] = await db
        .select()
        .from(globalScripts)
        .where(eq(globalScripts.id, id))
        .limit(1);

      if (!current) {
        return res.status(404).json({ message: "Script not found" });
      }

      const newState = !current.isEnabled;

      const [updated] = await db
        .update(globalScripts)
        .set({
          isEnabled: newState,
          updatedAt: new Date(),
        })
        .where(eq(globalScripts.id, id))
        .returning();

      console.log(`[Global Scripts] Script "${current.name}" ${newState ? "enabled" : "disabled"} by ${user?.email}`);
      res.json(updated);
    } catch (error) {
      console.error("[Global Scripts] Error toggling script:", error);
      res.status(500).json({ message: "Failed to toggle script" });
    }
  });

  // ── POST /api/admin/global-scripts/reorder — update script priorities ──
  app.post("/api/admin/global-scripts/reorder", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const user = req.dbUser;
      const { scriptIds } = req.body; // array of script IDs in new order

      if (!Array.isArray(scriptIds)) {
        return res.status(400).json({ message: "scriptIds must be an array" });
      }

      // Update priorities based on array position (higher index = lower priority)
      const updates = scriptIds.map((id: string, index: number) => 
        db.update(globalScripts)
          .set({ 
            priority: scriptIds.length - index, // reverse order for priority
            updatedAt: new Date() 
          })
          .where(eq(globalScripts.id, id))
      );

      await Promise.all(updates);

      console.log(`[Global Scripts] Reordered scripts by ${user?.email}`);
      res.json({ message: "Script order updated" });
    } catch (error) {
      console.error("[Global Scripts] Error reordering scripts:", error);
      res.status(500).json({ message: "Failed to reorder scripts" });
    }
  });

  // ── Public route to get active scripts for frontend ──
  app.get("/api/global-scripts", async (req: any, res) => {
    try {
      const position = req.query.position as string; // 'head' or 'body'
      
      const conditions = [eq(globalScripts.isEnabled, true)];
      if (position) {
        conditions.push(eq(globalScripts.position, position));
      }

      const scripts = await db
        .select({
          id: globalScripts.id,
          name: globalScripts.name,
          scriptType: globalScripts.scriptType,
          position: globalScripts.position,
          scriptContent: globalScripts.scriptContent,
          priority: globalScripts.priority,
        })
        .from(globalScripts)
        .where(and(...conditions))
        .orderBy(desc(globalScripts.priority), asc(globalScripts.name));

      // Set cache headers for performance (5 minutes)
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ scripts });
    } catch (error) {
      console.error("[Global Scripts] Error getting public scripts:", error);
      res.status(500).json({ message: "Failed to get scripts" });
    }
  });
}