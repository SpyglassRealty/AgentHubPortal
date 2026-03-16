import { Router } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  callDutySlots,
  callDutySignups,
  callDutyHolidays,
  callDutyWaitlist,
  users,
  type CallDutySlot,
  type CallDutySignup,
  type CallDutyHoliday,
  type CallDutyWaitlist,
} from "@shared/schema";
import { isAuthenticated } from "./replitAuth";
import {
  createCallDutyCalendarEvent,
  addCallDutyAttendee,
  removeCallDutyAttendee,
  registerEventWatch,
  getCalendarEventAttendees,
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
 * Format date for Slack notifications (e.g. "Thu, Mar 12")
 */
function formatSlackDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

/**
 * Format shift label for Slack notifications (e.g. "Morning (8:00 AM - 12:00 PM)")
 */
function formatShiftLabel(shiftType: string, startTime: string, endTime: string): string {
  const label = SHIFT_TYPE_LABELS[shiftType] || shiftType;
  return `${label} (${startTime} - ${endTime})`;
}

/**
 * Fire-and-forget Slack notification for Call Duty events.
 */
function notifyCallDutySlack(
  action: "self_signup" | "admin_assign" | "force_assign" | "self_cancel" | "admin_remove",
  agentName: string,
  slot: { date: string; shiftType: string; startTime: string; endTime: string },
  options?: {
    adminName?: string;
    agentEmail?: string;
    cancellationReason?: string;
  }
): void {
  const shift = formatShiftLabel(slot.shiftType, slot.startTime, slot.endTime);
  const dayDate = formatSlackDate(slot.date);
  
  let text = "";
  
  switch (action) {
    case "self_signup":
      text = `${agentName} signed up for the ${shift} on ${dayDate}.`;
      break;
      
    case "admin_assign":
      text = `${agentName} was assigned to the ${shift} on ${dayDate} by ${options?.adminName || "Admin"}.`;
      break;
      
    case "force_assign":
      text = `${agentName} (${options?.agentEmail}) was force-assigned to the ${shift} on ${dayDate} by ${options?.adminName || "Admin"}. _(External assignment — calendar invite sent to email, no Slack account.)_`;
      break;
      
    case "self_cancel":
      text = `${agentName} cancelled their ${shift} on ${dayDate}. Reason: ${options?.cancellationReason || "No reason provided"}`;
      break;
      
    case "admin_remove":
      text = `${agentName} was removed from the ${shift} on ${dayDate} by ${options?.adminName || "Admin"}. Reason: ${options?.cancellationReason || "No reason provided"}`;
      break;
  }

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
        assignedName: callDutySignups.assignedName,
        assignedEmail: callDutySignups.assignedEmail,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        fubAvatarUrl: users.fubAvatarUrl,
      })
      .from(callDutySignups)
      .leftJoin(users, eq(callDutySignups.userId, users.id))
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

    // Fetch waitlist data for these slots
    const waitlistData = await db
      .select({
        id: callDutyWaitlist.id,
        slotId: callDutyWaitlist.slotId,
        userId: callDutyWaitlist.userId,
        position: callDutyWaitlist.position,
        status: callDutyWaitlist.status,
        createdAt: callDutyWaitlist.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(callDutyWaitlist)
      .innerJoin(users, eq(callDutyWaitlist.userId, users.id))
      .where(
        and(
          sql`${callDutyWaitlist.slotId} IN (${sql.join(slotIds.map(id => sql`${id}`), sql`, `)})`,
          eq(callDutyWaitlist.status, "waiting")
        )
      )
      .orderBy(callDutyWaitlist.slotId, callDutyWaitlist.position);

    // Group waitlist by slot
    const waitlistBySlot = new Map<string, typeof waitlistData>();
    for (const waitlistEntry of waitlistData) {
      const existing = waitlistBySlot.get(waitlistEntry.slotId) || [];
      existing.push(waitlistEntry);
      waitlistBySlot.set(waitlistEntry.slotId, existing);
    }

    // Build response with signup and waitlist info
    const result = slots.map((slot) => {
      const slotSignups = signupsBySlot.get(slot.id) || [];
      const slotWaitlist = waitlistBySlot.get(slot.id) || [];
      const userWaitlistEntry = slotWaitlist.find((w) => w.userId === currentUserId);
      
      return {
        ...slot,
        signupCount: slotSignups.length,
        isFull: slotSignups.length >= slot.maxSignups,
        isSignedUp: slotSignups.some((s) => s.userId === currentUserId),
        isOnWaitlist: !!userWaitlistEntry,
        waitlistPosition: userWaitlistEntry?.position || null,
        waitlistCount: slotWaitlist.length,
        signups: slotSignups.map((s) => ({
          id: s.id,
          userId: s.userId,
          firstName: s.userId ? s.firstName : s.assignedName?.split(' ')[0] || null,
          lastName: s.userId ? s.lastName : s.assignedName?.split(' ').slice(1).join(' ') || null,
          profileImageUrl: s.userId ? s.profileImageUrl : null,
          signedUpAt: s.signedUpAt,
        })),
        waitlist: slotWaitlist.map((w) => ({
          id: w.id,
          userId: w.userId,
          position: w.position,
          firstName: w.firstName,
          lastName: w.lastName,
          email: w.email,
          createdAt: w.createdAt,
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
    const { confirmed } = req.body; // Support for confirmed warnings
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

    // Soft warning: Check for 5+ shifts per week (Task 6)
    let weeklyLimitWarning = false;
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

      // Soft warning: Show warning at 5+ shifts, but allow if confirmed
      if (weekSignups.length >= MAX_SHIFTS_PER_WEEK) {
        weeklyLimitWarning = true;
        
        // If not confirmed, return warning (don't block)
        if (!confirmed) {
          return res.status(409).json({
            warning: "weekly_limit",
            message: `You already have ${weekSignups.length} shifts this week. Are you sure?`,
            canProceed: true,
          });
        }
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
        // Register calendar watch for RSVP notifications
        await registerEventWatch(eventId, slotId);
      }
    }

    // Slack notification (fire-and-forget)
    notifyCallDutySlack("self_signup", getUserName(req), slot);

    res.status(201).json(signup);
  } catch (error: any) {
    console.error("[Call Duty] Error signing up:", error);
    
    // Handle duplicate signup constraint violation
    if (error.code === '23505' || error.constraint === 'idx_call_duty_signups_slot_user') {
      return res.status(409).json({ message: "You're already signed up for this shift." });
    }
    
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
    const { confirmed, cancellationReason } = req.body; // Support for confirmed warnings + cancellation reason
    const userId = await resolveUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "User not found in database" });
    }

    // Require cancellation reason (Task 6)
    if (!cancellationReason || cancellationReason.trim() === "") {
      return res.status(400).json({ 
        requiresReason: true,
        message: "Cancellation reason is required" 
      });
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

    // Get slot details for 24-hour warning check
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(eq(callDutySlots.id, slotId));

    if (!slot) {
      return res.status(404).json({ message: "Shift slot not found" });
    }

    // Soft warning: Check for cancellation within 24 hours (Task 6)
    const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
    const now = new Date();
    const hoursUntilShift = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    let shortNoticeWarning = false;
    if (hoursUntilShift < 24 && hoursUntilShift > 0) {
      shortNoticeWarning = true;
      
      // If not confirmed, return warning (don't block)
      if (!confirmed) {
        return res.status(409).json({
          warning: "short_notice_cancellation",
          message: "This shift starts in less than 24 hours. Late cancellations are tracked.",
          canProceed: true,
        });
      }
    }

    // Soft-cancel: update status to 'cancelled', set cancelledAt, and store reason
    const [cancelled] = await db
      .update(callDutySignups)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: cancellationReason.trim(),
      })
      .where(eq(callDutySignups.id, signup.id))
      .returning();

    // Google Calendar: remove agent from the event attendees
    const agentEmail = getUserEmail(req);
    if (agentEmail && slot?.googleCalendarEventId) {
      await removeCallDutyAttendee(slot.googleCalendarEventId, agentEmail);
    }

    // Slack notification (fire-and-forget)
    if (slot) {
      notifyCallDutySlack("self_cancel", getUserName(req), slot, {
        cancellationReason: cancellationReason.trim()
      });
    }

    // Check waitlist and notify first person if a spot opened up
    await processWaitlistForSlot(slotId);

    res.json(cancelled);
  } catch (error: any) {
    console.error("[Call Duty] Error cancelling signup:", error);
    res.status(500).json({ message: "Failed to cancel shift signup" });
  }
});

