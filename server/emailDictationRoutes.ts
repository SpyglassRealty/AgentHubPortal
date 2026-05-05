import type { Express } from 'express';
import OpenAI from 'openai';
import { isAuthenticated } from './replitAuth';
import { speechToText } from './replit_integrations/audio/client';
import { getOrExtractVoiceProfile, type VoiceProfile } from './emailVoiceProfiler';

function buildOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
      ? { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }
      : {}),
  });
}

function buildRewritePrompt(voiceProfile: VoiceProfile | null): string {
  const voiceSection = voiceProfile
    ? `\n\nAgent voice profile:\n${JSON.stringify(voiceProfile, null, 2)}\n\nWhen applying this profile:\n- Match the agent's typical email length. If their profile says "1-2 sentences", keep the output brief even if the dictation was longer. Do not elaborate beyond what the speaker stated.\n- Match their formality level, salutation style, and use of contractions.\n- Match their tone, sentence rhythm, and typical phrasing exactly.`
    : '';
  return `You are an email editor for a real estate agent. Transform a raw voice dictation transcript into a polished email reply body.

Rules:
1. Preserve every fact, name, date, number, and action item the speaker stated.
2. Remove filler words (um, uh, like, you know), false starts, repetitions, and self-corrections.
3. Return ONLY the polished email body. Do not add a subject line, greeting, or sign-off unless the speaker explicitly dictated them.
4. Do not infer or add any information the speaker did not state.
5. If the transcript contains no actionable content (only filler, "testing", unintelligible noise, or a single syllable), respond with exactly this JSON and nothing else: {"error":"too_vague"}${voiceSection}`;
}

export function registerEmailDictationRoutes(app: Express): void {
  // Body: { audio: string (base64 webm) }  → { body: string }
  app.post('/api/email/dictate', isAuthenticated, async (req: any, res) => {
    try {
      const { audio } = req.body as { audio?: string };
      if (!audio) return res.status(400).json({ error: 'audio (base64) is required' });

      // 1. STT — webm passes directly to OpenAI, no ffmpeg needed on Render
      const audioBuffer = Buffer.from(audio, 'base64');
      const transcript = await speechToText(audioBuffer, 'webm');
      if (!transcript?.trim()) return res.status(422).json({ error: 'too_vague' });

      // 2. Voice profile (non-fatal)
      let voiceProfile: VoiceProfile | null = null;
      if (req.user?.email && req.user?.id) {
        try { voiceProfile = await getOrExtractVoiceProfile(req.user.email, req.user.id); } catch { /* ignore */ }
      }

      // 3. Rewrite in agent voice
      const openai = buildOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          { role: 'system', content: buildRewritePrompt(voiceProfile) },
          { role: 'user', content: `Transcript:\n${transcript}` },
        ],
      });

      const rawOutput = completion.choices[0]?.message?.content?.trim() ?? '';

      // Check for too_vague sentinel from model
      try {
        const parsed = JSON.parse(rawOutput);
        if (parsed?.error === 'too_vague') return res.status(422).json({ error: 'too_vague' });
      } catch { /* not JSON — normal body text */ }

      if (!rawOutput) return res.status(422).json({ error: 'too_vague' });

      return res.json({ body: rawOutput });
    } catch (err: any) {
      console.error('[emailDictation] error:', err);
      return res.status(500).json({ error: 'Dictation failed' });
    }
  });
}
