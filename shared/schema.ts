import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
import { z } from "zod";

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
  theme: varchar("theme").default("light"),
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

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  labels: string[];
  body?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  type: 'event' | 'meeting' | 'showing' | 'closing' | 'open_house' | 'listing' | 'inspection';
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  colorId?: string;
  colorHex?: string;
  creator?: string;
  organizer?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
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
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title"),
  headshotUrl: text("headshot_url"),
  bio: text("bio"),
  defaultCoverLetter: text("default_cover_letter"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  marketingCompany: text("marketing_company"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentProfile = typeof agentProfiles.$inferInsert;

export const agentResources = pgTable("agent_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'pdf', 'doc', 'image', 'link'
  fileData: bytea("file_data"), // file stored as binary (for uploaded files)
  fileName: varchar("file_name", { length: 255 }), // original filename
  fileSize: integer("file_size"), // size in bytes
  mimeType: varchar("mime_type", { length: 100 }), // e.g. 'application/pdf'
  redirectUrl: text("redirect_url"), // for link-type resources
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AgentResource = typeof agentResources.$inferSelect;
export type InsertAgentResource = typeof agentResources.$inferInsert;

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

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'lead_assigned', 'appointment_reminder', 'deal_update', 'task_due', 'system'
  title: varchar("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  payload: jsonb("payload"), // { leadId, dealId, appointmentId, etc. }
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_user_unread").on(table.userId, table.isRead),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const userNotificationSettings = pgTable("user_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  notificationsEnabled: boolean("notifications_enabled").default(false),
  
  leadAssignedEnabled: boolean("lead_assigned_enabled").default(true),
  appointmentReminderEnabled: boolean("appointment_reminder_enabled").default(true),
  dealUpdateEnabled: boolean("deal_update_enabled").default(true),
  taskDueEnabled: boolean("task_due_enabled").default(true),
  systemEnabled: boolean("system_enabled").default(true),
  
  appointmentReminderTimes: jsonb("appointment_reminder_times").default([1440, 60, 15]),
  
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start").default("22:00"),
  quietHoursEnd: varchar("quiet_hours_end").default("07:00"),
  
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(false),
  notificationEmail: varchar("notification_email"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect;
export type InsertUserNotificationSettings = typeof userNotificationSettings.$inferInsert;

export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  leadAssignedEnabled: z.boolean().optional(),
  appointmentReminderEnabled: z.boolean().optional(),
  dealUpdateEnabled: z.boolean().optional(),
  taskDueEnabled: z.boolean().optional(),
  systemEnabled: z.boolean().optional(),
  appointmentReminderTimes: z.array(z.number()).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  notificationEmail: z.string().email().optional().nullable(),
});

export const userVideoPreferences = pgTable("user_video_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoId: varchar("video_id", { length: 50 }).notNull(),
  videoName: varchar("video_name", { length: 255 }),
  videoThumbnail: varchar("video_thumbnail", { length: 500 }),
  videoDuration: integer("video_duration"),
  isFavorite: boolean("is_favorite").default(false),
  isWatchLater: boolean("is_watch_later").default(false),
  watchProgress: integer("watch_progress").default(0),
  watchPercentage: integer("watch_percentage").default(0),
  lastWatchedAt: timestamp("last_watched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_video_prefs_user_id").on(table.userId),
  uniqueIndex("idx_user_video_prefs_unique").on(table.userId, table.videoId),
]);

export type UserVideoPreference = typeof userVideoPreferences.$inferSelect;
export type InsertUserVideoPreference = typeof userVideoPreferences.$inferInsert;

export const videoFavoriteSchema = z.object({
  videoName: z.string().optional(),
  videoThumbnail: z.string().optional(),
  videoDuration: z.number().optional(),
});

export const videoProgressSchema = z.object({
  progress: z.number().min(0),
  percentage: z.number().min(0).max(100),
  videoName: z.string().optional(),
  videoThumbnail: z.string().optional(),
  videoDuration: z.number().optional(),
});

export const syncStatus = pgTable('sync_status', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar('user_id').references(() => users.id).notNull(),
  section: varchar('section', { length: 50 }).notNull(),
  lastManualRefresh: timestamp('last_manual_refresh'),
  lastAutoRefresh: timestamp('last_auto_refresh'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type SyncStatus = typeof syncStatus.$inferSelect;
export type InsertSyncStatus = typeof syncStatus.$inferInsert;

export const savedContentIdeas = pgTable('saved_content_ideas', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar('user_id').references(() => users.id).notNull(),
  month: varchar('month', { length: 20 }).notNull(),
  year: integer('year').notNull(),
  week: integer('week').notNull(),
  theme: varchar('theme', { length: 100 }),
  platform: varchar('platform', { length: 50 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  bestTime: varchar('best_time', { length: 50 }),
  content: text('content').notNull(),
  hashtags: text('hashtags'),
  status: varchar('status', { length: 20 }).default('saved'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index("idx_saved_content_ideas_user_id").on(table.userId),
]);

export type SavedContentIdea = typeof savedContentIdeas.$inferSelect;
export type InsertSavedContentIdea = typeof savedContentIdeas.$inferInsert;

export const saveContentIdeaSchema = z.object({
  month: z.string().min(1).max(20),
  year: z.number().int().min(2000).max(2100),
  week: z.number().int().min(1).max(5),
  theme: z.string().max(100).optional(),
  platform: z.string().min(1).max(50),
  contentType: z.string().min(1).max(50),
  bestTime: z.string().max(50).optional(),
  content: z.string().min(1),
  hashtags: z.union([z.array(z.string()), z.string()]).optional()
});

export const updateContentIdeaStatusSchema = z.object({
  status: z.enum(['saved', 'scheduled', 'posted'])
});

// CMA Brochure type
export interface CmaBrochure {
  type: "pdf" | "image";
  url: string;
  thumbnail?: string;
  filename: string;
  generated: boolean;
  uploadedAt: string;
}

// CMA Adjustment Rates
export interface CmaAdjustmentRates {
  sqftPerUnit: number;
  bedroomValue: number;
  bathroomValue: number;
  poolValue: number;
  garagePerSpace: number;
  yearBuiltPerYear: number;
  lotSizePerSqft: number;
}

// CMA Comparable Adjustment Overrides
export interface CmaCompAdjustmentOverrides {
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  pool: number | null;
  garage: number | null;
  yearBuilt: number | null;
  lotSize: number | null;
  custom: { name: string; value: number }[];
}

// CMA Adjustments Data
export interface CmaAdjustmentsData {
  rates: CmaAdjustmentRates;
  compAdjustments: Record<string, CmaCompAdjustmentOverrides>;
  enabled: boolean;
}

// Cover Page Config
export interface CoverPageConfig {
  title: string;
  subtitle: string;
  showDate: boolean;
  showAgentPhoto: boolean;
  background: "none" | "gradient" | "property";
}

// Default adjustment rates
export const DEFAULT_ADJUSTMENT_RATES: CmaAdjustmentRates = {
  sqftPerUnit: 50,
  bedroomValue: 10000,
  bathroomValue: 7500,
  poolValue: 25000,
  garagePerSpace: 5000,
  yearBuiltPerYear: 1000,
  lotSizePerSqft: 2,
};

// CMA (Comparative Market Analysis) tables
export const cmas = pgTable("cmas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  subjectProperty: jsonb("subject_property"), // { address, city, state, zip, listPrice, beds, baths, sqft, mlsNumber, photo }
  comparableProperties: jsonb("comparable_properties").default([]), // array of comparable property objects
  notes: text("notes"),
  status: varchar("status").default("draft"), // 'draft', 'completed', 'shared'
  presentationConfig: jsonb("presentation_config"), // { sections: [...], layout: { theme, primaryColor } }
  // Presentation Builder fields (migrated from Contract Conduit)
  shareToken: varchar("share_token").unique(), // for public share links
  shareCreatedAt: timestamp("share_created_at"), // when share link was created
  propertiesData: jsonb("properties_data").$type<any[]>(), // full properties data from Repliers MLS
  preparedFor: text("prepared_for"), // client name the CMA is prepared for
  suggestedListPrice: integer("suggested_list_price"), // suggested price
  coverLetter: text("cover_letter"), // custom cover letter
  brochure: jsonb("brochure").$type<CmaBrochure>(), // listing brochure config
  adjustments: jsonb("adjustments").$type<CmaAdjustmentsData>(), // property value adjustments
  expiresAt: timestamp("expires_at"), // share link expiry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cmas_user_id").on(table.userId),
]);

export type Cma = typeof cmas.$inferSelect;
export type InsertCma = typeof cmas.$inferInsert;

// CMA Report Configs table - 1:1 with cmas for presentation settings
export const cmaReportConfigs = pgTable("cma_report_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cmaId: varchar("cma_id").notNull().unique(), // References cmas.id
  includedSections: jsonb("included_sections").$type<string[]>(),
  sectionOrder: jsonb("section_order").$type<string[]>(),
  coverLetterOverride: text("cover_letter_override"),
  layout: text("layout").default("two_photos"), // two_photos, single_photo, no_photos
  template: text("template").default("default"),
  theme: text("theme").default("spyglass"),
  photoLayout: text("photo_layout").default("first_dozen"), // first_dozen, all, ai_suggested, custom
  mapStyle: text("map_style").default("streets"), // streets, satellite, dark
  showMapPolygon: boolean("show_map_polygon").default(true),
  includeAgentFooter: boolean("include_agent_footer").default(true),
  coverPageConfig: jsonb("cover_page_config").$type<CoverPageConfig>(),
  customPhotoSelections: jsonb("custom_photo_selections").$type<Record<string, string[]>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CmaReportConfig = typeof cmaReportConfigs.$inferSelect;
export type InsertCmaReportConfig = typeof cmaReportConfigs.$inferInsert;

// CMA Report Templates - user-owned reusable templates
export const cmaReportTemplates = pgTable("cma_report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  includedSections: jsonb("included_sections").$type<string[]>(),
  sectionOrder: jsonb("section_order").$type<string[]>(),
  coverLetterOverride: text("cover_letter_override"),
  layout: text("layout").default("two_photos"),
  theme: text("theme").default("spyglass"),
  photoLayout: text("photo_layout").default("first_dozen"),
  mapStyle: text("map_style").default("streets"),
  showMapPolygon: boolean("show_map_polygon").default(true),
  includeAgentFooter: boolean("include_agent_footer").default(true),
  coverPageConfig: jsonb("cover_page_config").$type<CoverPageConfig>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CmaReportTemplate = typeof cmaReportTemplates.$inferSelect;
export type InsertCmaReportTemplate = typeof cmaReportTemplates.$inferInsert;

// CMA Statistics types
export interface CmaStatRange {
  min: number;
  max: number;
}

export interface CmaStatMetric {
  range: CmaStatRange;
  average: number;
  median: number;
}

export interface PropertyStatistics {
  price: CmaStatMetric;
  pricePerSqFt: CmaStatMetric;
  daysOnMarket: CmaStatMetric;
  livingArea: CmaStatMetric;
  lotSize: CmaStatMetric;
  acres: CmaStatMetric;
  bedrooms: CmaStatMetric;
  bathrooms: CmaStatMetric;
  yearBuilt: CmaStatMetric;
}

export interface TimelineDataPoint {
  date: string;
  price: number;
  status: string;
  propertyId: string;
  address: string;
  daysOnMarket: number | null;
  cumulativeDaysOnMarket: number | null;
}

// CMA Comparable type (for shared views)
export interface CMAComparable {
  address: string;
  price: number;
  listPrice?: number;
  closePrice?: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | string;
  daysOnMarket: number;
  distance: number;
  imageUrl?: string;
  photos?: string[];
  mlsNumber?: string;
  status?: string;
  listDate?: string;
  closeDate?: string;
  yearBuilt?: number;
  description?: string; // MLS property description ("About This Home")
  map?: {
    latitude: number;
    longitude: number;
  };
}

// Property interface for CMA and search results (from Repliers API)
export interface Property {
  id: string;
  mlsNumber?: string;
  unparsedAddress: string;
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  city: string;
  state?: string;
  postalCode: string;
  county?: string;

  // Property characteristics
  bedrooms?: number;
  bathrooms?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  sqft?: number;
  livingArea?: number;
  lotSize?: number;
  lotSizeAcres?: number;
  yearBuilt?: number;
  propertyType?: string;
  propertySubType?: string;
  stories?: number;
  garage?: string;
  garageSpaces?: number;

  // Status and dates
  standardStatus?: string;
  status?: string;
  listDate?: string;
  listingContractDate?: string;
  soldDate?: string;
  closeDate?: string;
  daysOnMarket?: number;
  simpleDaysOnMarket?: number | null;
  cumulativeDaysOnMarket?: number | null;

  // Pricing
  listPrice?: number;
  originalListPrice?: number;
  soldPrice?: number;
  closePrice?: number;
  pricePerSqft?: number;

  // Location
  latitude?: number;
  longitude?: number;
  subdivision?: string;
  neighborhood?: string;

  // School information
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;

  // Media
  photos?: string[];
  photoCount?: number;
  virtualTourUrl?: string;

  // Description
  description?: string;
  publicRemarks?: string;

  // Features
  interiorFeatures?: string[];
  exteriorFeatures?: string[];
  appliances?: string[];
  heatingCooling?: string[];
  flooring?: string[];
  pool?: string;

  // Listing agent info
  listingAgent?: string;
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingOffice?: string;
  listingOfficeName?: string;

  // Financial
  hoaFee?: number;
  hoaFrequency?: string;
  taxAmount?: number;
  taxYear?: number;

  // Search API specific fields
  type?: string;
  class?: string;
  transactionType?: string;

  // Legacy/alternate field names (for compatibility with different data sources)
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  lotSizeSquareFeet?: number;
  stateOrProvince?: string;
  middleOrJuniorSchool?: string;

  // Additional raw data
  details?: Record<string, any>;
  rawData?: Record<string, any>;
}

// Helper schema for optional URLs that auto-prepends https:// if missing
const optionalUrlSchema = z
  .string()
  .transform((val) => {
    if (!val || val.trim() === "") return "";
    let url = val.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    return url;
  })
  .refine(
    (val) => {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Please enter a valid URL (e.g., facebook.com/yourprofile)" }
  )
  .optional()
  .or(z.literal(''));

// Agent profile update validation schema (for CMA presentation settings)
export const updateAgentProfileSchema = z.object({
  title: z.string().optional(),
  headshotUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().optional(),
  defaultCoverLetter: z.string().optional(),
  facebookUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  linkedinUrl: optionalUrlSchema,
  twitterUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  marketingCompany: z.string().optional(),
});

export type UpdateAgentProfile = z.infer<typeof updateAgentProfileSchema>;

// =====================================================// Pulse V2 — Reventure-level data tables
// ============================================================

// Zillow home value data (ZHVI + ZORI)
export const pulseZillowData = pgTable("pulse_zillow_data", {
  id: serial("id").primaryKey(),
  zip: varchar("zip", { length: 5 }).notNull(),
  date: date("date").notNull(),
  homeValue: numeric("home_value"),                     // ZHVI all homes
  singleFamilyValue: numeric("single_family_value"),    // ZHVI single-family
  condoValue: numeric("condo_value"),                   // ZHVI condo
  rentValue: numeric("rent_value"),                     // ZORI rent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_pulse_zillow_zip_date").on(table.zip, table.date),
  index("idx_pulse_zillow_zip").on(table.zip),
]);

export type PulseZillowData = typeof pulseZillowData.$inferSelect;
export type InsertPulseZillowData = typeof pulseZillowData.$inferInsert;

// Census ACS demographic data
export const pulseCensusData = pgTable("pulse_census_data", {
  id: serial("id").primaryKey(),
  zip: varchar("zip", { length: 5 }).notNull(),
  year: integer("year").notNull(),
  population: integer("population"),
  medianIncome: numeric("median_income"),
  medianAge: numeric("median_age"),
  homeownershipRate: numeric("homeownership_rate"),
  povertyRate: numeric("poverty_rate"),
  collegeDegreeRate: numeric("college_degree_rate"),
  remoteWorkPct: numeric("remote_work_pct"),
  housingUnits: integer("housing_units"),
  familyHouseholdsPct: numeric("family_households_pct"),
  homeowners25to44Pct: numeric("homeowners_25_to_44_pct"),
  homeowners75plusPct: numeric("homeowners_75_plus_pct"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_pulse_census_zip_year").on(table.zip, table.year),
  index("idx_pulse_census_zip").on(table.zip),
]);

export type PulseCensusData = typeof pulseCensusData.$inferSelect;
export type InsertPulseCensusData = typeof pulseCensusData.$inferInsert;

// Redfin market tracker data
export const pulseRedfinData = pgTable("pulse_redfin_data", {
  id: serial("id").primaryKey(),
  zip: varchar("zip", { length: 5 }).notNull(),
  periodStart: date("period_start").notNull(),
  medianSalePrice: numeric("median_sale_price"),
  homesSold: integer("homes_sold"),
  medianDom: integer("median_dom"),
  inventory: integer("inventory"),
  priceDropsPct: numeric("price_drops_pct"),
  saleToListRatio: numeric("sale_to_list_ratio"),
  newListings: integer("new_listings"),
  avgSaleToList: numeric("avg_sale_to_list"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_pulse_redfin_zip_period").on(table.zip, table.periodStart),
  index("idx_pulse_redfin_zip").on(table.zip),
]);

export type PulseRedfinData = typeof pulseRedfinData.$inferSelect;
export type InsertPulseRedfinData = typeof pulseRedfinData.$inferInsert;

// Calculated / derived pulse metrics
export const pulseMetrics = pgTable("pulse_metrics", {
  id: serial("id").primaryKey(),
  zip: varchar("zip", { length: 5 }).notNull(),
  date: date("date").notNull(),
  overvaluedPct: numeric("overvalued_pct"),
  valueIncomeRatio: numeric("value_income_ratio"),
  mortgagePayment: numeric("mortgage_payment"),
  mtgPctIncome: numeric("mtg_pct_income"),
  salaryToAfford: numeric("salary_to_afford"),
  buyVsRent: numeric("buy_vs_rent"),
  capRate: numeric("cap_rate"),
  priceForecast: numeric("price_forecast"),
  investorScore: numeric("investor_score"),
  growthScore: numeric("growth_score"),
  marketHealthScore: numeric("market_health_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_pulse_metrics_zip_date").on(table.zip, table.date),
  index("idx_pulse_metrics_zip").on(table.zip),
]);

export type PulseMetrics = typeof pulseMetrics.$inferSelect;
export type InsertPulseMetrics = typeof pulseMetrics.$inferInsert;

// Integration Configs - store API keys for external services
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(), // 'fub', 'ghl', 'sendblue', etc.
  displayName: varchar("display_name", { length: 255 }).notNull(),
  apiKey: text("api_key").notNull(),
  additionalConfig: jsonb("additional_config"), // { systemName, systemKey, accountId, etc. }
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestResult: varchar("last_test_result", { length: 50 }), // 'success', 'failed', 'unknown'
  lastTestMessage: text("last_test_message"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = typeof integrationConfigs.$inferInsert;

export const upsertIntegrationConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  additionalConfig: z.record(z.any()).optional(),
});

// App Visibility table — persists which apps are hidden from agent dashboard
export const appVisibility = pgTable("app_visibility", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appId: varchar("app_id").unique().notNull(),
  hidden: boolean("hidden").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppVisibility = typeof appVisibility.$inferSelect;
export type InsertAppVisibility = typeof appVisibility.$inferInsert;

// GreatSchools nearby schools cache
export const pulseSchoolsCache = pgTable("pulse_schools_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key", { length: 50 }).notNull().unique(), // "lat,lon,radius"
  lat: numeric("lat").notNull(),
  lon: numeric("lon").notNull(),
  radius: integer("radius").notNull().default(5),
  data: jsonb("data").notNull(), // Array of school objects
  fetchedAt: timestamp("fetched_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_pulse_schools_cache_key").on(table.cacheKey),
]);

export type PulseSchoolsCache = typeof pulseSchoolsCache.$inferSelect;
export type InsertPulseSchoolsCache = typeof pulseSchoolsCache.$inferInsert;

// ── Communities (SEO content editor) ────────────────────────────────────
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  county: varchar("county", { length: 100 }),
  // Location data fields
  locationType: varchar("location_type", { length: 20 }).notNull().default('polygon'), // 'polygon' | 'zip' | 'city'
  filterValue: varchar("filter_value", { length: 50 }), // for zip/city types (e.g. "78704", "Bastrop")
  polygon: jsonb("polygon").$type<[number, number][]>(), // array of [lng, lat] coordinates
  displayPolygon: jsonb("display_polygon").$type<[number, number][]>(), // array of [lat, lng] for Leaflet
  centroid: jsonb("centroid").$type<{ lat: number; lng: number }>(), // center point
  heroImage: text("hero_image"), // URL for hero image
  parentSlug: varchar("parent_slug", { length: 255 }), // for nesting (e.g. zip belongs to city)
  // SEO fields
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  focusKeyword: varchar("focus_keyword", { length: 255 }),
  // Content fields
  description: text("description"),
  highlights: jsonb("highlights").$type<string[]>(),
  bestFor: jsonb("best_for").$type<string[]>(),
  nearbyLandmarks: jsonb("nearby_landmarks").$type<string[]>(),
  sections: jsonb("sections").$type<{ id: string; heading: string; content: string; order: number }[]>(),
  published: boolean("published").default(false),
  featured: boolean("featured").default(false),
  // Enhanced SEO fields (Phase 1)
  customSlug: varchar("custom_slug", { length: 255 }),
  featuredImageUrl: varchar("featured_image_url", { length: 500 }),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  breadcrumbPath: jsonb("breadcrumb_path"),
  indexingDirective: varchar("indexing_directive", { length: 20 }).default('index,follow'),
  customSchema: jsonb("custom_schema"),
  seoScore: integer("seo_score"),
  seoIssues: jsonb("seo_issues"),
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 255 }),
}, (table) => [
  uniqueIndex("idx_communities_slug").on(table.slug),
  index("idx_communities_county").on(table.county),
  index("idx_communities_published").on(table.published),
  index("idx_communities_location_type").on(table.locationType),
  index("idx_communities_custom_slug").on(table.customSlug),
  index("idx_communities_seo_score").on(table.seoScore),
  index("idx_communities_updated_at").on(table.updatedAt),
  index("idx_communities_featured").on(table.featured),
  index("idx_communities_published_featured").on(table.published, table.featured),
]);

// Update communities table with new SEO fields
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = typeof communities.$inferInsert;

// Site Content table — stores homepage section content as JSON blobs
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  section: varchar("section", { length: 100 }).notNull().unique(),
  content: jsonb("content").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_site_content_section").on(table.section),
]);

export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = typeof siteContent.$inferInsert;
// ── CMS Enhancement Phase 1 Tables ──────────────────────────────────────────

// ── 1. Redirects Management ──────────────────────────────────────────────────
export const redirects = pgTable("redirects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceUrl: varchar("source_url", { length: 500 }).notNull(),
  destinationUrl: varchar("destination_url", { length: 500 }).notNull(),
  redirectType: varchar("redirect_type", { length: 10 }).notNull().default('301'), // '301' or '302'
  description: text("description"),
  isActive: boolean("is_active").default(true),
  hitCount: integer("hit_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
}, (table) => [
  // Create unique index on source_url for active redirects to prevent conflicts
  uniqueIndex("idx_redirects_active_source").on(table.sourceUrl).where(sql`${table.isActive} = true`),
  index("idx_redirects_source").on(table.sourceUrl),
  index("idx_redirects_active").on(table.isActive),
  index("idx_redirects_created_at").on(table.createdAt),
]);

export type Redirect = typeof redirects.$inferSelect;
export type InsertRedirect = typeof redirects.$inferInsert;

// ── 2. Global Tracking Scripts Management ─────────────────────────────────────
export const globalScripts = pgTable("global_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  scriptType: varchar("script_type", { length: 50 }).notNull(), // 'google_analytics', 'google_tag_manager', 'meta_pixel', 'microsoft_clarity', 'custom'
  position: varchar("position", { length: 20 }).notNull().default('head'), // 'head' or 'body'
  scriptContent: text("script_content").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0), // higher number = higher priority (loads first)
  description: text("description"),
  configuration: jsonb("configuration"), // store additional config like tracking IDs, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
}, (table) => [
  index("idx_global_scripts_enabled").on(table.isEnabled),
  index("idx_global_scripts_type").on(table.scriptType),
  index("idx_global_scripts_position").on(table.position),
  index("idx_global_scripts_priority").on(table.priority),
]);

