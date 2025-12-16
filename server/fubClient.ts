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

export interface FubPerson {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  created: string;
  lastActivity?: string;
  assignedUserId?: number;
  customFields?: Record<string, any>;
  homePurchaseAnniversary?: string;
}

export interface FubTask {
  id: number;
  name: string;
  dueDate: string;
  completed: boolean;
  personId?: number;
  personName?: string;
  assignedUserId?: number;
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

  async getPeople(userId?: number): Promise<FubPerson[]> {
    try {
      const params: Record<string, string> = { limit: "200" };
      if (userId) params.assignedUserId = userId.toString();

      const data = await this.request<{ people: any[] }>("/people", params);
      
      return (data.people || []).map((person: any) => ({
        id: person.id,
        name: person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown',
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.emails?.[0]?.value || person.email,
        phone: person.phones?.[0]?.value || person.phone,
        stage: person.stage,
        source: person.source,
        created: person.created,
        lastActivity: person.lastActivity,
        assignedUserId: person.assignedUserId,
        customFields: person.customFields || {},
        homePurchaseAnniversary: person.customFields?.['Home Purchase Anniversary'] || 
                                  person.customFields?.['homePurchaseAnniversary'] ||
                                  person.customFields?.['Closing Date'] ||
                                  person.customFields?.['closingDate'],
      }));
    } catch (error) {
      console.error("Error fetching FUB people:", error);
      return [];
    }
  }

  async getAnniversaryLeads(userId: number): Promise<FubPerson[]> {
    const people = await this.getPeople(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return people.filter(person => {
      if (!person.homePurchaseAnniversary) return false;
      const parsed = this.parseAnniversaryDate(person.homePurchaseAnniversary);
      if (!parsed) return false;
      
      const daysUntilAnniversary = this.getDaysUntilAnniversary(parsed.month, parsed.day, today);
      return daysUntilAnniversary >= -7 && daysUntilAnniversary <= 30;
    }).sort((a, b) => {
      const parsedA = this.parseAnniversaryDate(a.homePurchaseAnniversary!);
      const parsedB = this.parseAnniversaryDate(b.homePurchaseAnniversary!);
      if (!parsedA || !parsedB) return 0;
      return this.getDaysUntilAnniversary(parsedA.month, parsedA.day, today) - 
             this.getDaysUntilAnniversary(parsedB.month, parsedB.day, today);
    });
  }

  private parseAnniversaryDate(dateStr: string): { month: number; day: number; year?: number } | null {
    if (!dateStr) return null;
    
    const mmddPattern = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
    const mmddMatch = dateStr.match(mmddPattern);
    if (mmddMatch) {
      const month = parseInt(mmddMatch[1], 10) - 1;
      const day = parseInt(mmddMatch[2], 10);
      const year = mmddMatch[3] ? parseInt(mmddMatch[3], 10) : undefined;
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        return { month, day, year };
      }
    }
    
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})/;
    const isoMatch = dateStr.match(isoPattern);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        return { month, day, year };
      }
    }
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return { month: date.getMonth(), day: date.getDate(), year: date.getFullYear() };
      }
    } catch {
      return null;
    }
    
    return null;
  }

  private getDaysUntilAnniversary(month: number, day: number, today: Date): number {
    const thisYearAnniversary = new Date(today.getFullYear(), month, day);
    const nextYearAnniversary = new Date(today.getFullYear() + 1, month, day);
    
    const diffThis = Math.floor((thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const diffNext = Math.floor((nextYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.abs(diffThis) < Math.abs(diffNext) ? diffThis : diffNext;
  }

  async getRecentActivityLeads(userId: number): Promise<FubPerson[]> {
    const people = await this.getPeople(userId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    return people.filter(person => {
      if (!person.created || !person.lastActivity) return false;
      
      const createdDate = new Date(person.created);
      const lastActivityDate = new Date(person.lastActivity);
      
      if (isNaN(createdDate.getTime()) || isNaN(lastActivityDate.getTime())) return false;
      
      const createdMoreThan30DaysAgo = createdDate <= thirtyDaysAgo;
      const hadRecentActivity = lastActivityDate >= threeDaysAgo;
      
      return createdMoreThan30DaysAgo && hadRecentActivity;
    }).sort((a, b) => {
      const dateA = new Date(a.lastActivity!);
      const dateB = new Date(b.lastActivity!);
      return dateB.getTime() - dateA.getTime();
    });
  }

  async getDueTasks(userId: number): Promise<FubTask[]> {
    try {
      const params: Record<string, string> = {
        assignedTo: userId.toString(),
        status: 'incomplete'
      };

      const data = await this.request<{ tasks: any[] }>("/tasks", params);
      
      const now = new Date();
      return (data.tasks || [])
        .filter((task: any) => !task.completed && task.dueDate)
        .map((task: any) => ({
          id: task.id,
          name: task.name || task.subject || "Untitled Task",
          dueDate: task.dueDate,
          completed: task.completed || false,
          personId: task.personId,
          personName: task.personName,
          assignedUserId: task.assignedUserId,
        }))
        .sort((a: FubTask, b: FubTask) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } catch (error) {
      console.error("Error fetching FUB tasks:", error);
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
