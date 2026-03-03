/**
 * Google Calendar Client - Uses domain-wide delegation to impersonate users
 * 
 * Supports read (calendar.readonly) and write (calendar.events) operations.
 * Credentials loaded via shared googleCredentials.ts helper.
 */

import { google } from 'googleapis';
import { getGoogleCredentials } from './googleCredentials';

import type { GoogleCalendarEvent } from '@shared/schema';

// ── Constants ────────────────────────────────────────────────────────────

/** Shared "Call Duty" calendar — all shift events go here */
const CALL_DUTY_CALENDAR_ID = 'c_efca76ba29cbe0b028fc4951141ce67d9abefc25ab5e1ab0c1cf92d8ca9a402e@group.calendar.google.com';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Default impersonation account for Calendar write operations.
 * The shared Call Duty calendar requires domain-wide delegation with a
 * domain user context — the service account alone returns 404.
 */
const CALENDAR_IMPERSONATE_USER = 'ryan@spyglassrealty.com';

/**
 * Get an authenticated Calendar API client with write scope.
 * Impersonates a domain user via domain-wide delegation to access the shared calendar.
 */
function getCalendarWriteClient() {
  const credentials = getGoogleCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    subject: CALENDAR_IMPERSONATE_USER,
  });
  return google.calendar({ version: 'v3', auth });
}

// Color mapping for Google Calendar event colors
const GOOGLE_CALENDAR_COLORS: Record<string, { name: string; bg: string; text: string }> = {
  '1': { name: 'Lavender', bg: '#7986cb', text: 'white' },
  '2': { name: 'Sage', bg: '#33b679', text: 'white' },
  '3': { name: 'Grape', bg: '#8e24aa', text: 'white' },
  '4': { name: 'Flamingo', bg: '#e67c73', text: 'white' },
  '5': { name: 'Banana', bg: '#f6bf26', text: 'black' },
  '6': { name: 'Tangerine', bg: '#f4511e', text: 'white' },
  '7': { name: 'Peacock', bg: '#039be5', text: 'white' },
  '8': { name: 'Graphite', bg: '#616161', text: 'white' },
  '9': { name: 'Blueberry', bg: '#3f51b5', text: 'white' },
  '10': { name: 'Basil', bg: '#0b8043', text: 'white' },
  '11': { name: 'Tomato', bg: '#d50000', text: 'white' },
};

function inferEventType(event: any): GoogleCalendarEvent['type'] {
  const summary = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  
  if (summary.includes('closing') || description.includes('closing')) return 'closing';
  if (summary.includes('showing') || description.includes('showing')) return 'showing';
  if (summary.includes('open house') || description.includes('open house')) return 'open_house';
  if (summary.includes('listing') || description.includes('listing appointment')) return 'listing';
  if (summary.includes('inspection') || description.includes('inspection')) return 'inspection';
  if (summary.includes('meeting') || description.includes('meeting')) return 'meeting';
  
  return 'event';
}

export async function getGoogleCalendarEvents(
  userEmail: string,
  startDate: string,
  endDate: string
): Promise<GoogleCalendarEvent[]> {
  const credentials = getGoogleCredentials();

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    subject: userEmail, // Impersonate the user via domain-wide delegation
  });

  const calendar = google.calendar({ version: 'v3', auth });

  // Ensure we capture the full day range
  const timeMin = new Date(`${startDate}T00:00:00`).toISOString();
  const timeMax = new Date(`${endDate}T23:59:59`).toISOString();

  console.log(`[Google Calendar] Fetching events for ${userEmail} from ${startDate} to ${endDate}`);

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  });

  const events = response.data.items || [];
  console.log(`[Google Calendar] Found ${events.length} events for ${userEmail}`);

  return events.map((event, index) => {
    const isAllDay = !!event.start?.date;
    const startDateTime = event.start?.dateTime || event.start?.date || '';
    const endDateTime = event.end?.dateTime || event.end?.date || '';
    
    const colorInfo = event.colorId ? GOOGLE_CALENDAR_COLORS[event.colorId] : null;

    return {
      id: event.id || `gcal-${index}`,
      title: event.summary || '(No title)',
      description: event.description || undefined,
      startDate: startDateTime,
      endDate: endDateTime || undefined,
      allDay: isAllDay,
      type: inferEventType(event),
      location: event.location || undefined,
      status: (event.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
      htmlLink: event.htmlLink || undefined,
      colorId: event.colorId || undefined,
      colorHex: colorInfo?.bg || undefined,
      creator: event.creator?.email || undefined,
      organizer: event.organizer?.displayName || event.organizer?.email || undefined,
      attendees: event.attendees?.map(a => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
    };
  });
}

// ── Call Duty Calendar Write Operations ──────────────────────────────────

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Morning',
  midday: 'Midday',
  evening: 'Evening',
};

