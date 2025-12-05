import type { FubEvent, FubDeal } from "@shared/schema";

const FUB_BASE_URL = "https://api.followupboss.com/v1";

interface FubApiOptions {
  apiKey: string;
  systemName?: string;
  systemKey?: string;
}

export interface FubAgent {
  id: number;
  name: string;
  email: string;
}

class FubClient {
  private apiKey: string;
  private systemName: string;
  private systemKey: string;

  constructor(options: FubApiOptions) {
    this.apiKey = options.apiKey;
    this.systemName = options.systemName || "MissionControl";
    this.systemKey = options.systemKey || "";
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${FUB_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
    };

    if (this.systemName) {
      headers["X-System"] = this.systemName;
    }
    if (this.systemKey) {
      headers["X-System-Key"] = this.systemKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FUB API error ${response.status}: ${text}`);
    }

    return response.json();
  }

  async getUserByEmail(email: string): Promise<{ id: number; name: string } | null> {
    try {
      const data = await this.request<{ users: any[] }>("/users", { email });
      if (data.users && data.users.length > 0) {
        return {
          id: data.users[0].id,
          name: data.users[0].name || `${data.users[0].firstName} ${data.users[0].lastName}`,
        };
      }
      return null;
    } catch (error) {
      console.error("Error finding FUB user:", error);
      return null;
    }
  }

  async getEvents(userId?: number, startDate?: string, endDate?: string): Promise<FubEvent[]> {
    try {
      const params: Record<string, string> = {};
      if (userId) params.userId = userId.toString();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await this.request<{ events: any[] }>("/events", params);
      
      return (data.events || []).map((event: any) => ({
        id: event.id,
        title: event.title || event.name || "Untitled Event",
        description: event.description || event.message,
        startDate: event.startDate || event.created,
        endDate: event.endDate,
        allDay: event.allDay || false,
        type: this.mapEventType(event.type),
        personId: event.personId,
        personName: event.personName,
        dealId: event.dealId,
      }));
    } catch (error) {
      console.error("Error fetching FUB events:", error);
      return [];
    }
  }

  async getTasks(userId?: number, startDate?: string, endDate?: string): Promise<FubEvent[]> {
    try {
      const params: Record<string, string> = {};
      if (userId) params.assignedTo = userId.toString();

      const data = await this.request<{ tasks: any[] }>("/tasks", params);
      
      let tasks = (data.tasks || []).map((task: any) => ({
        id: task.id,
        title: task.name || task.subject || "Untitled Task",
        description: task.description || task.body,
        startDate: task.dueDate || task.created,
        allDay: true,
        type: 'task' as const,
        personId: task.personId,
        personName: task.personName,
      }));

      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        tasks = tasks.filter(task => {
          const taskDate = new Date(task.startDate);
          if (start && taskDate < start) return false;
          if (end && taskDate > end) return false;
          return true;
        });
      }

      return tasks;
    } catch (error) {
      console.error("Error fetching FUB tasks:", error);
      return [];
    }
  }

  async getDeals(userId?: number): Promise<FubDeal[]> {
    try {
      const params: Record<string, string> = { limit: "100" };
      if (userId) params.assignedUserId = userId.toString();

      console.log(`[FUB] getDeals called with userId: ${userId}, params:`, params);

      const data = await this.request<{ deals: any[] }>("/deals", params);
      
      console.log(`[FUB] getDeals returned ${data.deals?.length || 0} deals`);
      
      return (data.deals || []).map((deal: any) => ({
        id: deal.id,
        name: deal.name || "Untitled Deal",
        stage: deal.stage || deal.stageId?.toString() || "Unknown",
        price: deal.price || deal.amount,
        closeDate: deal.closeDate || deal.estimatedCloseDate,
        createdAt: deal.created || deal.createdAt,
        agentId: deal.assignedUserId || deal.agentId,
        agentName: deal.assignedUserName,
        status: this.mapDealStatus(deal.stage, deal.stageCategory),
        propertyAddress: deal.propertyAddress || this.formatAddress(deal),
        clientName: deal.clientName || deal.contactName,
      }));
    } catch (error) {
      console.error("Error fetching FUB deals:", error);
      return [];
    }
  }

  async getAllAgents(): Promise<FubAgent[]> {
    try {
      const allAgents: FubAgent[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await this.request<{ users: any[]; _metadata?: { total: number } }>("/users", { 
          limit: "100",
          offset: ((page - 1) * 100).toString()
        });
        
        console.log(`[FUB] Fetched ${data.users?.length || 0} users on page ${page}`);
        
        const users = data.users || [];
        for (const user of users) {
          if (!user.isDeleted && user.isActive !== false) {
            allAgents.push({
              id: user.id,
              name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
              email: user.email,
            });
          }
        }

        hasMore = users.length === 100;
        page++;
        
        if (page > 10) break;
      }

      console.log(`[FUB] Total agents found: ${allAgents.length}`);
      return allAgents.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error fetching FUB agents:", error);
      return [];
    }
  }

  private mapEventType(type: string): FubEvent['type'] {
    const typeMap: Record<string, FubEvent['type']> = {
      'appointment': 'appointment',
      'showing': 'appointment',
      'meeting': 'appointment',
      'task': 'task',
      'closing': 'deal_closing',
      'deal_closing': 'deal_closing',
    };
    return typeMap[type?.toLowerCase()] || 'custom';
  }

  private mapDealStatus(stage: string, category?: string): FubDeal['status'] {
    const stageLower = (stage || '').toLowerCase();
    const categoryLower = (category || '').toLowerCase();
    
    if (categoryLower === 'closed' || stageLower.includes('closed') || stageLower.includes('sold')) {
      return 'closed';
    }
    if (categoryLower === 'lost' || stageLower.includes('lost') || stageLower.includes('cancelled')) {
      return 'lost';
    }
    if (stageLower.includes('contract') || stageLower.includes('pending') || stageLower.includes('active')) {
      return 'under_contract';
    }
    return 'pending';
  }

  private formatAddress(deal: any): string | undefined {
    const parts = [
      deal.street,
      deal.city,
      deal.state,
      deal.zip
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
}

let fubClientInstance: FubClient | null = null;

export function getFubClient(): FubClient | null {
  if (!fubClientInstance) {
    const apiKey = process.env.FUB_API_KEY;
    if (!apiKey) {
      console.warn("FUB_API_KEY not configured");
      return null;
    }
    fubClientInstance = new FubClient({
      apiKey,
      systemName: process.env.FUB_SYSTEM_NAME || "MissionControl",
      systemKey: process.env.FUB_SYSTEM_KEY,
    });
  }
  return fubClientInstance;
}

export function resetFubClient(): void {
  fubClientInstance = null;
}
