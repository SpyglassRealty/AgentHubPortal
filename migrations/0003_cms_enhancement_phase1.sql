-- ============================================================================
-- CMS Enhancement Phase 1 - Technical/SEO Infrastructure
-- ============================================================================

-- ── 1. Redirects Management ──────────────────────────────────────────────────
CREATE TABLE "redirects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_url" varchar(500) NOT NULL,
  "destination_url" varchar(500) NOT NULL,
  "redirect_type" varchar(10) NOT NULL DEFAULT '301', -- '301' or '302'
  "description" text,
  "is_active" boolean DEFAULT true,
  "hit_count" integer DEFAULT 0,
  "last_accessed" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" varchar(255)
);

-- Create unique index on source_url for active redirects to prevent conflicts
CREATE UNIQUE INDEX "idx_redirects_active_source" ON "redirects" ("source_url") WHERE "is_active" = true;
CREATE INDEX "idx_redirects_source" ON "redirects" ("source_url");
CREATE INDEX "idx_redirects_active" ON "redirects" ("is_active");
CREATE INDEX "idx_redirects_created_at" ON "redirects" ("created_at");

-- ── 2. Global Tracking Scripts Management ─────────────────────────────────────
CREATE TABLE "global_scripts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "script_type" varchar(50) NOT NULL, -- 'google_analytics', 'google_tag_manager', 'meta_pixel', 'microsoft_clarity', 'custom'
  "position" varchar(20) NOT NULL DEFAULT 'head', -- 'head' or 'body'
  "script_content" text NOT NULL,
  "is_enabled" boolean DEFAULT true,
  "priority" integer DEFAULT 0, -- higher number = higher priority (loads first)
  "description" text,
  "configuration" jsonb, -- store additional config like tracking IDs, etc.
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" varchar(255)
);

CREATE INDEX "idx_global_scripts_enabled" ON "global_scripts" ("is_enabled");
CREATE INDEX "idx_global_scripts_type" ON "global_scripts" ("script_type");
CREATE INDEX "idx_global_scripts_position" ON "global_scripts" ("position");
CREATE INDEX "idx_global_scripts_priority" ON "global_scripts" ("priority" DESC);

-- ── 3. SEO Templates & Settings ───────────────────────────────────────────────
CREATE TABLE "seo_templates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "page_type" varchar(50) NOT NULL, -- 'community', 'blog', 'agent', 'landing'
  "title_template" varchar(255), -- e.g. "{{name}} - Homes for Sale | {{company}}"
  "description_template" text,
  "schema_template" jsonb, -- JSON-LD schema template
  "breadcrumb_config" jsonb, -- breadcrumb hierarchy rules
  "default_indexing" varchar(20) DEFAULT 'index,follow', -- 'index,follow', 'noindex,follow', etc.
  "og_image_template" varchar(500), -- template for OG image generation
  "is_default" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" varchar(255)
);

CREATE INDEX "idx_seo_templates_page_type" ON "seo_templates" ("page_type");
CREATE INDEX "idx_seo_templates_default" ON "seo_templates" ("is_default");

-- ── 4. Page-Level SEO Overrides ───────────────────────────────────────────────
CREATE TABLE "page_seo_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "page_type" varchar(50) NOT NULL, -- 'community', 'blog', 'agent', 'landing'
  "page_identifier" varchar(255) NOT NULL, -- slug, ID, or other unique identifier
  "custom_title" varchar(255),
  "custom_description" text,
  "custom_slug" varchar(255),
  "featured_image_url" varchar(500),
  "og_image_url" varchar(500),
  "breadcrumb_path" jsonb, -- custom breadcrumb override
  "indexing_directive" varchar(20) DEFAULT 'index,follow',
  "custom_schema" jsonb, -- custom JSON-LD schema
  "focus_keyword" varchar(255),
  "seo_score" integer, -- calculated SEO score (0-100)
  "seo_issues" jsonb, -- array of SEO issues found
  "canonical_url" varchar(500),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "created_by" varchar(255)
);

-- Ensure one SEO setting per page
CREATE UNIQUE INDEX "idx_page_seo_unique" ON "page_seo_settings" ("page_type", "page_identifier");
CREATE INDEX "idx_page_seo_page_type" ON "page_seo_settings" ("page_type");
CREATE INDEX "idx_page_seo_score" ON "page_seo_settings" ("seo_score");

-- ── 5. Update communities table with new SEO fields ──────────────────────────
-- Add new SEO-related fields to existing communities table
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "custom_slug" varchar(255);
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "featured_image_url" varchar(500);
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "og_image_url" varchar(500);
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "breadcrumb_path" jsonb;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "indexing_directive" varchar(20) DEFAULT 'index,follow';
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "custom_schema" jsonb;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "seo_score" integer;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "seo_issues" jsonb;
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "canonical_url" varchar(500);

-- Create index for custom slug if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_communities_custom_slug" ON "communities" ("custom_slug");
CREATE INDEX IF NOT EXISTS "idx_communities_seo_score" ON "communities" ("seo_score");

