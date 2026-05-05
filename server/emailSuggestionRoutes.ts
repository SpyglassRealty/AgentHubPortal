import type { Express } from 'express';
import OpenAI from 'openai';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import {
  getGmailMessage,
  getGmailThreadContext,
  htmlToPlainText,
  stripQuotedContent,
} from './gmailClient';
import { getOrExtractVoiceProfile, type VoiceProfile } from './emailVoiceProfiler';

export interface Suggestion {
  index: 0 | 1 | 2;
  label: 'Quick update' | 'Full response' | 'Ask a question';
  body: string;
}

function buildOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }
      : {}),
  });
}

function buildSystemPrompt(voiceProfile: VoiceProfile | null): string {
  const voiceSection = voiceProfile
    ? `The agent's personal writing voice is described in a profile below. Write as if you ARE the agent — match their tone, rhythm, and typical phrasing.

VOICE PROFILE:
${JSON.stringify(voiceProfile, null, 2)}

WRITING EXAMPLES (actual sentences from this agent's emails):
${voiceProfile.representative_sentences.map(s => `"${s}"`).join('\n')}

`
    : `Write professional, concise email replies appropriate for a real estate agent.

`;

  return `You are a writing assistant for a real estate agent. Your job is to draft three distinct reply options for an email they need to respond to.

${voiceSection}RULES:
1. Each reply must use the agent's salutation style and closing style if they have one. Match their typical email length.
2. The three replies must represent genuinely different strategies, not three versions of the same message.
3. Each reply must be complete and sendable as-is. No placeholders like [NAME] or [DATE] unless that information is truly unknown from context.
4. Avoid starting replies with "I" as the first word — prefer leading with the salutation, a transitional phrase, or the subject of the response. ("I'll loop in" or "I checked with the lender" is fine mid-sentence; the issue is only with "I" as the literal first character of the reply body.)
5. Keep signatures out of the reply body — the app adds the signature separately.
6. Write in plain text. No markdown, no bullet points, no HTML.
7. The suggestions array must contain exactly three items with indices 0, 1, and 2 respectively.

Return ONLY a JSON object:
{
  "suggestions": [
    { "index": 0, "label": "Quick update", "body": "..." },
    { "index": 1, "label": "Full response", "body": "..." },
    { "index": 2, "label": "Ask a question", "body": "..." }
  ]
}

Strategy definitions:
- index 0 / "Quick update": Acknowledge receipt, give a brief status or confirmation, set a clear next step. 2-3 sentences max. Use this when the agent wants to respond immediately without committing to a full answer.
- index 1 / "Full response": Answer the email substantively with all information the agent could reasonably provide from context. Length appropriate to the complexity of what's being asked.
- index 2 / "Ask a question": Ask one focused clarifying question before committing to a full answer. Useful when the request is ambiguous or when the agent needs more information to respond properly. 2-3 sentences max.`;
}

async function getDbUser(req: any) {
  const sessionUserId = req.user?.claims?.sub;
  const email = req.user?.claims?.email;
  let user = await storage.getUser(sessionUserId);
  if (!user && email) user = await storage.getUserByEmail(email);
  return user;
}

export function registerEmailSuggestionRoutes(app: Express) {

  // POST /api/gmail/suggest-replies/:messageId
  // Returns 3 AI-generated reply suggestions in the authenticated user's voice.
  app.post('/api/gmail/suggest-replies/:messageId', isAuthenticated, async (req: any, res) => {
    const { messageId } = req.params;

    try {
      const user = await getDbUser(req);
      if (!user?.email) {
        return res.status(404).json({ message: 'User or email not found' });
      }

      // 1. Load (or extract) voice profile. Non-fatal: suggestions still work
      //    without voice matching, using a generic professional style instead.
      let voiceProfile: VoiceProfile | null = null;
      try {
        voiceProfile = await getOrExtractVoiceProfile(user.email, user.id);
      } catch (profileErr) {
        console.warn('[SuggestionRoutes] Voice profile unavailable — proceeding without voice matching:', profileErr);
      }

      // 2. Fetch the email being replied to
      const message = await getGmailMessage(user.email, messageId);

      // 3. Convert body to plain text (handles both HTML and plain-text emails),
      //    then strip quoted prior messages. Cap at 3000 chars.
      const rawBody = message.body || message.snippet || '';
      const plainBody = rawBody.includes('<') ? htmlToPlainText(rawBody) : rawBody;
      const cleanedBody = stripQuotedContent(plainBody).substring(0, 3000);

      // 4. Fetch thread context for background — non-fatal if unavailable
      let threadContext = '';
      if (message.threadId && message.threadId !== messageId) {
        try {
          const rawContext = await getGmailThreadContext(user.email, message.threadId, messageId);
          threadContext = rawContext.substring(0, 1000);
        } catch (threadErr) {
          console.warn('[SuggestionRoutes] Thread context unavailable:', threadErr);
        }
      }

      // 5. Build and run suggestion prompt
      const openai = buildOpenAIClient();
      const userPrompt = `I need to reply to this email. Draft three replies in my voice.

FROM: ${message.from}
SUBJECT: ${message.subject}
DATE: ${message.date}

EMAIL CONTENT:
${cleanedBody}${threadContext ? `\n\nEARLIER THREAD CONTEXT (most recent first, for background only):\n${threadContext}` : ''}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildSystemPrompt(voiceProfile) },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 1200,
      });

      const raw = completion.choices[0].message.content || '{}';
      let parsed: { suggestions: Suggestion[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('[SuggestionRoutes] JSON parse failed. Raw:', raw.substring(0, 300));
        return res.status(500).json({ message: 'Failed to parse suggestion response' });
      }

      if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length !== 3) {
        console.error('[SuggestionRoutes] Unexpected response shape:', raw.substring(0, 300));
        return res.status(500).json({ message: 'Unexpected suggestion format from AI' });
      }

      res.json({
        suggestions: parsed.suggestions,
        voiceMatched: voiceProfile !== null,
      });

    } catch (err: any) {
      console.error('[SuggestionRoutes] Error generating suggestions:', err);

      if (err.message?.includes('Not Authorized') || err.code === 403) {
        return res.status(403).json({ message: 'Gmail access not authorized for this account' });
      }
      if (err.message?.includes('credentials')) {
        return res.status(503).json({ message: 'Gmail service not configured' });
      }

      res.status(500).json({ message: 'Failed to generate reply suggestions' });
    }
  });
}
