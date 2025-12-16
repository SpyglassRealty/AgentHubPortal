import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
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