export type GlobalScript = typeof globalScripts.$inferSelect;
export type InsertGlobalScript = typeof globalScripts.$inferInsert;

// ── 3. SEO Templates & Settings ───────────────────────────────────────────────
export const seoTemplates = pgTable("seo_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  pageType: varchar("page_type", { length: 50 }).notNull(), // 'community', 'blog', 'agent', 'landing'
  titleTemplate: varchar("title_template", { length: 255 }), // e.g. "{{name}} - Homes for Sale | {{company}}"
  descriptionTemplate: text("description_template"),
  schemaTemplate: jsonb("schema_template"), // JSON-LD schema template
  breadcrumbConfig: jsonb("breadcrumb_config"), // breadcrumb hierarchy rules
  defaultIndexing: varchar("default_indexing", { length: 20 }).default('index,follow'), // 'index,follow', 'noindex,follow', etc.
  ogImageTemplate: varchar("og_image_template", { length: 500 }), // template for OG image generation
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
}, (table) => [
  index("idx_seo_templates_page_type").on(table.pageType),
  index("idx_seo_templates_default").on(table.isDefault),
]);

export type SeoTemplate = typeof seoTemplates.$inferSelect;
export type InsertSeoTemplate = typeof seoTemplates.$inferInsert;

// ── 4. Page-Level SEO Overrides ───────────────────────────────────────────────
export const pageSeoSettings = pgTable("page_seo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageType: varchar("page_type", { length: 50 }).notNull(), // 'community', 'blog', 'agent', 'landing'
  pageIdentifier: varchar("page_identifier", { length: 255 }).notNull(), // slug, ID, or other unique identifier
  customTitle: varchar("custom_title", { length: 255 }),
  customDescription: text("custom_description"),
  customSlug: varchar("custom_slug", { length: 255 }),
  featuredImageUrl: varchar("featured_image_url", { length: 500 }),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  breadcrumbPath: jsonb("breadcrumb_path"), // custom breadcrumb override
  indexingDirective: varchar("indexing_directive", { length: 20 }).default('index,follow'),
  customSchema: jsonb("custom_schema"), // custom JSON-LD schema
  focusKeyword: varchar("focus_keyword", { length: 255 }),
  seoScore: integer("seo_score"), // calculated SEO score (0-100)
  seoIssues: jsonb("seo_issues"), // array of SEO issues found
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
}, (table) => [
  // Ensure one SEO setting per page
  uniqueIndex("idx_page_seo_unique").on(table.pageType, table.pageIdentifier),
  index("idx_page_seo_page_type").on(table.pageType),
  index("idx_page_seo_score").on(table.seoScore),
]);

