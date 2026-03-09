import { Router } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  callDutySlots,
  callDutySignups,
  callDutyHolidays,
  users,
  type CallDutySlot,
  type CallDutySignup,
  type CallDutyHoliday,
} from "@shared/schema";
import { isAuthenticated } from "./replitAuth";
import {
  createCallDutyCalendarEvent,
  addCallDutyAttendee,
  removeCallDutyAttendee,
} from "./googleCalendarClient";
import { sendSlackMessage } from "./slackNotify";
import { generateSlotsForWeek } from "./slotGenerationService";

const router = Router();

// ── Constants (configurable placeholders) ────────────────────────────────

/** Max shifts per agent per week — confirmed: 5 */
const MAX_SHIFTS_PER_WEEK: number | null = 5;

/** Cancellation notice window in hours — default 24h */
const CANCELLATION_NOTICE_HOURS = 24;

/** Slack channel for notifications */
const CALL_DUTY_SLACK_CHANNEL_ID = "C0AHLEPF2F9";

const SHIFT_TYPE_LABELS: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getUserId(req: any): string {
  const userId = req.user.claims.sub;
  console.log("[Call Duty Debug] getUserId returning:", userId);
  console.log("[Call Duty Debug] Full user object:", JSON.stringify(req.user, null, 2));
  return userId;
}

/**
 * Resolve the authenticated user's database ID with email fallback
 */
