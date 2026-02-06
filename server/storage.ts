import { 
  users, 
  agentProfiles, 
  contextSuggestions,
  marketPulseSnapshots,
  appUsage,
  notifications,
  userNotificationSettings,
  userVideoPreferences,
  syncStatus,
  savedContentIdeas,
  cmas,
  type User, 
  type UpsertUser,
  type AgentProfile,
  type InsertAgentProfile,
  type ContextSuggestion,
  type InsertContextSuggestion,
  type MarketPulseSnapshot,
  type InsertMarketPulseSnapshot,
  type AppUsage,
  type Notification,
  type InsertNotification,
  type UserNotificationSettings,
  type InsertUserNotificationSettings,
  type UserVideoPreference,
  type InsertUserVideoPreference,
  type SyncStatus,
  type SavedContentIdea,
  type InsertSavedContentIdea,
  type Cma,
  type InsertCma
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, sql, gt, lt } from "drizzle-orm";

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
  
  trackAppUsage(userId: string, appId: string, page: string): Promise<AppUsage>;
  getAppUsageByPage(userId: string, page: string): Promise<AppUsage[]>;
  
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  updateUserTheme(userId: string, theme: string): Promise<User | undefined>;
  
  getNotificationSettings(userId: string): Promise<UserNotificationSettings | undefined>;
  upsertNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings>;
  
  getVideoPreferences(userId: string): Promise<UserVideoPreference[]>;
  getVideoPreference(userId: string, videoId: string): Promise<UserVideoPreference | undefined>;
  upsertVideoPreference(pref: InsertUserVideoPreference): Promise<UserVideoPreference>;
  getFavoriteVideos(userId: string): Promise<UserVideoPreference[]>;
  getWatchLaterVideos(userId: string): Promise<UserVideoPreference[]>;
  getContinueWatchingVideos(userId: string): Promise<UserVideoPreference[]>;
  
  getSyncStatus(userId: string, section: string): Promise<SyncStatus | undefined>;
  upsertSyncStatus(userId: string, section: string, manualRefreshTime: Date): Promise<SyncStatus>;
  
  getSavedContentIdeas(userId: string): Promise<SavedContentIdea[]>;
  saveContentIdea(idea: InsertSavedContentIdea): Promise<SavedContentIdea>;
  deleteContentIdea(id: number, userId: string): Promise<boolean>;
  updateContentIdeaStatus(id: number, userId: string, status: string): Promise<SavedContentIdea | undefined>;
  
  // CMA methods
  getCmas(userId: string): Promise<Cma[]>;
  getCma(id: string, userId: string): Promise<Cma | undefined>;
  createCma(cma: InsertCma): Promise<Cma>;
  updateCma(id: string, userId: string, data: Partial<InsertCma>): Promise<Cma | undefined>;
  deleteCma(id: string, userId: string): Promise<boolean>;
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
    // First check if a user with this email already exists (handles auth provider switches)
    if (userData.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser && existingUser.id !== userData.id) {
        // User exists with different ID (e.g., switching from Replit to Google auth)
        // Update the existing user record instead of creating a new one
        const [user] = await db
          .update(users)
          .set({
            firstName: userData.firstName || existingUser.firstName,
            lastName: userData.lastName || existingUser.lastName,
            profileImageUrl: userData.profileImageUrl || existingUser.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return user;
      }
    }
    
    // Standard upsert by ID, with fallback handling for email conflicts (race condition safety)
    try {
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
    } catch (error: any) {
      // Handle race condition: if email unique constraint violated, update existing user by email
      if (error.code === '23505' && error.constraint === 'users_email_unique' && userData.email) {
        const existingUser = await this.getUserByEmail(userData.email);
        if (existingUser) {
          const [user] = await db
            .update(users)
            .set({
              firstName: userData.firstName || existingUser.firstName,
              lastName: userData.lastName || existingUser.lastName,
              profileImageUrl: userData.profileImageUrl || existingUser.profileImageUrl,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning();
          return user;
        }
      }
      throw error;
    }
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

  async trackAppUsage(userId: string, appId: string, page: string): Promise<AppUsage> {
    const [result] = await db
      .insert(appUsage)
      .values({ userId, appId, page, clickCount: 1, lastUsedAt: new Date() })
      .onConflictDoUpdate({
        target: [appUsage.userId, appUsage.appId, appUsage.page],
        set: {
          clickCount: sql`${appUsage.clickCount} + 1`,
          lastUsedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  async getAppUsageByPage(userId: string, page: string): Promise<AppUsage[]> {
    return db
      .select()
      .from(appUsage)
      .where(and(
        eq(appUsage.userId, userId),
        eq(appUsage.page, page)
      ))
      .orderBy(desc(appUsage.clickCount));
  }

  async getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async updateUserTheme(userId: string, theme: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ theme, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getNotificationSettings(userId: string): Promise<UserNotificationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
    return settings;
  }

  async upsertNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings> {
    const existing = await this.getNotificationSettings(settings.userId);
    if (existing) {
      const [updated] = await db
        .update(userNotificationSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userNotificationSettings.userId, settings.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userNotificationSettings)
        .values(settings)
        .returning();
      return created;
    }
  }

  async getVideoPreferences(userId: string): Promise<UserVideoPreference[]> {
    return db
      .select()
      .from(userVideoPreferences)
      .where(eq(userVideoPreferences.userId, userId));
  }

  async getVideoPreference(userId: string, videoId: string): Promise<UserVideoPreference | undefined> {
    const [pref] = await db
      .select()
      .from(userVideoPreferences)
      .where(and(
        eq(userVideoPreferences.userId, userId),
        eq(userVideoPreferences.videoId, videoId)
      ));
    return pref;
  }

  async upsertVideoPreference(pref: InsertUserVideoPreference): Promise<UserVideoPreference> {
    const existing = await this.getVideoPreference(pref.userId, pref.videoId);
    if (existing) {
      const [updated] = await db
        .update(userVideoPreferences)
        .set({ ...pref, updatedAt: new Date() })
        .where(eq(userVideoPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userVideoPreferences)
        .values(pref)
        .returning();
      return created;
    }
  }

  async getFavoriteVideos(userId: string): Promise<UserVideoPreference[]> {
    return db
      .select()
      .from(userVideoPreferences)
      .where(and(
        eq(userVideoPreferences.userId, userId),
        eq(userVideoPreferences.isFavorite, true)
      ))
      .orderBy(desc(userVideoPreferences.updatedAt));
  }

  async getWatchLaterVideos(userId: string): Promise<UserVideoPreference[]> {
    return db
      .select()
      .from(userVideoPreferences)
      .where(and(
        eq(userVideoPreferences.userId, userId),
        eq(userVideoPreferences.isWatchLater, true)
      ))
      .orderBy(desc(userVideoPreferences.createdAt));
  }

  async getContinueWatchingVideos(userId: string): Promise<UserVideoPreference[]> {
    return db
      .select()
      .from(userVideoPreferences)
      .where(and(
        eq(userVideoPreferences.userId, userId),
        gt(userVideoPreferences.watchProgress, 0),
        lt(userVideoPreferences.watchPercentage, 95)
      ))
      .orderBy(desc(userVideoPreferences.lastWatchedAt));
  }

  async getSyncStatus(userId: string, section: string): Promise<SyncStatus | undefined> {
    const [status] = await db
      .select()
      .from(syncStatus)
      .where(and(
        eq(syncStatus.userId, userId),
        eq(syncStatus.section, section)
      ));
    return status;
  }

  async upsertSyncStatus(userId: string, section: string, manualRefreshTime: Date): Promise<SyncStatus> {
    const existing = await this.getSyncStatus(userId, section);
    
    if (existing) {
      const [updated] = await db
        .update(syncStatus)
        .set({
          lastManualRefresh: manualRefreshTime,
          updatedAt: new Date()
        })
        .where(and(
          eq(syncStatus.userId, userId),
          eq(syncStatus.section, section)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(syncStatus)
        .values({
          userId,
          section,
          lastManualRefresh: manualRefreshTime,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async getSavedContentIdeas(userId: string): Promise<SavedContentIdea[]> {
    return db
      .select()
      .from(savedContentIdeas)
      .where(eq(savedContentIdeas.userId, userId))
      .orderBy(desc(savedContentIdeas.createdAt));
  }

  async saveContentIdea(idea: InsertSavedContentIdea): Promise<SavedContentIdea> {
    const [saved] = await db
      .insert(savedContentIdeas)
      .values(idea)
      .returning();
    return saved;
  }

  async deleteContentIdea(id: number, userId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(savedContentIdeas)
      .where(and(
        eq(savedContentIdeas.id, id),
        eq(savedContentIdeas.userId, userId)
      ))
      .limit(1);

    if (!existing) return false;

    await db
      .delete(savedContentIdeas)
      .where(eq(savedContentIdeas.id, id));
    return true;
  }

  async updateContentIdeaStatus(id: number, userId: string, status: string): Promise<SavedContentIdea | undefined> {
    const [updated] = await db
      .update(savedContentIdeas)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(savedContentIdeas.id, id),
        eq(savedContentIdeas.userId, userId)
      ))
      .returning();
    return updated;
  }
  // CMA methods
  async getCmas(userId: string): Promise<Cma[]> {
    return db.select().from(cmas).where(eq(cmas.userId, userId)).orderBy(desc(cmas.updatedAt));
  }

  async getCma(id: string, userId: string): Promise<Cma | undefined> {
    const [cma] = await db.select().from(cmas).where(and(eq(cmas.id, id), eq(cmas.userId, userId)));
    return cma;
  }

  async createCma(cma: InsertCma): Promise<Cma> {
    const [created] = await db.insert(cmas).values(cma).returning();
    return created;
  }

  async updateCma(id: string, userId: string, data: Partial<InsertCma>): Promise<Cma | undefined> {
    const [updated] = await db
      .update(cmas)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cmas.id, id), eq(cmas.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCma(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(cmas)
      .where(and(eq(cmas.id, id), eq(cmas.userId, userId)))
      .limit(1);
    if (!existing) return false;
    await db.delete(cmas).where(eq(cmas.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