export type PageSeoSettings = typeof pageSeoSettings.$inferSelect;
export type InsertPageSeoSettings = typeof pageSeoSettings.$inferInsert;

// ── 5. Internal Link Management ───────────────────────────────────────────────
export const internalLinks = pgTable("internal_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourcePageType: varchar("source_page_type", { length: 50 }).notNull(),
  sourcePageId: varchar("source_page_id", { length: 255 }).notNull(),
  targetPageType: varchar("target_page_type", { length: 50 }).notNull(),
  targetPageId: varchar("target_page_id", { length: 255 }).notNull(),
  anchorText: varchar("anchor_text", { length: 255 }).notNull(),
  linkContext: text("link_context"), // surrounding text for context
  position: integer("position"), // position within content
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_internal_links_source").on(table.sourcePageType, table.sourcePageId),
  index("idx_internal_links_target").on(table.targetPageType, table.targetPageId),
  index("idx_internal_links_active").on(table.isActive),
]);

export type InternalLink = typeof internalLinks.$inferSelect;
export type InsertInternalLink = typeof internalLinks.$inferInsert;

// ── CMS Enhancement Phase 3: Agent Pages + Landing Pages ─────────────────────

// ── Agent Directory (Phase 3A) ───────────────────────────────────────────────
export const agentDirectoryProfiles = pgTable("agent_directory_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  fubEmail: varchar("fub_email", { length: 255 }), // Follow Up Boss routing email
  officeLocation: varchar("office_location", { length: 50 }).notNull(), // Austin/Houston/Corpus Christi
  bio: text("bio"),
  professionalTitle: varchar("professional_title", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  headshotUrl: varchar("headshot_url", { length: 500 }),
  socialLinks: jsonb("social_links").$type<{
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  }>(),
  subdomain: varchar("subdomain", { length: 100 }).unique(), // For agentname.spyglassrealty.com
  isVisible: boolean("is_visible").default(true),
  sortOrder: integer("sort_order").default(0),
  
  // SEO fields (reusing SeoPanel pattern)
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  indexingDirective: varchar("indexing_directive", { length: 20 }).default('index,follow'),
  customSchema: jsonb("custom_schema"),
  seoScore: integer("seo_score"),
  
  // Custom content
  videoUrl: varchar("video_url", { length: 500 }), // Custom intro video
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agent_directory_visible").on(table.isVisible),
  index("idx_agent_directory_office").on(table.officeLocation),
  index("idx_agent_directory_sort").on(table.sortOrder),
  index("idx_agent_directory_name").on(table.firstName, table.lastName),
  index("idx_agent_directory_subdomain").on(table.subdomain),
]);

