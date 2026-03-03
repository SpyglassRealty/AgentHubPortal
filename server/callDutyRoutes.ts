import { Router } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  callDutySlots,
  callDutySignups,
  users,
  type CallDutySlot,
  type CallDutySignup,
} from "@shared/schema";
import { isAuthenticated } from "./replitAuth";
import {
  createCallDutyCalendarEvent,
  addCallDutyAttendee,
  removeCallDutyAttendee,
} from "./googleCalendarClient";
import { sendSlackMessage } from "./slackNotify";

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
  return req.user.claims.sub;
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
 * Requires authentication.
 */
router.get("/slots", isAuthenticated, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required (YYYY-MM-DD)" });
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

    const currentUserId = getUserId(req);

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
    const userId = getUserId(req);

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
    const userId = getUserId(req);

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
    const userId = getUserId(req);
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

export default router;
