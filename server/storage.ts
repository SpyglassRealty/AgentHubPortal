import { 
  users, 
  sessions,
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
  cmaReportConfigs,
  cmaReportTemplates,
  agentResources,
  integrationConfigs,
  appVisibility,
  type User, 
  type UpsertUser,
  type AgentProfile,
  type InsertAgentProfile,
  type UpdateAgentProfile,
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
  type InsertCma,
  type CmaReportConfig,
  type InsertCmaReportConfig,
  type CmaReportTemplate,
  type InsertCmaReportTemplate,
  type AgentResource,
  type InsertAgentResource,
  type IntegrationConfig,
  type InsertIntegrationConfig,
  type AppVisibility,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, sql, gt, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<{ isSuperAdmin: boolean }>): Promise<User | undefined>;
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
  getCma(id: string, userId?: string): Promise<Cma | undefined>;
  getCmaByShareToken(token: string): Promise<Cma | undefined>;
  createCma(cma: InsertCma): Promise<Cma>;
  updateCma(id: string, userId: string | null, data: Partial<InsertCma>): Promise<Cma | undefined>;
  deleteCma(id: string, userId: string): Promise<boolean>;
  
  // CMA Report Config methods
  getCmaReportConfig(cmaId: string): Promise<CmaReportConfig | undefined>;
  upsertCmaReportConfig(config: InsertCmaReportConfig): Promise<CmaReportConfig>;
  deleteCmaReportConfig(cmaId: string): Promise<boolean>;
  
  // CMA Report Template methods
  getCmaReportTemplates(userId: string): Promise<CmaReportTemplate[]>;
  getCmaReportTemplate(id: string): Promise<CmaReportTemplate | undefined>;
  createCmaReportTemplate(template: InsertCmaReportTemplate): Promise<CmaReportTemplate>;
  updateCmaReportTemplate(id: string, data: Partial<InsertCmaReportTemplate>): Promise<CmaReportTemplate | undefined>;
  deleteCmaReportTemplate(id: string, userId: string): Promise<boolean>;
  
  // Agent Profile (CMA-specific) methods
  updateAgentProfileCma(userId: string, data: UpdateAgentProfile): Promise<AgentProfile | undefined>;
  
  // Agent Resource methods
  getAgentResources(userId: string): Promise<AgentResource[]>;
  getAgentResource(id: string): Promise<AgentResource | undefined>;
  createAgentResource(resource: InsertAgentResource): Promise<AgentResource>;
  updateAgentResource(id: string, data: Partial<InsertAgentResource>): Promise<AgentResource | undefined>;
  deleteAgentResource(id: string): Promise<boolean>;
  reorderAgentResources(userId: string, orderedIds: string[]): Promise<boolean>;

  // Integration config methods
  getIntegrationConfigs(): Promise<IntegrationConfig[]>;
  getIntegrationConfig(name: string): Promise<IntegrationConfig | undefined>;
  upsertIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig>;
  updateIntegrationTestResult(name: string, result: string, message?: string): Promise<IntegrationConfig | undefined>;
  deleteIntegrationConfig(name: string): Promise<boolean>;
  getIntegrationApiKey(name: string): Promise<string | null>;

  // App visibility methods
  getAppVisibility(): Promise<AppVisibility[]>;
  setAppVisibility(appId: string, hidden: boolean): Promise<AppVisibility>;

  // Admin stats & activity
  getAdminStats(): Promise<{ totalUsers: number; activeLastWeek: number; totalCmas: number; loginsToday: number }>;
  getActivityLogs(limit?: number): Promise<any[]>;
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: Partial<{ isSuperAdmin: boolean }>): Promise<User | undefined> {
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (typeof data.isSuperAdmin === "boolean") {
      updateFields.isSuperAdmin = data.isSuperAdmin;
    }
    const [user] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, id))
      .returning();
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
    console.log(`[Storage DEBUG] Querying latest market pulse snapshot...`);
    const [snapshot] = await db
      .select()
      .from(marketPulseSnapshots)
      .orderBy(desc(marketPulseSnapshots.lastUpdatedAt))
      .limit(1);
    console.log(`[Storage DEBUG] Query result:`, snapshot ? 'Found snapshot' : 'No snapshot found');
    return snapshot;
  }

  async saveMarketPulseSnapshot(snapshot: InsertMarketPulseSnapshot): Promise<MarketPulseSnapshot> {
    console.log(`[Storage DEBUG] Saving market pulse snapshot:`, snapshot);
    const [saved] = await db.insert(marketPulseSnapshots).values(snapshot).returning();
    console.log(`[Storage DEBUG] Saved snapshot:`, saved);
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

  async getCma(id: string, userId?: string): Promise<Cma | undefined> {
    if (userId) {
      const [cma] = await db.select().from(cmas).where(and(eq(cmas.id, id), eq(cmas.userId, userId)));
      return cma;
    }
    const [cma] = await db.select().from(cmas).where(eq(cmas.id, id));
    return cma;
  }

  async getCmaByShareToken(token: string): Promise<Cma | undefined> {
    const [cma] = await db.select().from(cmas).where(eq(cmas.shareToken, token));
    return cma;
  }

  async createCma(cma: InsertCma): Promise<Cma> {
    console.log('[Storage DEBUG] Creating CMA with data:', cma);
    try {
      const [created] = await db.insert(cmas).values(cma).returning();
      console.log('[Storage DEBUG] CMA created successfully:', created.id);
      return created;
    } catch (error) {
      console.error('[Storage DEBUG] CMA creation failed:', error);
      throw error;
    }
  }

  async updateCma(id: string, userId: string | null, data: Partial<InsertCma>): Promise<Cma | undefined> {
    if (userId) {
      const [updated] = await db
        .update(cmas)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(cmas.id, id), eq(cmas.userId, userId)))
        .returning();
      return updated;
    }
    const [updated] = await db
      .update(cmas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmas.id, id))
      .returning();
    return updated;
  }

  async deleteCma(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(cmas)
      .where(and(eq(cmas.id, id), eq(cmas.userId, userId)))
      .limit(1);
    if (!existing) return false;
    // Also delete associated report config
    await db.delete(cmaReportConfigs).where(eq(cmaReportConfigs.cmaId, id));
    await db.delete(cmas).where(eq(cmas.id, id));
    return true;
  }

  // CMA Report Config methods
  async getCmaReportConfig(cmaId: string): Promise<CmaReportConfig | undefined> {
    const [config] = await db.select().from(cmaReportConfigs).where(eq(cmaReportConfigs.cmaId, cmaId));
    return config;
  }

  async upsertCmaReportConfig(config: InsertCmaReportConfig): Promise<CmaReportConfig> {
    const existing = await this.getCmaReportConfig(config.cmaId);
    if (existing) {
      const [updated] = await db
        .update(cmaReportConfigs)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(cmaReportConfigs.cmaId, config.cmaId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(cmaReportConfigs).values(config).returning();
    return created;
  }

  async deleteCmaReportConfig(cmaId: string): Promise<boolean> {
    const [existing] = await db.select().from(cmaReportConfigs).where(eq(cmaReportConfigs.cmaId, cmaId)).limit(1);
    if (!existing) return false;
    await db.delete(cmaReportConfigs).where(eq(cmaReportConfigs.cmaId, cmaId));
    return true;
  }

  // CMA Report Template methods
  async getCmaReportTemplates(userId: string): Promise<CmaReportTemplate[]> {
    return db.select().from(cmaReportTemplates).where(eq(cmaReportTemplates.userId, userId)).orderBy(desc(cmaReportTemplates.updatedAt));
  }

  async getCmaReportTemplate(id: string): Promise<CmaReportTemplate | undefined> {
    const [template] = await db.select().from(cmaReportTemplates).where(eq(cmaReportTemplates.id, id));
    return template;
  }

  async createCmaReportTemplate(template: InsertCmaReportTemplate): Promise<CmaReportTemplate> {
    const [created] = await db.insert(cmaReportTemplates).values(template).returning();
    return created;
  }

  async updateCmaReportTemplate(id: string, data: Partial<InsertCmaReportTemplate>): Promise<CmaReportTemplate | undefined> {
    const [updated] = await db
      .update(cmaReportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmaReportTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteCmaReportTemplate(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select().from(cmaReportTemplates)
      .where(and(eq(cmaReportTemplates.id, id), eq(cmaReportTemplates.userId, userId)))
      .limit(1);
    if (!existing) return false;
    await db.delete(cmaReportTemplates).where(eq(cmaReportTemplates.id, id));
    return true;
  }

  // Agent Profile (CMA-specific) methods
  async updateAgentProfileCma(userId: string, data: UpdateAgentProfile): Promise<AgentProfile | undefined> {
    const existing = await this.getAgentProfile(userId);
    
    // Filter out empty strings - only update fields with actual content
    const filteredData: Partial<UpdateAgentProfile> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        (filteredData as any)[key] = value;
      }
    }
    
    if (!existing) {
      // Create new profile with CMA fields
      const [created] = await db
        .insert(agentProfiles)
        .values({ userId, ...filteredData })
        .returning();
      return created;
    }
    
    if (Object.keys(filteredData).length === 0) return existing;
    
    const [updated] = await db
      .update(agentProfiles)
      .set({ ...filteredData, updatedAt: new Date() })
      .where(eq(agentProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Agent Resource methods
  async getAgentResources(userId: string): Promise<AgentResource[]> {
    return db.select().from(agentResources)
      .where(eq(agentResources.userId, userId))
      .orderBy(agentResources.displayOrder);
  }

  async getAgentResource(id: string): Promise<AgentResource | undefined> {
    const [resource] = await db.select().from(agentResources).where(eq(agentResources.id, id)).limit(1);
    return resource;
  }

  async createAgentResource(resource: InsertAgentResource): Promise<AgentResource> {
    const existing = await this.getAgentResources(resource.userId);
    const maxOrder = existing.length > 0
      ? Math.max(...existing.map(r => r.displayOrder ?? 0)) + 1
      : 0;
    const [created] = await db
      .insert(agentResources)
      .values({ ...resource, displayOrder: maxOrder })
      .returning();
    return created;
  }

  async updateAgentResource(id: string, data: Partial<InsertAgentResource>): Promise<AgentResource | undefined> {
    const [updated] = await db
      .update(agentResources)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentResources.id, id))
      .returning();
    return updated;
  }

  async deleteAgentResource(id: string): Promise<boolean> {
    await db.delete(agentResources).where(eq(agentResources.id, id));
    return true;
  }

  async reorderAgentResources(userId: string, orderedIds: string[]): Promise<boolean> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(agentResources)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(and(
          eq(agentResources.id, orderedIds[i]),
          eq(agentResources.userId, userId)
        ));
    }
    return true;
  }

  // Integration config methods
  async getIntegrationConfigs(): Promise<IntegrationConfig[]> {
    return db.select().from(integrationConfigs).orderBy(integrationConfigs.displayName);
  }

  async getIntegrationConfig(name: string): Promise<IntegrationConfig | undefined> {
    const [config] = await db.select().from(integrationConfigs).where(eq(integrationConfigs.name, name));
    return config;
  }

  async upsertIntegrationConfig(config: InsertIntegrationConfig): Promise<IntegrationConfig> {
    const existing = await this.getIntegrationConfig(config.name);
    if (existing) {
      const [updated] = await db
        .update(integrationConfigs)
        .set({
          apiKey: config.apiKey,
          displayName: config.displayName || existing.displayName,
          additionalConfig: config.additionalConfig !== undefined ? config.additionalConfig : existing.additionalConfig,
          isActive: config.isActive !== undefined ? config.isActive : existing.isActive,
          createdBy: config.createdBy || existing.createdBy,
          updatedAt: new Date(),
        })
        .where(eq(integrationConfigs.name, config.name))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(integrationConfigs).values(config).returning();
      return created;
    }
  }

  async updateIntegrationTestResult(name: string, result: string, message?: string): Promise<IntegrationConfig | undefined> {
    const [updated] = await db
      .update(integrationConfigs)
      .set({
        lastTestedAt: new Date(),
        lastTestResult: result,
        lastTestMessage: message || null,
        updatedAt: new Date(),
      })
      .where(eq(integrationConfigs.name, name))
      .returning();
    return updated;
  }

  async deleteIntegrationConfig(name: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.name, name))
      .limit(1);
    if (!existing) return false;
    await db.delete(integrationConfigs).where(eq(integrationConfigs.name, name));
    return true;
  }

  async getIntegrationApiKey(name: string): Promise<string | null> {
    const config = await this.getIntegrationConfig(name);
    if (!config || !config.isActive) return null;
    return config.apiKey;
  }

  // App visibility methods
  async getAppVisibility(): Promise<AppVisibility[]> {
    return db.select().from(appVisibility);
  }

  async setAppVisibility(appId: string, hidden: boolean): Promise<AppVisibility> {
    const [existing] = await db.select().from(appVisibility).where(eq(appVisibility.appId, appId));
    if (existing) {
      const [updated] = await db
        .update(appVisibility)
        .set({ hidden, updatedAt: new Date() })
        .where(eq(appVisibility.appId, appId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(appVisibility)
        .values({ appId, hidden, updatedAt: new Date() })
        .returning();
      return created;
    }
  }

  // Admin stats
  async getAdminStats(): Promise<{ totalUsers: number; activeLastWeek: number; totalCmas: number; loginsToday: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gt(users.updatedAt, oneWeekAgo));
    
    const [cmaCount] = await db.select({ count: sql<number>`count(*)` }).from(cmas);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [loginCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(gt(sessions.expire, todayStart));
    
    return {
      totalUsers: Number(userCount.count),
      activeLastWeek: Number(activeCount.count),
      totalCmas: Number(cmaCount.count),
      loginsToday: Number(loginCount.count),
    };
  }

  // Activity logs
  async getActivityLogs(limit: number = 50): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT al.*, u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
          FROM admin_activity_logs al
          LEFT JOIN users u ON al.admin_user_id = u.id
          ORDER BY al.created_at DESC
          LIMIT ${limit}`
    );
    return result.rows as any[];
  }
}

export const storage = new DatabaseStorage();
