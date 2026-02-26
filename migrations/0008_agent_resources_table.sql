-- Add agent_resources table for CMA slide 9/33
-- Resources and links that agents can upload/add in Settings

CREATE TABLE IF NOT EXISTS agent_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'pdf', 'doc', 'image', 'link'
  file_data BYTEA, -- file stored as binary (for uploaded files)
  file_name VARCHAR(255), -- original filename
  file_size INTEGER, -- size in bytes
  mime_type VARCHAR(100), -- e.g. 'application/pdf'
  redirect_url TEXT, -- for link-type resources
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_resources_user_id ON agent_resources (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_resources_sort_order ON agent_resources (user_id, sort_order);

-- Constraints
-- Max file size: 5MB per file (5242880 bytes) - enforced at application level
-- Max 10 resources per agent - enforced at application level