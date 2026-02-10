import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Share2,
  Download,
  MapPin,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ForecastGauge from "./ForecastGauge";
import DemographicsSection from "./DemographicsSection";
import SchoolsSection from "./SchoolsSection";
import { generatePulseReport } from "./generateReport";
import type { ZipSummary } from "./types";

// ─── Mock data for when API isn't ready ──────────────────────
const MOCK_SUMMARY: ZipSummary = {
  zipCode: "78704",
  county: "Travis County",
  metro: "Austin-Round Rock-Georgetown",
  state: "TX",
  source: "Zillow, Census, Redfin",
  dataDate: "2025-01",
  forecast: { value: -5.8, label: "Home Price Forecast", direction: "down" },
  investorScore: 62,
  growthScore: 71,
  bestMonthToBuy: "January",
  bestMonthToSell: "May",
  scores: {
    recentAppreciation: 35,
    daysOnMarket: 58,
    mortgageRates: 42,
    inventory: 67,
  },
  homeValue: 585000,
  homeValueGrowthYoY: -2.3,
  medianIncome: 78500,
  population: 52340,
};

interface ZipSummaryPanelProps {
  zipCode: string;
  lat?: number;
  lng?: number;
  onClose: () => void;
  className?: string;
}

export default function ZipSummaryPanel({
  zipCode,
  lat,
  lng,
  onClose,
  className = "",
}: ZipSummaryPanelProps) {
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  const [activeTab, setActiveTab] = useState("forecast");

  // Try the V2 API, fall back to mock
  const { data: summary, isLoading } = useQuery<ZipSummary>({
    queryKey: ["/api/pulse/v2/zip", zipCode, "summary"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/pulse/v2/zip/${zipCode}/summary`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("API not ready");
        const raw = await res.json();
        // Map V2 response shape to ZipSummary type
        return {
          zipCode: raw.zip || zipCode,
          county: raw.county ? `${raw.county} County` : "Travis County",
          metro: raw.metro || "Austin-Round Rock-Georgetown",
          state: raw.state || "TX",
          source: raw.source || "Zillow, Census, Redfin",
          dataDate: raw.dataDate || "2025-01",
          forecast: {
            value: raw.forecast?.value ?? -5.8,
            label: "Home Price Forecast",
            direction: raw.forecast?.direction || "down",
          },
          investorScore: raw.metrics?.investment_score ?? 62,
          growthScore: raw.metrics?.growth_potential_score ?? 71,
          bestMonthToBuy: raw.bestMonthBuy || "January",
          bestMonthToSell: raw.bestMonthSell || "May",
          scores: {
            recentAppreciation: raw.scores?.appreciation ?? 35,
            daysOnMarket: raw.scores?.daysOnMarket ?? 58,
            mortgageRates: raw.scores?.mortgageRates ?? 42,
            inventory: raw.scores?.inventory ?? 67,
          },
          homeValue: raw.metrics?.home_value ?? 585000,
          homeValueGrowthYoY: raw.metrics?.home_value_growth_yoy ?? -2.3,
          medianIncome: raw.metrics?.median_income ?? 78500,
          population: raw.metrics?.population ?? 52340,
        } as ZipSummary;
      } catch {
        // Return mock data with the selected zip
        return { ...MOCK_SUMMARY, zipCode };
      }
    },
    enabled: !!zipCode,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const gaugeValue =
    activeTab === "forecast"
      ? summary.forecast.value
      : activeTab === "investor"
      ? ((summary.investorScore - 50) / 50) * 20 // normalize to -20..20
      : ((summary.growthScore - 50) / 50) * 20;

  const gaugeLabel =
    activeTab === "forecast"
      ? "Home Price Forecast"
      : activeTab === "investor"
      ? "Investor Score"
      : "Long-Term Growth Score";

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header bar */}
      <div className="bg-muted/50 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-3 border-b border-border overflow-x-auto whitespace-nowrap">
        <span>Source: {summary.source}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>Zip: {summary.zipCode}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>{summary.county}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>{summary.metro}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>{summary.state}</span>
        <span className="text-muted-foreground/30">|</span>
        <span>Data: {summary.dataDate}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Zip Hero */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#EF4923]" />
                <h2 className="text-2xl font-display font-bold">{summary.zipCode}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {summary.county}, {summary.state}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Period toggle */}
              <div className="flex bg-muted rounded-md p-0.5 text-[11px]">
                <button
                  onClick={() => setPeriod("yearly")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    period === "yearly"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setPeriod("monthly")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    period === "monthly"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Gauge */}
          <ForecastGauge
            value={gaugeValue}
            label={gaugeLabel}
            description={
              activeTab === "forecast"
                ? "Projected 12-month home price change"
                : activeTab === "investor"
                ? "Overall investment potential (0-100)"
                : "Long-term growth potential (0-100)"
            }
          />

          {/* Tab bar */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-8">
              <TabsTrigger value="forecast" className="text-[11px] data-[state=active]:text-[#EF4923]">
                Forecast
              </TabsTrigger>
              <TabsTrigger value="investor" className="text-[11px] data-[state=active]:text-[#EF4923]">
                Investor Score
              </TabsTrigger>
              <TabsTrigger value="growth" className="text-[11px] data-[state=active]:text-[#EF4923]">
                Growth Score
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Best Month Badges */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  Best Month to Buy
                </p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {summary.bestMonthToBuy}
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div>
                <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase">
                  Best Month to Sell
                </p>
                <p className="text-xs font-bold text-red-700 dark:text-red-300">
                  {summary.bestMonthToSell}
                </p>
              </div>
            </div>
          </div>

          {/* Score Bars */}
          <div className="space-y-3">
            <ScoreBar label="Recent Appreciation" value={summary.scores.recentAppreciation} />
            <ScoreBar label="Days on Market" value={summary.scores.daysOnMarket} />
            <ScoreBar label="Mortgage Rates" value={summary.scores.mortgageRates} />
            <ScoreBar label="Inventory" value={summary.scores.inventory} />
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <KeyStat label="Home Value" value={formatCurrency(summary.homeValue)} />
            <KeyStat
              label="YoY Growth"
              value={`${summary.homeValueGrowthYoY >= 0 ? "+" : ""}${summary.homeValueGrowthYoY.toFixed(1)}%`}
              color={summary.homeValueGrowthYoY >= 0 ? "text-emerald-500" : "text-red-500"}
            />
            <KeyStat label="Median Income" value={formatCurrency(summary.medianIncome)} />
            <KeyStat label="Population" value={summary.population.toLocaleString()} />
          </div>

          {/* Download Report */}
          <Button
            className="w-full bg-[#EF4923] hover:bg-[#d4411f] text-white text-sm"
            onClick={() => generatePulseReport(summary)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>

          {/* ─── Demographics ──────────────────────────── */}
          <Separator />
          <DemographicsSection zipCode={zipCode} />

          {/* ─── Nearby Schools ────────────────────────── */}
          {lat && lng && (
            <>
              <Separator />
              <SchoolsSection lat={lat} lng={lng} />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Score Bar Component ──────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const barColor =
    value >= 70
      ? "bg-emerald-500"
      : value >= 40
      ? "bg-amber-500"
      : "bg-red-500";
  const badgeColor =
    value >= 70
      ? "bg-emerald-500"
      : value >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-[120px] shrink-0 truncate">
        {label}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <div
        className={`w-7 h-7 rounded-full ${badgeColor} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Key Stat Mini Component ──────────────────────────────────
function KeyStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-2 rounded-md border border-border bg-muted/30">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
