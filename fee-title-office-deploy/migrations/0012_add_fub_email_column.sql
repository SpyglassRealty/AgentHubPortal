-- Add fub_email column to agent_directory_profiles if it doesn't exist
-- This column stores the agent's Follow Up Boss routing email
ALTER TABLE agent_directory_profiles 
ADD COLUMN IF NOT EXISTS fub_email VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN agent_directory_profiles.fub_email IS 'Follow Up Boss routing email for agent-specific lead assignment';