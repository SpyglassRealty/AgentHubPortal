-- [EMAIL-SUGGESTIONS] Voice profiles + suggestion feedback tables
-- Date: 2026-05-05
-- Risk: LOW — two brand-new tables, no changes to existing tables or columns
-- Depends on: users table (FK references users.id)
-- Execution: auto-run via db.ts createUserVoiceProfilesTable() +
--            createSuggestionFeedbackTable() on app startup.
--            This file is documentation only — no manual psql step required.

BEGIN;

-- 1. user_voice_profiles
--    One row per user. UNIQUE on user_id enforced at both schema and DB level.
CREATE TABLE IF NOT EXISTS user_voice_profiles (
  id                   VARCHAR      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              VARCHAR      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_profile        JSONB        NOT NULL,
  extracted_from_count INTEGER      NOT NULL DEFAULT 0,
  last_extracted_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_voice_profiles_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_voice_profiles_user_id ON user_voice_profiles (user_id);

-- 2. suggestion_feedback
--    One row per suggestion session (email open + user action).
--    suggestion_index NULL = user discarded all suggestions without picking one.
CREATE TABLE IF NOT EXISTS suggestion_feedback (
  id                VARCHAR      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id        VARCHAR      NOT NULL,
  suggestion_index  INTEGER,
  suggestion_label  VARCHAR(50),
  original_text     TEXT,
  sent_text         TEXT,
  edit_distance     INTEGER,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_user    ON suggestion_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_message ON suggestion_feedback (message_id);

-- Verify both tables created with expected column counts
SELECT table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name IN ('user_voice_profiles', 'suggestion_feedback')
  AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
-- Expected:
--   suggestion_feedback   | 9
--   user_voice_profiles   | 5

-- Verify FK constraints exist
SELECT tc.table_name, tc.constraint_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('user_voice_profiles', 'suggestion_feedback')
ORDER BY tc.table_name;
-- Expected: 2 rows, both referencing users table

COMMIT;
