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
  lastLeadActivity?: string;
  assignedUserId?: number;
  customFields?: Record<string, any>;
  homePurchaseAnniversary?: string;
  birthday?: string;
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
      console.log('[FUB Debug] getUserByEmail called with:', email);
      
      // First try exact email query
      const data = await this.request<{ users: any[] }>("/users", { email });
      console.log('[FUB Debug] Direct email query returned:', data.users?.length || 0, 'users');
      
      if (data.users && data.users.length > 0) {
        const user = data.users[0];
        console.log('[FUB Debug] Found user by direct query:', { id: user.id, email: user.email, name: user.name });
        return {
          id: user.id,
          name: user.name || `${user.firstName} ${user.lastName}`,
        };
      }
      
      // If direct query fails, try fetching all users and matching
      console.log('[FUB Debug] Direct query failed, trying full user list...');
      const allUsers = await this.getAllAgents();
      const matchingUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (matchingUser) {
        console.log('[FUB Debug] Found user by scanning all agents:', { id: matchingUser.id, email: matchingUser.email, name: matchingUser.name });
        return {
          id: matchingUser.id,
          name: matchingUser.name,
        };
      }
      
      console.log('[FUB Debug] No matching user found for email:', email);
      return null;
    } catch (error) {
      console.error("Error finding FUB user:", error);
      return null;
    }
  }

  async getAppointments(userId?: number, startDate?: string, endDate?: string): Promise<FubEvent[]> {
    try {
      const params: Record<string, string> = {};
      if (userId) params.userId = userId.toString();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      console.log(`[FUB] Fetching appointments with params:`, params);

      const data = await this.request<{ appointments: any[] }>("/appointments", params);
      
      console.log(`[FUB] Appointments API returned ${data.appointments?.length || 0} appointments`);

      return (data.appointments || []).map((appt: any) => {
        const invitee = appt.invitees?.[0];
        return {
          id: appt.id,
          title: appt.title || appt.name || "Untitled Appointment",
          description: appt.description || appt.notes,
          startDate: appt.startAt || appt.startDate || appt.created,
          endDate: appt.endAt || appt.endDate,
          allDay: appt.allDay || false,
          type: 'appointment' as const,
          personId: invitee?.personId || appt.personId,
          personName: invitee?.name || appt.personName,
          dealId: appt.dealId,
          externalEventLink: appt.externalEventLink,
          originFub: appt.originFub,
        };
      });
    } catch (error) {
      console.error("Error fetching FUB appointments:", error);
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
      console.log('[Leads Debug] ========== getPeople START ==========');
      console.log('[Leads Debug] Fetching people for FUB userId:', userId);
      
      const allPeople: FubPerson[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params: Record<string, string> = { 
          limit: "100",
          offset: ((page - 1) * 100).toString(),
          fields: "id,name,firstName,lastName,emails,phones,stage,source,created,lastActivity,lastLeadActivity,assignedUserId,customFields"
        };
        if (userId) params.assignedUserId = userId.toString();

        const data = await this.request<{ people: any[] }>("/people", params);
        
        console.log(`[FUB] Fetched ${data.people?.length || 0} people on page ${page}`);
        
        // Debug: Log sample person with custom fields on first page
        if (page === 1 && data.people?.length > 0) {
          console.log('[Leads Debug] Sample person from FUB:', {
            id: data.people[0].id,
            name: data.people[0].name,
            customFieldKeys: data.people[0].customFields ? Object.keys(data.people[0].customFields) : 'NO CUSTOM FIELDS',
            customFieldValues: data.people[0].customFields || {}
          });
        }
        
        const people = data.people || [];
        for (const person of people) {
          allPeople.push({
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
            lastLeadActivity: person.lastLeadActivity,
            assignedUserId: person.assignedUserId,
            customFields: person.customFields || {},
            homePurchaseAnniversary: person.customFields?.['Home Purchase Anniversary'] || 
                                      person.customFields?.['homePurchaseAnniversary'] ||
                                      person.customFields?.['Closing Date'] ||
                                      person.customFields?.['closingDate'],
            birthday: person.customFields?.['Birthday'] ||
                      person.customFields?.['birthday'] ||
                      person.customFields?.['Birth Date'] ||
                      person.customFields?.['birthDate'] ||
                      person.customFields?.['DOB'],
          });
        }

        hasMore = people.length === 100;
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 50) break;
      }

      console.log(`[FUB] Total people found: ${allPeople.length}`);
      console.log('[Leads Debug] ========== getPeople END ==========');
      return allPeople;
    } catch (error) {
      console.error("Error fetching FUB people:", error);
      console.log('[Leads Debug] getPeople ERROR:', error);
      return [];
    }
  }

  async getAnniversaryLeads(userId: number): Promise<FubPerson[]> {
    console.log('[Leads Debug] ========== getAnniversaryLeads START ==========');
    const people = await this.getPeople(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Debug: Count people with anniversary field
    const peopleWithAnniversary = people.filter(p => p.homePurchaseAnniversary);
    console.log('[Leads Debug] Anniversary field stats:', {
      totalPeople: people.length,
      withAnniversaryField: peopleWithAnniversary.length,
      sampleWithAnniversary: peopleWithAnniversary.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        anniversaryValue: p.homePurchaseAnniversary
      }))
    });
    
    const filtered = people.filter(person => {
      if (!person.homePurchaseAnniversary) return false;
      const parsed = this.parseAnniversaryDate(person.homePurchaseAnniversary);
      if (!parsed) {
        console.log('[Leads Debug] Failed to parse anniversary date:', {
          personId: person.id,
          value: person.homePurchaseAnniversary
        });
        return false;
      }
      
      const daysUntilAnniversary = this.getDaysUntilAnniversary(parsed.month, parsed.day, today);
      return daysUntilAnniversary >= -7 && daysUntilAnniversary <= 30;
    }).sort((a, b) => {
      const parsedA = this.parseAnniversaryDate(a.homePurchaseAnniversary!);
      const parsedB = this.parseAnniversaryDate(b.homePurchaseAnniversary!);
      if (!parsedA || !parsedB) return 0;
      return this.getDaysUntilAnniversary(parsedA.month, parsedA.day, today) - 
             this.getDaysUntilAnniversary(parsedB.month, parsedB.day, today);
    });
    
    console.log('[Leads Debug] Anniversary filtering results:', {
      totalBeforeFilter: peopleWithAnniversary.length,
      totalAfterDateFilter: filtered.length,
      dateRange: 'today -7 to +30 days'
    });
    console.log('[Leads Debug] ========== getAnniversaryLeads END ==========');
    
    return filtered;
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

  async getBirthdayLeads(userId: number): Promise<FubPerson[]> {
    console.log('[Leads Debug] ========== getBirthdayLeads START ==========');
    const people = await this.getPeople(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Debug: Count people with birthday field
    const peopleWithBirthday = people.filter(p => p.birthday);
    console.log('[Leads Debug] Birthday field stats:', {
      totalPeople: people.length,
      withBirthdayField: peopleWithBirthday.length,
      sampleWithBirthday: peopleWithBirthday.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        birthdayValue: p.birthday
      }))
    });
    
    const filtered = people.filter(person => {
      if (!person.birthday) return false;
      const parsed = this.parseAnniversaryDate(person.birthday);
      if (!parsed) {
        console.log('[Leads Debug] Failed to parse birthday date:', {
          personId: person.id,
          value: person.birthday
        });
        return false;
      }
      
      const daysUntilBirthday = this.getDaysUntilAnniversary(parsed.month, parsed.day, today);
      return daysUntilBirthday >= -7 && daysUntilBirthday <= 30;
    }).sort((a, b) => {
      const parsedA = this.parseAnniversaryDate(a.birthday!);
      const parsedB = this.parseAnniversaryDate(b.birthday!);
      if (!parsedA || !parsedB) return 0;
      return this.getDaysUntilAnniversary(parsedA.month, parsedA.day, today) - 
             this.getDaysUntilAnniversary(parsedB.month, parsedB.day, today);
    });
    
    console.log('[Leads Debug] Birthday filtering results:', {
      totalBeforeFilter: peopleWithBirthday.length,
      totalAfterDateFilter: filtered.length,
      dateRange: 'today -7 to +30 days'
    });
    console.log('[Leads Debug] ========== getBirthdayLeads END ==========');
    
    return filtered;
  }

  async getRecentActivityLeads(userId: number): Promise<FubPerson[]> {
    const people = await this.getPeople(userId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    return people.filter(person => {
      if (!person.created || !person.lastLeadActivity) return false;
      
      const createdDate = new Date(person.created);
      const lastLeadActivityDate = new Date(person.lastLeadActivity);
      
      if (isNaN(createdDate.getTime()) || isNaN(lastLeadActivityDate.getTime())) return false;
      
      const createdMoreThan30DaysAgo = createdDate <= thirtyDaysAgo;
      const hadRecentClientActivity = lastLeadActivityDate >= threeDaysAgo;
      
      return createdMoreThan30DaysAgo && hadRecentClientActivity;
    }).sort((a, b) => {
      const dateA = new Date(a.lastLeadActivity!);
      const dateB = new Date(b.lastLeadActivity!);
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

  async getStaleContacts(userId: number, minDays: number = 60): Promise<FubPerson[]> {
    console.log('[Leads Debug] ========== getStaleContacts START ==========');
    console.log('[Leads Debug] minDays:', minDays);
    
    const people = await this.getPeople(userId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const staleContacts = people.filter(person => {
      // Must have some activity date to be considered (otherwise brand new)
      const lastActivityDate = person.lastActivity || person.lastLeadActivity;
      if (!lastActivityDate) return false;
      
      const activityDate = new Date(lastActivityDate);
      if (isNaN(activityDate.getTime())) return false;
      
      const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceActivity >= minDays;
    }).map(person => {
      const lastActivityDate = person.lastActivity || person.lastLeadActivity;
      const activityDate = new Date(lastActivityDate!);
      const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...person, daysSinceActivity };
    }).sort((a: any, b: any) => b.daysSinceActivity - a.daysSinceActivity);
    
    console.log('[Leads Debug] Stale contacts found:', staleContacts.length);
    console.log('[Leads Debug] ========== getStaleContacts END ==========');
    
    return staleContacts;
  }

  async getSmartSuggestions(userId: number, limit: number = 5): Promise<Array<FubPerson & { priority: number; reason: string }>> {
    console.log('[Leads Debug] ========== getSmartSuggestions START ==========');
    
    const people = await this.getPeople(userId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Score each contact based on various factors
    const scoredPeople = people.map(person => {
      let priority = 0;
      let reasons: string[] = [];
      
      // 1. Birthday coming up (within 7 days) - high priority
      if (person.birthday) {
        const parsed = this.parseAnniversaryDate(person.birthday);
        if (parsed) {
          const daysUntil = this.getDaysUntilAnniversary(parsed.month, parsed.day, now);
          if (daysUntil >= 0 && daysUntil <= 7) {
            priority += 50;
            reasons.push(`Birthday in ${daysUntil === 0 ? 'today!' : daysUntil + ' days'}`);
          }
        }
      }
      
      // 2. Anniversary coming up (within 14 days) - high priority
      if (person.homePurchaseAnniversary) {
        const parsed = this.parseAnniversaryDate(person.homePurchaseAnniversary);
        if (parsed) {
          const daysUntil = this.getDaysUntilAnniversary(parsed.month, parsed.day, now);
          if (daysUntil >= 0 && daysUntil <= 14) {
            priority += 40;
            reasons.push(`Home anniversary in ${daysUntil === 0 ? 'today!' : daysUntil + ' days'}`);
          }
        }
      }
      
      // 3. Stale contact (no activity in 60+ days) - needs nurturing
      const lastActivityDate = person.lastActivity || person.lastLeadActivity;
      if (lastActivityDate) {
        const activityDate = new Date(lastActivityDate);
        if (!isNaN(activityDate.getTime())) {
          const daysSinceActivity = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceActivity >= 90) {
            priority += 30;
            reasons.push(`No contact in ${daysSinceActivity} days`);
          } else if (daysSinceActivity >= 60) {
            priority += 20;
            reasons.push(`No contact in ${daysSinceActivity} days`);
          }
        }
      }
      
      // 4. Past client stages get higher priority (they're your SOI)
      const pastClientStages = ['past client', 'closed', 'sold', 'sphere', 'soi'];
      if (person.stage && pastClientStages.some(s => person.stage!.toLowerCase().includes(s))) {
        priority += 15;
        if (reasons.length === 0) reasons.push('Past client - maintain relationship');
      }
      
      // 5. Recent lead activity but agent hasn't followed up (they reached out to you!)
      if (person.lastLeadActivity) {
        const leadActivityDate = new Date(person.lastLeadActivity);
        if (!isNaN(leadActivityDate.getTime())) {
          const daysSinceLeadActivity = Math.floor((now.getTime() - leadActivityDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceLeadActivity <= 3 && daysSinceLeadActivity >= 0) {
            priority += 35;
            reasons.push('Recent activity - follow up!');
          }
        }
      }
      
      return {
        ...person,
        priority,
        reason: reasons.join(' • ') || 'General check-in'
      };
    });
    
    // Filter to only include people with a reason to call, then sort by priority
    const suggestions = scoredPeople
      .filter(p => p.priority > 0)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
    
    console.log('[Leads Debug] Smart suggestions generated:', suggestions.length);
    console.log('[Leads Debug] Top suggestion:', suggestions[0] ? { name: suggestions[0].name, priority: suggestions[0].priority, reason: suggestions[0].reason } : 'none');
    console.log('[Leads Debug] ========== getSmartSuggestions END ==========');
    
    return suggestions;
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
let lastFubApiKey: string | null = null;

export function getFubClient(): FubClient | null {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    console.warn("FUB_API_KEY not configured");
    return null;
  }
  if (!fubClientInstance || lastFubApiKey !== apiKey) {
    fubClientInstance = new FubClient({
      apiKey,
      systemName: process.env.FUB_SYSTEM_NAME || "MissionControl",
      systemKey: process.env.FUB_SYSTEM_KEY,
    });
    lastFubApiKey = apiKey;
  }
  return fubClientInstance;
}

export function resetFubClient(): void {
  fubClientInstance = null;
}
