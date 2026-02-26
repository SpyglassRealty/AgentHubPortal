-- Migration: Create testimonials and review_sources tables
-- Phase 4 of Mission Control CMS Enhancement: Testimonials & Reviews System

-- ── Testimonials table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "testimonials" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "reviewer_name" varchar(255) NOT NULL,
    "reviewer_location" varchar(255),
    "review_text" text NOT NULL,
    "rating" integer NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
    "source" varchar(50) NOT NULL DEFAULT 'manual',
    "source_url" varchar(500),
    "agent_id" varchar,
    "community_slug" varchar(255),
    "photo_url" varchar(500),
    "is_approved" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- ── Review Sources table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "review_sources" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "platform" varchar(50) NOT NULL,
    "place_id" varchar(255),
    "api_key" varchar(500),
    "last_synced_at" timestamp,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);

-- ── Indexes for testimonials ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_testimonials_approved" ON "testimonials" ("is_approved");
CREATE INDEX IF NOT EXISTS "idx_testimonials_featured" ON "testimonials" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_testimonials_rating" ON "testimonials" ("rating");
CREATE INDEX IF NOT EXISTS "idx_testimonials_source" ON "testimonials" ("source");
CREATE INDEX IF NOT EXISTS "idx_testimonials_agent" ON "testimonials" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_testimonials_community" ON "testimonials" ("community_slug");
CREATE INDEX IF NOT EXISTS "idx_testimonials_display_order" ON "testimonials" ("display_order");

-- ── Indexes for review_sources ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_review_sources_platform" ON "review_sources" ("platform");
CREATE INDEX IF NOT EXISTS "idx_review_sources_active" ON "review_sources" ("is_active");

-- ── Add some sample data ─────────────────────────────────────────────────────────
INSERT INTO "testimonials" ("reviewer_name", "reviewer_location", "review_text", "rating", "source", "is_approved", "is_featured", "display_order") VALUES
  ('Sarah Johnson', 'Austin, TX', 'Working with Spyglass Realty was an exceptional experience. Their team went above and beyond to help us find our dream home in the perfect neighborhood. Professional, knowledgeable, and genuinely caring.', 5, 'google', true, true, 1),
  ('Michael Chen', 'Round Rock, TX', 'Outstanding service from start to finish. The agent was incredibly responsive and helped us navigate a competitive market with confidence. Would definitely recommend to anyone buying or selling.', 5, 'manual', true, true, 2),
  ('Jennifer Williams', 'Cedar Park, TX', 'Sold our home quickly and for above asking price! The marketing strategy was excellent and the communication throughout the process was top-notch.', 5, 'zillow', true, false, 3),
  ('David Rodriguez', 'Leander, TX', 'As first-time buyers, we were nervous about the process. The Spyglass team made everything clear and stress-free. They truly have your best interests at heart.', 5, 'facebook', true, false, 4),
  ('Lisa Thompson', 'Georgetown, TX', 'Professional, knowledgeable, and results-driven. They helped us sell our previous home and buy our new one seamlessly. Excellent communication and follow-through.', 4, 'google', true, false, 5);

-- ── Add review sources ───────────────────────────────────────────────────────────
INSERT INTO "review_sources" ("platform", "place_id", "is_active") VALUES
  ('google', 'ChIJ_____example_place_id_____', true),
  ('zillow', NULL, true),
  ('facebook', NULL, true);