export type AgentDirectoryProfile = typeof agentDirectoryProfiles.$inferSelect;
export type InsertAgentDirectoryProfile = typeof agentDirectoryProfiles.$inferInsert;

// ── Landing Pages (Phase 3B) ─────────────────────────────────────────────────
export const landingPages = pgTable("landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  pageType: varchar("page_type", { length: 50 }).notNull(), // buy/sell/cash-offer/trade-in/relocation/join-team/join-real/about/newsroom/faq/custom
  content: text("content").notNull(), // Rich HTML content
  sections: jsonb("sections").$type<Array<{
    id: string;
    heading: string;
    content: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    order: number;
  }>>().default([]),
  
  // SEO fields
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  indexingDirective: varchar("indexing_directive", { length: 20 }).default('index,follow'),
  customSchema: jsonb("custom_schema"),
  seoScore: integer("seo_score"),
  breadcrumbPath: jsonb("breadcrumb_path").$type<Array<{ name: string; url: string }>>(),
  
  // Page-specific scripts and content
  customScripts: text("custom_scripts"), // For page-specific scripts/schema
  
  // Publishing
  isPublished: boolean("is_published").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_landing_pages_slug").on(table.slug),
  index("idx_landing_pages_type").on(table.pageType),
  index("idx_landing_pages_published").on(table.isPublished),
  index("idx_landing_pages_seo_score").on(table.seoScore),
]);

