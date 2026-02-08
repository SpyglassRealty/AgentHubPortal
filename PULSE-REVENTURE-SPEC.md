# Pulse V2 — Reventure Feature Parity Spec

## Goal
Build all Reventure data layers and UI features into Pulse within Mission Control.

## Data Sources Required
- **Zillow ZHVI** — Home values, growth rates, forecasts (free CSV downloads)
- **US Census Bureau / ACS** — Demographics, income, homeownership (free API)
- **Redfin** — Home sales, inventory, DOM, price cuts (free CSV data center)
- **Repliers MLS API** — Active listings, sold data (already integrated)
- **FHFA HPI** — House price index (free)
- **Calculated** — Overvalued %, affordability, investor scores

---

## Data Layer Categories (from Reventure screenshots)

### 1. Popular Data (hero layer selection)
- Home Value
- Home Value Growth (YoY)
- For Sale Inventory
- Home Price Forecast
- Home Value Growth (5-Year)
- Home Value Growth (MoM)
- Overvalued %
- Days on Market
- Home Sales
- Cap Rate
- Long-Term Growth Score

### 2. Home Price & Affordability
- Home Value (Zillow ZHVI)
- Home Value Growth YoY
- Home Value Growth 5-Year
- Home Value Growth MoM
- Overvalued % (value vs income ratio vs long-term avg)
- Value / Income Ratio
- Single Family Value
- Single Family Value Growth YoY
- Condo Value
- Condo Value Growth YoY
- Mortgage Payment (estimated from home value + rates)
- Mtg Payment as % of Income
- Salary to Afford a House
- Property Tax Annual
- Property Tax Rate
- Insurance Premium Annual
- Insurance Premium %
- Buy v Rent Differential
- % Change from 2022 Peak
- % Crash from 2007-12

### 3. Market Trends
- For Sale Inventory
- Home Price Forecast
- Days on Market
- Home Sales (monthly closed)
- Cap Rate
- Long-Term Growth Score

### 4. Demographic
- Population
- Median Household Income
- Population Growth
- Income Growth
- Population Density
- Weather (Avg Temperature)
- Remote Work %
- College Degree Rate
- Homeownership Rate
- Homeowners 25-44 %
- Homeowners 75+ %
- Mortgaged Home %
- Median Age
- Poverty Rate
- Family Households %
- Single Households %
- Housing Units
- Housing Unit Growth Rate

### 5. Investor Metrics
- Cap Rate
- Gross Rent Yield
- Home Sales volume
- Rent Growth
- Vacancy Rate

### 6. Reventure Scores (proprietary — we'll create Spyglass equivalents)
- Market Health Score
- Investment Score
- Growth Potential Score

---

## UI Components Required

### A. Left Sidebar — Data Layer Selector
- Collapsible category sections (Popular, Home Price, Market Trends, Demographic, Investor, Spyglass Scores)
- Radio-button selection for each data layer
- Info (i) tooltip icons with descriptions
- Search box at top ("SEARCH DATA POINTS")

### B. Center Panel — Zip Code Summary
- **Header**: Source attribution, zip/county/metro/state, data date
- **Forecast Gauge**: Semicircle gauge showing Home Price Forecast (-X.X%)
  - Color scale: blue (decline) → red (hot)
  - Tabs: "Home Price Forecast" | "Investor Score" | "Long-Term Growth Score"
- **Best Month to Buy / Sell**: Green/red badges
- **Metric Bars**: Recent Appreciation (score), Days on Market (score), Mortgage Rates (score), Inventory
- **Report Download Button**: Generate PDF report

### C. Right Panel — Historical Chart
- Time-series line/area chart for selected metric
- **Yearly / Monthly toggle**
- **Download Data** button (CSV)
- Chart description text explaining the metric
- Dropdown to switch sub-metrics
- Historical reference line (dotted) for averages
- "Show Fair Home Value" checkbox (for Home Value layer)
- Labels: "Overvalued" / "Undervalued", "Sellers Market" / "Buyers Market"

### D. Map Enhancement
- Choropleth coloring by selected data layer (not just price)
- Labels on zip markers showing selected metric value
- Legend updates per selected layer
- Click zip → populates center + right panels

### E. Compare Mode (existing but needs expansion)
- Side-by-side comparison of 2+ zip codes across all metrics

### F. PDF Report Generation
- Downloadable market report per zip code
- Include all key metrics, charts, and forecasts

---

## Data Pipeline Architecture

### Phase 1: Data Ingestion Service
Create `server/services/pulseDataService.ts`:
1. **Zillow ZHVI Downloader** — Monthly CSV from Zillow Research
   - URL: https://files.zillowstatic.com/research/public_v2/zhvi/
   - Files: Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv
   - Parse → store in Supabase table `pulse_zillow_data`
