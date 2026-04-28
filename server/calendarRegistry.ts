/**
 * Shared calendar registry for Mission Control's Google Calendar integration.
 *
 * Centralizes hardcoded calendar IDs and their source-tag classification so the
 * source-tagging logic in routes.ts (Developer "All Calendars" view) can use a
 * deterministic Map lookup instead of fragile name-substring matching.
 *
 * Confirmed by Johnny Mac 2026-04-29: Call Duty is a separate Google Calendar
 * from Spyglass Company Events. Both registered for ID-based source-tagging.
 * CALL_DUTY_CALENDAR_ID export from googleCalendarClient.ts preserved for
 * CRUD function consumers (do not relocate it here).
 */

export type CalendarSourceTag = 'google_company' | 'google_fub' | 'google_personal';

export interface SharedCalendarEntry {
  id: string;
  name: string;
  sourceTag: CalendarSourceTag;
}

export const SHARED_CALENDARS: readonly SharedCalendarEntry[] = [
  {
    id: 'c_0eb1d92fe687aa77a4d881712dc21f4a4429c55594c3abb56ce2f768f3651b8f@group.calendar.google.com',
    name: 'Spyglass Company Events',
    sourceTag: 'google_company',
  },
  {
    id: 'c_efca76ba29cbe0b028fc4951141ce67d9abefc25ab5e1ab0c1cf92d8ca9a402e@group.calendar.google.com',
    name: 'Call Duty',
    sourceTag: 'google_company',
  },
] as const;

/**
 * O(1) lookup map keyed by calendar ID. Built once at module load.
 * Consumers: source-tagging block in routes.ts.
 */
export const SHARED_CALENDAR_MAP: ReadonlyMap<string, SharedCalendarEntry> = new Map(
  SHARED_CALENDARS.map((entry) => [entry.id, entry])
);

/**
 * Re-exported for backward compatibility with existing routes.ts consumers
 * that reference COMPANY_CALENDAR_ID directly (RBAC branch, single-calendar
 * fetches for Admin/Agent roles).
 */
export const COMPANY_CALENDAR_ID = SHARED_CALENDARS[0].id;
