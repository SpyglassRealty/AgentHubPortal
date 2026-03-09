import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ── Developer Dashboard Tables (Developer Portal Feature) ──────────────────
export const devChangelog = pgTable("dev_changelog", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  developer_name: varchar("developer_name", { length: 255 }),
  developer_email: varchar("developer_email", { length: 255 }),
  requested_by: varchar("requested_by", { length: 255 }),
  commit_hash: varchar("commit_hash", { length: 100 }),
  category: varchar("category", { length: 50 }), // bug_fix, feature, ui, database, api, deployment
  status: varchar("status", { length: 50 }).default("deployed"), // deployed, in_progress, reverted, pending
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dev_changelog_status").on(table.status),
  index("idx_dev_changelog_category").on(table.category),
  index("idx_dev_changelog_created_at").on(table.created_at),
]);

export type DevChangelog = typeof devChangelog.$inferSelect;
export type InsertDevChangelog = typeof devChangelog.$inferInsert;

export const developerActivityLogs = pgTable("developer_activity_logs", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  user_email: varchar("user_email", { length: 255 }),
  user_name: varchar("user_name", { length: 255 }),
  action_type: varchar("action_type", { length: 100 }), // create, update, delete, view, login, export, search
  description: text("description"),
  metadata: jsonb("metadata"),
  ip_address: varchar("ip_address", { length: 45 }),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_developer_activity_logs_user_id").on(table.user_id),
  index("idx_developer_activity_logs_action_type").on(table.action_type),
  index("idx_developer_activity_logs_created_at").on(table.created_at),
]);

export type DeveloperActivityLog = typeof developerActivityLogs.$inferSelect;
export type InsertDeveloperActivityLog = typeof developerActivityLogs.$inferInsert;