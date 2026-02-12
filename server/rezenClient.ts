const REZEN_BASE_URL = "https://arrakis.therealbrokerage.com/api/v1";

export interface RezenAddress {
  oneLine: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface RezenAmount {
  amount: number;
  currency?: string;
}

export interface RezenParticipant {
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  company?: string;
  participantRole: string;
  yentaUserId?: string;
  payment?: {
    amount?: number;
    percent?: number;
  };
}

export interface RezenTransaction {
  id: string;
  code?: string;
  address?: RezenAddress;
  price?: RezenAmount;
  transactionType?: "SALE" | "LEASE";
  propertyType?: string;
  closingDateEstimated?: string;
  closedAt?: number;
  firmDate?: string;
  closed?: boolean;
  terminated?: boolean;
  listing?: boolean;
  grossCommission?: RezenAmount;
  saleCommissionAmount?: RezenAmount;
  listingCommissionAmount?: RezenAmount;
  myNetPayout?: RezenAmount;
  leadSource?: { id?: string; name?: string } | null;
  lifecycleState?: {
    state: string;
  };
  complianceStatus?: string;
  participants?: RezenParticipant[];
}

export interface RezenTransactionsResponse {
  pageNumber: number;
  pageSize: number;
  hasNext: boolean;
  totalCount: number;
  transactions: RezenTransaction[];
}

export interface RezenIncomeOverview {
  totalGrossCommission?: RezenAmount;
  totalNetPayout?: RezenAmount;
  transactionCount?: number;
  [key: string]: any;
}

export type TransactionStatus = "OPEN" | "CLOSED" | "TERMINATED";

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

    console.log(`[ReZen] Request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-KEY": this.apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[ReZen] API error ${response.status}: ${text.substring(0, 500)}`);
      throw new Error(`ReZen API error ${response.status}: ${text}`);
    }

    return response.json();
  }

  async getTransactions(
    yentaId: string,
    status: TransactionStatus = "OPEN",
    options: {
      pageNumber?: number;
      pageSize?: number;
      sortBy?: string;
      sortDirection?: "ASC" | "DESC";
    } = {}
  ): Promise<RezenTransactionsResponse> {
    const {
      pageNumber = 0,
      pageSize = 50,
      sortBy = "ESCROW_CLOSING_DATE",
      sortDirection = "DESC"
    } = options;

    const params: Record<string, string> = {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortDirection
    };

    const result = await this.request<RezenTransactionsResponse>(
      `/transactions/participant/${yentaId}/transactions/${status}`,
      params
    );

    return result;
  }

  async getOpenTransactions(yentaId: string, pageSize = 50): Promise<RezenTransactionsResponse> {
    return this.getTransactions(yentaId, "OPEN", { pageSize, sortDirection: "ASC" });
  }

  async getClosedTransactions(yentaId: string, pageSize = 50): Promise<RezenTransactionsResponse> {
    return this.getTransactions(yentaId, "CLOSED", { pageSize, sortDirection: "DESC" });
  }

  async getTerminatedTransactions(yentaId: string, pageSize = 50): Promise<RezenTransactionsResponse> {
    return this.getTransactions(yentaId, "TERMINATED", { pageSize, sortDirection: "DESC" });
  }

  async getIncomeOverview(yentaId: string): Promise<RezenIncomeOverview> {
    return this.request<RezenIncomeOverview>(`/income/overview/${yentaId}/current`);
  }

  async getTransactionDetails(transactionId: string): Promise<RezenTransaction> {
    return this.request<RezenTransaction>(`/transactions/${transactionId}`);
  }
}

let rezenClient: RezenClient | null = null;
let lastRezenApiKey: string | null = null;

export function getRezenClient(): RezenClient | null {
  const apiKey = process.env.REZEN_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!rezenClient || lastRezenApiKey !== apiKey) {
    rezenClient = new RezenClient(apiKey);
    lastRezenApiKey = apiKey;
  }
  return rezenClient;
}
