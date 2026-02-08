import { DataLayer, DataLayerCategory } from "./types";

// ─── Complete Data Layer Catalog ──────────────────────────────
// Matches Reventure's layer categories and structure

export const DATA_LAYERS: DataLayer[] = [
  // Popular Data
  { id: "home-value", label: "Home Value", description: "Zillow Home Value Index (ZHVI) — the typical home value in a zip code, smoothed and seasonally adjusted.", category: "popular", unit: "currency" },
  { id: "home-value-growth-yoy", label: "Home Value Growth (YoY)", description: "Year-over-year percentage change in home values. Positive values indicate appreciation.", category: "popular", unit: "percent" },
  { id: "for-sale-inventory", label: "For Sale Inventory", description: "Total number of homes currently listed for sale in the zip code.", category: "popular", unit: "number" },
  { id: "home-price-forecast", label: "Home Price Forecast", description: "Projected home price change over the next 12 months based on market fundamentals, affordability, and trends.", category: "popular", unit: "percent" },
  { id: "home-value-growth-5yr", label: "Home Value Growth (5-Year)", description: "Cumulative percentage change in home values over the past 5 years.", category: "popular", unit: "percent" },
  { id: "home-value-growth-mom", label: "Home Value Growth (MoM)", description: "Month-over-month percentage change in home values.", category: "popular", unit: "percent" },
  { id: "overvalued-pct", label: "Overvalued %", description: "How much home prices are above or below their historically normal level relative to local incomes. Positive = overvalued.", category: "popular", unit: "percent" },
  { id: "days-on-market", label: "Days on Market", description: "Average number of days homes stay on the market before going under contract.", category: "popular", unit: "days" },
  { id: "home-sales", label: "Home Sales", description: "Number of homes sold in the most recent month.", category: "popular", unit: "number" },
  { id: "cap-rate", label: "Cap Rate", description: "Capitalization rate — annual net operating income divided by property value. Higher = better return for investors.", category: "popular", unit: "percent" },
  { id: "long-term-growth-score", label: "Long-Term Growth Score", description: "Composite score (0-100) predicting long-term price appreciation based on demographics, economy, and supply factors.", category: "popular", unit: "score" },

  // Home Price & Affordability
  { id: "home-value-detail", label: "Home Value", description: "Zillow Home Value Index for all home types.", category: "home-price", unit: "currency" },
  { id: "home-value-growth-yoy-detail", label: "Home Value Growth YoY", description: "Year-over-year growth in home values.", category: "home-price", unit: "percent" },
  { id: "home-value-growth-5yr-detail", label: "Home Value Growth 5-Year", description: "5-year cumulative home value growth.", category: "home-price", unit: "percent" },
  { id: "home-value-growth-mom-detail", label: "Home Value Growth MoM", description: "Month-over-month home value growth.", category: "home-price", unit: "percent" },
  { id: "overvalued-pct-detail", label: "Overvalued %", description: "Current value/income ratio vs. historical average.", category: "home-price", unit: "percent" },
  { id: "value-income-ratio", label: "Value / Income Ratio", description: "Median home value divided by median household income. Higher ratios indicate less affordability.", category: "home-price", unit: "ratio" },
  { id: "sf-value", label: "Single Family Value", description: "Zillow Home Value Index for single-family homes only.", category: "home-price", unit: "currency" },
  { id: "sf-value-growth-yoy", label: "Single Family Value Growth YoY", description: "Year-over-year growth for single-family homes.", category: "home-price", unit: "percent" },
  { id: "condo-value", label: "Condo Value", description: "Zillow Home Value Index for condominiums.", category: "home-price", unit: "currency" },
  { id: "condo-value-growth-yoy", label: "Condo Value Growth YoY", description: "Year-over-year growth for condominiums.", category: "home-price", unit: "percent" },
  { id: "mortgage-payment", label: "Mortgage Payment", description: "Estimated monthly mortgage payment based on home value, current rates, and 20% down.", category: "home-price", unit: "currency" },
  { id: "mtg-pct-income", label: "Mtg Payment as % of Income", description: "Monthly mortgage payment as a percentage of median monthly household income.", category: "home-price", unit: "percent" },
  { id: "salary-to-afford", label: "Salary to Afford a House", description: "Annual salary needed to afford the median home (max 30% of income on housing).", category: "home-price", unit: "currency" },
  { id: "property-tax-annual", label: "Property Tax Annual", description: "Median annual property tax payment.", category: "home-price", unit: "currency" },
  { id: "property-tax-rate", label: "Property Tax Rate", description: "Effective property tax rate as a percentage of home value.", category: "home-price", unit: "percent" },
  { id: "insurance-annual", label: "Insurance Premium Annual", description: "Estimated annual homeowner's insurance premium.", category: "home-price", unit: "currency" },
  { id: "insurance-pct", label: "Insurance Premium %", description: "Annual insurance as a percentage of home value.", category: "home-price", unit: "percent" },
  { id: "buy-vs-rent", label: "Buy v Rent Differential", description: "Monthly cost difference between buying and renting. Negative = buying is cheaper.", category: "home-price", unit: "currency" },
  { id: "pct-from-2022-peak", label: "% Change from 2022 Peak", description: "Current price relative to the 2022 market peak.", category: "home-price", unit: "percent" },
  { id: "pct-crash-2007", label: "% Crash from 2007-12", description: "Price decline from 2007 peak to 2012 trough. Markets that crashed more may be more resilient now.", category: "home-price", unit: "percent" },

  // Market Trends
  { id: "for-sale-inventory-detail", label: "For Sale Inventory", description: "Current active listings count.", category: "market-trends", unit: "number" },
  { id: "home-price-forecast-detail", label: "Home Price Forecast", description: "12-month projected price change.", category: "market-trends", unit: "percent" },
  { id: "days-on-market-detail", label: "Days on Market", description: "Average days until sale.", category: "market-trends", unit: "days" },
  { id: "home-sales-detail", label: "Home Sales", description: "Monthly closed transactions.", category: "market-trends", unit: "number" },
  { id: "cap-rate-detail", label: "Cap Rate", description: "Investor capitalization rate.", category: "market-trends", unit: "percent" },
  { id: "long-term-growth-detail", label: "Long-Term Growth Score", description: "Composite growth potential score.", category: "market-trends", unit: "score" },

  // Demographic
  { id: "population", label: "Population", description: "Total population from the most recent Census/ACS estimates.", category: "demographic", unit: "number" },
  { id: "median-income", label: "Median Household Income", description: "Median annual household income from ACS data.", category: "demographic", unit: "currency" },
  { id: "population-growth", label: "Population Growth", description: "Year-over-year population growth rate.", category: "demographic", unit: "percent" },
  { id: "income-growth", label: "Income Growth", description: "Year-over-year median income growth.", category: "demographic", unit: "percent" },
  { id: "population-density", label: "Population Density", description: "People per square mile.", category: "demographic", unit: "number" },
  { id: "avg-temperature", label: "Weather (Avg Temperature)", description: "Average annual temperature in degrees Fahrenheit.", category: "demographic", unit: "temperature" },
  { id: "remote-work-pct", label: "Remote Work %", description: "Percentage of workers working from home.", category: "demographic", unit: "percent" },
  { id: "college-degree-rate", label: "College Degree Rate", description: "Percentage of adults 25+ with a bachelor's degree or higher.", category: "demographic", unit: "percent" },
  { id: "homeownership-rate", label: "Homeownership Rate", description: "Percentage of occupied housing units that are owner-occupied.", category: "demographic", unit: "percent" },
  { id: "homeowners-25-44", label: "Homeowners 25-44 %", description: "Homeownership rate among 25-44 year olds.", category: "demographic", unit: "percent" },
  { id: "homeowners-75plus", label: "Homeowners 75+ %", description: "Homeownership rate among people 75 and older.", category: "demographic", unit: "percent" },
  { id: "mortgaged-home-pct", label: "Mortgaged Home %", description: "Percentage of owner-occupied homes with a mortgage.", category: "demographic", unit: "percent" },
  { id: "median-age", label: "Median Age", description: "Median age of residents.", category: "demographic", unit: "number" },
  { id: "poverty-rate", label: "Poverty Rate", description: "Percentage of population below the poverty line.", category: "demographic", unit: "percent" },
  { id: "family-households-pct", label: "Family Households %", description: "Percentage of households that are family households.", category: "demographic", unit: "percent" },
  { id: "single-households-pct", label: "Single Households %", description: "Percentage of single-person households.", category: "demographic", unit: "percent" },
  { id: "housing-units", label: "Housing Units", description: "Total number of housing units.", category: "demographic", unit: "number" },
  { id: "housing-unit-growth", label: "Housing Unit Growth Rate", description: "Year-over-year growth in housing units.", category: "demographic", unit: "percent" },

  // Investor Metrics
  { id: "cap-rate-investor", label: "Cap Rate", description: "Capitalization rate for rental property investors.", category: "investor", unit: "percent" },
  { id: "gross-rent-yield", label: "Gross Rent Yield", description: "Annual rent divided by home value. Higher yield = better cash flow potential.", category: "investor", unit: "percent" },
  { id: "home-sales-investor", label: "Home Sales Volume", description: "Total transaction volume — higher volume means more liquidity.", category: "investor", unit: "number" },
  { id: "rent-growth", label: "Rent Growth", description: "Year-over-year percentage change in rents.", category: "investor", unit: "percent" },
  { id: "vacancy-rate", label: "Vacancy Rate", description: "Percentage of rental units that are vacant.", category: "investor", unit: "percent" },

  // Spyglass Scores
  { id: "market-health-score", label: "Market Health Score", description: "Spyglass composite score (0-100) measuring overall market health based on supply, demand, pricing, and economic fundamentals.", category: "spyglass", unit: "score" },
  { id: "investment-score", label: "Investment Score", description: "Spyglass score (0-100) rating a zip code's investment potential based on yields, appreciation, and risk factors.", category: "spyglass", unit: "score" },
  { id: "growth-potential-score", label: "Growth Potential Score", description: "Spyglass score (0-100) predicting future price growth based on demographics, jobs, and housing supply.", category: "spyglass", unit: "score" },
];