export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = typeof landingPages.$inferInsert;

// ── CMS Enhancement Phase 2: Blog System ─────────────────────────────────────

// ── Blog Authors ──────────────────────────────────────────────────────────────
export const blogAuthors = pgTable("blog_authors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  socialLinks: jsonb("social_links").$type<{
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_blog_authors_email").on(table.email),
]);

export type BlogAuthor = typeof blogAuthors.$inferSelect;
export type InsertBlogAuthor = typeof blogAuthors.$inferInsert;

// ── Blog Categories ───────────────────────────────────────────────────────────
export const blogCategories = pgTable("blog_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  parentId: varchar("parent_id"), // Self-referencing for hierarchy
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_blog_categories_slug").on(table.slug),
  index("idx_blog_categories_parent").on(table.parentId),
  index("idx_blog_categories_sort").on(table.sortOrder),
]);

export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

// ── Blog Posts ─────────────────────────────────────────────────────────────────
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(), // Rich text/HTML content
  excerpt: text("excerpt"),
  featuredImageUrl: varchar("featured_image_url", { length: 500 }),
  ogImageUrl: varchar("og_image_url", { length: 500 }),
  authorId: varchar("author_id").notNull().references(() => blogAuthors.id),
  status: varchar("status", { length: 20 }).notNull().default('draft'), // 'draft', 'published', 'scheduled'
  publishedAt: timestamp("published_at"),
  categoryIds: jsonb("category_ids").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  
  // SEO fields (reusing SeoPanel pattern)
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  indexingDirective: varchar("indexing_directive", { length: 20 }).default('index,follow'),
  customSchema: jsonb("custom_schema"),
  seoScore: integer("seo_score"),
  seoIssues: jsonb("seo_issues").$type<string[]>(),
  canonicalUrl: varchar("canonical_url", { length: 500 }),
  breadcrumbPath: jsonb("breadcrumb_path").$type<Array<{ name: string; url: string }>>(),
  
  // Content features
  tableOfContents: jsonb("table_of_contents").$type<Array<{ id: string; title: string; level: number }>>(),
  ctaConfig: jsonb("cta_config").$type<{
    enabled: boolean;
    title?: string;
    description?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>(),
  readingTime: integer("reading_time"), // Estimated reading time in minutes
  viewCount: integer("view_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_blog_posts_slug").on(table.slug),
  index("idx_blog_posts_status").on(table.status),
  index("idx_blog_posts_author").on(table.authorId),
  index("idx_blog_posts_published").on(table.publishedAt),
  index("idx_blog_posts_seo_score").on(table.seoScore),
  index("idx_blog_posts_status_published").on(table.status, table.publishedAt),
  index("idx_blog_posts_updated").on(table.updatedAt),
]);

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// ── Blog Post Categories Junction (for many-to-many) ──────────────────────────
export const blogPostCategories = pgTable("blog_post_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").notNull().references(() => blogCategories.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex("idx_blog_post_categories_unique").on(table.postId, table.categoryId),
  index("idx_blog_post_categories_post").on(table.postId),
  index("idx_blog_post_categories_category").on(table.categoryId),
]);

