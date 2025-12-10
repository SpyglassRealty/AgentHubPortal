const REZEN_API_KEY = process.env.REZEN_API_KEY;
const REZEN_BASE_URL = "https://arrakis.therealbrokerage.com/api/v1";

export interface RezenTransaction {
  id: string;
  address?: string;
  price?: number;
  closeDate?: string;
  status?: string;
  commission?: number;
  [key: string]: any;
}

export class RezenClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${REZEN_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ReZen API error ${response.status}: ${text}`);
    }

    return response.json();
  }

  async getClosedTransactions(yentaId: string, dateFrom?: string, dateTo?: string): Promise<RezenTransaction[]> {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    const result = await this.request<any>(`/reports/${yentaId}/transactions/closed`, params);
    return Array.isArray(result) ? result : result.transactions || result.data || [];
  }
}

let rezenClient: RezenClient | null = null;

export function getRezenClient(): RezenClient | null {
  if (!REZEN_API_KEY) {
    return null;
  }
  if (!rezenClient) {
    rezenClient = new RezenClient(REZEN_API_KEY);
  }
  return rezenClient;
}
