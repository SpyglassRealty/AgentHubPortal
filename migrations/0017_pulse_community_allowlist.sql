CREATE TABLE IF NOT EXISTS pulse_community_allowlist (
  slug VARCHAR(100) PRIMARY KEY
    REFERENCES communities(slug) ON DELETE CASCADE,
  county VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'live-site-county-tabs-2026-04',
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pulse_allowlist_county
  ON pulse_community_allowlist(county);
