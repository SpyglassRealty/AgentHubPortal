-- Developer Dashboard & Role-based Access Control
-- Part 2C: Database Schema for Developer Dashboard

-- Add role field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'agent';

-- Update daryl@spyglassrealty.com as the default developer
UPDATE users SET role = 'developer' WHERE email = 'daryl@spyglassrealty.com';

-- Create developer changelog table
CREATE TABLE IF NOT EXISTS dev_changelog (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  developer_name VARCHAR(255),
  developer_email VARCHAR(255),
  requested_by VARCHAR(255),
  commit_hash VARCHAR(100),
  category VARCHAR(50), -- 'bug_fix', 'feature', 'ui', 'database', 'api', 'deployment'
  status VARCHAR(50) DEFAULT 'deployed', -- 'deployed', 'in_progress', 'reverted', 'pending'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create activity logs table for developer dashboard
CREATE TABLE IF NOT EXISTS developer_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action_type VARCHAR(100), -- 'create', 'update', 'delete', 'view', 'login', 'export', 'search'
  description TEXT,
  metadata JSONB, -- extra context
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dev_changelog_developer_email ON dev_changelog (developer_email);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_category ON dev_changelog (category);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_status ON dev_changelog (status);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_created_at ON dev_changelog (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON developer_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON developer_activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON developer_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_email ON developer_activity_logs (user_email);

-- Add comment for supported role values
COMMENT ON COLUMN users.role IS 'Supported roles: developer, admin, agent, viewer';