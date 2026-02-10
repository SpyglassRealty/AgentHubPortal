// ─── Pulse V2 Types ───────────────────────────────────────────

export interface DataLayer {
  id: string;
  label: string;
  description: string;
  category: string;
  unit: "currency" | "percent" | "number" | "days" | "score" | "ratio" | "temperature";
  format?: string;
}

export interface DataLayerCategory {
  id: string;
  label: string;
  layers: DataLayer[];
}

export interface ZipSummary {
  zipCode: string;
  county: string;
  metro: string;
  state: string;
  source: string;
  dataDate: string;
  forecast: {
    value: number;
    label: string;
    direction: "up" | "down" | "flat";
  };
  investorScore: number;
  growthScore: number;
  bestMonthToBuy: string;
  bestMonthToSell: string;
  scores: {
    recentAppreciation: number;
    daysOnMarket: number;
    mortgageRates: number;
    inventory: number;
  };
  homeValue: number;
  homeValueGrowthYoY: number;
  medianIncome: number;
  population: number;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TimeseriesData {
  layerId: string;
  zip: string;
  period: "yearly" | "monthly";
  data: TimeseriesPoint[];
  average: number;
  unit: string;
}

export interface MapLayerData {
  layerId: string;
  zips: {
    zip: string;
    value: number;
    lat: number;
    lng: number;
  }[];
  min: number;
  max: number;
  unit: string;
}

// Existing types from pulse v1
export interface OverviewData {
  totalActive: number;
  activeUnderContract: number;
  pending: number;
  closedLast30: number;
  newLast7: number;
  medianListPrice: number;
  medianSoldPrice: number;
  avgDom: number;
  avgPricePerSqft: number;
  monthsOfSupply: number;
  lastUpdated: string;
}

export interface ZipHeatmapItem {
  zip: string;
  count: number;
  medianPrice: number;
  avgDom: number;
  lat: number;
  lng: number;
  /** V2 layer metric value (when a data layer is selected) */
  layerValue?: number | null;
  /** V2 formatted label for the layer value */
  layerLabel?: string | null;
}

export interface TrendMonth {
  month: string;
  closedCount: number;
  medianPrice: number;
  avgDom: number;
  activeInventory: number | null;
}
