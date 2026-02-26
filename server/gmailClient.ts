/**
 * Gmail Client - Uses domain-wide delegation to impersonate users
 * 
 * Uses the same service account credentials as Google Calendar.
 * For deployment, set one of these environment variables:
 *   - GOOGLE_CALENDAR_CREDENTIALS = the full JSON string of the service account key
 *   - GOOGLE_CALENDAR_CREDENTIALS_FILE = path to the JSON file on disk
 * 
 * The service account must have domain-wide delegation enabled in Google Admin
 * with scopes: https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.send
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

import type { GmailMessage } from '@shared/schema';

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
      console.log('[Gmail] Loaded credentials from GOOGLE_CALENDAR_CREDENTIALS env var');
      return cachedCredentials!;
    } catch (e) {
      console.error('[Gmail] Failed to parse GOOGLE_CALENDAR_CREDENTIALS:', e);
    }
  }

  // Fall back to file path
  const credentialsFile = process.env.GOOGLE_CALENDAR_CREDENTIALS_FILE
    || path.resolve(process.env.HOME || '', 'clawd/.credentials/google-calendar.json');

  if (fs.existsSync(credentialsFile)) {
    const raw = fs.readFileSync(credentialsFile, 'utf-8');
    cachedCredentials = JSON.parse(raw);
    console.log(`[Gmail] Loaded credentials from file: ${credentialsFile}`);
    return cachedCredentials!;
  }

  throw new Error('Gmail credentials not found. Set GOOGLE_CALENDAR_CREDENTIALS or GOOGLE_CALENDAR_CREDENTIALS_FILE.');
}

function getGmailClient(userEmail: string) {
  const credentials = getCredentials();

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    subject: userEmail, // Impersonate the user via domain-wide delegation
  });

  return google.gmail({ version: 'v1', auth });
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractBody(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  // Simple message with body data directly
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  // Multipart message
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data && !text) {
        text = decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
        html = decodeBase64Url(part.body.data);
      } else if (part.mimeType?.startsWith('multipart/') && part.parts) {
        // Nested multipart (e.g., multipart/alternative inside multipart/mixed)
        const nested = extractBody(part);
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
      }
    }
  }

  return { text, html };
}

function parseMessageToGmailMessage(message: any): GmailMessage {
  const headers = message.payload?.headers || [];
  const labelIds = message.labelIds || [];

  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const cc = getHeader(headers, 'Cc');
  const bcc = getHeader(headers, 'Bcc');
  const subject = getHeader(headers, 'Subject');
  const date = getHeader(headers, 'Date');
  const messageIdHeader = getHeader(headers, 'Message-ID') || getHeader(headers, 'Message-Id');
  const references = getHeader(headers, 'References');

  const isRead = !labelIds.includes('UNREAD');

  const { text, html } = extractBody(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject: subject || '(No subject)',
    snippet: message.snippet || '',
    date,
    isRead,
    labels: labelIds,
    body: html || text || undefined,
    messageIdHeader: messageIdHeader || undefined,
    references: references || undefined,
  };
}

export interface GmailInboxResult {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface CategoryUnreadCounts {
  primary: number;
  promotions: number;
  social: number;
  forums: number;
}

export async function getGmailInbox(
  userEmail: string,
  maxResults: number = 20,
  pageToken?: string,
  query?: string
): Promise<GmailInboxResult> {
  const gmail = getGmailClient(userEmail);

  console.log(`[Gmail] Fetching inbox for ${userEmail} (maxResults: ${maxResults}, query: ${query || 'none'})`);

  // Build query based on category and search
  let q = 'in:inbox';
  let isUsingCategories = false;
  
  if (query) {
    // Handle category-specific queries
    if (query.startsWith('category:')) {
      const category = query.replace('category:', '');
      isUsingCategories = true;
      switch (category) {
        case 'primary':
          // Try primary category approach first, fallback to all inbox if no results
          q = 'in:inbox -category:promotions -category:social -category:forums';
          break;
        case 'promotions':
          q = 'in:inbox category:promotions';
          break;
        case 'social':
          q = 'in:inbox category:social';
          break;
        case 'forums':
          q = 'in:inbox category:forums';
          break;
        default:
          q = `in:inbox ${query}`;
          isUsingCategories = false;
      }
    } else {
      q = `in:inbox ${query}`;
    }
  }

  console.log(`[Gmail] Using query: "${q}"`);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken: pageToken || undefined,
    q,
  });

  let messageIds = listResponse.data.messages || [];
  
  // Fallback for Primary category: if no results and we were filtering categories, try just inbox
  if (messageIds.length === 0 && query === 'category:primary' && isUsingCategories) {
    console.log(`[Gmail] No results for primary category filter, falling back to basic inbox`);
    const fallbackResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      pageToken: pageToken || undefined,
      q: 'in:inbox',
    });
    messageIds = fallbackResponse.data.messages || [];
  }
  
  console.log(`[Gmail] Found ${messageIds.length} message IDs for ${userEmail}`);
  
  if (messageIds.length === 0) {
    return {
      messages: [],
      nextPageToken: listResponse.data.nextPageToken || undefined,
      resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
    };
  }

  // Fetch each message with metadata + snippet (format: metadata gives headers + snippet)
  // Use 'metadata' format for list view (fast), 'full' format when we need body
  const messages = await Promise.all(
    messageIds.map(async (msg) => {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
        });
        return parseMessageToGmailMessage(fullMessage.data);
      } catch (err) {
        console.error(`[Gmail] Error fetching message ${msg.id}:`, err);
        return null;
      }
    })
  );

  const validMessages = messages.filter(Boolean) as GmailMessage[];
  console.log(`[Gmail] Returning ${validMessages.length} messages for ${userEmail}`);

  return {
    messages: validMessages,
    nextPageToken: listResponse.data.nextPageToken || undefined,
    resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
  };
}

export async function getGmailMessage(
  userEmail: string,
  messageId: string
): Promise<GmailMessage> {
  const gmail = getGmailClient(userEmail);

  console.log(`[Gmail] Fetching message ${messageId} for ${userEmail}`);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return parseMessageToGmailMessage(response.data);
}

export async function getGmailCategoryUnreadCounts(
  userEmail: string
): Promise<CategoryUnreadCounts> {
  const gmail = getGmailClient(userEmail);

  console.log(`[Gmail] Fetching category unread counts for ${userEmail}`);

  // Fetch unread counts for each category in parallel
  const [primaryCount, promotionsCount, socialCount, forumsCount] = await Promise.all([
    // Primary: try category filtering, fallback to total inbox unread count
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'in:inbox is:unread -category:promotions -category:social -category:forums',
    }).then(async (res) => {
      const categoryCount = res.data.resultSizeEstimate || 0;
      // If no results with category filtering, try just unread inbox
      if (categoryCount === 0) {
        try {
          const fallbackRes = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 1,
            q: 'in:inbox is:unread',
          });
          return fallbackRes.data.resultSizeEstimate || 0;
        } catch (e) {
          console.warn(`[Gmail] Fallback unread count failed for ${userEmail}:`, e);
          return 0;
        }
      }
      return categoryCount;
    }).catch((e) => {
      console.warn(`[Gmail] Primary unread count failed for ${userEmail}:`, e);
      return 0;
    }),
    
    // Promotions
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'in:inbox is:unread category:promotions',
    }).then(res => res.data.resultSizeEstimate || 0).catch(() => 0),
    
    // Social
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'in:inbox is:unread category:social',
    }).then(res => res.data.resultSizeEstimate || 0).catch(() => 0),
    
    // Forums
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'in:inbox is:unread category:forums',
    }).then(res => res.data.resultSizeEstimate || 0).catch(() => 0),
  ]);

  return {
    primary: primaryCount,
    promotions: promotionsCount,
    social: socialCount,
    forums: forumsCount,
  };
}

export interface SendEmailOptions {
  userEmail: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

export async function sendGmailMessage(options: SendEmailOptions): Promise<string> {
  const { userEmail, to, cc, bcc, subject, htmlBody, inReplyTo, references, threadId } = options;
  const gmail = getGmailClient(userEmail);

  console.log(`[Gmail] Sending message from ${userEmail} to ${to}`);

  // Construct RFC 2822 MIME message
  const messageParts = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    bcc ? `Bcc: ${bcc}` : '',
    `Subject: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    references ? `References: ${references}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody
  ].filter(Boolean);

  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const requestBody: any = {
    raw: encodedMessage
  };

  if (threadId) {
    requestBody.threadId = threadId;
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody
  });

  console.log(`[Gmail] Message sent successfully, ID: ${response.data.id}`);
  return response.data.id!;
}