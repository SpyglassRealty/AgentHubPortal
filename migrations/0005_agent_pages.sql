-- CMS Enhancement Phase 3A: Agent Directory Profiles
CREATE TABLE agent_directory_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  fub_email VARCHAR(255),
  office_location VARCHAR(50) NOT NULL,
  bio TEXT,
  professional_title VARCHAR(255),
  license_number VARCHAR(100),
  website_url VARCHAR(500),
  headshot_url VARCHAR(500),
  social_links JSONB,
  subdomain VARCHAR(100) UNIQUE,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  meta_title VARCHAR(255),
  meta_description TEXT,
  indexing_directive VARCHAR(20) DEFAULT 'index,follow',
  custom_schema JSONB,
  seo_score INTEGER,
  video_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agent_directory_visible ON agent_directory_profiles (is_visible);
CREATE INDEX idx_agent_directory_office ON agent_directory_profiles (office_location);
CREATE INDEX idx_agent_directory_sort ON agent_directory_profiles (sort_order);
CREATE INDEX idx_agent_directory_name ON agent_directory_profiles (first_name, last_name);
CREATE INDEX idx_agent_directory_subdomain ON agent_directory_profiles (subdomain);