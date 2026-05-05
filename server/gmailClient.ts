/**
 * Gmail Client - Uses domain-wide delegation to impersonate users
 * 
 * Credentials loaded via shared googleCredentials.ts helper.
 */

import { google } from 'googleapis';
import { getGoogleCredentials } from './googleCredentials';

import type { GmailMessage } from '@shared/schema';

function getGmailClient(userEmail: string) {
  const credentials = getGoogleCredentials();

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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
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

// ── Sent mail + thread context helpers ────────────────────────────────────────

// Converts HTML email content to clean plain text: strips tags, then decodes
// entities. Preserves <br> and <p> boundaries as newlines so quoted-content
// detection still works on the resulting plain text.
export function htmlToPlainText(html: string): string {
  if (!html.includes('<')) return decodeHtmlEntities(html);
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n');
  const stripped = withLineBreaks.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(stripped).replace(/\n{3,}/g, '\n\n').trim();
}

// Strips Gmail signature blocks and quoted prior messages from a plain-text body.
// Exported so emailVoiceProfiler and emailSuggestionRoutes share the logic.
export function stripQuotedContent(body: string): string {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^>/.test(line)) break;
    if (/^On .{5,80}wrote:\s*$/i.test(line.trim())) break;
    if (/^-{3,}\s*(Original|Forwarded) Message\s*-{3,}/i.test(line)) break;
    if (line.trim() === '--') break;
    out.push(line);
  }
  return out.join('\n').trim();
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;   // plain text, signature and quoted content stripped
  date: string;
}

export async function fetchSentEmails(
  userEmail: string,
  limit: number = 20
): Promise<SentEmail[]> {
  const gmail = getGmailClient(userEmail);

  console.log(`[Gmail] Fetching ${limit} sent emails for ${userEmail}`);

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: limit,
    q: 'in:sent',
  });

  const messageIds = listResponse.data.messages || [];
  if (messageIds.length === 0) return [];

  const messages = await Promise.all(
    messageIds.map(async (msg) => {
      try {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });
        const headers = full.data.payload?.headers || [];
        const { text, html } = extractBody(full.data.payload);
        const rawBody = text || htmlToPlainText(html);
        return {
          id: full.data.id!,
          to: getHeader(headers, 'To'),
          subject: getHeader(headers, 'Subject') || '(No subject)',
          body: rawBody,
          date: getHeader(headers, 'Date'),
        } satisfies SentEmail;
      } catch (err) {
        console.error(`[Gmail] Error fetching sent message ${msg.id}:`, err);
        return null;
      }
    })
  );

  return messages.filter(Boolean) as SentEmail[];
}

// Returns a plain-text summary of earlier messages in a thread for injection
// into the suggestion prompt as background context.
export async function getGmailThreadContext(
  userEmail: string,
  threadId: string,
  excludeMessageId: string,
  maxMessages: number = 3
): Promise<string> {
  const gmail = getGmailClient(userEmail);

  try {
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    // Thread messages arrive oldest-first; exclude the message being replied to
    const prior = (thread.data.messages || []).filter(m => m.id !== excludeMessageId);
    const context = prior.slice(-maxMessages);

    if (context.length === 0) return '';

    return context
      .map(m => {
        const headers = m.payload?.headers || [];
        const from = getHeader(headers, 'From');
        const date = getHeader(headers, 'Date');
        const { text, html } = extractBody(m.payload);
        const body = stripQuotedContent(text || htmlToPlainText(html));
        return `--- From: ${from} | Date: ${date} ---\n${body.substring(0, 400)}`;
      })
      .join('\n\n');
  } catch (err) {
    console.error(`[Gmail] Error fetching thread context for ${threadId}:`, err);
    return '';
  }
}