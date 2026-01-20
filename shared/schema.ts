import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  fubUserId: integer("fub_user_id"),
  rezenYentaId: varchar("rezen_yenta_id"),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export interface FubEvent {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  type: 'appointment' | 'task' | 'deal_closing' | 'custom';
  personId?: number;
  personName?: string;
  dealId?: number;
}

export interface FubDeal {
  id: number;
  name: string;
  stage: string;
  price?: number;
  closeDate?: string;
  createdAt: string;
  agentId: number;
  agentName?: string;
  status: 'pending' | 'under_contract' | 'closed' | 'lost';
  propertyAddress?: string;
  clientName?: string;
}

export const agentProfiles = pgTable("agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  missionFocus: varchar("mission_focus"), // 'buyers', 'sellers', 'both', 'new_agent', 'team_lead'
  experienceLevel: varchar("experience_level"), // 'new', 'experienced', 'veteran'
  primaryGoal: varchar("primary_goal"), // 'grow_pipeline', 'close_deals', 'build_team', 'improve_systems'
  onboardingAnswers: jsonb("onboarding_answers"),
  dismissedSuggestions: text("dismissed_suggestions").array(),
  lastSurveyedAt: timestamp("last_surveyed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentProfile = typeof agentProfiles.$inferInsert;

export const contextSuggestions = pgTable("context_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  suggestionType: varchar("suggestion_type").notNull(), // 'deal_action', 'listing_stale', 'task_overdue', 'pipeline_empty', 'closing_soon'
  title: varchar("title").notNull(),
  description: text("description"),
  priority: integer("priority").default(0), // Higher = more important
  payload: jsonb("payload"), // { dealId, taskId, appId, etc. }
  recommendedAppId: varchar("recommended_app_id"),
  status: varchar("status").default("active"), // 'active', 'dismissed', 'completed'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContextSuggestion = typeof contextSuggestions.$inferSelect;
export type InsertContextSuggestion = typeof contextSuggestions.$inferInsert;

export const marketPulseSnapshots = pgTable("market_pulse_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalProperties: integer("total_properties").notNull(),
  active: integer("active").notNull(),
  activeUnderContract: integer("active_under_contract").notNull(),
  pending: integer("pending").notNull(),
  closed: integer("closed").notNull(),
  lastUpdatedAt: timestamp("last_updated_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MarketPulseSnapshot = typeof marketPulseSnapshots.$inferSelect;
export type InsertMarketPulseSnapshot = typeof marketPulseSnapshots.$inferInsert;

export const appUsage = pgTable("app_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  appId: varchar("app_id").notNull(),
  page: varchar("page").notNull(),
  clickCount: integer("click_count").default(1),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_app_usage_user_page").on(table.userId, table.page),
  uniqueIndex("idx_app_usage_unique").on(table.userId, table.appId, table.page),
]);

export type AppUsage = typeof appUsage.$inferSelect;
export type InsertAppUsage = typeof appUsage.$inferInsert;