async function resolveUserId(req: any): Promise<string | null> {
  // Try getUserId first
  const authId = getUserId(req);
  
  // Look up user by ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, authId));
    
  if (user) return user.id;
  
  // Fallback: look up by email from session/claims
  const email = req.user?.claims?.email || req.user?.email;
  if (email) {
    const [userByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
      
    if (userByEmail) return userByEmail.id;
  }
  
  return null;
}

function getUserEmail(req: any): string | null {
  return req.user.claims.email || null;
}

function getUserName(req: any): string {
  const first = req.user.claims.first_name || "";
  const last = req.user.claims.last_name || "";
  return `${first} ${last}`.trim() || req.user.claims.email || "An agent";
}

/**
 * Fire-and-forget Slack notification for Call Duty events.
 */
function notifyCallDutySlack(
  action: "signup" | "cancel",
  agentName: string,
  slot: { date: string; shiftType: string; startTime: string; endTime: string },
): void {
  const label = SHIFT_TYPE_LABELS[slot.shiftType] || slot.shiftType;
  const emoji = action === "signup" ? "✅" : "❌";
  const verb = action === "signup" ? "signed up for" : "cancelled";

  const text = `${emoji} *${agentName}* ${verb} *${label} Shift* on *${slot.date}* (${slot.startTime}–${slot.endTime})`;

  // Fire-and-forget — don't await
  sendSlackMessage(CALL_DUTY_SLACK_CHANNEL_ID, text).catch(() => {});
}

/**
 * Get all Monday dates (week start dates) within the given date range
 */
function getMondaysInRange(startDate: string, endDate: string): Date[] {
  const mondays: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Find the first Monday within or before the start date
  let current = new Date(start);
  const dayOfWeek = current.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Sunday, 1=Monday
  current.setDate(current.getDate() - daysFromMonday);
  
  // If this Monday is before our start date, get the next Monday
  if (current < start) {
    current.setDate(current.getDate() + 7);
  }
  
  // Collect all Mondays within the range
  while (current <= end) {
    mondays.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  
  return mondays;
}

/**
 * Ensure a slot has a Google Calendar event. If it doesn't yet (pre-Phase 2 slots
 * or if creation failed previously), create one now and store the event ID.
 * Returns the event ID, or null if creation fails.
 */
async function ensureCalendarEvent(slot: CallDutySlot): Promise<string | null> {
  if (slot.googleCalendarEventId) return slot.googleCalendarEventId;

  const eventId = await createCallDutyCalendarEvent(
    slot.date,
    slot.shiftType,
    slot.startTime,
    slot.endTime,
  );

  if (eventId) {
    // Persist the event ID back to the slot
    await db
      .update(callDutySlots)
      .set({ googleCalendarEventId: eventId })
      .where(eq(callDutySlots.id, slot.id));
  }

  return eventId;
}

// ── Routes ───────────────────────────────────────────────────────────────

/**
 * GET /slots?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns slots for a date range with signup counts and agent names.
 * Auto-generates missing slots for any weeks in the range that don't have slots yet.
 * Requires authentication.
 */
router.get("/slots", isAuthenticated, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required (YYYY-MM-DD)" });
    }

    // Auto-generate missing slots for weeks in the requested range
    try {
      const mondaysInRange = getMondaysInRange(startDate as string, endDate as string);
      let totalSlotsGenerated = 0;
      
      for (const monday of mondaysInRange) {
        const slotsCreated = await generateSlotsForWeek(monday);
        totalSlotsGenerated += slotsCreated;
      }
      
      if (totalSlotsGenerated > 0) {
        console.log(`[Call Duty] Auto-generated ${totalSlotsGenerated} slots for date range ${startDate} to ${endDate}`);
      }
    } catch (generationError) {
      // Log the error but don't fail the request - return existing slots
      console.error("[Call Duty] Error auto-generating slots:", generationError);
    }

    // Fetch active slots in the date range
    const slots = await db
      .select()
      .from(callDutySlots)
      .where(
        and(
          gte(callDutySlots.date, startDate as string),
          lte(callDutySlots.date, endDate as string),
          eq(callDutySlots.isActive, true)
        )
      )
      .orderBy(callDutySlots.date, callDutySlots.startTime);

    if (slots.length === 0) {
      return res.json([]);
    }

    // Fetch all active signups for these slots
    const slotIds = slots.map((s) => s.id);
    const signups = await db
      .select({
        id: callDutySignups.id,
        slotId: callDutySignups.slotId,
        userId: callDutySignups.userId,
        status: callDutySignups.status,
        signedUpAt: callDutySignups.signedUpAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(callDutySignups)
      .innerJoin(users, eq(callDutySignups.userId, users.id))
      .where(
        and(
          sql`${callDutySignups.slotId} IN (${sql.join(slotIds.map(id => sql`${id}`), sql`, `)})`,
          eq(callDutySignups.status, "active")
        )
      );

    // Group signups by slot
    const signupsBySlot = new Map<string, typeof signups>();
    for (const signup of signups) {
      const existing = signupsBySlot.get(signup.slotId) || [];
      existing.push(signup);
      signupsBySlot.set(signup.slotId, existing);
    }

    const currentUserId = await resolveUserId(req);
    if (!currentUserId) {
      return res.status(401).json({ message: "User not found in database" });
    }

    // Build response with signup info
    const result = slots.map((slot) => {
      const slotSignups = signupsBySlot.get(slot.id) || [];
      return {
        ...slot,
        signupCount: slotSignups.length,
        isFull: slotSignups.length >= slot.maxSignups,
        isSignedUp: slotSignups.some((s) => s.userId === currentUserId),
        signups: slotSignups.map((s) => ({
          id: s.id,
          userId: s.userId,
          firstName: s.firstName,
          lastName: s.lastName,
          profileImageUrl: s.profileImageUrl,
          signedUpAt: s.signedUpAt,
        })),
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("[Call Duty] Error fetching slots:", error);
    res.status(500).json({ message: "Failed to fetch slots" });
  }
});

/**
 * POST /slots/:slotId/signup
 * Sign up the current user for a shift slot.
 */
router.post("/slots/:slotId/signup", isAuthenticated, async (req: any, res) => {
  try {
    const { slotId } = req.params;
    const userId = await resolveUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "User not found in database" });
    }

    // Verify slot exists and is active
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(and(eq(callDutySlots.id, slotId), eq(callDutySlots.isActive, true)));

    if (!slot) {
      return res.status(404).json({ message: "Shift slot not found or inactive" });
    }

    // Check if slot is in the past
    const slotDate = new Date(`${slot.date}T${slot.startTime}:00`);
    if (slotDate < new Date()) {
      return res.status(400).json({ message: "Cannot sign up for a past shift" });
    }

    // Check if already signed up (active)
    const [existingSignup] = await db
      .select()
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.userId, userId),
          eq(callDutySignups.status, "active")
        )
      );

    if (existingSignup) {
      return res.status(409).json({ message: "You are already signed up for this shift" });
    }

    // Check if slot is full
    const activeSignups = await db
      .select({ id: callDutySignups.id })
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.status, "active")
        )
      );

    if (activeSignups.length >= slot.maxSignups) {
      return res.status(409).json({ message: "This shift is already full" });
    }

    // Check max shifts per week (if enforced)
    if (MAX_SHIFTS_PER_WEEK !== null) {
      // Determine the week (Mon-Sun) for the slot date
      const d = new Date(slot.date);
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      const weekSignups = await db
        .select({ id: callDutySignups.id })
        .from(callDutySignups)
        .innerJoin(callDutySlots, eq(callDutySignups.slotId, callDutySlots.id))
        .where(
          and(
            eq(callDutySignups.userId, userId),
            eq(callDutySignups.status, "active"),
            gte(callDutySlots.date, weekStartStr),
            lte(callDutySlots.date, weekEndStr)
          )
        );

      if (weekSignups.length >= MAX_SHIFTS_PER_WEEK) {
        return res.status(409).json({
          message: `You have reached the maximum of ${MAX_SHIFTS_PER_WEEK} shifts per week`,
        });
      }
    }

    // Insert signup
    const [signup] = await db
      .insert(callDutySignups)
      .values({ slotId, userId })
      .returning();

    // Google Calendar: ensure event exists, then add agent as attendee
    const agentEmail = getUserEmail(req);
    if (agentEmail) {
      const eventId = await ensureCalendarEvent(slot);
      if (eventId) {
        await addCallDutyAttendee(eventId, agentEmail);
      }
    }

    // Slack notification (fire-and-forget)
    notifyCallDutySlack("signup", getUserName(req), slot);

    res.status(201).json(signup);
  } catch (error: any) {
    console.error("[Call Duty] Error signing up:", error);
    res.status(500).json({ message: "Failed to sign up for shift" });
  }
});

