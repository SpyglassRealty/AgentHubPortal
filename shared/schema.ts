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