/**
 * Create a Google Calendar event for a Call Duty shift slot.
 * Returns the Calendar event ID, or null if the API call fails.
 */
export async function createCallDutyCalendarEvent(
  date: string,       // YYYY-MM-DD
  shiftType: string,  // 'morning' | 'midday' | 'evening'
  startTime: string,  // '08:00' | '12:00' | '16:00'
  endTime: string,    // '12:00' | '16:00' | '20:00'
): Promise<string | null> {
  try {
    const calendar = getCalendarWriteClient();
    const label = SHIFT_LABELS[shiftType] || shiftType;

    const response = await calendar.events.insert({
      calendarId: CALL_DUTY_CALENDAR_ID,
      requestBody: {
        summary: `Call Duty — ${label} Shift`,
        description: `Spyglass Realty Call Duty ${label} shift (${startTime}–${endTime}).\nManaged by Mission Control.`,
        start: {
          dateTime: `${date}T${startTime}:00`,
          timeZone: 'America/Chicago',
        },
        end: {
          dateTime: `${date}T${endTime}:00`,
          timeZone: 'America/Chicago',
        },
        status: 'confirmed',
      },
    });

    const eventId = response.data.id || null;
    console.log(`[Call Duty Calendar] Created event ${eventId} for ${date} ${shiftType}`);
    return eventId;
  } catch (error: any) {
    console.error(`[Call Duty Calendar] Failed to create event for ${date} ${shiftType}:`, error.message);
    return null;
  }
}

/**
 * Add an attendee (agent) to an existing Call Duty Calendar event.
 * Preserves existing attendees. Silently fails if the API call errors.
 */
export async function addCallDutyAttendee(
  eventId: string,
  agentEmail: string,
): Promise<boolean> {
  try {
    const calendar = getCalendarWriteClient();

    // Fetch current event to get existing attendees
    const existing = await calendar.events.get({
      calendarId: CALL_DUTY_CALENDAR_ID,
      eventId,
    });

    const currentAttendees = existing.data.attendees || [];

    // Skip if already an attendee
    if (currentAttendees.some(a => a.email?.toLowerCase() === agentEmail.toLowerCase())) {
      console.log(`[Call Duty Calendar] ${agentEmail} already an attendee on ${eventId}`);
      return true;
    }

    await calendar.events.patch({
      calendarId: CALL_DUTY_CALENDAR_ID,
      eventId,
      requestBody: {
        attendees: [...currentAttendees, { email: agentEmail }],
      },
      sendUpdates: 'all', // notify the agent via email
    });

    console.log(`[Call Duty Calendar] Added ${agentEmail} to event ${eventId}`);
    return true;
  } catch (error: any) {
    console.error(`[Call Duty Calendar] Failed to add ${agentEmail} to ${eventId}:`, error.message);
    return false;
  }
}

/**
 * Remove an attendee (agent) from an existing Call Duty Calendar event.
 * Silently fails if the API call errors.
 */
export async function removeCallDutyAttendee(
  eventId: string,
  agentEmail: string,
): Promise<boolean> {
  try {
    const calendar = getCalendarWriteClient();

    // Fetch current event to get existing attendees
    const existing = await calendar.events.get({
      calendarId: CALL_DUTY_CALENDAR_ID,
      eventId,
    });

    const currentAttendees = existing.data.attendees || [];
    const updatedAttendees = currentAttendees.filter(
      a => a.email?.toLowerCase() !== agentEmail.toLowerCase()
    );

    // Skip if they weren't an attendee
    if (updatedAttendees.length === currentAttendees.length) {
      console.log(`[Call Duty Calendar] ${agentEmail} was not an attendee on ${eventId}`);
      return true;
    }

    await calendar.events.patch({
      calendarId: CALL_DUTY_CALENDAR_ID,
      eventId,
      requestBody: {
        attendees: updatedAttendees,
      },
      sendUpdates: 'all', // notify the agent via email
    });

    console.log(`[Call Duty Calendar] Removed ${agentEmail} from event ${eventId}`);
    return true;
  } catch (error: any) {
    console.error(`[Call Duty Calendar] Failed to remove ${agentEmail} from ${eventId}:`, error.message);
    return false;
  }
}