/**
 * DELETE /slots/:slotId/signup
 * Cancel the current user's signup for a shift slot.
 */
router.delete("/slots/:slotId/signup", isAuthenticated, async (req: any, res) => {
  try {
    const { slotId } = req.params;
    const userId = await resolveUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "User not found in database" });
    }

    // Find the active signup
    const [signup] = await db
      .select()
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.userId, userId),
          eq(callDutySignups.status, "active")
        )
      );

    if (!signup) {
      return res.status(404).json({ message: "No active signup found for this shift" });
    }

    // Soft-cancel: update status to 'cancelled' and set cancelledAt
    const [cancelled] = await db
      .update(callDutySignups)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
      })
      .where(eq(callDutySignups.id, signup.id))
      .returning();

    // Google Calendar: remove agent from the event attendees
    const agentEmail = getUserEmail(req);
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(eq(callDutySlots.id, slotId));

    if (agentEmail && slot?.googleCalendarEventId) {
      await removeCallDutyAttendee(slot.googleCalendarEventId, agentEmail);
    }

    // Slack notification (fire-and-forget)
    if (slot) {
      notifyCallDutySlack("cancel", getUserName(req), slot);
    }

    res.json(cancelled);
  } catch (error: any) {
    console.error("[Call Duty] Error cancelling signup:", error);
    res.status(500).json({ message: "Failed to cancel shift signup" });
  }
});

/**
 * GET /my-shifts
 * List the current user's upcoming active signups.
 */