export type BlogPostCategory = typeof blogPostCategories.$inferSelect;
export type InsertBlogPostCategory = typeof blogPostCategories.$inferInsert;

// ── CMS Enhancement Phase 4: Testimonials & Reviews System ──────────────────

// ── Testimonials (Phase 4A) ──────────────────────────────────────────────────
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
  reviewerLocation: varchar("reviewer_location", { length: 255 }),
  reviewText: text("review_text").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  source: varchar("source", { length: 50 }).notNull().default('manual'), // google/zillow/facebook/manual
  sourceUrl: varchar("source_url", { length: 500 }),
  agentId: varchar("agent_id"), // Optional - link to agent directory profile
  communitySlug: varchar("community_slug", { length: 255 }), // Optional - link to community
  photoUrl: varchar("photo_url", { length: 500 }),
  isApproved: boolean("is_approved").default(false),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_testimonials_approved").on(table.isApproved),
  index("idx_testimonials_featured").on(table.isFeatured),
  index("idx_testimonials_rating").on(table.rating),
  index("idx_testimonials_source").on(table.source),
  index("idx_testimonials_agent").on(table.agentId),
  index("idx_testimonials_community").on(table.communitySlug),
  index("idx_testimonials_display_order").on(table.displayOrder),
]);

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

// ── Review Sources (Phase 4B) ────────────────────────────────────────────────
export const reviewSources = pgTable("review_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform", { length: 50 }).notNull(), // google/zillow/facebook
  placeId: varchar("place_id", { length: 255 }), // Google place ID
  apiKey: varchar("api_key", { length: 500 }), // Optional API key for platform
  lastSyncedAt: timestamp("last_synced_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_review_sources_platform").on(table.platform),
  index("idx_review_sources_active").on(table.isActive),
]);

