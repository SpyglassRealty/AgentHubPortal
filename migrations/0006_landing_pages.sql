-- CMS Enhancement Phase 3B: Landing Pages
CREATE TABLE landing_pages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  page_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb,
  meta_title VARCHAR(255),
  meta_description TEXT,
  og_image_url VARCHAR(500),
  indexing_directive VARCHAR(20) DEFAULT 'index,follow',
  custom_schema JSONB,
  seo_score INTEGER,
  breadcrumb_path JSONB,
  custom_scripts TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_landing_pages_slug ON landing_pages (slug);
CREATE INDEX idx_landing_pages_type ON landing_pages (page_type);
CREATE INDEX idx_landing_pages_published ON landing_pages (is_published);
CREATE INDEX idx_landing_pages_seo_score ON landing_pages (seo_score);