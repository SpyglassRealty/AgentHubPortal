import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { userVoiceProfiles } from '@shared/schema';
import { fetchSentEmails, stripQuotedContent } from './gmailClient';
import type { SentEmail } from './gmailClient';

export type VoiceProfile = {
  salutation_style: string | null;
  closing_style: string | null;
  signature_pattern: string | null;
  avg_sentence_length: 'short' | 'medium' | 'long';
  uses_bullet_points: boolean;
  formality_level: 1 | 2 | 3 | 4 | 5;
  typical_email_length: '1-2 sentences' | '1 paragraph' | 'multi-paragraph';
  uses_contractions: boolean;
  characteristic_phrases: string[];
  tends_to_ask_follow_up_questions: boolean;
  representative_sentences: string[];
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PROSE_EMAILS = 5;   // skip extraction if user has too few substantive sent emails
const FETCH_LIMIT = 30;       // fetch extra to survive self-email and empty-body filtering
const EXTRACTION_LIMIT = 20;  // max emails passed to OpenAI

const SYSTEM_PROMPT = `You are a writing-style analyst. Your job is to study a collection of emails written by one person and extract a precise, reusable description of how they write.

You will receive a numbered list of emails the person sent. Analyze them as a whole — look for patterns that appear consistently across multiple emails, not quirks from a single email.

Return ONLY a JSON object. No prose, no markdown, no explanation. Exactly this schema:

{
  "salutation_style": string | null,
  "closing_style": string | null,
  "signature_pattern": string | null,
  "avg_sentence_length": "short" | "medium" | "long",
  "uses_bullet_points": boolean,
  "formality_level": 1 | 2 | 3 | 4 | 5,
  "typical_email_length": "1-2 sentences" | "1 paragraph" | "multi-paragraph",
  "uses_contractions": boolean,
  "characteristic_phrases": string[],
  "tends_to_ask_follow_up_questions": boolean,
  "representative_sentences": string[]
}

Field definitions:
- salutation_style: The greeting pattern they most often use (e.g. "Hi [first name],", "Hello [Name],"). null if they rarely open with a salutation.
- closing_style: Their sign-off pattern (e.g. "Best,", "Thanks!"). null if they rarely close formally.
- signature_pattern: Describe their consistent signature in one line if visible in the email bodies. null if no signature appears.
- avg_sentence_length: "short" = typically under 12 words. "medium" = 12-20 words. "long" = typically over 20 words.
- uses_bullet_points: true if they format lists as bullet points in at least 30% of emails.
- formality_level: 1 = very casual (slang, fragments, emoji). 2 = casual-but-clear. 3 = professional-neutral. 4 = formal. 5 = very formal (legal or corporate register).
- typical_email_length: "1-2 sentences" if most emails are that brief. "1 paragraph" if most are 3-6 sentences. "multi-paragraph" if most have more than one paragraph.
- uses_contractions: true if they regularly write "I'll", "we're", "can't" rather than "I will", "we are", "cannot".
- characteristic_phrases: Up to 5 short phrases or sentence starters they use repeatedly. Empty array if none stand out.
- tends_to_ask_follow_up_questions: true if they often end emails with a direct question.
- representative_sentences: Choose 3 to 5 actual sentences from these emails that best show how this specific person sounds — their personality, rhythm, or distinct word choice.
    AVOID: sentences that describe a technical problem ("I'm getting this error when..."), instructions or requests that anyone might send ("Can you have them check that?"), purely logistical facts (tracking numbers, addresses, dates), and sentences that could have been written by any businessperson.
    PREFER: sentences that show personality or opinion, direct or casual asides, moments where the writer's judgment or attitude comes through, short emphatic statements, or anything that sounds like a specific person rather than a generic professional.`;

function buildOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }
      : {}),
  });
}

function filterAndCleanEmails(emails: SentEmail[], userEmail: string): SentEmail[] {
  return emails
    .filter(e => {
      // Drop emails sent only to self (daily summaries, self-forwards)
      const isSelfOnly = e.to.includes(userEmail) && !e.to.includes(',');
      return !isSelfOnly;
    })
    .filter(e => !e.subject.startsWith('Daily Ops Summary'))
    .map(e => ({ ...e, body: stripQuotedContent(e.body).substring(0, 800) }))
    .filter(e => e.body.trim().length >= 10)
    .slice(0, EXTRACTION_LIMIT);
}

async function callExtractionPrompt(emails: SentEmail[]): Promise<VoiceProfile | null> {
  const openai = buildOpenAIClient();

  const userPrompt = `Here are ${emails.length} emails I recently sent. Study them and return my writing voice profile.

${emails.map((e, i) => `--- Email ${i + 1} ---
To: ${e.to.substring(0, 60)}
Subject: ${e.subject.substring(0, 80)}
Date: ${e.date}

${e.body}
`).join('\n')}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = res.choices[0].message.content || '{}';
    let parsed: VoiceProfile;
    try {
      parsed = JSON.parse(raw) as VoiceProfile;
    } catch {
      console.warn('[VoiceProfiler] JSON parse failed. Raw:', raw.substring(0, 200));
      return null;
    }

    if (typeof parsed.formality_level !== 'number' || !Array.isArray(parsed.representative_sentences)) {
      console.warn('[VoiceProfiler] Unexpected response shape:', raw.substring(0, 200));
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[VoiceProfiler] OpenAI extraction failed:', err);
    return null;
  }
}

// Main export. Returns cached or freshly-extracted voice profile for a user.
// Returns null if the user has too few prose-heavy sent emails for a reliable extraction.
export async function getOrExtractVoiceProfile(
  userEmail: string,
  userId: string
): Promise<VoiceProfile | null> {
  // 1. Check cache — return early if profile is < 7 days old
  const existing = await db
    .select()
    .from(userVoiceProfiles)
    .where(eq(userVoiceProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const cached = existing[0];
    const ageMs = Date.now() - cached.lastExtractedAt.getTime();
    if (ageMs < SEVEN_DAYS_MS) {
      console.log(`[VoiceProfiler] Cached profile for ${userEmail} (age: ${Math.round(ageMs / 3600000)}h)`);
      return cached.voiceProfile as VoiceProfile;
    }
    console.log(`[VoiceProfiler] Cache stale for ${userEmail} — re-extracting`);
  }

  // 2. Fetch sent emails
  const rawEmails = await fetchSentEmails(userEmail, FETCH_LIMIT);
  const emails = filterAndCleanEmails(rawEmails, userEmail);

  // 3. Gate: skip if user doesn't have enough substantive sent emails
  const proseCount = emails.filter(e => e.body.length > 100).length;
  if (proseCount < MIN_PROSE_EMAILS) {
    console.log(`[VoiceProfiler] Only ${proseCount} prose-heavy emails for ${userEmail} — skipping extraction`);
    return null;
  }

  // 4. Run extraction prompt
  const profile = await callExtractionPrompt(emails);
  if (!profile) return null;

  // 5. Upsert — insert on first run, refresh on subsequent runs
  await db
    .insert(userVoiceProfiles)
    .values({
      userId,
      voiceProfile: profile,
      extractedFromCount: emails.length,
      lastExtractedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userVoiceProfiles.userId,
      set: {
        voiceProfile: profile,
        extractedFromCount: emails.length,
        lastExtractedAt: new Date(),
      },
    });

  console.log(`[VoiceProfiler] Extracted and cached profile for ${userEmail} (${emails.length} emails)`);
  return profile;
}