-- ── 6. Internal Link Management ───────────────────────────────────────────────
CREATE TABLE "internal_links" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_page_type" varchar(50) NOT NULL,
  "source_page_id" varchar(255) NOT NULL,
  "target_page_type" varchar(50) NOT NULL,
  "target_page_id" varchar(255) NOT NULL,
  "anchor_text" varchar(255) NOT NULL,
  "link_context" text, -- surrounding text for context
  "position" integer, -- position within content
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX "idx_internal_links_source" ON "internal_links" ("source_page_type", "source_page_id");
CREATE INDEX "idx_internal_links_target" ON "internal_links" ("target_page_type", "target_page_id");
CREATE INDEX "idx_internal_links_active" ON "internal_links" ("is_active");

-- ── 7. Add indexes for better performance ─────────────────────────────────────
-- Additional helpful indexes for the CMS features
CREATE INDEX IF NOT EXISTS "idx_communities_updated_at" ON "communities" ("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_communities_featured" ON "communities" ("featured");
CREATE INDEX IF NOT EXISTS "idx_communities_published_featured" ON "communities" ("published", "featured");

-- ── 8. Create some default SEO templates ─────────────────────────────────────
INSERT INTO "seo_templates" ("name", "page_type", "title_template", "description_template", "is_default", "created_by") VALUES
('Default Community Page', 'community', '{{name}} - Homes for Sale & Community Guide | Spyglass Realty', 'Discover homes for sale in {{name}}, {{county}}. Learn about the neighborhood, schools, amenities, and what it''s like to live in this community.', true, 'system'),
('Default Blog Post', 'blog', '{{title}} | Spyglass Realty Blog', '{{excerpt}}', true, 'system'),
('Default Agent Page', 'agent', '{{agent_name}} - Real Estate Agent | Spyglass Realty', 'Meet {{agent_name}}, an experienced real estate agent with Spyglass Realty. {{bio_excerpt}}', true, 'system'),
('Default Landing Page', 'landing', '{{title}} | Spyglass Realty', '{{description}}', true, 'system');

-- ── 9. Create some default global scripts templates ──────────────────────────
INSERT INTO "global_scripts" ("name", "script_type", "position", "script_content", "is_enabled", "priority", "description", "created_by") VALUES
('Google Analytics 4', 'google_analytics', 'head', '<!-- Google Analytics 4 will be configured via admin -->', false, 100, 'Google Analytics 4 tracking script', 'system'),
('Google Tag Manager', 'google_tag_manager', 'head', '<!-- Google Tag Manager will be configured via admin -->', false, 95, 'Google Tag Manager container', 'system'),
('Meta Pixel', 'meta_pixel', 'head', '<!-- Meta Pixel will be configured via admin -->', false, 90, 'Facebook/Meta Pixel tracking', 'system'),
('Microsoft Clarity', 'microsoft_clarity', 'head', '<!-- Microsoft Clarity will be configured via admin -->', false, 85, 'Microsoft Clarity heatmaps and recordings', 'system');

-- ── 10. Comments and documentation ────────────────────────────────────────────
COMMENT ON TABLE "redirects" IS 'URL redirects management for SEO and site maintenance';
COMMENT ON TABLE "global_scripts" IS 'Global tracking scripts and custom code injection';
COMMENT ON TABLE "seo_templates" IS 'SEO templates for different page types';
COMMENT ON TABLE "page_seo_settings" IS 'Page-specific SEO overrides and settings';
COMMENT ON TABLE "internal_links" IS 'Internal link management and tracking';

COMMENT ON COLUMN "redirects"."source_url" IS 'Source URL path (relative to domain)';
COMMENT ON COLUMN "redirects"."destination_url" IS 'Target URL (can be relative or absolute)';
COMMENT ON COLUMN "redirects"."redirect_type" IS 'HTTP redirect type: 301 (permanent) or 302 (temporary)';
COMMENT ON COLUMN "redirects"."hit_count" IS 'Number of times this redirect has been accessed';

COMMENT ON COLUMN "global_scripts"."script_type" IS 'Type of script: google_analytics, google_tag_manager, meta_pixel, microsoft_clarity, custom';
COMMENT ON COLUMN "global_scripts"."position" IS 'Where to inject the script: head or body';
COMMENT ON COLUMN "global_scripts"."priority" IS 'Loading priority (higher numbers load first)';
COMMENT ON COLUMN "global_scripts"."configuration" IS 'Additional configuration like tracking IDs, settings, etc.';

COMMENT ON COLUMN "seo_templates"."title_template" IS 'Template with variables like {{name}}, {{company}}, etc.';
COMMENT ON COLUMN "seo_templates"."schema_template" IS 'JSON-LD structured data template';
COMMENT ON COLUMN "seo_templates"."breadcrumb_config" IS 'Rules for generating breadcrumb navigation';

COMMENT ON COLUMN "page_seo_settings"."seo_score" IS 'Calculated SEO score based on various factors (0-100)';
COMMENT ON COLUMN "page_seo_settings"."seo_issues" IS 'Array of SEO issues found during analysis';
COMMENT ON COLUMN "page_seo_settings"."indexing_directive" IS 'Search engine indexing directive: index,follow / noindex,follow / etc.';