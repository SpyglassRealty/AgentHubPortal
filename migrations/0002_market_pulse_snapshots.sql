-- Market Pulse Snapshots table for basic dashboard functionality
-- This table was missing from the initial migration

CREATE TABLE IF NOT EXISTS market_pulse_snapshots (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  total_properties INTEGER NOT NULL,
  active INTEGER NOT NULL,
  active_under_contract INTEGER NOT NULL,
  pending INTEGER NOT NULL,
  closed INTEGER NOT NULL,
  last_updated_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_pulse_snapshots_last_updated 
ON market_pulse_snapshots (last_updated_at DESC);