export const LAYER_CATEGORIES: DataLayerCategory[] = [
  {
    id: "popular",
    label: "Popular Data",
    layers: DATA_LAYERS.filter((l) => l.category === "popular"),
  },
  {
    id: "home-price",
    label: "Home Price & Affordability",
    layers: DATA_LAYERS.filter((l) => l.category === "home-price"),
  },
  {
    id: "market-trends",
    label: "Market Trends",
    layers: DATA_LAYERS.filter((l) => l.category === "market-trends"),
  },
  {
    id: "demographic",
    label: "Demographic",
    layers: DATA_LAYERS.filter((l) => l.category === "demographic"),
  },
  {
    id: "investor",
    label: "Investor Metrics",
    layers: DATA_LAYERS.filter((l) => l.category === "investor"),
  },
  {
    id: "spyglass",
    label: "Spyglass Scores",
    layers: DATA_LAYERS.filter((l) => l.category === "spyglass"),
  },
];

export function getLayerById(id: string): DataLayer | undefined {
  return DATA_LAYERS.find((l) => l.id === id);
}

export function formatLayerValue(value: number, layer: DataLayer): string {
  switch (layer.unit) {
    case "currency":
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${Math.round(value).toLocaleString()}`;
    case "percent":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "days":
      return `${Math.round(value)}d`;
    case "score":
      return `${Math.round(value)}`;
    case "ratio":
      return value.toFixed(2);
    case "temperature":
      return `${Math.round(value)}°F`;
    case "number":
    default:
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : Math.round(value).toLocaleString();
  }
}
