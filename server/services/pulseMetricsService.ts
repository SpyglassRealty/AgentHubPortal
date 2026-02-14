/**
 * Pulse Calculated Metrics Service
 * 
 * After raw data is loaded from Zillow, Census, and Redfin,
 * this service computes derived metrics for each zip code:
 * 
 * - Overvalued % = (current value_income_ratio / historical_avg_ratio) - 1
 * - Mortgage payment = standard amortization at current rates
 * - Mtg as % of income = (annual_mortgage / median_income) * 100
 * - Salary to afford = mortgage * 12 / 0.28 (28% rule)
 * - Cap rate = (annual_rent * 0.6) / home_value (60% expense ratio)
 * - Buy vs rent = mortgage_payment / monthly_rent
 * - Home price forecast = simple linear regression on 12-month trend
 * - Investor score, growth score, market health score (composite)
 */

import { db } from '../db';
import { pulseZillowData, pulseCensusData, pulseRedfinData, pulseMetrics } from '@shared/schema';
import { sql, eq, desc, and, gte } from 'drizzle-orm';
import { AUSTIN_MSA_ZIPS } from '../config/austinMsaZips';

// Current mortgage rate — could be fetched from an API, but hardcoding is simpler
// Update periodically or fetch from FRED API
const CURRENT_MORTGAGE_RATE = 0.0689; // ~6.89% as of mid-2025
const LOAN_TERM_YEARS = 30;
const DOWN_PAYMENT_PCT = 0.20;
const EXPENSE_RATIO = 0.60; // For cap rate: 60% of rent goes to expenses
const AFFORDABILITY_RATIO = 0.28; // 28% of income rule

/**
 * Calculate monthly mortgage payment using standard amortization formula
 * P = L[c(1+c)^n] / [(1+c)^n - 1]
 */
