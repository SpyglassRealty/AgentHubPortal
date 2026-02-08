-- Pulse V2: Reventure-level data tables
-- Run via: drizzle-kit push (preferred) or manually against the DB

-- Zillow home value data (ZHVI + ZORI)
CREATE TABLE IF NOT EXISTS pulse_zillow_data (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  date DATE NOT NULL,
  home_value NUMERIC,
  home_value_sf NUMERIC,
  home_value_condo NUMERIC,
  rental_value NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_zillow_zip_date ON pulse_zillow_data (zip, date);
CREATE INDEX IF NOT EXISTS idx_pulse_zillow_zip ON pulse_zillow_data (zip);

-- Census ACS demographic data
CREATE TABLE IF NOT EXISTS pulse_census_data (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  year INTEGER NOT NULL,
  population INTEGER,
  median_income NUMERIC,
  median_age NUMERIC,
  homeownership_rate NUMERIC,
  poverty_rate NUMERIC,
  college_degree_rate NUMERIC,
  remote_work_pct NUMERIC,
  housing_units INTEGER,
  family_households_pct NUMERIC,
  homeowners_25_to_44_pct NUMERIC,
  homeowners_75_plus_pct NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_census_zip_year ON pulse_census_data (zip, year);
CREATE INDEX IF NOT EXISTS idx_pulse_census_zip ON pulse_census_data (zip);

-- Redfin market tracker data
CREATE TABLE IF NOT EXISTS pulse_redfin_data (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  period_start DATE NOT NULL,
  median_sale_price NUMERIC,
  homes_sold INTEGER,
  median_dom INTEGER,
  inventory INTEGER,
  price_drops_pct NUMERIC,
  sale_to_list_ratio NUMERIC,
  new_listings INTEGER,
  avg_sale_to_list NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_redfin_zip_period ON pulse_redfin_data (zip, period_start);
CREATE INDEX IF NOT EXISTS idx_pulse_redfin_zip ON pulse_redfin_data (zip);

-- Calculated / derived pulse metrics
CREATE TABLE IF NOT EXISTS pulse_metrics (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  date DATE NOT NULL,
  overvalued_pct NUMERIC,
  value_income_ratio NUMERIC,
  mortgage_payment NUMERIC,
  mtg_pct_income NUMERIC,
  salary_to_afford NUMERIC,
  buy_vs_rent NUMERIC,
  cap_rate NUMERIC,
  price_forecast NUMERIC,
  investor_score NUMERIC,
  growth_score NUMERIC,
  market_health_score NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_metrics_zip_date ON pulse_metrics (zip, date);
CREATE INDEX IF NOT EXISTS idx_pulse_metrics_zip ON pulse_metrics (zip);
