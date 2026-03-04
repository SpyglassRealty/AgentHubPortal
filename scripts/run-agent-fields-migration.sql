-- Run this migration on the production database after deployment

-- Add new fields to agent_directory_profiles table
ALTER TABLE agent_directory_profiles
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN agent_directory_profiles.years_of_experience IS 'Years of real estate experience';
COMMENT ON COLUMN agent_directory_profiles.languages IS 'JSON array of languages spoken, e.g. ["English", "Spanish", "Mandarin"]';
COMMENT ON COLUMN agent_directory_profiles.specialties IS 'JSON array of specialties/areas of expertise, e.g. ["Luxury Homes", "First-Time Buyers", "Investment Properties"]';

-- Verify the migration worked
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'agent_directory_profiles' 
AND column_name IN ('years_of_experience', 'languages', 'specialties')
ORDER BY ordinal_position;