/**
 * Shared Google Service Account Credentials
 * 
 * Used by googleCalendarClient.ts and gmailClient.ts.
 * Loads credentials from environment variable or file:
 *   - GOOGLE_CALENDAR_CREDENTIALS = full JSON string of the service account key
 *   - GOOGLE_CALENDAR_CREDENTIALS_FILE = path to JSON file on disk
 *   - Fallback: ~/clawd/.credentials/google-calendar.json
 */

import fs from 'fs';
import path from 'path';

export interface ServiceAccountCredentials {
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

export function getGoogleCredentials(): ServiceAccountCredentials {
  if (cachedCredentials) return cachedCredentials;

  // Try env var with JSON string first
  const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (credentialsJson) {
    try {
      cachedCredentials = JSON.parse(credentialsJson);
      console.log('[Google Auth] Loaded credentials from GOOGLE_CALENDAR_CREDENTIALS env var');
      return cachedCredentials!;
    } catch (e) {
      console.error('[Google Auth] Failed to parse GOOGLE_CALENDAR_CREDENTIALS:', e);
    }
  }

  // Fall back to file path
  const credentialsFile = process.env.GOOGLE_CALENDAR_CREDENTIALS_FILE
    || path.resolve(process.env.HOME || '', 'clawd/.credentials/google-calendar.json');

  if (fs.existsSync(credentialsFile)) {
    const raw = fs.readFileSync(credentialsFile, 'utf-8');
    cachedCredentials = JSON.parse(raw);
    console.log(`[Google Auth] Loaded credentials from file: ${credentialsFile}`);
    return cachedCredentials!;
  }

  throw new Error('Google credentials not found. Set GOOGLE_CALENDAR_CREDENTIALS or GOOGLE_CALENDAR_CREDENTIALS_FILE.');
}
