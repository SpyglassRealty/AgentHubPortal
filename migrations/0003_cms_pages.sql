-- CMS Pages table for the Elementor-style page builder
CREATE TABLE IF NOT EXISTS cms_pages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  type VARCHAR NOT NULL DEFAULT 'page',
  status VARCHAR NOT NULL DEFAULT 'draft',
  content JSONB,
  excerpt TEXT,
  featured_image_url TEXT,
  meta_title VARCHAR,
  meta_description TEXT,
  focus_keyword VARCHAR,
  author_id VARCHAR REFERENCES users(id),
  tags JSONB DEFAULT '[]'::jsonb,
  category VARCHAR,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_type ON cms_pages(type);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
