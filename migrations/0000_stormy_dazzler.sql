CREATE TABLE "agent_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"mission_focus" varchar,
	"experience_level" varchar,
	"primary_goal" varchar,
	"onboarding_answers" jsonb,
	"dismissed_suggestions" text[],
	"last_surveyed_at" timestamp,
	"title" text,
	"headshot_url" text,
	"bio" text,
	"default_cover_letter" text,
	"facebook_url" text,
	"instagram_url" text,
	"linkedin_url" text,
	"twitter_url" text,
	"website_url" text,
	"marketing_company" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"file_url" text,
	"file_name" text,
	"file_data" text,
	"file_mime_type" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"app_id" varchar NOT NULL,
	"page" varchar NOT NULL,
	"click_count" integer DEFAULT 1,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cma_report_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cma_id" varchar NOT NULL,
	"included_sections" jsonb,
	"section_order" jsonb,
	"cover_letter_override" text,
	"layout" text DEFAULT 'two_photos',
	"template" text DEFAULT 'default',
	"theme" text DEFAULT 'spyglass',
	"photo_layout" text DEFAULT 'first_dozen',
	"map_style" text DEFAULT 'streets',
	"show_map_polygon" boolean DEFAULT true,
	"include_agent_footer" boolean DEFAULT true,
	"cover_page_config" jsonb,
	"custom_photo_selections" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cma_report_configs_cma_id_unique" UNIQUE("cma_id")
);
--> statement-breakpoint
CREATE TABLE "cma_report_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"included_sections" jsonb,
	"section_order" jsonb,
	"cover_letter_override" text,
	"layout" text DEFAULT 'two_photos',
	"theme" text DEFAULT 'spyglass',
	"photo_layout" text DEFAULT 'first_dozen',
	"map_style" text DEFAULT 'streets',
	"show_map_polygon" boolean DEFAULT true,
	"include_agent_footer" boolean DEFAULT true,
	"cover_page_config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cmas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"subject_property" jsonb,
	"comparable_properties" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"status" varchar DEFAULT 'draft',
	"presentation_config" jsonb,
	"share_token" varchar,
	"share_created_at" timestamp,
	"properties_data" jsonb,
	"prepared_for" text,
	"suggested_list_price" integer,
	"cover_letter" text,
	"brochure" jsonb,
	"adjustments" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cmas_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "context_suggestions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"suggestion_type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0,
	"payload" jsonb,
	"recommended_app_id" varchar,
	"status" varchar DEFAULT 'active',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"api_key" text NOT NULL,
	"additional_config" jsonb,
	"is_active" boolean DEFAULT true,
	"last_tested_at" timestamp,
	"last_test_result" varchar(50),
	"last_test_message" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "integration_configs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "market_pulse_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_properties" integer NOT NULL,
	"active" integer NOT NULL,
	"active_under_contract" integer NOT NULL,
	"pending" integer NOT NULL,
	"closed" integer NOT NULL,
	"last_updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pulse_census_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"zip" varchar(5) NOT NULL,
	"year" integer NOT NULL,
	"population" integer,
	"median_income" numeric,
	"median_age" numeric,
	"homeownership_rate" numeric,
	"poverty_rate" numeric,
	"college_degree_rate" numeric,
	"remote_work_pct" numeric,
	"housing_units" integer,
	"family_households_pct" numeric,
	"homeowners_25_to_44_pct" numeric,
	"homeowners_75_plus_pct" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pulse_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"zip" varchar(5) NOT NULL,
	"date" date NOT NULL,
	"overvalued_pct" numeric,
	"value_income_ratio" numeric,
	"mortgage_payment" numeric,
	"mtg_pct_income" numeric,
	"salary_to_afford" numeric,
	"buy_vs_rent" numeric,
	"cap_rate" numeric,
	"price_forecast" numeric,
	"investor_score" numeric,
	"growth_score" numeric,
	"market_health_score" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pulse_redfin_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"zip" varchar(5) NOT NULL,
	"period_start" date NOT NULL,
	"median_sale_price" numeric,
	"homes_sold" integer,
	"median_dom" integer,
	"inventory" integer,
	"price_drops_pct" numeric,
	"sale_to_list_ratio" numeric,
	"new_listings" integer,
	"avg_sale_to_list" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pulse_zillow_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"zip" varchar(5) NOT NULL,
	"date" date NOT NULL,
	"home_value" numeric,
	"home_value_sf" numeric,
	"home_value_condo" numeric,
	"rental_value" numeric,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_content_ideas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "saved_content_ideas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"month" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"theme" varchar(100),
	"platform" varchar(50) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"best_time" varchar(50),
	"content" text NOT NULL,
	"hashtags" text,
	"status" varchar(20) DEFAULT 'saved',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_status" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_status_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" varchar NOT NULL,
	"section" varchar(50) NOT NULL,
	"last_manual_refresh" timestamp,
	"last_auto_refresh" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"notifications_enabled" boolean DEFAULT false,
	"lead_assigned_enabled" boolean DEFAULT true,
	"appointment_reminder_enabled" boolean DEFAULT true,
	"deal_update_enabled" boolean DEFAULT true,
	"task_due_enabled" boolean DEFAULT true,
	"system_enabled" boolean DEFAULT true,
	"appointment_reminder_times" jsonb DEFAULT '[1440,60,15]'::jsonb,
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" varchar DEFAULT '22:00',
	"quiet_hours_end" varchar DEFAULT '07:00',
	"email_notifications_enabled" boolean DEFAULT false,
	"notification_email" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_video_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" varchar(50) NOT NULL,
	"video_name" varchar(255),
	"video_thumbnail" varchar(500),
	"video_duration" integer,
	"is_favorite" boolean DEFAULT false,
	"is_watch_later" boolean DEFAULT false,
	"watch_progress" integer DEFAULT 0,
	"watch_percentage" integer DEFAULT 0,
	"last_watched_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"fub_user_id" integer,
	"rezen_yenta_id" varchar,
	"is_super_admin" boolean DEFAULT false,
	"theme" varchar DEFAULT 'light',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage" ADD CONSTRAINT "app_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cmas" ADD CONSTRAINT "cmas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_suggestions" ADD CONSTRAINT "context_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_content_ideas" ADD CONSTRAINT "saved_content_ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_status" ADD CONSTRAINT "sync_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_video_preferences" ADD CONSTRAINT "user_video_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_usage_user_page" ON "app_usage" USING btree ("user_id","page");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_app_usage_unique" ON "app_usage" USING btree ("user_id","app_id","page");--> statement-breakpoint
CREATE INDEX "idx_cmas_user_id" ON "cmas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pulse_census_zip_year" ON "pulse_census_data" USING btree ("zip","year");--> statement-breakpoint
CREATE INDEX "idx_pulse_census_zip" ON "pulse_census_data" USING btree ("zip");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pulse_metrics_zip_date" ON "pulse_metrics" USING btree ("zip","date");--> statement-breakpoint
CREATE INDEX "idx_pulse_metrics_zip" ON "pulse_metrics" USING btree ("zip");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pulse_redfin_zip_period" ON "pulse_redfin_data" USING btree ("zip","period_start");--> statement-breakpoint
CREATE INDEX "idx_pulse_redfin_zip" ON "pulse_redfin_data" USING btree ("zip");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pulse_zillow_zip_date" ON "pulse_zillow_data" USING btree ("zip","date");--> statement-breakpoint
CREATE INDEX "idx_pulse_zillow_zip" ON "pulse_zillow_data" USING btree ("zip");--> statement-breakpoint
CREATE INDEX "idx_saved_content_ideas_user_id" ON "saved_content_ideas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_user_video_prefs_user_id" ON "user_video_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_video_prefs_unique" ON "user_video_preferences" USING btree ("user_id","video_id");