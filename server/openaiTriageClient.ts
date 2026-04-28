import OpenAI from 'openai';

export interface TriageScore {
  score: number;
  category: string;
  reason: string;
}

export interface EmailTriageContext {
  fromEmail: string;
  fromName: string;
  subject: string;
  snippet: string;
  contactEmails: string[];
  dealAddresses: string[];
}

const FALLBACK_SCORE: TriageScore = {
  score: 50,
  category: 'other',
  reason: 'Unable to score',
};

const SYSTEM_PROMPT = `You are an email triage assistant for real estate agents.
Score this email 0-100 on whether it needs a personal reply from the agent.
High (70-100): client questions, transaction details, deadlines, replies in active threads, known contacts with questions.
Medium (40-69): follow-ups that can wait, ambiguous sender intent.
Low (0-39): automations, marketing, notifications, newsletters, no-reply senders.
Return JSON only: {"score": number, "category": string, "reason": string}
Categories: "client_question", "transaction", "deadline", "follow_up", "marketing", "notification", "other"
Reason must be 90 characters or fewer.`;

function buildOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }
      : {}),
  });
}

export async function scoreEmailForTriage(ctx: EmailTriageContext): Promise<TriageScore> {
  const openai = buildOpenAIClient();

  const isKnownContact = ctx.contactEmails.includes(ctx.fromEmail.toLowerCase());
  const dealMatch = ctx.dealAddresses.find(
    (addr) =>
      ctx.subject.toLowerCase().includes(addr.toLowerCase()) ||
      ctx.snippet.toLowerCase().includes(addr.toLowerCase())
  );

  const lines: string[] = [
    `From: ${ctx.fromName} <${ctx.fromEmail}>`,
    `Subject: ${ctx.subject}`,
    `Body preview: ${ctx.snippet.substring(0, 500)}`,
  ];
  if (ctx.contactEmails.length > 0) {
    lines.push(`Known FUB contact: ${isKnownContact ? 'YES' : 'NO'}`);
  }
  if (dealMatch) {
    lines.push(`Active deal address match: YES (${dealMatch})`);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 150,
    });

    const raw = completion.choices[0].message.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[TriageClient] JSON parse failed, using fallback. Raw:', raw);
      return FALLBACK_SCORE;
    }

    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.category !== 'string' ||
      typeof parsed.reason !== 'string'
    ) {
      console.warn('[TriageClient] Invalid response shape, using fallback. Parsed:', parsed);
      return FALLBACK_SCORE;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      category: String(parsed.category).substring(0, 50),
      reason: String(parsed.reason).substring(0, 90),
    };
  } catch (err) {
    console.error('[TriageClient] OpenAI call failed:', err);
    return FALLBACK_SCORE;
  }
}
