-- Migration: Add additional marketing fields to agent_profiles table for CMA presentation
-- Note: bio, headshot_url, title already exist from Stage 1
-- Added fields: marketingTitle, marketingPhone, marketingEmail (additional to existing fields)

ALTER TABLE agent_profiles 
ADD COLUMN IF NOT EXISTS marketing_title VARCHAR,
ADD COLUMN IF NOT EXISTS marketing_phone VARCHAR,
ADD COLUMN IF NOT EXISTS marketing_email VARCHAR;