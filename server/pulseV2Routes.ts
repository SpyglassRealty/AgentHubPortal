/**
 * Pulse V2 — Reventure-style Data Layer API
 *
 * Provides 50+ data layers across six categories, choropleth data,
 * time-series history, zip summaries, composite scores, and CSV export.
 *
 * Data sources: Zillow ZHVI, US Census / ACS, Redfin, Calculated metrics.
 * Tables: pulse_zillow_data, pulse_census_data, pulse_redfin_data, pulse_metrics
 * (If tables don't exist yet, mock data is returned so frontend can build ahead.)
 */

import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import { pool } from "./db";

// ─── Layer Catalog ──────────────────────────────────────────────────────

interface LayerDef {
  id: string;
  label: string;
  source: string;
  description: string;
  unit: "currency" | "percent" | "number" | "days" | "score" | "ratio" | "temperature";
  table: string;       // Supabase table holding raw data
  column: string;      // Column name inside that table
  dateColumn?: string;  // column holding the period date
}

interface Category {
  id: string;
  label: string;
  layers: LayerDef[];
}

const LAYER_CATALOG: Category[] = [
  // ───────────────────────── 1. Popular Data ─────────────────────────
  {
    id: "popular",
    label: "Popular Data",
    layers: [
      { id: "home_value", label: "Home Value", source: "zillow", description: "The area's typical home value (Zillow Home Value Index — ZHVI), reflecting the estimated market value for middle-tier homes.", unit: "currency", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "home_value_growth_yoy", label: "Home Value Growth (YoY)", source: "zillow", description: "Year-over-year percentage change in typical home value.", unit: "percent", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "for_sale_inventory", label: "For Sale Inventory", source: "redfin", description: "Number of active listings on the market in a given month.", unit: "number", table: "pulse_redfin_data", column: "inventory", dateColumn: "period_start" },
      { id: "home_price_forecast", label: "Home Price Forecast", source: "calculated", description: "Projected home value change over the next 12 months based on trend analysis.", unit: "percent", table: "pulse_metrics", column: "price_forecast", dateColumn: "date" },
      { id: "home_value_growth_5yr", label: "Home Value Growth (5-Year)", source: "zillow", description: "Cumulative home value percentage change over the last five years.", unit: "percent", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "home_value_growth_mom", label: "Home Value Growth (MoM)", source: "zillow", description: "Month-over-month percentage change in typical home value.", unit: "percent", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "overvalued_pct", label: "Overvalued %", source: "calculated", description: "Percentage a market is overvalued relative to its long-term value-to-income ratio average.", unit: "percent", table: "pulse_metrics", column: "overvalued_pct", dateColumn: "date" },
      { id: "days_on_market", label: "Days on Market", source: "redfin", description: "Median number of days homes stay on the market before going under contract.", unit: "days", table: "pulse_redfin_data", column: "median_dom", dateColumn: "period_start" },
      { id: "home_sales", label: "Home Sales", source: "redfin", description: "Number of homes that closed/sold during the period.", unit: "number", table: "pulse_redfin_data", column: "homes_sold", dateColumn: "period_start" },
      { id: "cap_rate", label: "Cap Rate", source: "calculated", description: "Capitalization rate — net operating income divided by property value. Higher is better for investors.", unit: "percent", table: "pulse_metrics", column: "cap_rate", dateColumn: "date" },
      { id: "long_term_growth_score", label: "Long-Term Growth Score", source: "calculated", description: "Composite score (0-100) measuring an area's long-term growth potential based on price appreciation, demographics, and economic fundamentals.", unit: "score", table: "pulse_metrics", column: "growth_score", dateColumn: "date" },
    ],
  },

  // ───────────────────────── 2. Home Price & Affordability ───────────
  {
    id: "home_price_affordability",
    label: "Home Price & Affordability",
    layers: [
      { id: "home_value_detail", label: "Home Value", source: "zillow", description: "Zillow Home Value Index (ZHVI) for all home types.", unit: "currency", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "single_family_value", label: "Single Family Value", source: "zillow", description: "Typical value of single-family homes.", unit: "currency", table: "pulse_zillow_data", column: "home_value_sf", dateColumn: "date" },
      { id: "single_family_growth_yoy", label: "Single Family Value Growth (YoY)", source: "zillow", description: "Year-over-year change in single-family home values.", unit: "percent", table: "pulse_zillow_data", column: "home_value_sf", dateColumn: "date" },
      { id: "condo_value", label: "Condo Value", source: "zillow", description: "Typical value of condominiums.", unit: "currency", table: "pulse_zillow_data", column: "home_value_condo", dateColumn: "date" },
      { id: "condo_growth_yoy", label: "Condo Value Growth (YoY)", source: "zillow", description: "Year-over-year change in condo values.", unit: "percent", table: "pulse_zillow_data", column: "home_value_condo", dateColumn: "date" },
      { id: "value_income_ratio", label: "Value / Income Ratio", source: "calculated", description: "Ratio of median home value to median household income — measures affordability.", unit: "ratio", table: "pulse_metrics", column: "value_income_ratio", dateColumn: "date" },
      { id: "mortgage_payment", label: "Mortgage Payment", source: "calculated", description: "Estimated monthly mortgage payment based on current home value and prevailing rates (30-yr fixed, 20% down).", unit: "currency", table: "pulse_metrics", column: "mortgage_payment", dateColumn: "date" },
      { id: "mtg_pct_income", label: "Mtg Payment as % of Income", source: "calculated", description: "Monthly mortgage payment as a percentage of monthly median household income.", unit: "percent", table: "pulse_metrics", column: "mtg_pct_income", dateColumn: "date" },
      { id: "salary_to_afford", label: "Salary to Afford a House", source: "calculated", description: "Minimum annual salary required so that mortgage payments don't exceed 28% of gross income.", unit: "currency", table: "pulse_metrics", column: "salary_to_afford", dateColumn: "date" },
      { id: "property_tax_annual", label: "Property Tax Annual", source: "census", description: "Estimated annual property tax bill based on assessed home value and local tax rate.", unit: "currency", table: "pulse_metrics", column: "property_tax_annual", dateColumn: "date" },
      { id: "property_tax_rate", label: "Property Tax Rate", source: "census", description: "Effective property tax rate as a percentage of home value.", unit: "percent", table: "pulse_metrics", column: "property_tax_rate", dateColumn: "date" },
      { id: "insurance_annual", label: "Insurance Premium Annual", source: "calculated", description: "Estimated annual homeowners insurance premium.", unit: "currency", table: "pulse_metrics", column: "insurance_annual", dateColumn: "date" },
      { id: "insurance_pct", label: "Insurance Premium %", source: "calculated", description: "Annual insurance premium as a percentage of home value.", unit: "percent", table: "pulse_metrics", column: "insurance_annual", dateColumn: "date" },
      { id: "buy_vs_rent", label: "Buy vs Rent Differential", source: "calculated", description: "Monthly cost difference between buying and renting. Positive means buying costs more.", unit: "currency", table: "pulse_metrics", column: "buy_vs_rent", dateColumn: "date" },
      { id: "pct_from_2022_peak", label: "% Change from 2022 Peak", source: "zillow", description: "Current home value compared to the mid-2022 market peak.", unit: "percent", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
      { id: "pct_crash_2007_12", label: "% Crash from 2007-12", source: "zillow", description: "Comparison of the 2007-2012 crash magnitude in this area.", unit: "percent", table: "pulse_zillow_data", column: "home_value", dateColumn: "date" },
    ],
  },

  // ───────────────────────── 3. Market Trends ────────────────────────
  {
    id: "market_trends",
    label: "Market Trends",
    layers: [
      { id: "inventory_trend", label: "For Sale Inventory", source: "redfin", description: "Number of active for-sale listings.", unit: "number", table: "pulse_redfin_data", column: "inventory", dateColumn: "period_start" },
      { id: "forecast_trend", label: "Home Price Forecast", source: "calculated", description: "Projected 12-month home value change.", unit: "percent", table: "pulse_metrics", column: "price_forecast", dateColumn: "date" },
      { id: "dom_trend", label: "Days on Market", source: "redfin", description: "Median days on market for sold listings.", unit: "days", table: "pulse_redfin_data", column: "median_dom", dateColumn: "period_start" },
      { id: "sales_trend", label: "Home Sales", source: "redfin", description: "Monthly count of closed home sales.", unit: "number", table: "pulse_redfin_data", column: "homes_sold", dateColumn: "period_start" },
      { id: "cap_rate_trend", label: "Cap Rate", source: "calculated", description: "Capitalization rate trend over time.", unit: "percent", table: "pulse_metrics", column: "cap_rate", dateColumn: "date" },
      { id: "sale_to_list", label: "Sale-to-List Ratio", source: "redfin", description: "Ratio of final sale price to original list price. Above 1.0 indicates a seller's market.", unit: "ratio", table: "pulse_redfin_data", column: "sale_to_list_ratio", dateColumn: "period_start" },
      { id: "price_drops_pct", label: "Price Drops %", source: "redfin", description: "Percentage of listings that had at least one price reduction.", unit: "percent", table: "pulse_redfin_data", column: "price_drops_pct", dateColumn: "period_start" },
      { id: "median_sale_price", label: "Median Sale Price", source: "redfin", description: "Median sale price of closed transactions.", unit: "currency", table: "pulse_redfin_data", column: "median_sale_price", dateColumn: "period_start" },
    ],
  },

  // ───────────────────────── 4. Demographics ─────────────────────────
  {
    id: "demographics",
    label: "Demographics",
    layers: [
      { id: "population", label: "Population", source: "census", description: "Total population from the US Census Bureau American Community Survey.", unit: "number", table: "pulse_census_data", column: "population", dateColumn: "year" },
      { id: "median_income", label: "Median Household Income", source: "census", description: "Median household income in the area.", unit: "currency", table: "pulse_census_data", column: "median_income", dateColumn: "year" },
      { id: "population_growth", label: "Population Growth", source: "census", description: "Year-over-year percentage change in population.", unit: "percent", table: "pulse_census_data", column: "population", dateColumn: "year" },
      { id: "income_growth", label: "Income Growth", source: "census", description: "Year-over-year percentage change in median household income.", unit: "percent", table: "pulse_census_data", column: "median_income", dateColumn: "year" },
      { id: "population_density", label: "Population Density", source: "census", description: "Population per square mile.", unit: "number", table: "pulse_census_data", column: "population", dateColumn: "year" },
      { id: "avg_temperature", label: "Avg Temperature", source: "census", description: "Average annual temperature for the area.", unit: "temperature", table: "pulse_census_data", column: "median_age", dateColumn: "year" },
      { id: "remote_work_pct", label: "Remote Work %", source: "census", description: "Percentage of workers who work from home.", unit: "percent", table: "pulse_census_data", column: "remote_work_pct", dateColumn: "year" },
      { id: "college_degree_rate", label: "College Degree Rate", source: "census", description: "Percentage of adults 25+ with a bachelor's degree or higher.", unit: "percent", table: "pulse_census_data", column: "college_degree_rate", dateColumn: "year" },
      { id: "homeownership_rate", label: "Homeownership Rate", source: "census", description: "Percentage of occupied housing units that are owner-occupied.", unit: "percent", table: "pulse_census_data", column: "homeownership_rate", dateColumn: "year" },
      { id: "homeowners_25_44", label: "Homeowners 25-44 %", source: "census", description: "Percentage of homeowners aged 25-44.", unit: "percent", table: "pulse_census_data", column: "homeownership_rate", dateColumn: "year" },
      { id: "homeowners_75_plus", label: "Homeowners 75+ %", source: "census", description: "Percentage of homeowners aged 75 and older.", unit: "percent", table: "pulse_census_data", column: "homeownership_rate", dateColumn: "year" },
      { id: "mortgaged_home_pct", label: "Mortgaged Home %", source: "census", description: "Percentage of owner-occupied homes with a mortgage.", unit: "percent", table: "pulse_census_data", column: "homeownership_rate", dateColumn: "year" },
      { id: "median_age", label: "Median Age", source: "census", description: "Median age of residents.", unit: "number", table: "pulse_census_data", column: "median_age", dateColumn: "year" },
      { id: "poverty_rate", label: "Poverty Rate", source: "census", description: "Percentage of the population living below the poverty line.", unit: "percent", table: "pulse_census_data", column: "poverty_rate", dateColumn: "year" },
      { id: "family_households_pct", label: "Family Households %", source: "census", description: "Percentage of households that are family households.", unit: "percent", table: "pulse_census_data", column: "family_households_pct", dateColumn: "year" },
      { id: "single_households_pct", label: "Single Households %", source: "census", description: "Percentage of households with a single occupant.", unit: "percent", table: "pulse_census_data", column: "family_households_pct", dateColumn: "year" },
      { id: "housing_units", label: "Housing Units", source: "census", description: "Total number of housing units.", unit: "number", table: "pulse_census_data", column: "housing_units", dateColumn: "year" },
      { id: "housing_unit_growth", label: "Housing Unit Growth Rate", source: "census", description: "Year-over-year percentage change in total housing units.", unit: "percent", table: "pulse_census_data", column: "housing_units", dateColumn: "year" },
    ],
  },

  // ───────────────────────── 5. Investor Metrics ─────────────────────
  {
    id: "investor",
    label: "Investor Metrics",
    layers: [
      { id: "investor_cap_rate", label: "Cap Rate", source: "calculated", description: "Capitalization rate — annual net operating income as a percentage of property value.", unit: "percent", table: "pulse_metrics", column: "cap_rate", dateColumn: "date" },
      { id: "gross_rent_yield", label: "Gross Rent Yield", source: "calculated", description: "Annual gross rent as a percentage of home value.", unit: "percent", table: "pulse_metrics", column: "cap_rate", dateColumn: "date" },
      { id: "investor_home_sales", label: "Home Sales Volume", source: "redfin", description: "Total number of closed home sales — indicates market liquidity.", unit: "number", table: "pulse_redfin_data", column: "homes_sold", dateColumn: "period_start" },
      { id: "rent_growth", label: "Rent Growth", source: "zillow", description: "Year-over-year percentage change in Zillow Observed Rent Index.", unit: "percent", table: "pulse_zillow_data", column: "rental_value", dateColumn: "date" },
      { id: "vacancy_rate", label: "Vacancy Rate", source: "census", description: "Percentage of housing units that are vacant.", unit: "percent", table: "pulse_census_data", column: "homeownership_rate", dateColumn: "year" },
    ],
  },

  // ───────────────────────── 6. Spyglass Scores ─────────────────────
  {
    id: "scores",
    label: "Spyglass Scores",
    layers: [
      { id: "market_health_score", label: "Market Health Score", source: "calculated", description: "Composite score (0-100) measuring overall market health based on DOM, inventory, and sale-to-list ratio.", unit: "score", table: "pulse_metrics", column: "growth_score", dateColumn: "date" },
      { id: "investment_score", label: "Investment Score", source: "calculated", description: "Composite score (0-100) evaluating investment attractiveness based on cap rate, appreciation, and rent yield.", unit: "score", table: "pulse_metrics", column: "investor_score", dateColumn: "date" },
      { id: "growth_potential_score", label: "Growth Potential Score", source: "calculated", description: "Composite score (0-100) measuring growth potential based on population growth, income growth, and home value trajectory.", unit: "score", table: "pulse_metrics", column: "growth_score", dateColumn: "date" },
    ],
  },
];

// Flat lookup map: layerId → LayerDef
const LAYER_MAP = new Map<string, LayerDef>();
for (const cat of LAYER_CATALOG) {
  for (const layer of cat.layers) {
    LAYER_MAP.set(layer.id, layer);
  }
}

// ─── Austin-metro zips for mock data ────────────────────────────────

const AUSTIN_ZIPS = [
  "78701","78702","78703","78704","78705","78712","78717","78719","78721",
  "78722","78723","78724","78725","78726","78727","78728","78729","78730",
  "78731","78732","78733","78734","78735","78736","78737","78738","78739",
  "78741","78742","78744","78745","78746","78747","78748","78749","78750",
  "78751","78752","78753","78754","78756","78757","78758","78759",
  "78610","78613","78617","78620","78628","78634","78641","78645",
  "78653","78660","78664","78665","78681","78717","78660",
  "76574","78621","78626","78633","78642","78654","78669",
];

// ─── Formatting helpers ─────────────────────────────────────────────

function formatLabel(value: number, unit: string): string {
  if (value == null) return "—";
  switch (unit) {
    case "currency":
      if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${Math.round(value)} days`;
    case "score":
      return `${Math.round(value)}`;
    case "ratio":
      return value.toFixed(2);
    case "temperature":
      return `${value.toFixed(0)}°F`;
    default:
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toFixed(0);
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ─── Seeded random for deterministic mock data ──────────────────────

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

// ─── Realistic Austin ZHVI home values (approx Zillow mid-2025) ─────
const REALISTIC_HOME_VALUES: Record<string, number> = {
  "78701": 550000, // Downtown Austin
  "78702": 600000, // East Austin
  "78703": 950000, // Tarrytown / Old West Austin
  "78704": 700000, // Travis Heights / South Congress
  "78705": 500000, // UT Campus / North University
  "78712": 480000, // UT Main Campus area
  "78717": 520000, // Brushy Creek
  "78719": 340000, // SE Austin near airport
  "78721": 400000, // East Austin / MLK
  "78722": 520000, // Cherrywood / French Place
  "78723": 450000, // Windsor Park / Mueller
  "78724": 320000, // East Austin outer
  "78725": 310000, // SE Austin
  "78726": 580000, // NW Austin / Canyon Creek
  "78727": 470000, // NW Austin / Scofield
  "78728": 420000, // Wells Branch / Pflugerville border
  "78729": 480000, // NW Austin / Anderson Mill
  "78730": 850000, // River Place
  "78731": 700000, // NW Hills / Far West
  "78732": 750000, // Steiner Ranch
  "78733": 900000, // Bee Cave / West Lake Hills
  "78734": 650000, // Lakeway
  "78735": 620000, // Circle C / SW Austin
  "78736": 500000, // Oak Hill
  "78737": 520000, // Buda border / Shady Hollow
  "78738": 680000, // Bee Cave / Lake Travis
  "78739": 530000, // Circle C / Mopac South
  "78741": 380000, // East Riverside
  "78742": 300000, // Montopolis / SE
  "78744": 340000, // South Austin / Slaughter
  "78745": 450000, // South Austin / Stassney
  "78746": 1200000, // Westlake Hills / Eanes
  "78747": 380000, // SE Austin
  "78748": 430000, // South Austin / Shady Hollow
  "78749": 520000, // SW Austin / Great Hills
  "78750": 550000, // NW Austin / Balcones
  "78751": 530000, // Hyde Park / North Loop
  "78752": 400000, // North Austin / Windsor Hills
  "78753": 360000, // North Austin / Rundberg area
  "78754": 350000, // NE Austin / Dessau
  "78756": 600000, // Brentwood / Crestview
  "78757": 520000, // Allandale
  "78758": 370000, // North Austin / Metric
  "78759": 560000, // Great Hills / Arboretum
  // Suburbs
  "78610": 360000, // Buda
  "78613": 430000, // Cedar Park
  "78617": 310000, // Del Valle
  "78620": 600000, // Dripping Springs
  "78628": 400000, // Georgetown
  "78634": 330000, // Hutto
  "78640": 300000, // Kyle
  "78641": 380000, // Leander
  "78642": 350000, // Liberty Hill
  "78645": 520000, // Lago Vista
  "78653": 340000, // Manor
  "78654": 380000, // Marble Falls
  "78660": 350000, // Pflugerville
  "78664": 360000, // Round Rock
  "78665": 400000, // Round Rock South
  "78669": 600000, // Spicewood
  "78681": 420000, // Round Rock West
  "76574": 280000, // Taylor
  "78621": 300000, // Elgin
  "78626": 370000, // Georgetown
  "78633": 430000, // Georgetown Sun City
};

// Realistic median incomes by zip
const REALISTIC_INCOMES: Record<string, number> = {
  "78701": 85000, "78702": 82000, "78703": 130000, "78704": 95000,
  "78705": 42000, "78712": 35000, "78717": 105000, "78719": 55000,
  "78721": 52000, "78722": 72000, "78723": 68000, "78724": 50000,
  "78725": 48000, "78726": 110000, "78727": 85000, "78728": 78000,
  "78729": 92000, "78730": 140000, "78731": 110000, "78732": 125000,
  "78733": 145000, "78734": 100000, "78735": 105000, "78736": 90000,
  "78737": 95000, "78738": 120000, "78739": 98000, "78741": 55000,
  "78742": 42000, "78744": 52000, "78745": 72000, "78746": 180000,
  "78747": 68000, "78748": 82000, "78749": 100000, "78750": 105000,
  "78751": 75000, "78752": 60000, "78753": 55000, "78754": 52000,
  "78756": 90000, "78757": 82000, "78758": 58000, "78759": 100000,
  "78610": 75000, "78613": 95000, "78617": 50000, "78620": 110000,
  "78628": 82000, "78634": 72000, "78640": 68000, "78641": 82000,
  "78642": 78000, "78645": 80000, "78653": 62000, "78654": 65000,
  "78660": 82000, "78664": 78000, "78665": 88000, "78669": 105000,
  "78681": 92000, "76574": 58000, "78621": 55000, "78626": 72000,
  "78633": 75000,
};

// Realistic populations by zip
const REALISTIC_POPULATIONS: Record<string, number> = {
  "78701": 12500, "78702": 28000, "78703": 18000, "78704": 35000,
  "78705": 32000, "78712": 8000, "78717": 30000, "78719": 4500,
  "78721": 15000, "78722": 12000, "78723": 35000, "78724": 25000,
  "78725": 18000, "78726": 22000, "78727": 28000, "78728": 25000,
  "78729": 30000, "78730": 10000, "78731": 25000, "78732": 15000,
  "78733": 12000, "78734": 20000, "78735": 28000, "78736": 18000,
  "78737": 20000, "78738": 25000, "78739": 22000, "78741": 42000,
  "78742": 8000, "78744": 40000, "78745": 48000, "78746": 22000,
  "78747": 30000, "78748": 35000, "78749": 30000, "78750": 28000,
  "78751": 18000, "78752": 22000, "78753": 50000, "78754": 30000,
  "78756": 12000, "78757": 20000, "78758": 42000, "78759": 32000,
  "78610": 35000, "78613": 65000, "78617": 20000, "78620": 15000,
  "78628": 55000, "78634": 35000, "78640": 55000, "78641": 70000,
  "78642": 20000, "78645": 12000, "78653": 25000, "78654": 18000,
  "78660": 70000, "78664": 55000, "78665": 45000, "78669": 8000,
  "78681": 45000, "76574": 18000, "78621": 12000, "78626": 40000,
  "78633": 25000,
};

function getRealisticHomeValue(zip: string): number {
  if (REALISTIC_HOME_VALUES[zip]) return REALISTIC_HOME_VALUES[zip];
  // Fallback: use seeded random but within realistic Austin range ($280K-$600K)
  const rng = seededRandom(`hv-${zip}`);
  return Math.round(280000 + rng() * 320000);
}

function mockValueForLayer(layer: LayerDef, zip: string): number {
  const rng = seededRandom(`${layer.id}-${zip}`);
  const homeValue = getRealisticHomeValue(zip);
  const income = REALISTIC_INCOMES[zip] || Math.round(55000 + rng() * 50000);
  const population = REALISTIC_POPULATIONS[zip] || Math.round(15000 + rng() * 40000);

  switch (layer.unit) {
    case "currency": {
      // Home value layers should use realistic ZHVI
      const isHomeValue = ["home_value","home_value_detail","single_family_value","median_sale_price"].some(
        id => layer.id === id || layer.id.includes(id)
      );
      if (isHomeValue) return homeValue;
      if (layer.id === "condo_value" || layer.id.includes("condo_value")) return Math.round(homeValue * (0.7 + rng() * 0.15));
      if (layer.id.includes("median_income") || layer.id === "median_income") return income;
      if (layer.id.includes("salary")) {
        // Salary to afford: ~3.5x mortgage payment annually
        const monthlyMtg = (homeValue * 0.8 * 0.065) / 12;
        return Math.round((monthlyMtg / 0.28) * 12);
      }
      if (layer.id.includes("mortgage_payment")) {
        // 30yr fixed ~6.5%, 80% LTV
        const principal = homeValue * 0.8;
        const monthlyRate = 0.065 / 12;
        const n = 360;
        return Math.round(principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
      }
      if (layer.id.includes("property_tax_annual") || layer.id.includes("tax_annual")) {
        // Texas avg effective rate ~1.8%
        return Math.round(homeValue * (0.016 + rng() * 0.006));
      }
      if (layer.id.includes("insurance")) return Math.round(homeValue * (0.003 + rng() * 0.002));
      if (layer.id.includes("buy_vs_rent")) {
        const monthlyMtg = (homeValue * 0.8 * 0.065) / 12;
        const estimatedRent = homeValue * 0.005; // ~0.5% of value monthly
        return Math.round(monthlyMtg - estimatedRent);
      }
      return Math.round(800 + rng() * 3000);
    }
    case "percent": {
      if (layer.id === "home_value_growth_yoy" || layer.id.includes("growth_yoy")) {
        // Austin 2024-2025: most zips -3% to +4%
        return parseFloat((-3 + rng() * 7).toFixed(1));
      }
      if (layer.id.includes("growth_5yr") || layer.id.includes("5yr")) {
        // 5yr growth for Austin: most zips 25-65%
        return parseFloat((25 + rng() * 40).toFixed(1));
      }
      if (layer.id.includes("growth_mom") || layer.id.includes("mom")) {
        return parseFloat((-0.5 + rng() * 1.5).toFixed(1));
      }
      if (layer.id.includes("forecast") || layer.id.includes("price_forecast")) {
        // Austin forecast: mostly flat to slight decline
        return parseFloat((-6 + rng() * 8).toFixed(1));
      }
      if (layer.id.includes("overvalued")) {
        // Austin: many areas 5-25% overvalued
        return parseFloat((0 + rng() * 30).toFixed(1));
      }
      if (layer.id.includes("peak") || layer.id.includes("2022")) {
        // % from 2022 peak: most Austin zips -5% to -15%
        return parseFloat((-15 + rng() * 12).toFixed(1));
      }
      if (layer.id.includes("crash") || layer.id.includes("2007")) {
        // Austin barely crashed 2007-2012: most zips -2% to +5%
        return parseFloat((-5 + rng() * 10).toFixed(1));
      }
      if (layer.id.includes("cap_rate")) return parseFloat((3.5 + rng() * 3).toFixed(1));
      if (layer.id.includes("mtg_pct_income")) {
        const monthlyMtg = (homeValue * 0.8 * 0.065) / 12;
        return parseFloat(((monthlyMtg / (income / 12)) * 100).toFixed(1));
      }
      if (layer.id.includes("property_tax_rate")) return parseFloat((1.6 + rng() * 0.6).toFixed(2));
      if (layer.id.includes("sale_to_list")) return parseFloat((0.96 + rng() * 0.05).toFixed(3));
      if (layer.id.includes("price_drops")) return parseFloat((15 + rng() * 25).toFixed(1));
      if (layer.id.includes("remote_work")) return parseFloat((15 + rng() * 25).toFixed(1));
      if (layer.id.includes("college_degree")) return parseFloat((25 + rng() * 45).toFixed(1));
      if (layer.id.includes("homeownership")) return parseFloat((35 + rng() * 35).toFixed(1));
      if (layer.id.includes("poverty")) return parseFloat((5 + rng() * 20).toFixed(1));
      if (layer.id.includes("family_households")) return parseFloat((40 + rng() * 30).toFixed(1));
      if (layer.id.includes("rent_growth")) return parseFloat((-2 + rng() * 6).toFixed(1));
      if (layer.id.includes("vacancy")) return parseFloat((4 + rng() * 8).toFixed(1));
      if (layer.id.includes("population_growth") || layer.id.includes("income_growth")) return parseFloat((0.5 + rng() * 4).toFixed(1));
      if (layer.id.includes("housing_unit_growth")) return parseFloat((1 + rng() * 5).toFixed(1));
      // Generic percent
      return parseFloat((-5 + rng() * 15).toFixed(1));
    }
    case "days":
      // Austin DOM: typically 30-75 days
      return Math.round(25 + rng() * 55);
    case "number": {
      if (layer.id.includes("population")) return population;
      if (layer.id.includes("housing_units")) return Math.round(population * (0.35 + rng() * 0.1));
      if (layer.id.includes("inventory")) return Math.round(20 + rng() * 200);
      if (layer.id.includes("homes_sold") || layer.id.includes("home_sales")) return Math.round(15 + rng() * 150);
      if (layer.id.includes("population_density")) return Math.round(1500 + rng() * 5000);
      return Math.round(10 + rng() * 300);
    }
    case "score":
      return Math.round(30 + rng() * 55);
    case "ratio": {
      if (layer.id.includes("value_income") || layer.id.includes("income_ratio")) {
        return parseFloat((homeValue / income).toFixed(2));
      }
      if (layer.id.includes("sale_to_list")) return parseFloat((0.96 + rng() * 0.05).toFixed(3));
      return parseFloat((3 + rng() * 5).toFixed(2));
    }
    case "temperature":
      // Austin: ~68°F average
      return Math.round(66 + rng() * 5);
    default:
      return parseFloat((rng() * 100).toFixed(1));
  }
}

// ─── Attempt real DB query; fall back to mock ───────────────────────

async function queryLayerData(layer: LayerDef, opts: { zip?: string; metro?: string }): Promise<{ zip: string; value: number }[]> {
  try {
    const client = await pool.connect();
    try {
      // Check if the table exists
      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [layer.table]
      );
      if (!tableCheck.rows[0]?.exists) throw new Error("table_missing");

      // Determine date column
      const dateCol = layer.dateColumn || "date";
      const isYearCol = dateCol === "year";

      // Get latest value per zip
      let query: string;
      const params: any[] = [];

      if (opts.zip) {
        query = `
          SELECT zip, ${layer.column} AS value
          FROM ${layer.table}
          WHERE zip = $1
          ORDER BY ${dateCol} DESC
          LIMIT 1
        `;
        params.push(opts.zip);
      } else {
        // For choropleth — latest row per zip via DISTINCT ON
        query = `
          SELECT DISTINCT ON (zip) zip, ${layer.column} AS value
          FROM ${layer.table}
          ORDER BY zip, ${dateCol} DESC
        `;
      }

      const result = await client.query(query, params);
      if (result.rows.length === 0) throw new Error("no_data");

      return result.rows.map((r: any) => ({
        zip: r.zip,
        value: Number(r.value),
      }));
    } finally {
      client.release();
    }
  } catch {
    // Fall back to mock data
    const zips = opts.zip ? [opts.zip] : AUSTIN_ZIPS;
    return Array.from(new Set(zips)).map(zip => ({
      zip,
      value: mockValueForLayer(layer, zip),
    }));
  }
}

async function queryTimeseries(layer: LayerDef, zip: string, period: "monthly" | "yearly"): Promise<{ date: string; value: number }[]> {
  try {
    const client = await pool.connect();
    try {
      const tableCheck = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [layer.table]
      );
      if (!tableCheck.rows[0]?.exists) throw new Error("table_missing");

      const dateCol = layer.dateColumn || "date";

      if (period === "yearly" && dateCol !== "year") {
        // Aggregate monthly → yearly
        const query = `
          SELECT date_trunc('year', ${dateCol}) AS period, AVG(${layer.column}) AS value
          FROM ${layer.table}
          WHERE zip = $1
          GROUP BY period
          ORDER BY period ASC
        `;
        const result = await client.query(query, [zip]);
        return result.rows.map((r: any) => ({
          date: new Date(r.period).getFullYear().toString(),
          value: Number(r.value),
        }));
      } else if (dateCol === "year") {
        const query = `
          SELECT year::text AS date, ${layer.column} AS value
          FROM ${layer.table}
          WHERE zip = $1
          ORDER BY year ASC
        `;
        const result = await client.query(query, [zip]);
        return result.rows.map((r: any) => ({ date: r.date, value: Number(r.value) }));
      } else {
        // Monthly
        const query = `
          SELECT to_char(${dateCol}, 'YYYY-MM') AS date, ${layer.column} AS value
          FROM ${layer.table}
          WHERE zip = $1
          ORDER BY ${dateCol} ASC
        `;
        const result = await client.query(query, [zip]);
        return result.rows.map((r: any) => ({ date: r.date, value: Number(r.value) }));
      }
    } finally {
      client.release();
    }
  } catch {
    // Mock time-series with realistic Austin growth curves
    const points: { date: string; value: number }[] = [];
    const currentValue = mockValueForLayer(layer, zip);
    const rng = seededRandom(`ts-${layer.id}-${zip}`);
    const isCurrency = layer.unit === "currency";
    const isHomeValueLayer = isCurrency && (
      layer.id.includes("home_value") || layer.id === "home_value" ||
      layer.id.includes("single_family") || layer.id.includes("condo_value") ||
      layer.id.includes("median_sale_price")
    );

    // Austin home value trajectory (multiplier vs current value):
    // 2015: ~50%, 2016: ~53%, 2017: ~57%, 2018: ~62%, 2019: ~65%, 
    // 2020: ~68%, 2021: ~85%, 2022 peak: ~108%, 2023: ~97%, 2024: ~98%, 2025: ~100%
    const yearlyMultipliers: Record<number, number> = {
      2015: 0.50, 2016: 0.53, 2017: 0.57, 2018: 0.62, 2019: 0.65,
      2020: 0.68, 2021: 0.85, 2022: 1.08, 2023: 0.97, 2024: 0.98, 2025: 1.00,
    };

    if (period === "yearly") {
      for (let y = 2015; y <= 2025; y++) {
        const noise = 1 + (rng() - 0.5) * 0.03; // ±1.5% noise
        if (isHomeValueLayer) {
          const mult = yearlyMultipliers[y] || 1.0;
          const val = currentValue * mult * noise;
          points.push({ date: y.toString(), value: parseFloat(val.toFixed(2)) });
        } else if (isCurrency) {
          // Other currency metrics: gentle upward trend
          const trendMult = 0.7 + (y - 2015) * 0.03;
          const val = currentValue * trendMult * noise;
          points.push({ date: y.toString(), value: parseFloat(val.toFixed(2)) });
        } else {
          // Non-currency: drift around current with gentle noise
          const drift = 1 + (rng() - 0.45) * 0.06;
          const trendAdj = 1 + (y - 2020) * 0.015;
          const val = currentValue * drift * trendAdj;
          points.push({ date: y.toString(), value: parseFloat(val.toFixed(2)) });
        }
      }
    } else {
      // Monthly data 2020-2025
      // Monthly multipliers interpolated from yearly curve
      const monthlyBase: Record<string, number> = {};
      for (let y = 2020; y <= 2025; y++) {
        for (let m = 1; m <= (y === 2025 ? 6 : 12); m++) {
          const yearMult = yearlyMultipliers[y] || 1.0;
          const nextYearMult = yearlyMultipliers[y + 1] || yearMult;
          // Interpolate within the year
          const monthFrac = (m - 1) / 12;
          const interpMult = yearMult + (nextYearMult - yearMult) * monthFrac;
          // Add seasonal variation (spring bump, winter dip)
          const seasonal = 1 + Math.sin(((m - 3) / 12) * Math.PI * 2) * 0.015;
          const noise = 1 + (rng() - 0.5) * 0.01;
          const key = `${y}-${String(m).padStart(2, "0")}`;

          if (isHomeValueLayer) {
            monthlyBase[key] = currentValue * interpMult * seasonal * noise;
          } else if (isCurrency) {
            const trendMult = 0.7 + ((y - 2020) * 12 + m) / (6 * 12) * 0.3;
            monthlyBase[key] = currentValue * trendMult * seasonal * noise;
          } else {
            const drift = 1 + (rng() - 0.45) * 0.03;
            const trendAdj = 1 + ((y - 2020) * 12 + m) / (6 * 12) * 0.08;
            monthlyBase[key] = currentValue * drift * trendAdj * seasonal;
          }
        }
      }
      for (const [date, value] of Object.entries(monthlyBase)) {
        points.push({ date, value: parseFloat(value.toFixed(2)) });
      }
    }
    return points;
  }
}

// ─── Zip metadata mock (another agent building real data) ───────────

const ZIP_META: Record<string, { county: string; city?: string }> = {
  "78701": { county: "Travis", city: "Austin" },
  "78702": { county: "Travis", city: "Austin" },
  "78703": { county: "Travis", city: "Austin" },
  "78704": { county: "Travis", city: "Austin" },
  "78705": { county: "Travis", city: "Austin" },
  "78712": { county: "Travis", city: "Austin" },
  "78717": { county: "Travis", city: "Austin" },
  "78721": { county: "Travis", city: "Austin" },
  "78722": { county: "Travis", city: "Austin" },
  "78723": { county: "Travis", city: "Austin" },
  "78724": { county: "Travis", city: "Austin" },
  "78725": { county: "Travis", city: "Austin" },
  "78726": { county: "Williamson", city: "Austin" },
  "78727": { county: "Travis", city: "Austin" },
  "78728": { county: "Williamson", city: "Austin" },
  "78729": { county: "Williamson", city: "Austin" },
  "78730": { county: "Travis", city: "Austin" },
  "78731": { county: "Travis", city: "Austin" },
  "78732": { county: "Travis", city: "Austin" },
  "78733": { county: "Travis", city: "Austin" },
  "78734": { county: "Travis", city: "Austin" },
  "78735": { county: "Travis", city: "Austin" },
  "78736": { county: "Travis", city: "Austin" },
  "78737": { county: "Hays", city: "Austin" },
  "78738": { county: "Travis", city: "Austin" },
  "78739": { county: "Travis", city: "Austin" },
  "78741": { county: "Travis", city: "Austin" },
  "78742": { county: "Travis", city: "Austin" },
  "78744": { county: "Travis", city: "Austin" },
  "78745": { county: "Travis", city: "Austin" },
  "78746": { county: "Travis", city: "Austin" },
  "78747": { county: "Travis", city: "Austin" },
  "78748": { county: "Travis", city: "Austin" },
  "78749": { county: "Travis", city: "Austin" },
  "78750": { county: "Travis", city: "Austin" },
  "78751": { county: "Travis", city: "Austin" },
  "78752": { county: "Travis", city: "Austin" },
  "78753": { county: "Travis", city: "Austin" },
  "78754": { county: "Travis", city: "Austin" },
  "78756": { county: "Travis", city: "Austin" },
  "78757": { county: "Travis", city: "Austin" },
  "78758": { county: "Travis", city: "Austin" },
  "78759": { county: "Travis", city: "Austin" },
  "78610": { county: "Hays", city: "Buda" },
  "78613": { county: "Williamson", city: "Cedar Park" },
  "78617": { county: "Travis", city: "Del Valle" },
  "78620": { county: "Hays", city: "Dripping Springs" },
  "78628": { county: "Williamson", city: "Georgetown" },
  "78634": { county: "Williamson", city: "Hutto" },
  "78641": { county: "Williamson", city: "Leander" },
  "78645": { county: "Travis", city: "Lago Vista" },
  "78653": { county: "Travis", city: "Manor" },
  "78660": { county: "Williamson", city: "Pflugerville" },
  "78664": { county: "Williamson", city: "Round Rock" },
  "78665": { county: "Williamson", city: "Round Rock" },
  "78681": { county: "Williamson", city: "Round Rock" },
  "76574": { county: "Williamson", city: "Taylor" },
  "78621": { county: "Bastrop", city: "Elgin" },
  "78626": { county: "Williamson", city: "Georgetown" },
  "78633": { county: "Williamson", city: "Georgetown" },
  "78642": { county: "Williamson", city: "Liberty Hill" },
  "78654": { county: "Burnet", city: "Marble Falls" },
  "78669": { county: "Travis", city: "Spicewood" },
};

// ─── Register Routes ────────────────────────────────────────────────

export function registerPulseV2Routes(app: Express): void {
  // ═══════════════════════════════════════════════════════════════════
  // 1. GET /api/pulse/layers — Full catalog
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/layers", isAuthenticated, (_req: Request, res: Response) => {
    // Strip internal fields (table, column, dateColumn) from response
    const categories = LAYER_CATALOG.map(cat => ({
      id: cat.id,
      label: cat.label,
      layers: cat.layers.map(({ id, label, source, description, unit }) => ({
        id, label, source, description, unit,
      })),
    }));
    res.json({ categories });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. GET /api/pulse/v2/layer/:layerId — Choropleth data
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/layer/:layerId", isAuthenticated, async (req: Request, res: Response) => {
    const { layerId } = req.params;
    const metro = (req.query.metro as string) || "austin";

    const layer = LAYER_MAP.get(layerId);
    if (!layer) {
      return res.status(404).json({ error: `Unknown layer: ${layerId}` });
    }

    try {
      const rawData = await queryLayerData(layer, { metro });

      const values = rawData.map(d => d.value).filter(v => v != null && !isNaN(v));
      const data = rawData.map(d => ({
        zip: d.zip,
        value: d.value,
        label: formatLabel(d.value, layer.unit),
      }));

      res.json({
        layerId,
        data,
        meta: {
          min: values.length ? Math.min(...values) : 0,
          max: values.length ? Math.max(...values) : 0,
          median: median(values),
          unit: layer.unit,
          source: layer.source,
          description: layer.description,
          count: data.length,
        },
      });
    } catch (err: any) {
      console.error(`[Pulse V2] layer/${layerId} error:`, err);
      res.status(500).json({ error: "Failed to fetch layer data" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. GET /api/pulse/v2/layer/:layerId/timeseries
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/layer/:layerId/timeseries", isAuthenticated, async (req: Request, res: Response) => {
    const { layerId } = req.params;
    const zip = (req.query.zip as string) || "78704";
    const period = ((req.query.period as string) || "yearly") as "monthly" | "yearly";

    const layer = LAYER_MAP.get(layerId);
    if (!layer) {
      return res.status(404).json({ error: `Unknown layer: ${layerId}` });
    }

    try {
      const data = await queryTimeseries(layer, zip, period);

      res.json({
        layerId,
        zip,
        period,
        data,
        meta: {
          unit: layer.unit,
          source: layer.source,
          description: layer.description,
          count: data.length,
        },
      });
    } catch (err: any) {
      console.error(`[Pulse V2] timeseries/${layerId} error:`, err);
      res.status(500).json({ error: "Failed to fetch timeseries data" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. GET /api/pulse/v2/zip/:zip/summary — Complete zip summary
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/zip/:zip/summary", isAuthenticated, async (req: Request, res: Response) => {
    const { zip } = req.params;
    const meta = ZIP_META[zip];

    try {
      // Gather values for every layer in the catalog for this zip
      const metrics: Record<string, number> = {};
      const promises = Array.from(LAYER_MAP.entries()).map(async ([id, layer]) => {
        const rows = await queryLayerData(layer, { zip });
        if (rows.length > 0) {
          metrics[id] = rows[0].value;
        }
      });
      await Promise.all(promises);

      // Build scores
      const appreciation = metrics.home_value_growth_yoy != null
        ? Math.min(100, Math.max(0, Math.round(50 + metrics.home_value_growth_yoy * 3)))
        : 30;
      const dom = metrics.days_on_market != null
        ? Math.min(100, Math.max(0, Math.round(100 - metrics.days_on_market)))
        : 28;
      const inventory = metrics.for_sale_inventory != null
        ? Math.min(100, Math.max(0, Math.round(50 - metrics.for_sale_inventory * 0.1)))
        : 45;

      // Forecast
      const forecastVal = metrics.home_price_forecast ?? -5.8;

      // Best month logic (deterministic from zip)
      const rng = seededRandom(`bestmonth-${zip}`);
      const buyMonths = ["January", "February", "October", "November", "December"];
      const sellMonths = ["March", "April", "May", "June"];
      const bestBuy = buyMonths[Math.floor(rng() * buyMonths.length)];
      const bestSell = sellMonths[Math.floor(rng() * sellMonths.length)];

      const now = new Date();
      const dataDate = now.toLocaleString("en-US", { month: "short", year: "numeric" });

      res.json({
        zip,
        county: meta?.county || "Travis",
        city: meta?.city || "Austin",
        metro: "Austin",
        state: "Texas",
        source: "Zillow / US Census Bureau / Redfin",
        dataDate,
        forecast: {
          value: forecastVal,
          direction: forecastVal >= 0 ? "up" : "down",
        },
        bestMonthBuy: bestBuy,
        bestMonthSell: bestSell,
        scores: {
          appreciation,
          daysOnMarket: dom,
          mortgageRates: 48, // placeholder — would come from macro data
          inventory,
        },
        metrics,
      });
    } catch (err: any) {
      console.error(`[Pulse V2] zip/${zip}/summary error:`, err);
      res.status(500).json({ error: "Failed to fetch zip summary" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. GET /api/pulse/v2/zip/:zip/scores — Composite scores
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/zip/:zip/scores", isAuthenticated, async (req: Request, res: Response) => {
    const { zip } = req.params;

    try {
      // Fetch underlying metrics
      const fetchMetric = async (layerId: string): Promise<number | null> => {
        const layer = LAYER_MAP.get(layerId);
        if (!layer) return null;
        const rows = await queryLayerData(layer, { zip });
        return rows.length > 0 ? rows[0].value : null;
      };

      const [
        capRate,
        hvGrowthYoy,
        grossRentYield,
        populationGrowth,
        incomeGrowth,
        hvGrowth5yr,
        dom,
        inventoryVal,
        saleToList,
      ] = await Promise.all([
        fetchMetric("cap_rate"),
        fetchMetric("home_value_growth_yoy"),
        fetchMetric("gross_rent_yield"),
        fetchMetric("population_growth"),
        fetchMetric("income_growth"),
        fetchMetric("home_value_growth_5yr"),
        fetchMetric("days_on_market"),
        fetchMetric("for_sale_inventory"),
        fetchMetric("sale_to_list"),
      ]);

      // ── Investor Score (0-100) ──
      // Weighted: cap rate (40%), appreciation (30%), rent yield (30%)
      const capScore = capRate != null ? Math.min(100, Math.max(0, capRate * 10)) : 50;
      const apprScore = hvGrowthYoy != null ? Math.min(100, Math.max(0, 50 + hvGrowthYoy * 3)) : 50;
      const rentScore = grossRentYield != null ? Math.min(100, Math.max(0, grossRentYield * 12)) : 50;
      const investorScore = Math.round(capScore * 0.4 + apprScore * 0.3 + rentScore * 0.3);

      // ── Growth Score (0-100) ──
      // Weighted: pop growth (35%), income growth (35%), home value growth 5yr (30%)
      const popScore = populationGrowth != null ? Math.min(100, Math.max(0, 50 + populationGrowth * 5)) : 50;
      const incScore = incomeGrowth != null ? Math.min(100, Math.max(0, 50 + incomeGrowth * 3)) : 50;
      const hv5yrScore = hvGrowth5yr != null ? Math.min(100, Math.max(0, 50 + hvGrowth5yr * 1)) : 50;
      const growthScore = Math.round(popScore * 0.35 + incScore * 0.35 + hv5yrScore * 0.3);

      // ── Market Health (0-100) ──
      // Weighted: DOM (40%), inventory (30%), sale-to-list (30%)
      // Low DOM = healthy, low inventory = healthy, high sale-to-list = healthy
      const domScore = dom != null ? Math.min(100, Math.max(0, 100 - dom)) : 50;
      const invScore = inventoryVal != null ? Math.min(100, Math.max(0, 80 - inventoryVal * 0.15)) : 50;
      const stlScore = saleToList != null ? Math.min(100, Math.max(0, (saleToList - 0.9) * 500)) : 50;
      const marketHealth = Math.round(domScore * 0.4 + invScore * 0.3 + stlScore * 0.3);

      res.json({
        zip,
        investorScore,
        growthScore,
        marketHealth,
        breakdown: {
          investor: {
            capRate: { value: capRate, score: Math.round(capScore), weight: 0.4 },
            appreciation: { value: hvGrowthYoy, score: Math.round(apprScore), weight: 0.3 },
            rentYield: { value: grossRentYield, score: Math.round(rentScore), weight: 0.3 },
          },
          growth: {
            populationGrowth: { value: populationGrowth, score: Math.round(popScore), weight: 0.35 },
            incomeGrowth: { value: incomeGrowth, score: Math.round(incScore), weight: 0.35 },
            homeValueGrowth5yr: { value: hvGrowth5yr, score: Math.round(hv5yrScore), weight: 0.3 },
          },
          marketHealth: {
            daysOnMarket: { value: dom, score: Math.round(domScore), weight: 0.4 },
            inventory: { value: inventoryVal, score: Math.round(invScore), weight: 0.3 },
            saleToList: { value: saleToList, score: Math.round(stlScore), weight: 0.3 },
          },
        },
      });
    } catch (err: any) {
      console.error(`[Pulse V2] zip/${zip}/scores error:`, err);
      res.status(500).json({ error: "Failed to calculate scores" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. GET /api/pulse/v2/export/:layerId — CSV download
  // ═══════════════════════════════════════════════════════════════════
  app.get("/api/pulse/v2/export/:layerId", isAuthenticated, async (req: Request, res: Response) => {
    const { layerId } = req.params;
    const zip = req.query.zip as string | undefined;

    const layer = LAYER_MAP.get(layerId);
    if (!layer) {
      return res.status(404).json({ error: `Unknown layer: ${layerId}` });
    }

    try {
      // If zip provided, export time-series for that zip
      // Otherwise, export latest values for all zips
      if (zip) {
        const data = await queryTimeseries(layer, zip, "monthly");
        const csv = [
          `Date,${layer.label}`,
          ...data.map(d => `${d.date},${d.value}`),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${layerId}_${zip}.csv"`);
        return res.send(csv);
      } else {
        const data = await queryLayerData(layer, { metro: "austin" });
        const csv = [
          `Zip Code,${layer.label}`,
          ...data.map(d => `${d.zip},${d.value}`),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${layerId}_all_zips.csv"`);
        return res.send(csv);
      }
    } catch (err: any) {
      console.error(`[Pulse V2] export/${layerId} error:`, err);
      res.status(500).json({ error: "Failed to generate export" });
    }
  });

  console.log("[Pulse V2] Registered 6 route groups under /api/pulse/v2/*");
}