2. **Census API Fetcher** — ACS 5-Year data by zip (ZCTA)
   - API: https://api.census.gov/data/2022/acs/acs5
   - Variables: B01003_001E (population), B19013_001E (median income), etc.
   - Store in `pulse_census_data`
3. **Redfin Data Fetcher** — Market tracker data
   - URL: https://redfin-public-data.s3.us-west-2.amazonaws.com/
   - Monthly zip-level: median sale price, homes sold, DOM, inventory
   - Store in `pulse_redfin_data`
4. **Calculated Metrics** — Run nightly
   - Overvalued % = (current value/income ratio) / (historical avg) - 1
   - Mortgage payment = home value * rate / 12 with amortization
   - Affordability = annual payment / median income
   - Cap rate = (annual rent - expenses) / home value

### Phase 2: API Endpoints
- `GET /api/pulse/layers` — List all available data layers
- `GET /api/pulse/layer/:layerId?zip=78704` — Get layer data for a zip
- `GET /api/pulse/layer/:layerId/timeseries?zip=78704&period=yearly` — Historical data
- `GET /api/pulse/layer/:layerId/map` — All zips for choropleth coloring
- `GET /api/pulse/zip/:zip/summary` — All metrics for a zip (center panel)
- `GET /api/pulse/zip/:zip/forecast` — Price forecast data
- `GET /api/pulse/zip/:zip/scores` — Investor/growth/market scores
- `GET /api/pulse/report/:zip` — Generate PDF report

### Phase 3: Frontend Build
- Sidebar component with collapsible sections
- Forecast gauge component (SVG semicircle)
- Time-series chart component (Recharts)
- Metric score bars
- Map choropleth by arbitrary layer
- PDF report generation (server-side with puppeteer or react-pdf)

---

## Implementation Priority

### Sprint 1: Data Foundation (Week 1)
- [ ] Zillow ZHVI data pipeline + Supabase tables
- [ ] Census ACS data pipeline
- [ ] Redfin data pipeline
- [ ] Cron job for nightly data refresh
- [ ] Backend API for all data layers

### Sprint 2: Core UI (Week 1-2)
- [ ] Left sidebar with all 50+ layers
- [ ] Historical time-series chart panel
- [ ] Yearly/Monthly toggle
- [ ] Metric descriptions and info tooltips
- [ ] Map choropleth by selected layer

### Sprint 3: Forecast & Scores (Week 2)
- [ ] Home Price Forecast gauge
- [ ] Investor Score calculation
- [ ] Long-Term Growth Score
- [ ] Best Month to Buy/Sell logic
- [ ] Metric score bars (appreciation, DOM, rates, inventory)

### Sprint 4: Polish & Export (Week 2-3)
- [ ] Download Data (CSV export)
- [ ] PDF Report generation
- [ ] Compare mode expansion
- [ ] Mobile responsive
- [ ] Share URL with state preservation

---

## Data Tables (Supabase)

```sql
-- Zillow home value data
CREATE TABLE pulse_zillow_data (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  date DATE NOT NULL,
  home_value NUMERIC,
  home_value_sf NUMERIC,
  home_value_condo NUMERIC,
  rental_value NUMERIC,
  UNIQUE(zip, date)
);

-- Census demographic data
CREATE TABLE pulse_census_data (
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
  -- ... more fields
  UNIQUE(zip, year)
);

-- Redfin market data
CREATE TABLE pulse_redfin_data (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  period_start DATE NOT NULL,
  median_sale_price NUMERIC,
  homes_sold INTEGER,
  median_dom INTEGER,
  inventory INTEGER,
  price_drops_pct NUMERIC,
  sale_to_list_ratio NUMERIC,
  UNIQUE(zip, period_start)
);

-- Calculated/derived metrics
CREATE TABLE pulse_metrics (
  id SERIAL PRIMARY KEY,
  zip VARCHAR(5) NOT NULL,
  date DATE NOT NULL,
  overvalued_pct NUMERIC,
  value_income_ratio NUMERIC,
  mortgage_payment NUMERIC,
  mtg_pct_income NUMERIC,
  salary_to_afford NUMERIC,
  property_tax_annual NUMERIC,
  property_tax_rate NUMERIC,
  insurance_annual NUMERIC,
  buy_vs_rent NUMERIC,
  cap_rate NUMERIC,
  price_forecast NUMERIC,
  investor_score NUMERIC,
  growth_score NUMERIC,
  UNIQUE(zip, date)
);
```
