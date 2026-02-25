-- Quick fix for Developer Dashboard access
-- This sets the default developer role for Daryl

-- 1. Add role column if it doesn't exist (should already be done via Drizzle)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'agent';

-- 2. Set Daryl as the default developer
UPDATE users SET role = 'developer' WHERE email = 'daryl@spyglassrealty.com';

-- 3. Also grant developer access to any super admins temporarily
UPDATE users SET role = 'developer' WHERE is_super_admin = true;

-- 4. Create the tables if they don't exist
CREATE TABLE IF NOT EXISTS dev_changelog (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    developer_name VARCHAR(255),
    developer_email VARCHAR(255),
    requested_by VARCHAR(255),
    commit_hash VARCHAR(100),
    category VARCHAR(50),
    status VARCHAR(50) DEFAULT 'deployed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS developer_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action_type VARCHAR(100),
    description TEXT,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_dev_changelog_status ON dev_changelog(status);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_category ON dev_changelog(category);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_created_at ON dev_changelog(created_at);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_user_id ON developer_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_action_type ON developer_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_created_at ON developer_activity_logs(created_at);

-- 6. Insert initial changelog entry
INSERT INTO dev_changelog (
    description, 
    developer_name, 
    developer_email, 
    requested_by, 
    category, 
    status
) VALUES (
    'Fixed Developer Dashboard white screen - added error handling, access control improvements, and missing database tables',
    'Clawd AI',
    'ai@spyglassrealty.com',
    'Daryl',
    'bug_fix',
    'deployed'
) ON CONFLICT DO NOTHING;