import { storage } from "./storage";
import { getFubClient } from "./fubClient";
import type { InsertContextSuggestion, FubDeal, AgentProfile } from "@shared/schema";

interface ContextData {
  deals: FubDeal[];
  tasks: any[];
  events: any[];
  profile: AgentProfile | null;
}

interface SuggestionRule {
  type: string;
  check: (data: ContextData) => InsertContextSuggestion[];
}

const suggestionRules: SuggestionRule[] = [
  {
    type: "deals_in_inspection",
    check: (data) => {
      const inspectionDeals = data.deals.filter(d => 
        d.status === "under_contract" && 
        d.stage?.toLowerCase().includes("inspection")
      );
      if (inspectionDeals.length > 0) {
        return [{
          userId: "",
          suggestionType: "deal_action",
          title: `${inspectionDeals.length} buyer${inspectionDeals.length > 1 ? 's' : ''} in inspection`,
          description: `Review inspection status and prepare for negotiations`,
          priority: 90,
          payload: { deals: inspectionDeals.map(d => ({ id: d.id, name: d.name, address: d.propertyAddress })) },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "closing_soon",
    check: (data) => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const closingSoon = data.deals.filter(d => {
        if (d.status !== "under_contract" || !d.closeDate) return false;
        const closeDate = new Date(d.closeDate);
        return closeDate >= now && closeDate <= nextWeek;
      });
      if (closingSoon.length > 0) {
        return [{
          userId: "",
          suggestionType: "closing_soon",
          title: `${closingSoon.length} closing${closingSoon.length > 1 ? 's' : ''} this week`,
          description: closingSoon.map(d => `${d.propertyAddress || d.name}`).join(", "),
          priority: 95,
          payload: { deals: closingSoon.map(d => ({ id: d.id, name: d.name, closeDate: d.closeDate })) },
          recommendedAppId: "rezen",
        }];
      }
      return [];
    }
  },
  {
    type: "empty_pipeline",
    check: (data) => {
      const activeDeals = data.deals.filter(d => d.status === "under_contract" || d.status === "pending");
      if (activeDeals.length === 0) {
        return [{
          userId: "",
          suggestionType: "pipeline_empty",
          title: "Your pipeline is empty",
          description: "Time to focus on lead generation and prospecting",
          priority: 70,
          payload: {},
          recommendedAppId: "rechat",
        }];
      }
      return [];
    }
  },
  {
    type: "overdue_tasks",
    check: (data) => {
      const now = new Date();
      const overdueTasks = data.tasks.filter((t: any) => {
        if (t.completed) return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });
      if (overdueTasks.length > 0) {
        return [{
          userId: "",
          suggestionType: "task_overdue",
          title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          description: "Review and complete your pending tasks",
          priority: 85,
          payload: { tasks: overdueTasks.slice(0, 5) },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "appointments_today",
    check: (data) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayEvents = data.events.filter((e: any) => {
        const eventDate = new Date(e.startDate);
        return eventDate >= today && eventDate < tomorrow;
      });
      if (todayEvents.length > 0) {
        return [{
          userId: "",
          suggestionType: "appointments_today",
          title: `${todayEvents.length} appointment${todayEvents.length > 1 ? 's' : ''} today`,
          description: todayEvents.map((e: any) => e.title).slice(0, 3).join(", "),
          priority: 100,
          payload: { events: todayEvents.slice(0, 5) },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "under_contract_summary",
    check: (data) => {
      const underContract = data.deals.filter(d => d.status === "under_contract");
      if (underContract.length > 0) {
        const totalValue = underContract.reduce((sum, d) => sum + (d.price || 0), 0);
        return [{
          userId: "",
          suggestionType: "deal_summary",
          title: `${underContract.length} active deal${underContract.length > 1 ? 's' : ''} under contract`,
          description: `Total pending volume: $${(totalValue / 1000000).toFixed(2)}M`,
          priority: 60,
          payload: { count: underContract.length, totalValue },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "new_agent_calls",
    check: (data) => {
      if (data.profile?.experienceLevel === "new") {
        return [{
          userId: "",
          suggestionType: "daily_action",
          title: "Call 20 leads a day",
          description: "Build your pipeline by making consistent outreach calls",
          priority: 80,
          payload: { actionType: "call_leads" },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "experienced_grow_pipeline",
    check: (data) => {
      const isExperienced = data.profile?.experienceLevel === "experienced" || data.profile?.experienceLevel === "veteran";
      const wantsGrowth = data.profile?.primaryGoal === "grow_pipeline";
      if (isExperienced && wantsGrowth) {
        return [{
          userId: "",
          suggestionType: "daily_action",
          title: "Add 5 contacts a day to CRM",
          description: "Grow your database by adding new contacts and reaching out via call or text",
          priority: 75,
          payload: { actionType: "add_contacts" },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "past_client_outreach",
    check: (data) => {
      const goal = data.profile?.primaryGoal;
      if (goal === "grow_pipeline" || goal === "close_deals") {
        return [{
          userId: "",
          suggestionType: "daily_action",
          title: "Contact 5 Past Clients or Prospects",
          description: "Nurture relationships and generate referrals from your sphere",
          priority: 78,
          payload: { actionType: "past_client_outreach" },
          recommendedAppId: "follow-up-boss",
        }];
      }
      return [];
    }
  },
  {
    type: "improve_systems_training",
    check: (data) => {
      if (data.profile?.primaryGoal === "improve_systems") {
        return [{
          userId: "",
          suggestionType: "daily_action",
          title: "Watch One Video on RealtyHackAI",
          description: "Improve your skills and systems with daily training",
          priority: 70,
          payload: { actionType: "training" },
          recommendedAppId: "realtyhack-ai",
        }];
      }
      return [];
    }
  }
];

export async function generateSuggestionsForUser(userId: string, fubUserId: number | null): Promise<void> {
  const fubClient = getFubClient();
  if (!fubClient || !fubUserId) {
    return;
  }

  try {
    const [deals, calendarData, profile] = await Promise.all([
      fubClient.getDeals(fubUserId),
      fubClient.getEvents(fubUserId).catch(() => []),
      storage.getAgentProfile(userId)
    ]);

    const tasks = calendarData.filter ? calendarData.filter((e: any) => e.type === 'task') : [];
    const events = calendarData.filter ? calendarData.filter((e: any) => e.type !== 'task') : [];

    const contextData: ContextData = {
      deals,
      tasks,
      events: Array.isArray(calendarData) ? calendarData : [],
      profile: profile || null
    };

    await storage.clearUserSuggestions(userId);

    const allSuggestions: InsertContextSuggestion[] = [];

    for (const rule of suggestionRules) {
      const suggestions = rule.check(contextData);
      for (const suggestion of suggestions) {
        suggestion.userId = userId;
        allSuggestions.push(suggestion);
      }
    }

    allSuggestions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (allSuggestions.length > 0) {
      await storage.createSuggestions(allSuggestions);
    }
  } catch (error) {
    console.error("Error generating suggestions:", error);
  }
}
