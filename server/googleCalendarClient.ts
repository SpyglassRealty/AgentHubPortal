/**
 * Google Calendar Client - Uses domain-wide delegation to impersonate users
 * 
 * For deployment (Vercel), set one of these environment variables:
 *   - GOOGLE_CALENDAR_CREDENTIALS = the full JSON string of the service account key
 *   - GOOGLE_CALENDAR_CREDENTIALS_FILE = path to the JSON file on disk
 * 
 * The service account must have domain-wide delegation enabled in Google Admin
 * with scope: https://www.googleapis.com/auth/calendar.readonly
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

import type { GoogleCalendarEvent } from '@shared/schema';

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let cachedCredentials: ServiceAccountCredentials | null = null;

function getCredentials(): ServiceAccountCredentials {
  if (cachedCredentials) return cachedCredentials;

  // Try env var with JSON string first
  const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (credentialsJson) {
    try {
      cachedCredentials = JSON.parse(credentialsJson);
      console.log('[Google Calendar] Loaded credentials from GOOGLE_CALENDAR_CREDENTIALS env var');
      return cachedCredentials!;
    } catch (e) {
      console.error('[Google Calendar] Failed to parse GOOGLE_CALENDAR_CREDENTIALS:', e);
    }
  }

  // Fall back to file path
  const credentialsFile = process.env.GOOGLE_CALENDAR_CREDENTIALS_FILE 
    || path.resolve(process.env.HOME || '', 'clawd/.credentials/google-calendar.json');
  
  if (fs.existsSync(credentialsFile)) {
    const raw = fs.readFileSync(credentialsFile, 'utf-8');
    cachedCredentials = JSON.parse(raw);
    console.log(`[Google Calendar] Loaded credentials from file: ${credentialsFile}`);
    return cachedCredentials!;
  }

  throw new Error('Google Calendar credentials not found. Set GOOGLE_CALENDAR_CREDENTIALS or GOOGLE_CALENDAR_CREDENTIALS_FILE.');
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
  const credentials = getCredentials();

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
