-- Migration: Blog System (CMS Enhancement Phase 2)
-- Description: Complete blog system with authors, categories, and posts
-- Created: $(date)

-- Blog Authors table
CREATE TABLE IF NOT EXISTS "blog_authors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"bio" text,
	"avatar_url" varchar(500),
	"social_links" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_authors_email_unique" UNIQUE("email")
);

-- Blog Categories table  
CREATE TABLE IF NOT EXISTS "blog_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"parent_id" varchar,
	"meta_title" varchar(255),
	"meta_description" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);

-- Blog Posts table
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"featured_image_url" varchar(500),
	"og_image_url" varchar(500),
	"author_id" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"category_ids" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"meta_title" varchar(255),
	"meta_description" text,
	"indexing_directive" varchar(20) DEFAULT 'index,follow',
	"custom_schema" jsonb,
	"seo_score" integer,
	"seo_issues" jsonb,
	"canonical_url" varchar(500),
	"breadcrumb_path" jsonb,
	"table_of_contents" jsonb,
	"cta_config" jsonb,
	"reading_time" integer,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);

-- Blog Post Categories Junction Table (for many-to-many)
CREATE TABLE IF NOT EXISTS "blog_post_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"category_id" varchar NOT NULL
);

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'blog_posts_author_id_blog_authors_id_fk'
    ) THEN
        ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_blog_authors_id_fk" 
            FOREIGN KEY ("author_id") REFERENCES "blog_authors"("id");
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'blog_post_categories_post_id_blog_posts_id_fk'
    ) THEN
        ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_post_id_blog_posts_id_fk" 
            FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE cascade;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'blog_post_categories_category_id_blog_categories_id_fk'
    ) THEN
        ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_category_id_blog_categories_id_fk" 
            FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE cascade;
    END IF;
END$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_blog_authors_email" ON "blog_authors" ("email");

CREATE INDEX IF NOT EXISTS "idx_blog_categories_slug" ON "blog_categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_categories_parent" ON "blog_categories" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_blog_categories_sort" ON "blog_categories" ("sort_order");

CREATE INDEX IF NOT EXISTS "idx_blog_posts_slug" ON "blog_posts" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status" ON "blog_posts" ("status");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_author" ON "blog_posts" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_published" ON "blog_posts" ("published_at");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_seo_score" ON "blog_posts" ("seo_score");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status_published" ON "blog_posts" ("status","published_at");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_updated" ON "blog_posts" ("updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_post_categories_unique" ON "blog_post_categories" ("post_id","category_id");
CREATE INDEX IF NOT EXISTS "idx_blog_post_categories_post" ON "blog_post_categories" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_blog_post_categories_category" ON "blog_post_categories" ("category_id");

-- Insert default blog author (Ryan from Spyglass)
INSERT INTO "blog_authors" ("id", "name", "email", "bio") 
VALUES (
    gen_random_uuid(),
    'Ryan Rodenbeck',
    'ryan@spyglassrealty.com',
    'Founder and Lead Agent at Spyglass Realty. Expert in Austin real estate market with over 10 years of experience helping clients buy and sell homes.'
) ON CONFLICT (email) DO NOTHING;

-- Insert default blog categories
INSERT INTO "blog_categories" ("id", "name", "slug", "description", "sort_order")
VALUES 
    (gen_random_uuid(), 'Market Updates', 'market-updates', 'Latest trends and insights from the Austin real estate market', 1),
    (gen_random_uuid(), 'Home Buying Tips', 'home-buying-tips', 'Essential advice for first-time and experienced home buyers', 2),
    (gen_random_uuid(), 'Home Selling Tips', 'home-selling-tips', 'Strategies to get the best price and sell quickly', 3),
    (gen_random_uuid(), 'Neighborhoods', 'neighborhoods', 'Community spotlights and neighborhood guides', 4),
    (gen_random_uuid(), 'Investment Properties', 'investment-properties', 'Real estate investment opportunities and analysis', 5)
ON CONFLICT (slug) DO NOTHING;