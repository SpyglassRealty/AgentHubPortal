class ResendClient {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com';

  constructor() {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    this.apiKey = key;
  }

  private async fetchApi(path: string) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    if (!res.ok) throw new Error(`Resend API error: ${res.status}`);
    return res.json();
  }

  async getEmails(limit = 100) {
    return this.fetchApi(`/emails?limit=${limit}`);
  }

  async getStats() {
    const data = await this.getEmails(100);
    const emails = data.data || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = emails.filter((e: any) => new Date(e.created_at) >= monthStart);
    const bounced = thisMonth.filter((e: any) => ['bounced', 'complained'].includes(e.last_event)).length;
    return {
      sent: thisMonth.length,
      delivered: thisMonth.filter((e: any) => e.last_event === 'delivered').length,
      bounced,
      opened: thisMonth.filter((e: any) => ['opened', 'clicked'].includes(e.last_event)).length,
      bounceRate: thisMonth.length > 0 ? Math.round((bounced / thisMonth.length) * 100) : 0,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }
}

let resendClientInstance: ResendClient | null = null;

export function getResendClient(): ResendClient {
  if (!resendClientInstance) {
    resendClientInstance = new ResendClient();
  }
  return resendClientInstance;
}
