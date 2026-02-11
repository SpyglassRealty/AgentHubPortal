import { sql } from 'drizzle-orm';
import {
  boolean,
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

// Agent resources for CMA presentations
export const agentResources = pgTable("agent_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'link' or 'file'
  url: text("url"), // For external links
  fileUrl: text("file_url"), // For uploaded files (object storage URL)
  fileName: text("file_name"), // Original file name
  fileData: text("file_data"), // Base64 encoded file content (for database storage)
  fileMimeType: text("file_mime_type"), // MIME type of uploaded file
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AgentResource = typeof agentResources.$inferSelect;
export type InsertAgentResource = typeof agentResources.$inferInsert;

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
  homeValue: numeric("home_value"),           // ZHVI all homes
  homeValueSf: numeric("home_value_sf"),      // ZHVI single-family
  homeValueCondo: numeric("home_value_condo"),// ZHVI condo
  rentalValue: numeric("rental_value"),       // ZORI rent
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

