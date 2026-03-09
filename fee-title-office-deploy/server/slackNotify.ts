/**
 * Slack Notification Helper — fire-and-forget message posting.
 * 
 * Uses SLACK_BOT_TOKEN env var (Clawd bot token).
 * All errors are caught and logged — never throws.
 */

const SLACK_API_URL = 'https://slack.com/api/chat.postMessage';

function getBotToken(): string | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN not set — notifications disabled');
    return null;
  }
  return token;
}

/**
 * Send a message to a Slack channel. Fire-and-forget.
 * @param channel - Channel ID (e.g. 'C0AHLEPF2F9')
 * @param text - Fallback plain text (used in notifications/previews)
 * @param blocks - Optional Block Kit blocks for rich formatting
 */
export async function sendSlackMessage(
  channel: string,
  text: string,
  blocks?: any[],
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;

  try {
    const body: any = { channel, text };
    if (blocks) body.blocks = blocks;

    const res = await fetch(SLACK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;

    if (!data.ok) {
      console.error(`[Slack] Post failed: ${data.error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`[Slack] Post error: ${error.message}`);
    return false;
  }
}
