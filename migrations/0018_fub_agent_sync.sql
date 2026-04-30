-- [FUB-SYNC-OPTION-D] Schema migration for FUB agent sync to agent_directory_profiles
-- Date: 2026-04-30
-- Risk: HIGH — schema change on shared production table (172 rows)
-- Changes: new nullable columns, drop NOT NULL on one column, new unique index,
--          schema-level default is_visible=FALSE for defense-in-depth on auto-synced rows.
-- No data rewrite. ON CONFLICT DO NOTHING in sync function protects existing rows.

BEGIN;

-- 1. Add fub_agent_id column (nullable)
ALTER TABLE agent_directory_profiles
  ADD COLUMN fub_agent_id INTEGER;

-- 2. Drop NOT NULL on office_location
ALTER TABLE agent_directory_profiles
  ALTER COLUMN office_location DROP NOT NULL;

-- 3. Add unique index on fub_agent_id (NULLs allowed; existing 172 rows stay NULL)
CREATE UNIQUE INDEX idx_agent_directory_fub_agent_id
  ON agent_directory_profiles (fub_agent_id);

-- 4. Verify (before fub_created_at)
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE fub_agent_id IS NULL) AS null_fub_id,
       COUNT(*) FILTER (WHERE office_location IS NULL) AS null_office
FROM agent_directory_profiles;
-- Expected: total=172, null_fub_id=172, null_office=0

-- 5. Add fub_created_at column (nullable timestamptz)
ALTER TABLE agent_directory_profiles
  ADD COLUMN fub_created_at TIMESTAMP WITH TIME ZONE;

-- 6. Verify after
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE fub_created_at IS NULL) AS null_fub_created_at
FROM agent_directory_profiles;
-- Expected: total=172, null_fub_created_at=172

-- 7. Change is_visible default to FALSE (defense-in-depth for auto-synced rows)
-- Manual Add Agent form explicitly passes is_visible: true, so this change is safe.
ALTER TABLE agent_directory_profiles
  ALTER COLUMN is_visible SET DEFAULT FALSE;

-- 8. Verify default applied
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'agent_directory_profiles'
  AND column_name = 'is_visible';
-- Expected: column_default = 'false'

COMMIT;