/**
 * POST /slots/:slotId/waitlist
 * Join the waitlist for a full shift slot.
 */
router.post("/slots/:slotId/waitlist", isAuthenticated, async (req: any, res) => {
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
      return res.status(400).json({ message: "Cannot join waitlist for a past shift" });
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

    // Check if already on waitlist
    const [existingWaitlist] = await db
      .select()
      .from(callDutyWaitlist)
      .where(
        and(
          eq(callDutyWaitlist.slotId, slotId),
          eq(callDutyWaitlist.userId, userId),
          eq(callDutyWaitlist.status, "waiting")
        )
      );

    if (existingWaitlist) {
      return res.status(409).json({ 
        message: `You are already on the waitlist for this shift (position #${existingWaitlist.position})` 
      });
    }

    // Check if slot is actually full
    const activeSignups = await db
      .select({ id: callDutySignups.id })
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.status, "active")
        )
      );

    if (activeSignups.length < slot.maxSignups) {
      return res.status(400).json({ message: "Slot is not full - you can sign up directly!" });
    }

    // Get next position in waitlist for this slot
    const waitlistEntries = await db
      .select({ position: callDutyWaitlist.position })
      .from(callDutyWaitlist)
      .where(
        and(
          eq(callDutyWaitlist.slotId, slotId),
          eq(callDutyWaitlist.status, "waiting")
        )
      )
      .orderBy(desc(callDutyWaitlist.position));

    const nextPosition = waitlistEntries.length > 0 ? waitlistEntries[0].position + 1 : 1;

    // Add to waitlist
    const [waitlistEntry] = await db
      .insert(callDutyWaitlist)
      .values({
        slotId,
        userId,
        position: nextPosition,
        status: "waiting",
      })
      .returning();

    res.status(201).json({
      ...waitlistEntry,
      message: `You've been added to the waitlist! You're #${nextPosition} in line.`,
    });
  } catch (error: any) {
    console.error("[Call Duty] Error joining waitlist:", error);
    res.status(500).json({ message: "Failed to join waitlist" });
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

/**
 * GET /unfilled-slots
 * Returns current week's slots with < 3/3 signups (admin/developer only).
 * Used by Johnny Mac's Leads Huddle dashboard.
 */
router.get("/unfilled-slots", isAuthenticated, async (req: any, res) => {
  try {
    // Check admin access
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    // Get current week (Mon-Sun)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startDate = weekStart.toISOString().split("T")[0];
    const endDate = weekEnd.toISOString().split("T")[0];
    const currentDateTime = new Date();

    // Auto-generate missing slots for the current week
    try {
      const slotsGenerated = await generateSlotsForWeek(weekStart);
      if (slotsGenerated > 0) {
        console.log(`[Call Duty] Auto-generated ${slotsGenerated} slots for unfilled-slots check`);
      }
    } catch (generationError) {
      console.error("[Call Duty] Error auto-generating slots for unfilled-slots:", generationError);
    }

    // Fetch active slots for current week, excluding past dates/times
    const slots = await db
      .select()
      .from(callDutySlots)
      .where(
        and(
          gte(callDutySlots.date, startDate),
          lte(callDutySlots.date, endDate),
          eq(callDutySlots.isActive, true)
        )
      )
      .orderBy(callDutySlots.date, callDutySlots.startTime);

    if (slots.length === 0) {
      return res.json([]);
    }

    // Filter out past slots
    const currentSlots = slots.filter(slot => {
      const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
      return slotDateTime >= currentDateTime;
    });

    if (currentSlots.length === 0) {
      return res.json([]);
    }

    // Fetch all active signups for these slots
    const slotIds = currentSlots.map((s) => s.id);
    const signups = await db
      .select({
        id: callDutySignups.id,
        slotId: callDutySignups.slotId,
        userId: callDutySignups.userId,
        status: callDutySignups.status,
        signedUpAt: callDutySignups.signedUpAt,
        assignedName: callDutySignups.assignedName,
        assignedEmail: callDutySignups.assignedEmail,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(callDutySignups)
      .leftJoin(users, eq(callDutySignups.userId, users.id))
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

    // Filter for unfilled slots (< maxSignups)
    const unfilledSlots = currentSlots
      .map((slot) => {
        const slotSignups = signupsBySlot.get(slot.id) || [];
        return {
          ...slot,
          signupCount: slotSignups.length,
          maxSignups: slot.maxSignups,
          needsCount: slot.maxSignups - slotSignups.length,
          signups: slotSignups.map((s) => ({
            id: s.id,
            userId: s.userId,
            firstName: s.userId ? s.firstName : s.assignedName?.split(' ')[0] || null,
            lastName: s.userId ? s.lastName : s.assignedName?.split(' ').slice(1).join(' ') || null,
            email: s.userId ? s.email : s.assignedEmail,
            signedUpAt: s.signedUpAt,
          })),
        };
      })
      .filter((slot) => slot.signupCount < slot.maxSignups);

    res.json(unfilledSlots);
  } catch (error: any) {
    console.error("[Call Duty] Error fetching unfilled slots:", error);
    res.status(500).json({ message: "Failed to fetch unfilled slots" });
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
    const { userId, name, email } = req.body;

    // Validation - must have either userId or both name/email
    if (!userId && (!name || !email)) {
      return res.status(400).json({ message: "Either userId or both name and email are required" });
    }

    if (userId && (name || email)) {
      return res.status(400).json({ message: "Cannot specify both userId and name/email - choose one assignment method" });
    }

    // Verify slot exists and is active
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(and(eq(callDutySlots.id, slotId), eq(callDutySlots.isActive, true)));

    if (!slot) {
      return res.status(404).json({ message: "Shift slot not found or inactive" });
    }

    let targetUser = null;
    let assignmentEmail = null;
    let agentName = "";

    if (userId) {
      // Regular user assignment flow
      const [user] = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      targetUser = user;
      assignmentEmail = user.email;
      agentName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Agent";

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
    } else {
      // Force-assign by email flow
      assignmentEmail = email.trim();
      agentName = name.trim();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(assignmentEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email already assigned to this slot (active)
      const [existingSignup] = await db
        .select()
        .from(callDutySignups)
        .where(
          and(
            eq(callDutySignups.slotId, slotId),
            eq(callDutySignups.assignedEmail, assignmentEmail),
            eq(callDutySignups.status, "active")
          )
        );

      if (existingSignup) {
        return res.status(409).json({ message: "This email is already assigned to this shift" });
      }
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
    const signupValues: any = {
      slotId,
      status: "active"
    };

    if (userId) {
      signupValues.userId = userId;
    } else {
      signupValues.assignedName = name.trim();
      signupValues.assignedEmail = assignmentEmail;
    }

    const [signup] = await db
      .insert(callDutySignups)
      .values(signupValues)
      .returning();

    // Google Calendar: ensure event exists, then add attendee
    if (assignmentEmail) {
      const eventId = await ensureCalendarEvent(slot);
      if (eventId) {
        await addCallDutyAttendee(eventId, assignmentEmail);
        // Register calendar watch for RSVP notifications
        await registerEventWatch(eventId, slotId);
      }
    }

    // Slack notification (fire-and-forget)
    const adminName = getUserName(req);
    if (userId) {
      // Regular admin assignment (existing user)
      notifyCallDutySlack("admin_assign", agentName, slot, { adminName });
    } else {
      // Force assignment (external email)
      notifyCallDutySlack("force_assign", agentName, slot, { 
        adminName, 
        agentEmail: assignmentEmail 
      });
    }

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
    const { cancellationReason } = req.body; // Task 6: Require cancellation reason

    if (!signupId) {
      return res.status(400).json({ message: "Signup ID is required" });
    }

    // Require cancellation reason (Task 6)
    if (!cancellationReason || cancellationReason.trim() === "") {
      return res.status(400).json({ 
        requiresReason: true,
        message: "Cancellation reason is required" 
      });
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

    // Soft-cancel: update status to 'cancelled', set cancelledAt, and store reason
    const [cancelled] = await db
      .update(callDutySignups)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: cancellationReason.trim(),
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
      notifyCallDutySlack("admin_remove", agentName, slot, {
        adminName: getUserName(req),
        cancellationReason: cancellationReason.trim()
      });
    }

    res.json(cancelled);
  } catch (error: any) {
    console.error("[Call Duty] Error removing agent from slot:", error);
    res.status(500).json({ message: "Failed to remove agent from shift" });
  }
});

// ── Helper Functions ─────────────────────────────────────────────────────

/**
 * Process waitlist for a slot when a spot opens up.
 * Notifies the first person in the waitlist via Slack.
 */
async function processWaitlistForSlot(slotId: string): Promise<void> {
  try {
    // Get the slot details
    const [slot] = await db
      .select()
      .from(callDutySlots)
      .where(eq(callDutySlots.id, slotId));

    if (!slot) return;

    // Check current signup count
    const activeSignups = await db
      .select({ id: callDutySignups.id })
      .from(callDutySignups)
      .where(
        and(
          eq(callDutySignups.slotId, slotId),
          eq(callDutySignups.status, "active")
        )
      );

    // If slot is still full, no need to process waitlist
    if (activeSignups.length >= slot.maxSignups) {
      return;
    }

    // Get the first person on the waitlist (lowest position)
    const [firstWaitlist] = await db
      .select({
        id: callDutyWaitlist.id,
        userId: callDutyWaitlist.userId,
        position: callDutyWaitlist.position,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(callDutyWaitlist)
      .innerJoin(users, eq(callDutyWaitlist.userId, users.id))
      .where(
        and(
          eq(callDutyWaitlist.slotId, slotId),
          eq(callDutyWaitlist.status, "waiting")
        )
      )
      .orderBy(callDutyWaitlist.position)
      .limit(1);

    if (!firstWaitlist) {
      // No one on waitlist
      return;
    }

    // Mark waitlist entry as notified and set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db
      .update(callDutyWaitlist)
      .set({
        status: "notified",
        notifiedAt: new Date(),
        expiresAt,
      })
      .where(eq(callDutyWaitlist.id, firstWaitlist.id));

    // Send Slack notification
    const agentName = `${firstWaitlist.firstName || ""} ${firstWaitlist.lastName || ""}`.trim() || firstWaitlist.email || "Agent";
    const shiftLabel = SHIFT_TYPE_LABELS[slot.shiftType] || slot.shiftType;
    const slackMessage = `🎯 <@${firstWaitlist.email}> A spot opened up for **${shiftLabel} Shift** on **${slot.date}** (${slot.startTime}–${slot.endTime}). Sign up now! You have 24 hours.`;

    // Fire-and-forget Slack notification
    sendSlackMessage(CALL_DUTY_SLACK_CHANNEL_ID, slackMessage).catch((error) => {
      console.error("[Call Duty] Failed to send waitlist notification:", error);
    });

    console.log(`[Call Duty] Notified waitlist user ${agentName} about opening in slot ${slotId}`);
  } catch (error: any) {
    console.error("[Call Duty] Error processing waitlist:", error);
  }
}

// ── Reporting Routes ─────────────────────────────────────────────────────

/**
 * GET /reports
 * Generate Call Duty coverage and activity reports (admin/developer only).
 * Query params: startDate, endDate (YYYY-MM-DD format)
 */
router.get("/reports", isAuthenticated, async (req: any, res) => {
  try {
    // Check admin access
    const isAdmin = await checkAdminRole(req, res);
    if (!isAdmin) return;

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required (YYYY-MM-DD)" });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ message: "Dates must be in YYYY-MM-DD format" });
    }

    // Get all slots in the date range
    const slots = await db
      .select({
        id: callDutySlots.id,
        date: callDutySlots.date,
        shiftType: callDutySlots.shiftType,
        startTime: callDutySlots.startTime,
        endTime: callDutySlots.endTime,
        maxSignups: callDutySlots.maxSignups,
        isActive: callDutySlots.isActive,
      })
      .from(callDutySlots)
      .where(
        and(
          gte(callDutySlots.date, startDate as string),
          lte(callDutySlots.date, endDate as string),
          eq(callDutySlots.isActive, true)
        )
      )
      .orderBy(callDutySlots.date, callDutySlots.startTime);

    // Get all signups (active and cancelled) in the date range
    const signups = await db
      .select({
        id: callDutySignups.id,
        slotId: callDutySignups.slotId,
        userId: callDutySignups.userId,
        status: callDutySignups.status,
        signedUpAt: callDutySignups.signedUpAt,
        cancelledAt: callDutySignups.cancelledAt,
        cancellationReason: callDutySignups.cancellationReason,
        // User info
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        // Slot info
        slotDate: callDutySlots.date,
        shiftType: callDutySlots.shiftType,
        startTime: callDutySlots.startTime,
        endTime: callDutySlots.endTime,
      })
      .from(callDutySignups)
      .innerJoin(users, eq(callDutySignups.userId, users.id))
      .innerJoin(callDutySlots, eq(callDutySignups.slotId, callDutySlots.id))
      .where(
        and(
          gte(callDutySlots.date, startDate as string),
          lte(callDutySlots.date, endDate as string),
          eq(callDutySlots.isActive, true)
        )
      )
      .orderBy(desc(callDutySignups.signedUpAt));

    // Calculate coverage statistics
    const totalSlots = slots.reduce((sum, slot) => sum + slot.maxSignups, 0);
    const activeSignups = signups.filter(s => s.status === "active").length;
    const coveragePercentage = totalSlots > 0 ? Math.round((activeSignups / totalSlots) * 100) : 0;

    // Group coverage by week
    const coverageByWeek = new Map<string, { filled: number; total: number }>();
    
    for (const slot of slots) {
      const slotDate = new Date(slot.date + "T00:00:00");
      const day = slotDate.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(slotDate);
      weekStart.setDate(slotDate.getDate() + mondayOffset);
      const weekKey = weekStart.toISOString().split("T")[0];
      
      const existing = coverageByWeek.get(weekKey) || { filled: 0, total: 0 };
      existing.total += slot.maxSignups;
      
      // Count active signups for this slot
      const slotActiveSignups = signups.filter(s => s.slotId === slot.id && s.status === "active").length;
      existing.filled += slotActiveSignups;
      
      coverageByWeek.set(weekKey, existing);
    }

    // Calculate agent activity (ranked by active shifts)
    const agentActivity = new Map<string, { 
      userId: string; 
      name: string; 
      email: string; 
      activeShifts: number; 
      totalSignups: number; 
      cancellations: number 
    }>();

    for (const signup of signups) {
      const agentKey = signup.userId;
      const agentName = `${signup.firstName || ""} ${signup.lastName || ""}`.trim() || signup.email;
      
      const existing = agentActivity.get(agentKey) || {
        userId: signup.userId,
        name: agentName,
        email: signup.email,
        activeShifts: 0,
        totalSignups: 0,
        cancellations: 0,
      };
      
      existing.totalSignups++;
      if (signup.status === "active") {
        existing.activeShifts++;
      } else if (signup.status === "cancelled") {
        existing.cancellations++;
      }
      
      agentActivity.set(agentKey, existing);
    }

    // Convert to sorted arrays
    const agentActivityArray = Array.from(agentActivity.values())
      .sort((a, b) => b.activeShifts - a.activeShifts);

    const coverageByWeekArray = Array.from(coverageByWeek.entries())
      .map(([weekStart, stats]) => ({
        weekStart,
        ...stats,
        percentage: stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Build shift history log
    const shiftHistory = signups.map(signup => ({
      id: signup.id,
      agentName: `${signup.firstName || ""} ${signup.lastName || ""}`.trim() || signup.email,
      email: signup.email,
      action: signup.status === "active" ? "signup" : "cancellation",
      shiftDate: signup.slotDate,
      shiftType: signup.shiftType,
      shiftTime: `${signup.startTime}–${signup.endTime}`,
      timestamp: signup.status === "cancelled" && signup.cancelledAt ? signup.cancelledAt : signup.signedUpAt,
      cancellationReason: signup.cancellationReason,
    }));

    const report = {
      dateRange: { startDate, endDate },
      coverageStats: {
        totalSlots,
        filledSlots: activeSignups,
        coveragePercentage,
      },
      coverageByWeek: coverageByWeekArray,
      agentActivity: agentActivityArray,
      shiftHistory,
    };

    res.json(report);
  } catch (error: any) {
    console.error("[Call Duty] Error generating reports:", error);
    res.status(500).json({ message: "Failed to generate reports" });
  }
});

// ── Google Calendar RSVP Webhook Handler ────────────────────────────────

/**
 * POST /calendar-webhook
 * Webhook handler for Google Calendar push notifications.
 * Processes RSVP status changes and posts Slack notifications.
 */
router.post("/calendar-webhook", async (req: any, res) => {
  try {
    // Always return 200 immediately to prevent Google retries
    res.status(200).send("OK");

    const resourceState = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];

    console.log(`[Calendar Webhook] Received notification: state=${resourceState}, channelId=${channelId}, resourceId=${resourceId}`);

    // Only process 'exists' events (skip 'sync')
    if (resourceState !== 'exists') {
      console.log(`[Calendar Webhook] Ignoring ${resourceState} event`);
      return;
    }

    if (!channelId || !resourceId) {
      console.log("[Calendar Webhook] Missing required headers");
      return;
    }

    // Find the watch registration
    const watchResult = await db.execute(sql`
      SELECT slot_id FROM calendar_watches 
      WHERE watch_id = ${channelId} AND resource_id = ${resourceId}
    `);

    if (watchResult.rows.length === 0) {
      console.log(`[Calendar Webhook] No watch found for channelId ${channelId}`);
      return;
    }

    const slotId = (watchResult.rows[0] as any).slot_id;

    // Get the slot and its Google Calendar event ID
    const slotResult = await db.execute(sql`
      SELECT google_calendar_event_id, date, shift_type, start_time, end_time
      FROM call_duty_slots WHERE id = ${slotId}
    `);

    if (slotResult.rows.length === 0) {
      console.log(`[Calendar Webhook] Slot ${slotId} not found`);
      return;
    }

    const slot = slotResult.rows[0] as any;
    const eventId = slot.google_calendar_event_id;

    if (!eventId) {
      console.log(`[Calendar Webhook] No Google Calendar event ID for slot ${slotId}`);
      return;
    }

    // Fetch the event attendees from Google Calendar
    const attendees = await getCalendarEventAttendees(eventId);
    console.log(`[Calendar Webhook] Event has ${attendees.length} attendees`);

    // Process each attendee's response status
    for (const attendee of attendees) {
      if (!attendee.email || !attendee.responseStatus) continue;

      const email = attendee.email;
      const currentStatus = attendee.responseStatus;

      // Get the last known status for this attendee
      const lastStatusResult = await db.execute(sql`
        SELECT last_response_status FROM calendar_watch_attendees 
        WHERE slot_id = ${slotId} AND attendee_email = ${email}
      `);

      const lastStatus = lastStatusResult.rows.length > 0 
        ? (lastStatusResult.rows[0] as any).last_response_status 
        : null;

      // Only notify if status has changed
      if (lastStatus !== currentStatus) {
        console.log(`[Calendar Webhook] Status change for ${email}: ${lastStatus} → ${currentStatus}`);

        // Get the attendee's name (first name + last name from database)
        const userResult = await db.execute(sql`
          SELECT first_name, last_name FROM users WHERE email = ${email}
        `);

        const userName = userResult.rows.length > 0 
          ? `${(userResult.rows[0] as any).first_name || ''} ${(userResult.rows[0] as any).last_name || ''}`.trim() || email.split('@')[0]
          : email.split('@')[0];

        // Format the date and shift info
        const shiftLabel = SHIFT_TYPE_LABELS[slot.shift_type] || slot.shift_type;
        const dateObj = new Date(slot.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Generate Slack message based on response status
        let slackMessage = '';
        if (currentStatus === 'accepted') {
          slackMessage = `✅ *${userName}* accepted the *${shiftLabel}* on *${dayName}, ${formattedDate}*.`;
        } else if (currentStatus === 'declined') {
          slackMessage = `❌ *${userName}* declined the *${shiftLabel}* on *${dayName}, ${formattedDate}*. Admin may need to fill this slot.`;
        } else if (currentStatus === 'tentative') {
          slackMessage = `❓ *${userName}* marked Maybe for the *${shiftLabel}* on *${dayName}, ${formattedDate}*.`;
        }

        if (slackMessage) {
          console.log(`[Calendar Webhook] Posting to Slack: ${slackMessage}`);
          
          // Fire-and-forget Slack notification
          sendSlackMessage(CALL_DUTY_SLACK_CHANNEL_ID, slackMessage).catch((error) => {
            console.error("[Calendar Webhook] Failed to send Slack notification:", error);
          });
        }

        // Update the stored status
        await db.execute(sql`
          INSERT INTO calendar_watch_attendees (slot_id, attendee_email, last_response_status, updated_at)
          VALUES (${slotId}, ${email}, ${currentStatus}, NOW())
          ON CONFLICT (slot_id, attendee_email)
          DO UPDATE SET last_response_status = ${currentStatus}, updated_at = NOW()
        `);
      }
    }

  } catch (error: any) {
    console.error("[Calendar Webhook] Error processing webhook:", error);
    // Don't re-throw - always return 200 to Google
  }
});

// ── Watch Renewal Functions ──────────────────────────────────────────────

/**
 * Renew expiring calendar watches (called by cron job).
 * Re-registers watches that expire within 24 hours.
 */
export async function renewExpiringCalendarWatches(): Promise<void> {
  try {
    console.log("[Calendar Watch Renewal] Checking for expiring watches...");

    // Find watches expiring within 24 hours
    const expiringWatchesResult = await db.execute(sql`
      SELECT cw.watch_id, cw.slot_id, cs.google_calendar_event_id
      FROM calendar_watches cw
      JOIN call_duty_slots cs ON cw.slot_id = cs.id
      WHERE cw.expires_at < NOW() + INTERVAL '24 hours'
      AND cs.date + cs.start_time::time > NOW()
    `);

    const expiringWatches = expiringWatchesResult.rows as any[];

    if (expiringWatches.length === 0) {
      console.log("[Calendar Watch Renewal] No expiring watches found");
      return;
    }

    console.log(`[Calendar Watch Renewal] Found ${expiringWatches.length} expiring watches`);

    // Re-register each expiring watch
    for (const watch of expiringWatches) {
      const { slot_id, google_calendar_event_id } = watch;

      if (google_calendar_event_id) {
        console.log(`[Calendar Watch Renewal] Renewing watch for slot ${slot_id}`);
        
        // Remove old watch record
        await db.execute(sql`DELETE FROM calendar_watches WHERE slot_id = ${slot_id}`);
        
        // Register new watch
        const success = await registerEventWatch(google_calendar_event_id, slot_id);
        if (success) {
          console.log(`[Calendar Watch Renewal] Successfully renewed watch for slot ${slot_id}`);
        } else {
          console.error(`[Calendar Watch Renewal] Failed to renew watch for slot ${slot_id}`);
        }
      }
    }

    // Clean up watches for slots that have already passed
    await db.execute(sql`
      DELETE FROM calendar_watches 
      WHERE slot_id IN (
        SELECT cs.id FROM call_duty_slots cs 
        WHERE cs.date + cs.start_time::time < NOW()
      )
    `);

    console.log("[Calendar Watch Renewal] Watch renewal complete");
  } catch (error: any) {
    console.error("[Calendar Watch Renewal] Error renewing watches:", error);
  }
}

export default router;
