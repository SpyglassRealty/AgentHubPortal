import { 
  users, 
  agentProfiles, 
  contextSuggestions,
  marketPulseSnapshots,
  type User, 
  type UpsertUser,
  type AgentProfile,
  type InsertAgentProfile,
  type ContextSuggestion,
  type InsertContextSuggestion,
  type MarketPulseSnapshot,
  type InsertMarketPulseSnapshot
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserFubId(userId: string, fubUserId: number): Promise<User | undefined>;
  updateUserRezenYentaId(userId: string, rezenYentaId: string | null): Promise<User | undefined>;
  
  getAgentProfile(userId: string): Promise<AgentProfile | undefined>;
  upsertAgentProfile(profile: InsertAgentProfile): Promise<AgentProfile>;
  
  getActiveSuggestions(userId: string): Promise<ContextSuggestion[]>;
  createSuggestion(suggestion: InsertContextSuggestion): Promise<ContextSuggestion>;
  createSuggestions(suggestions: InsertContextSuggestion[]): Promise<ContextSuggestion[]>;
  updateSuggestionStatus(id: string, status: string): Promise<ContextSuggestion | undefined>;
  clearUserSuggestions(userId: string): Promise<void>;
  
  getLatestMarketPulseSnapshot(): Promise<MarketPulseSnapshot | undefined>;
  saveMarketPulseSnapshot(snapshot: InsertMarketPulseSnapshot): Promise<MarketPulseSnapshot>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserFubId(userId: string, fubUserId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ fubUserId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRezenYentaId(userId: string, rezenYentaId: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ rezenYentaId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAgentProfile(userId: string): Promise<AgentProfile | undefined> {
    const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.userId, userId));
    return profile;
  }

  async upsertAgentProfile(profileData: InsertAgentProfile): Promise<AgentProfile> {
    const existing = await this.getAgentProfile(profileData.userId);
    if (existing) {
      const [profile] = await db
        .update(agentProfiles)
        .set({ ...profileData, updatedAt: new Date() })
        .where(eq(agentProfiles.userId, profileData.userId))
        .returning();
      return profile;
    } else {
      const [profile] = await db.insert(agentProfiles).values(profileData).returning();
      return profile;
    }
  }

  async getActiveSuggestions(userId: string): Promise<ContextSuggestion[]> {
    return db.select().from(contextSuggestions)
      .where(and(
        eq(contextSuggestions.userId, userId),
        eq(contextSuggestions.status, "active")
      ));
  }

  async createSuggestion(suggestion: InsertContextSuggestion): Promise<ContextSuggestion> {
    const [created] = await db.insert(contextSuggestions).values(suggestion).returning();
    return created;
  }

  async createSuggestions(suggestions: InsertContextSuggestion[]): Promise<ContextSuggestion[]> {
    if (suggestions.length === 0) return [];
    return db.insert(contextSuggestions).values(suggestions).returning();
  }

  async updateSuggestionStatus(id: string, status: string): Promise<ContextSuggestion | undefined> {
    const [suggestion] = await db
      .update(contextSuggestions)
      .set({ status })
      .where(eq(contextSuggestions.id, id))
      .returning();
    return suggestion;
  }

  async clearUserSuggestions(userId: string): Promise<void> {
    await db.delete(contextSuggestions).where(eq(contextSuggestions.userId, userId));
  }

  async getLatestMarketPulseSnapshot(): Promise<MarketPulseSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(marketPulseSnapshots)
      .orderBy(desc(marketPulseSnapshots.lastUpdatedAt))
      .limit(1);
    return snapshot;
  }

  async saveMarketPulseSnapshot(snapshot: InsertMarketPulseSnapshot): Promise<MarketPulseSnapshot> {
    const [saved] = await db.insert(marketPulseSnapshots).values(snapshot).returning();
    return saved;
  }
}

export const storage = new DatabaseStorage();
