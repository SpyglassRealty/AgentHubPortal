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
  developerName: varchar("developer_name", { length: 255 }),
  developerEmail: varchar("developer_email", { length: 255 }),
  requestedBy: varchar("requested_by", { length: 255 }),
  commitHash: varchar("commit_hash", { length: 100 }),
  category: varchar("category", { length: 50 }), // bug_fix, feature, ui, database, api, deployment
  status: varchar("status", { length: 50 }).default("deployed"), // deployed, in_progress, reverted, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dev_changelog_status").on(table.status),
  index("idx_dev_changelog_category").on(table.category),
  index("idx_dev_changelog_created_at").on(table.createdAt),
]);

export type DevChangelog = typeof devChangelog.$inferSelect;
export type InsertDevChangelog = typeof devChangelog.$inferInsert;

export const developerActivityLogs = pgTable("developer_activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: varchar("user_email", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),
  actionType: varchar("action_type", { length: 100 }), // create, update, delete, view, login, export, search
  description: text("description"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_developer_activity_logs_user_id").on(table.userId),
  index("idx_developer_activity_logs_action_type").on(table.actionType),
  index("idx_developer_activity_logs_created_at").on(table.createdAt),
]);

export type DeveloperActivityLog = typeof developerActivityLogs.$inferSelect;
export type InsertDeveloperActivityLog = typeof developerActivityLogs.$inferInsert;