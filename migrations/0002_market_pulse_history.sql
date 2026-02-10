-- Market Pulse History Table
-- Daily snapshots of key market metrics for historical trending

CREATE TABLE IF NOT EXISTS market_pulse_history (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  zip VARCHAR(5) NOT NULL,
  
  -- Price metrics
  median_home_value NUMERIC,
  median_sale_price NUMERIC,
  median_list_price NUMERIC,
  price_per_sqft NUMERIC,
  
  -- Market activity
  homes_sold INTEGER,
  active_listings INTEGER,
  new_listings INTEGER,
  pending_listings INTEGER,
  
  -- Market timing
  median_dom INTEGER,
  avg_dom INTEGER,
  
  -- Market conditions  
  months_of_supply NUMERIC,
  sale_to_list_ratio NUMERIC,
  price_drops_pct NUMERIC,
  
  -- Calculated metrics
  inventory_growth_mom NUMERIC, -- month-over-month inventory change
  sales_growth_mom NUMERIC,     -- month-over-month sales change
  price_growth_mom NUMERIC,     -- month-over-month price change
  price_growth_yoy NUMERIC,     -- year-over-year price change
  
  -- Market temperature (calculated)
  market_temperature VARCHAR(20), -- 'Hot', 'Warm', 'Balanced', 'Cool', 'Cold'
  market_score INTEGER,           -- 0-100 composite score
  
  -- Metadata
  data_source VARCHAR(50) DEFAULT 'repliers_mls',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_pulse_history_date_zip ON market_pulse_history (date, zip);
CREATE INDEX IF NOT EXISTS idx_market_pulse_history_date ON market_pulse_history (date);
CREATE INDEX IF NOT EXISTS idx_market_pulse_history_zip ON market_pulse_history (zip);
CREATE INDEX IF NOT EXISTS idx_market_pulse_history_zip_date ON market_pulse_history (zip, date DESC);

-- Comment
COMMENT ON TABLE market_pulse_history IS 'Daily snapshots of market pulse metrics by zip code for historical analysis and trending';