router.get("/my-shifts", isAuthenticated, async (req: any, res) => {
  try {
    const userId = await resolveUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "User not found in database" });
    }
    const today = new Date().toISOString().split("T")[0];

    const myShifts = await db
      .select({
        signupId: callDutySignups.id,
        signedUpAt: callDutySignups.signedUpAt,
        slotId: callDutySlots.id,
        date: callDutySlots.date,
        shiftType: callDutySlots.shiftType,
        startTime: callDutySlots.startTime,
        endTime: callDutySlots.endTime,
      })
      .from(callDutySignups)
      .innerJoin(callDutySlots, eq(callDutySignups.slotId, callDutySlots.id))
      .where(
        and(
          eq(callDutySignups.userId, userId),
          eq(callDutySignups.status, "active"),
          gte(callDutySlots.date, today)
        )
      )
      .orderBy(callDutySlots.date, callDutySlots.startTime);

    res.json(myShifts);
  } catch (error: any) {
    console.error("[Call Duty] Error fetching my shifts:", error);
    res.status(500).json({ message: "Failed to fetch your shifts" });
  }
});

// ── Holiday Management Routes ────────────────────────────────────────────

/**
 * Check if the current user has admin or developer role
 */
async function checkAdminRole(req: any, res: any): Promise<boolean> {
  try {
    const userId = await resolveUserId(req);
    console.log("[Call Duty Debug] checkAdminRole - Looking for resolved user ID:", userId);
    
    if (!userId) {
      console.log("[Call Duty Debug] checkAdminRole - Could not resolve user ID");
      res.status(403).json({ message: "User not found in database" });
      return false;
    }
    
    const [user] = await db
      .select({ role: users.role, id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    console.log("[Call Duty Debug] checkAdminRole - Found user:", user);
    
    // Also check if there are any users with similar IDs
    const allUsers = await db
      .select({ role: users.role, id: users.id, email: users.email })
      .from(users)
      .limit(10);
    
    console.log("[Call Duty Debug] checkAdminRole - All users in DB (first 10):", allUsers);

    if (!user || (user.role !== 'admin' && user.role !== 'developer')) {
      console.log("[Call Duty Debug] checkAdminRole - Access denied. User found:", !!user, "Role:", user?.role);
      res.status(403).json({ message: "Admin access required" });
      return false;
    }
    console.log("[Call Duty Debug] checkAdminRole - Access granted for role:", user.role);
    return true;
  } catch (error) {
    console.error("[Call Duty] Admin check error:", error);
    res.status(500).json({ message: "Authorization check failed" });
    return false;
  }
}

/**
 * GET /holidays
 * List all holidays sorted by date ascending
 */
router.get("/holidays", isAuthenticated, async (req: any, res) => {
  try {
    const holidays = await db
      .select()
      .from(callDutyHolidays)
      .orderBy(callDutyHolidays.date);

    res.json(holidays);
  } catch (error: any) {
    console.error("[Call Duty] Error fetching holidays:", error);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

/**
 * POST /holidays
 * Create a new holiday entry
 * Requires admin role
 */
router.post("/holidays", isAuthenticated, async (req: any, res) => {
  try {
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    const { name, date, isRecurring = false } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: "Holiday name is required" });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date is required in YYYY-MM-DD format" });
    }

    // Check for duplicate dates
    const [existingHoliday] = await db
      .select()
      .from(callDutyHolidays)
      .where(eq(callDutyHolidays.date, date));

    if (existingHoliday) {
      return res.status(400).json({ message: "A holiday already exists for this date" });
    }

    // Create the holiday
    const createdBy = await resolveUserId(req);
    if (!createdBy) {
      return res.status(401).json({ message: "User not found in database" });
    }
    
    const [newHoliday] = await db
      .insert(callDutyHolidays)
      .values({
        name: name.trim(),
        date: new Date(date),
        isRecurring: Boolean(isRecurring),
        createdBy,
      })
      .returning();

    res.status(201).json(newHoliday);
  } catch (error: any) {
    console.error("[Call Duty] Error creating holiday:", error);
    res.status(500).json({ message: "Failed to create holiday" });
  }
});

/**
 * DELETE /holidays/:id
 * Remove a holiday entry
 * Requires admin role
 */
router.delete("/holidays/:id", isAuthenticated, async (req: any, res) => {
  try {
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Holiday ID is required" });
    }

    // Check if holiday exists
    const [existingHoliday] = await db
      .select()
      .from(callDutyHolidays)
      .where(eq(callDutyHolidays.id, id));

    if (!existingHoliday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    // Delete the holiday
    await db
      .delete(callDutyHolidays)
      .where(eq(callDutyHolidays.id, id));

    res.json({ message: "Holiday deleted successfully" });
  } catch (error: any) {
    console.error("[Call Duty] Error deleting holiday:", error);
    res.status(500).json({ message: "Failed to delete holiday" });
  }
});

// ── Admin Assignment Routes ──────────────────────────────────────────────

/**
 * POST /slots/:slotId/assign
 * Admin assigns an agent to a shift slot
 * Requires admin/developer role
 */
router.post("/slots/:slotId/assign", isAuthenticated, async (req: any, res) => {
  try {
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    const { slotId } = req.params;
    const { userId } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Verify slot exists and is active
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(and(eq(callDutySlots.id, slotId), eq(callDutySlots.isActive, true)));

    if (!slot) {
      return res.status(404).json({ message: "Shift slot not found or inactive" });
    }

    // Verify user exists
    const [targetUser] = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId));

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already signed up for this slot (active)
    const [existingSignup] = await db
      .select()
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.userId, userId),
          eq(callDutySignups.status, "active")
        )
      );

    if (existingSignup) {
      return res.status(409).json({ message: "Agent is already signed up for this shift" });
    }

    // Check if slot is full
    const activeSignups = await db
      .select({ id: callDutySignups.id })
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.status, "active")
        )
      );

    if (activeSignups.length >= slot.maxSignups) {
      return res.status(409).json({ message: "This shift is already full" });
    }

    // Create the assignment (signup)
    const [signup] = await db
      .insert(callDutySignups)
      .values({ slotId, userId })
      .returning();

    // Google Calendar: ensure event exists, then add agent as attendee
    if (targetUser.email) {
      const eventId = await ensureCalendarEvent(slot);
      if (eventId) {
        await addCallDutyAttendee(eventId, targetUser.email);
      }
    }

    // Slack notification (fire-and-forget)
    const agentName = `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.email || "An agent";
    notifyCallDutySlack("signup", agentName, slot);

    res.status(201).json(signup);
  } catch (error: any) {
    console.error("[Call Duty] Error assigning agent to slot:", error);
    res.status(500).json({ message: "Failed to assign agent to shift" });
  }
});

/**
 * DELETE /slots/:slotId/signups/:signupId
 * Admin removes an agent from a shift slot
 * Requires admin/developer role
 */
router.delete("/slots/:slotId/signups/:signupId", isAuthenticated, async (req: any, res) => {
  try {
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    const { slotId, signupId } = req.params;

    if (!signupId) {
      return res.status(400).json({ message: "Signup ID is required" });
    }

    // Find the active signup and verify it belongs to the specified slot
    const [signup] = await db
      .select({
        id: callDutySignups.id,
        slotId: callDutySignups.slotId,
        userId: callDutySignups.userId,
        status: callDutySignups.status,
      })
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.id, signupId),
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.status, "active")
        )
      );

    if (!signup) {
      return res.status(404).json({ message: "Active signup not found for this shift" });
    }

    // Get user and slot info for notifications
    const [targetUser] = await db
      .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, signup.userId));

    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(eq(callDutySlots.id, slotId));

    // Soft-cancel: update status to 'cancelled' and set cancelledAt
    const [cancelled] = await db
      .update(callDutySignups)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
      })
      .where(eq(callDutySignups.id, signupId))
      .returning();

    // Google Calendar: remove agent from the event attendees
    if (targetUser?.email && slot?.googleCalendarEventId) {
      await removeCallDutyAttendee(slot.googleCalendarEventId, targetUser.email);
    }

    // Slack notification (fire-and-forget)
    if (slot && targetUser) {
      const agentName = `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.email || "An agent";
      notifyCallDutySlack("cancel", agentName, slot);
    }

    res.json(cancelled);
  } catch (error: any) {
    console.error("[Call Duty] Error removing agent from slot:", error);
    res.status(500).json({ message: "Failed to remove agent from shift" });
  }
});

export default router;
