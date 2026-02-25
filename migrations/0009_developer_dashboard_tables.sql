-- Migration: Developer Dashboard Tables
-- Created: 2026-02-25
-- Description: Add tables for Developer Dashboard feature

-- 1. Add role field to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'agent';
        
        -- Set default developer
        UPDATE users SET role = 'developer' WHERE email = 'daryl@spyglassrealty.com';
        
        -- Set existing super admins to admin role (if not the default developer)
        UPDATE users SET role = 'admin' WHERE is_super_admin = true AND email != 'daryl@spyglassrealty.com';
    END IF;
END $$;

-- 2. Developer changelog table
CREATE TABLE IF NOT EXISTS dev_changelog (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    developer_name VARCHAR(255),
    developer_email VARCHAR(255),
    requested_by VARCHAR(255),
    commit_hash VARCHAR(100),
    category VARCHAR(50) CHECK (category IN ('bug_fix', 'feature', 'ui', 'database', 'api', 'deployment')),
    status VARCHAR(50) DEFAULT 'deployed' CHECK (status IN ('deployed', 'in_progress', 'reverted', 'pending')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Developer activity logs table
CREATE TABLE IF NOT EXISTS developer_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    action_type VARCHAR(100) CHECK (action_type IN ('create', 'update', 'delete', 'view', 'login', 'export', 'search')),
    description TEXT,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dev_changelog_status ON dev_changelog(status);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_category ON dev_changelog(category);
CREATE INDEX IF NOT EXISTS idx_dev_changelog_created_at ON dev_changelog(created_at);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_user_id ON developer_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_action_type ON developer_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_developer_activity_logs_created_at ON developer_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 5. Insert initial changelog entry
INSERT INTO dev_changelog (
    description, 
    developer_name, 
    developer_email, 
    requested_by, 
    category, 
    status
) VALUES (
    'Added Developer Dashboard and Admin Settings fix - comprehensive 4-tab developer portal with access control',
    'Clawd AI',
    'ai@spyglassrealty.com',
    'Daryl',
    'feature',
    'in_progress'
) ON CONFLICT DO NOTHING;