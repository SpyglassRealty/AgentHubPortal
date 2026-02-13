-- Migration: Add pulse_schools_cache table for caching GreatSchools API results
-- This prevents redundant API calls by caching school data per zip code

CREATE TABLE IF NOT EXISTS pulse_schools_cache (
  id SERIAL PRIMARY KEY,
  zip_code VARCHAR(10) NOT NULL,
  school_data JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(zip_code)
);

-- Index for efficient lookups by zip code
CREATE INDEX IF NOT EXISTS idx_pulse_schools_cache_zip ON pulse_schools_cache (zip_code);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_pulse_schools_cache_expires ON pulse_schools_cache (expires_at);