export type ReviewSource = typeof reviewSources.$inferSelect;
export type InsertReviewSource = typeof reviewSources.$inferInsert;

// ── Agent Onboarding System ──────────────────────────────
export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  office: text("office").default("all"),
  agentType: text("agent_type").default("experienced"),
  phases: jsonb("phases").notNull().default([]),
  welcomeSequence: jsonb("welcome_sequence").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const agentOnboardings = pgTable("agent_onboardings", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  agentEmail: text("agent_email").notNull(),
  agentPhone: text("agent_phone"),
  office: text("office").notNull().default("austin"),
  licenseNumber: text("license_number"),
  startDate: timestamp("start_date", { mode: "date" }),
  templateId: integer("template_id").references(() => onboardingTemplates.id),
  status: text("status").default("in_progress"),
  checklistState: jsonb("checklist_state").notNull().default({}),
  progressPct: integer("progress_pct").default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: text("created_by"),
  recruitingSource: text("recruiting_source"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const onboardingActivity = pgTable("onboarding_activity", {
  id: serial("id").primaryKey(),
  onboardingId: integer("onboarding_id").notNull().references(() => agentOnboardings.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  phaseId: text("phase_id"),
  stepId: text("step_id"),
  performedBy: text("performed_by").default("system"),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;
export type InsertOnboardingTemplate = typeof onboardingTemplates.$inferInsert;
export type AgentOnboarding = typeof agentOnboardings.$inferSelect;
export type InsertAgentOnboarding = typeof agentOnboardings.$inferInsert;
export type OnboardingActivityEntry = typeof onboardingActivity.$inferSelect;
export type InsertOnboardingActivity = typeof onboardingActivity.$inferInsert;

export const INTEGRATION_DEFINITIONS = [
  {
    name: 'fub',
    displayName: 'Follow Up Boss',
    description: 'CRM for lead management, tasks, and deal tracking',
    icon: 'FUB',
    color: 'bg-blue-600',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const },
    ],
    additionalFields: [
      { key: 'systemName', label: 'System Name', type: 'text' as const, default: 'MissionControl' },
      { key: 'systemKey', label: 'System Key', type: 'password' as const, optional: true },
    ],
    testEndpoint: true,
  },
  {
    name: 'ghl',
    displayName: 'GoHighLevel',
    description: 'Marketing automation and CRM platform',
    icon: 'GHL',
    color: 'bg-green-600',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const },
    ],
    additionalFields: [
      { key: 'locationId', label: 'Location ID', type: 'text' as const, optional: true },
    ],
    testEndpoint: true,
  },
  {
    name: 'sendblue',
    displayName: 'SendBlue',
    description: 'SMS and iMessage marketing platform',
    icon: 'SB',
    color: 'bg-sky-500',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const },
    ],
    additionalFields: [
      { key: 'apiSecret', label: 'API Secret', type: 'password' as const, optional: true },
    ],
    testEndpoint: true,
  },
  {
    name: 'idx_grid',
    displayName: 'IDX / Repliers',
    description: 'MLS listing data and property search',
    icon: 'IDX',
    color: 'bg-orange-500',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const },
    ],
    additionalFields: [],
    testEndpoint: true,
  },
  {
    name: 'vimeo',
    displayName: 'Vimeo',
    description: 'Training video hosting and playback',
    icon: 'V',
    color: 'bg-cyan-600',
    fields: [
      { key: 'apiKey', label: 'Access Token', type: 'password' as const },
    ],
    additionalFields: [
      { key: 'userId', label: 'User ID', type: 'text' as const, optional: true },
      { key: 'folderId', label: 'Folder ID', type: 'text' as const, optional: true },
    ],
    testEndpoint: true,
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'AI-powered content generation and chat',
    icon: 'AI',
    color: 'bg-gray-800',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' as const },
    ],
    additionalFields: [
      { key: 'baseURL', label: 'Base URL (optional)', type: 'text' as const, optional: true },
    ],
    testEndpoint: true,
  },
] as const;