function calcMonthlyMortgage(homeValue: number, rate: number = CURRENT_MORTGAGE_RATE, years: number = LOAN_TERM_YEARS): number {
  const loanAmount = homeValue * (1 - DOWN_PAYMENT_PCT);
  const monthlyRate = rate / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return loanAmount / numPayments;
  
  const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                   (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return Math.round(payment * 100) / 100;
}

/**
 * Simple linear regression for price forecast
 * Returns the predicted % change over the next 12 months
 */
function linearRegressionForecast(values: { x: number; y: number }[]): number | null {
  if (values.length < 6) return null; // Need at least 6 months of data
  
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (const { x, y } of values) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict value 12 months from the last data point
  const lastX = values[values.length - 1].x;
  const currentValue = slope * lastX + intercept;
  const futureValue = slope * (lastX + 12) + intercept;
  
  if (currentValue === 0) return null;
  
  return ((futureValue - currentValue) / currentValue) * 100;
}

/**
 * Calculate the historical average value-to-income ratio for a zip code
 * Uses all available Zillow + Census data
 */
async function getHistoricalAvgValueIncomeRatio(zip: string): Promise<number | null> {
  // Get all Zillow data for this zip
  const zillowRows = await db
    .select({ date: pulseZillowData.date, homeValue: pulseZillowData.homeValue })
    .from(pulseZillowData)
    .where(eq(pulseZillowData.zip, zip))
    .orderBy(pulseZillowData.date);
  
  // Get census income data
  const censusRows = await db
    .select({ year: pulseCensusData.year, medianIncome: pulseCensusData.medianIncome })
    .from(pulseCensusData)
    .where(eq(pulseCensusData.zip, zip))
    .orderBy(pulseCensusData.year);
  
  if (zillowRows.length === 0 || censusRows.length === 0) return null;
  
  // Build income lookup by year
  const incomeByYear = new Map<number, number>();
  for (const row of censusRows) {
    if (row.medianIncome) {
      incomeByYear.set(row.year, parseFloat(row.medianIncome));
    }
  }
  
  // Get the latest known income — we'll use it for years without Census data
  const latestIncome = censusRows[censusRows.length - 1]?.medianIncome
    ? parseFloat(censusRows[censusRows.length - 1].medianIncome!)
    : null;
  
  if (!latestIncome) return null;
  
  // Calculate value/income ratios for each period
  const ratios: number[] = [];
  for (const row of zillowRows) {
    if (!row.homeValue) continue;
    const value = parseFloat(row.homeValue);
    const year = new Date(row.date).getFullYear();
    const income = incomeByYear.get(year) || latestIncome;
    if (income > 0) {
      ratios.push(value / income);
    }
  }
  
  if (ratios.length === 0) return null;
  
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

/**
 * Main pipeline: compute and store derived metrics for all Austin MSA zips
 */
export async function refreshPulseMetrics(): Promise<{ rowsProcessed: number; errors: string[] }> {
  console.log('[Metrics] Starting pulse metrics calculation...');
  const errors: string[] = [];
  let rowsProcessed = 0;
  
  const today = new Date().toISOString().split('T')[0];
  
  for (const zip of AUSTIN_MSA_ZIPS) {
    try {
      // Get latest Zillow data
      const [latestZillow] = await db
        .select()
        .from(pulseZillowData)
        .where(eq(pulseZillowData.zip, zip))
        .orderBy(desc(pulseZillowData.date))
        .limit(1);
      
      // Get latest Census data
      const [latestCensus] = await db
        .select()
        .from(pulseCensusData)
        .where(eq(pulseCensusData.zip, zip))
        .orderBy(desc(pulseCensusData.year))
        .limit(1);
      
      // Get latest Redfin data
      const [latestRedfin] = await db
        .select()
        .from(pulseRedfinData)
        .where(eq(pulseRedfinData.zip, zip))
        .orderBy(desc(pulseRedfinData.periodStart))
        .limit(1);
      
      // Skip if no Zillow data at all
      if (!latestZillow?.homeValue) continue;
      
      const homeValue = parseFloat(latestZillow.homeValue);
      const medianIncome = latestCensus?.medianIncome ? parseFloat(latestCensus.medianIncome) : null;
      const monthlyRent = latestZillow.rentValue ? parseFloat(latestZillow.rentValue) : null;
      
      // --- Calculate each metric ---
      
      // Value-to-income ratio
      const valueIncomeRatio = medianIncome && medianIncome > 0 ? homeValue / medianIncome : null;
      
      // Overvalued %
      let overvaluedPct: number | null = null;
      if (valueIncomeRatio !== null) {
        const historicalAvg = await getHistoricalAvgValueIncomeRatio(zip);
        if (historicalAvg && historicalAvg > 0) {
          overvaluedPct = ((valueIncomeRatio / historicalAvg) - 1) * 100;
        }
      }
      
      // Mortgage payment
      const mortgagePayment = calcMonthlyMortgage(homeValue);
      
      // Mortgage as % of income
      const mtgPctIncome = medianIncome && medianIncome > 0
        ? ((mortgagePayment * 12) / medianIncome) * 100
        : null;
      
      // Salary to afford
      const salaryToAfford = (mortgagePayment * 12) / AFFORDABILITY_RATIO;
      
      // Cap rate
      const capRate = monthlyRent
        ? ((monthlyRent * 12 * (1 - EXPENSE_RATIO)) / homeValue) * 100
        : null;
      
      // Buy vs rent ratio
      const buyVsRent = monthlyRent && monthlyRent > 0
        ? mortgagePayment / monthlyRent
        : null;
      
      // Home price forecast (linear regression on last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const cutoff = twelveMonthsAgo.toISOString().split('T')[0];
      
      const recentValues = await db
        .select({ date: pulseZillowData.date, homeValue: pulseZillowData.homeValue })
        .from(pulseZillowData)
        .where(and(
          eq(pulseZillowData.zip, zip),
          gte(pulseZillowData.date, cutoff)
        ))
        .orderBy(pulseZillowData.date);
      
      const forecastData = recentValues
        .filter(r => r.homeValue)
        .map((r, i) => ({ x: i, y: parseFloat(r.homeValue!) }));
      
      const priceForecast = linearRegressionForecast(forecastData);
      
      // --- Composite Scores (0-100 scale) ---
      
      // Investor Score: based on cap rate, buy-vs-rent, DOM
      let investorScore: number | null = null;
      {
        const scores: number[] = [];
        if (capRate !== null) {
          // Cap rate: 0-2% = bad (score 0-20), 2-4% = ok (20-50), 4-6% = good (50-80), 6%+ = great (80-100)
          scores.push(Math.min(100, Math.max(0, capRate * 15)));
        }
        if (buyVsRent !== null) {
          // Buy/rent < 1 = great (100), 1-1.5 = good (50-80), >2 = bad (0-20)
          scores.push(Math.min(100, Math.max(0, (2.5 - buyVsRent) * 50)));
        }
        if (latestRedfin?.medianDom) {
          // Higher DOM = better for buyers/investors
          const dom = latestRedfin.medianDom;
          scores.push(Math.min(100, Math.max(0, dom * 2)));
        }
        if (scores.length > 0) {
          investorScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      }
      
      // Growth Score: based on YoY growth, forecast, population growth
      let growthScore: number | null = null;
      {
        const scores: number[] = [];
        if (priceForecast !== null) {
          // Positive forecast is good for growth
          scores.push(Math.min(100, Math.max(0, 50 + priceForecast * 5)));
        }
        if (recentValues.length >= 12) {
          const first = parseFloat(recentValues[0].homeValue!);
          const last = parseFloat(recentValues[recentValues.length - 1].homeValue!);
          if (first > 0) {
            const yoyGrowth = ((last - first) / first) * 100;
            scores.push(Math.min(100, Math.max(0, 50 + yoyGrowth * 5)));
          }
        }
        if (scores.length > 0) {
          growthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      }
      
      // Market Health Score: affordability, inventory, DOM balance
      let marketHealthScore: number | null = null;
      {
        const scores: number[] = [];
        if (mtgPctIncome !== null) {
          // Lower mortgage-to-income is healthier
          scores.push(Math.min(100, Math.max(0, 100 - mtgPctIncome * 2)));
        }
        if (overvaluedPct !== null) {
          // Less overvalued = healthier
          scores.push(Math.min(100, Math.max(0, 75 - overvaluedPct)));
        }
        if (latestRedfin?.saleToListRatio) {
          const stl = parseFloat(latestRedfin.saleToListRatio);
          // Closer to 1.0 = balanced market
          scores.push(Math.min(100, Math.max(0, 100 - Math.abs(1.0 - stl) * 200)));
        }
        if (scores.length > 0) {
          marketHealthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      }
      
      // Upsert the metrics
      await db
        .insert(pulseMetrics)
        .values({
          zip,
          date: today,
          overvaluedPct: overvaluedPct?.toFixed(2) ?? null,
          valueIncomeRatio: valueIncomeRatio?.toFixed(2) ?? null,
          mortgagePayment: mortgagePayment.toFixed(2),
          mtgPctIncome: mtgPctIncome?.toFixed(2) ?? null,
          salaryToAfford: salaryToAfford.toFixed(2),
          buyVsRent: buyVsRent?.toFixed(2) ?? null,
          capRate: capRate?.toFixed(2) ?? null,
          priceForecast: priceForecast?.toFixed(2) ?? null,
          investorScore: investorScore?.toString() ?? null,
          growthScore: growthScore?.toString() ?? null,
          marketHealthScore: marketHealthScore?.toString() ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pulseMetrics.zip, pulseMetrics.date],
          set: {
            overvaluedPct: sql`EXCLUDED.overvalued_pct`,
            valueIncomeRatio: sql`EXCLUDED.value_income_ratio`,
            mortgagePayment: sql`EXCLUDED.mortgage_payment`,
            mtgPctIncome: sql`EXCLUDED.mtg_pct_income`,
            salaryToAfford: sql`EXCLUDED.salary_to_afford`,
            buyVsRent: sql`EXCLUDED.buy_vs_rent`,
            capRate: sql`EXCLUDED.cap_rate`,
            priceForecast: sql`EXCLUDED.price_forecast`,
            investorScore: sql`EXCLUDED.investor_score`,
            growthScore: sql`EXCLUDED.growth_score`,
            marketHealthScore: sql`EXCLUDED.market_health_score`,
            updatedAt: new Date(),
          },
        });
      
      rowsProcessed++;
    } catch (e: any) {
      errors.push(`Metrics for ${zip}: ${e.message}`);
      console.error(`[Metrics] Error computing metrics for ${zip}:`, e.message);
    }
  }
  
  console.log(`[Metrics] Complete. ${rowsProcessed} zips processed, ${errors.length} errors.`);
  return { rowsProcessed, errors };
}
