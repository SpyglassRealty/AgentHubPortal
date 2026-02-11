-- Migration: Add marketing fields to agent_profiles table for CMA presentation
-- Added fields: marketingTitle, marketingPhone, marketingEmail, headshotUrl, bio

ALTER TABLE agent_profiles 
ADD COLUMN marketing_title VARCHAR,
ADD COLUMN marketing_phone VARCHAR,
ADD COLUMN marketing_email VARCHAR,
ADD COLUMN headshot_url VARCHAR,
ADD COLUMN bio TEXT;