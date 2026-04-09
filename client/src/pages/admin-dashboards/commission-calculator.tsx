import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Copy,
  Download,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  PiggyBank,
  Trophy,
  Share2,
  BarChart3,
  Wallet,
  Gift,
  Shield,
  Clock,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

// ── Brokerage Cost Models ──────────────────────────

interface BrokerageModel {
  name: string;
  shortName: string;
  color: string;
  calculate: (gci: number, deals: number) => BrokerageCostBreakdown;
}

interface BrokerageCostBreakdown {
  splitCost: number;
  capCost: number;
  monthlyFees: number;
  transactionFees: number;
  royaltyFees: number;
  eoFees: number;
  techFees: number;
  totalCost: number;
  takeHome: number;
  revSharePotential: number;
  stockEquity: number;
  effectiveSplit: string;
}

function calcSpyglass(gci: number, deals: number): BrokerageCostBreakdown {
  const splitRate = 0.15;
  const cap = 12000;
  const postCapTxnFee = 285;

  const rawSplit = gci * splitRate;
  const splitCost = Math.min(rawSplit, cap);
  const avgGCIPerDeal = deals > 0 ? gci / deals : 0;
  const dealsToHitCap = avgGCIPerDeal > 0 ? Math.ceil(cap / (avgGCIPerDeal * splitRate)) : deals;
  const dealsAfterCap = Math.max(0, deals - dealsToHitCap);
  const transactionFees = dealsAfterCap * postCapTxnFee;
  const totalCost = splitCost + transactionFees;

  // Rev share: assume 5 direct recruits, avg $8K cap contribution each
  // Tier 1: 5% of cap = $600/recruit/year
  const revSharePotential = 5 * 600;

  // Stock: 150 shares at ~$5/share when capping
  const stockEquity = gci >= 80000 ? 750 : 0;

  return {
    splitCost,
    capCost: cap,
    monthlyFees: 0,
    transactionFees,
    royaltyFees: 0,
    eoFees: 0,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential,
    stockEquity,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

function calcCompass(gci: number, deals: number): BrokerageCostBreakdown {
  // Compass: negotiated splits, typically 75/25 to 90/10 for top producers
  // Average ~80/20 split, with soft cap around $20-25K
  const splitRate = 0.20;
  const softCap = 22000;
  const splitCost = Math.min(gci * splitRate, softCap);
  const eoFees = 800;
  const totalCost = splitCost + eoFees;

  return {
    splitCost,
    capCost: softCap,
    monthlyFees: 0,
    transactionFees: 0,
    royaltyFees: 0,
    eoFees,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential: 0,
    stockEquity: 0,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

function calcKW(gci: number, deals: number): BrokerageCostBreakdown {
  const splitRate = 0.30;
  const cap = 25000;
  const royaltyRate = 0.06;
  const royaltyCap = 3000;
  const monthlyTechFee = 75;
  const eoFees = 750;

  const splitCost = Math.min(gci * splitRate, cap);
  const royaltyFees = Math.min(gci * royaltyRate, royaltyCap);
  const monthlyFees = monthlyTechFee * 12;
  const totalCost = splitCost + royaltyFees + monthlyFees + eoFees;

  return {
    splitCost,
    capCost: cap,
    monthlyFees,
    transactionFees: 0,
    royaltyFees,
    eoFees,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential: 0,
    stockEquity: 0,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

function calcEXP(gci: number, deals: number): BrokerageCostBreakdown {
  const splitRate = 0.20;
  const cap = 16000;
  const monthlyFee = 85;
  const postCapTxnFee = 250;
  const postCapTxnFeeAfter20 = 75;

  const splitCost = Math.min(gci * splitRate, cap);
  const monthlyFees = monthlyFee * 12;
  const avgGCIPerDeal = deals > 0 ? gci / deals : 0;
  const dealsToHitCap = avgGCIPerDeal > 0 ? Math.ceil(cap / (avgGCIPerDeal * splitRate)) : deals;
  const dealsAfterCap = Math.max(0, deals - dealsToHitCap);
  const first20AfterCap = Math.min(dealsAfterCap, 20);
  const beyond20 = Math.max(0, dealsAfterCap - 20);
  const transactionFees = first20AfterCap * postCapTxnFee + beyond20 * postCapTxnFeeAfter20;
  const totalCost = splitCost + monthlyFees + transactionFees;

  // eXp has rev share but harder to build
  const revSharePotential = 5 * 400; // Lower effective per recruit
  const stockEquity = gci >= 100000 ? 500 : 0; // ICON is harder to achieve

  return {
    splitCost,
    capCost: cap,
    monthlyFees,
    transactionFees,
    royaltyFees: 0,
    eoFees: 0,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential,
    stockEquity,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

function calcREMAX(gci: number, deals: number): BrokerageCostBreakdown {
  const deskFee = 2000; // monthly
  const royaltyRate = 0.03;
  const eoFees = 800;

  const monthlyFees = deskFee * 12;
  const royaltyFees = gci * royaltyRate;
  const totalCost = monthlyFees + royaltyFees + eoFees;

  return {
    splitCost: 0,
    capCost: 0,
    monthlyFees,
    transactionFees: 0,
    royaltyFees,
    eoFees,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential: 0,
    stockEquity: 0,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

function calcCustom(gci: number, deals: number, params: CustomParams): BrokerageCostBreakdown {
  const splitCost = params.hasCap
    ? Math.min(gci * (params.splitPercent / 100), params.capAmount)
    : gci * (params.splitPercent / 100);
  const monthlyFees = params.monthlyFee * 12;
  const royaltyFees = gci * (params.royaltyPercent / 100);
  const transactionFees = deals * params.perTxnFee;
  const eoFees = params.eoFee;
  const totalCost = splitCost + monthlyFees + royaltyFees + transactionFees + eoFees;

  return {
    splitCost,
    capCost: params.hasCap ? params.capAmount : 0,
    monthlyFees,
    transactionFees,
    royaltyFees,
    eoFees,
    techFees: 0,
    totalCost,
    takeHome: gci - totalCost,
    revSharePotential: 0,
    stockEquity: 0,
    effectiveSplit: `${((1 - totalCost / gci) * 100).toFixed(1)}/${(totalCost / gci * 100).toFixed(1)}`,
  };
}

interface CustomParams {
  splitPercent: number;
  hasCap: boolean;
  capAmount: number;
  monthlyFee: number;
  royaltyPercent: number;
  perTxnFee: number;
  eoFee: number;
}

const BROKERAGES: BrokerageModel[] = [
  { name: "Spyglass Realty", shortName: "Spyglass", color: "#2563eb", calculate: calcSpyglass },
  { name: "Compass", shortName: "Compass", color: "#000000", calculate: calcCompass },
  { name: "Keller Williams", shortName: "KW", color: "#B5121B", calculate: calcKW },
  { name: "eXp Realty", shortName: "eXp", color: "#0066CC", calculate: calcEXP },
  { name: "RE/MAX", shortName: "RE/MAX", color: "#003DA5", calculate: calcREMAX },
];

// ── Format Helpers ──
function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Component ──────────────────────────────────────

export default function CommissionCalculatorPage() {
  // Inputs
  const [gci, setGci] = useState(250000);
  const [deals, setDeals] = useState(20);
  const [compareWith, setCompareWith] = useState("Compass");
  const [showCustom, setShowCustom] = useState(false);
  const [customParams, setCustomParams] = useState<CustomParams>({
    splitPercent: 25,
    hasCap: true,
    capAmount: 20000,
    monthlyFee: 100,
    royaltyPercent: 0,
    perTxnFee: 0,
    eoFee: 500,
  });

  // Quick GCI presets
  const GCI_PRESETS = [
    { label: "New Agent", gci: 75000, deals: 6 },
    { label: "Growing", gci: 150000, deals: 12 },
    { label: "Solid Producer", gci: 250000, deals: 20 },
    { label: "Top Producer", gci: 400000, deals: 30 },
    { label: "Mega Agent", gci: 750000, deals: 50 },
  ];

  // Calculate all scenarios
  const spyglass = useMemo(() => calcSpyglass(gci, deals), [gci, deals]);

  const competitor = useMemo(() => {
    if (showCustom) {
      return calcCustom(gci, deals, customParams);
    }
    const brokerage = BROKERAGES.find(b => b.shortName === compareWith);
    return brokerage ? brokerage.calculate(gci, deals) : calcCompass(gci, deals);
  }, [gci, deals, compareWith, showCustom, customParams]);

  const savings = competitor.totalCost - spyglass.totalCost;
  const savingsPercent = competitor.totalCost > 0 ? (savings / competitor.totalCost * 100) : 0;

  // 5-year projection
  const fiveYearData = useMemo(() => {
    const years = [];
    let cumulativeSavings = 0;
    let cumulativeRevShare = 0;
    let cumulativeStock = 0;

    for (let yr = 1; yr <= 5; yr++) {
      // Assume 8% annual GCI growth
      const projGci = gci * Math.pow(1.08, yr - 1);
      const projDeals = Math.round(deals * Math.pow(1.05, yr - 1));

      const spyResult = calcSpyglass(projGci, projDeals);
      const compResult = showCustom
        ? calcCustom(projGci, projDeals, customParams)
        : (BROKERAGES.find(b => b.shortName === compareWith)?.calculate(projGci, projDeals) || calcCompass(projGci, projDeals));

      const yearSavings = compResult.totalCost - spyResult.totalCost;
      cumulativeSavings += yearSavings;

      // Rev share grows as you recruit more (assume 2 new recruits/year)
      const recruits = yr * 2;
      cumulativeRevShare += recruits * 600;

      // Stock equity accumulates
      cumulativeStock += spyResult.stockEquity;

      years.push({
        year: `Year ${yr}`,
        commissionSavings: Math.round(cumulativeSavings),
        revShareIncome: Math.round(cumulativeRevShare),
        stockEquity: Math.round(cumulativeStock),
        totalBenefit: Math.round(cumulativeSavings + cumulativeRevShare + cumulativeStock),
      });
    }
    return years;
  }, [gci, deals, compareWith, showCustom, customParams]);

  // Cost breakdown chart data
  const breakdownData = useMemo(() => {
    const compName = showCustom ? "Current Brokerage" : compareWith;
    return [
      {
        name: "Spyglass",
        "Commission Split": spyglass.splitCost,
        "Monthly Fees": spyglass.monthlyFees,
        "Transaction Fees": spyglass.transactionFees,
        "Royalty/Franchise": spyglass.royaltyFees,
        "E&O Insurance": spyglass.eoFees,
        fill: "#2563eb",
      },
      {
        name: compName,
        "Commission Split": competitor.splitCost,
        "Monthly Fees": competitor.monthlyFees,
        "Transaction Fees": competitor.transactionFees,
        "Royalty/Franchise": competitor.royaltyFees,
        "E&O Insurance": competitor.eoFees,
        fill: "#94a3b8",
      },
    ];
  }, [spyglass, competitor, compareWith, showCustom]);

  // GCI slider comparison
  const gciRangeData = useMemo(() => {
    const points = [];
    for (let g = 50000; g <= 1000000; g += 50000) {
      const d = Math.round(g / (gci / deals)); // maintain same avg deal size
      const sp = calcSpyglass(g, d);
      const comp = showCustom
        ? calcCustom(g, d, customParams)
        : (BROKERAGES.find(b => b.shortName === compareWith)?.calculate(g, d) || calcCompass(g, d));
      points.push({
        gci: `$${(g / 1000).toFixed(0)}K`,
        gciRaw: g,
        spyglassCost: sp.totalCost,
        competitorCost: comp.totalCost,
        savings: comp.totalCost - sp.totalCost,
      });
    }
    return points;
  }, [gci, deals, compareWith, showCustom, customParams]);

  // Copy summary for recruiting conversations
  const copySummary = useCallback(() => {
    const compName = showCustom ? "your current brokerage" : compareWith;
    const text = [
      `💰 COMMISSION COMPARISON: Spyglass Realty vs ${compName}`,
      ``,
      `Based on your numbers: ${fmt(gci)} GCI / ${deals} deals per year`,
      ``,
      `📊 ANNUAL COSTS:`,
      `• Spyglass: ${fmt(spyglass.totalCost)} (effective ${spyglass.effectiveSplit} split)`,
      `• ${compName}: ${fmt(competitor.totalCost)} (effective ${competitor.effectiveSplit} split)`,
      ``,
      `✅ YOU SAVE: ${fmt(savings)}/year at Spyglass`,
      ``,
      `🎁 ADDITIONAL BENEFITS AT SPYGLASS:`,
      `• Revenue share: ~${fmt(spyglass.revSharePotential)}/yr potential (5-tier, willable, retirement-eligible)`,
      `• Stock equity: ~${fmt(spyglass.stockEquity)}/yr in REAX shares`,
      `• $0 monthly fees, E&O included`,
      `• Mission Control, Pulse, IDX — custom AI-powered tools`,
      `• Real Wallet instant commission payouts`,
      ``,
      `📈 5-YEAR TOTAL BENEFIT: ${fmt(fiveYearData[4]?.totalBenefit || 0)}`,
      `(Commission savings + revenue share + stock equity)`,
      ``,
      `Backed by Real Brokerage — #5 nationally, NASDAQ: REAX`,
      `Schedule a confidential conversation: spyglassrealty.com`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  }, [gci, deals, spyglass, competitor, savings, compareWith, showCustom, fiveYearData]);

  return (
    <DashboardLayout
      title="Commission Calculator"
      subtitle="Show prospects exactly what they'd save at Spyglass"
      icon={Calculator}
    >
      <div className="space-y-6">
        {/* ── Input Section ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Agent's Current Production
            </CardTitle>
            <CardDescription>
              Enter the prospect's numbers or pick a preset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {GCI_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant={gci === p.gci ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setGci(p.gci); setDeals(p.deals); }}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* GCI Input */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Annual Gross Commission Income (GCI)</Label>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={gci}
                    onChange={(e) => setGci(Number(e.target.value) || 0)}
                    className="font-mono text-lg"
                  />
                </div>
                <Slider
                  value={[gci]}
                  onValueChange={([v]) => setGci(v)}
                  min={25000}
                  max={1500000}
                  step={5000}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  {fmt(gci)} GCI = ~{fmt(gci / deals)} per deal average
                </p>
              </div>

              {/* Deals Input */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Deals Per Year</Label>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={deals}
                    onChange={(e) => setDeals(Number(e.target.value) || 1)}
                    className="font-mono text-lg"
                  />
                </div>
                <Slider
                  value={[deals]}
                  onValueChange={([v]) => setDeals(v)}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  Average sale price: ~{fmt(gci / deals / 0.028)} (at ~2.8% commission rate)
                </p>
              </div>
            </div>

            <Separator />

            {/* Compare Against */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Compare Against</Label>
              <div className="flex flex-wrap gap-2">
                {BROKERAGES.filter(b => b.shortName !== "Spyglass").map((b) => (
                  <Button
                    key={b.shortName}
                    variant={!showCustom && compareWith === b.shortName ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setCompareWith(b.shortName); setShowCustom(false); }}
                    className="gap-1"
                  >
                    <Building2 className="h-3 w-3" />
                    {b.shortName}
                  </Button>
                ))}
                <Button
                  variant={showCustom ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCustom(true)}
                  className="gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Custom
                </Button>
              </div>

              {/* Custom Brokerage Inputs */}
              {showCustom && (
                <div className="grid gap-4 md:grid-cols-3 mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Split to Brokerage (%)</Label>
                    <Input
                      type="number"
                      value={customParams.splitPercent}
                      onChange={(e) => setCustomParams({ ...customParams, splitPercent: Number(e.target.value) || 0 })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cap ($)</Label>
                    <Input
                      type="number"
                      value={customParams.capAmount}
                      onChange={(e) => setCustomParams({ ...customParams, capAmount: Number(e.target.value) || 0, hasCap: true })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Fees ($)</Label>
                    <Input
                      type="number"
                      value={customParams.monthlyFee}
                      onChange={(e) => setCustomParams({ ...customParams, monthlyFee: Number(e.target.value) || 0 })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Franchise/Royalty (%)</Label>
                    <Input
                      type="number"
                      value={customParams.royaltyPercent}
                      onChange={(e) => setCustomParams({ ...customParams, royaltyPercent: Number(e.target.value) || 0 })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Per-Transaction Fee ($)</Label>
                    <Input
                      type="number"
                      value={customParams.perTxnFee}
                      onChange={(e) => setCustomParams({ ...customParams, perTxnFee: Number(e.target.value) || 0 })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E&O Insurance ($)</Label>
                    <Input
                      type="number"
                      value={customParams.eoFee}
                      onChange={(e) => setCustomParams({ ...customParams, eoFee: Number(e.target.value) || 0 })}
                      className="font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── BIG SAVINGS HERO ── */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={savings > 0 ? "border-green-500/50 bg-gradient-to-br from-green-500/10 to-green-600/5 md:col-span-2" : "md:col-span-2"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-green-600" />
                Annual Savings at Spyglass
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${savings > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                {savings > 0 ? `+${fmt(savings)}` : fmt(savings)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {savings > 0
                  ? `${fmtPct(savingsPercent)} less in brokerage costs per year`
                  : "Comparable costs — but Spyglass adds rev share + stock equity"}
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={copySummary} className="gap-1">
                  <Copy className="h-3 w-3" />
                  Copy Summary
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                Spyglass Take-Home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{fmt(spyglass.takeHome)}</div>
              <p className="text-xs text-muted-foreground">
                {spyglass.effectiveSplit} effective split
              </p>
              <p className="text-xs text-muted-foreground">
                Total cost: {fmt(spyglass.totalCost)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                {showCustom ? "Current" : compareWith} Take-Home
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{fmt(competitor.takeHome)}</div>
              <p className="text-xs text-muted-foreground">
                {competitor.effectiveSplit} effective split
              </p>
              <p className="text-xs text-muted-foreground">
                Total cost: {fmt(competitor.totalCost)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── TABS: Details ── */}
        <Tabs defaultValue="breakdown">
          <TabsList>
            <TabsTrigger value="breakdown">💰 Cost Breakdown</TabsTrigger>
            <TabsTrigger value="five-year">📈 5-Year Projection</TabsTrigger>
            <TabsTrigger value="gci-range">📊 GCI Range</TabsTrigger>
            <TabsTrigger value="total-comp">🎁 Total Compensation</TabsTrigger>
          </TabsList>

          {/* ── COST BREAKDOWN ── */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Spyglass Breakdown */}
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Spyglass Realty
                  </CardTitle>
                  <CardDescription>Total: {fmt(spyglass.totalCost)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CostLine label="Commission split (15% → $12K cap)" amount={spyglass.splitCost} />
                  <CostLine label="Monthly fees" amount={spyglass.monthlyFees} />
                  <CostLine label="Transaction fees (post-cap)" amount={spyglass.transactionFees} />
                  <CostLine label="Franchise/royalty fees" amount={spyglass.royaltyFees} />
                  <CostLine label="E&O insurance" amount={0} suffix="Included" />
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total to brokerage</span>
                    <span className="text-blue-600">{fmt(spyglass.totalCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Your take-home</span>
                    <span className="text-green-600">{fmt(spyglass.takeHome)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {showCustom ? "Current Brokerage" : compareWith}
                  </CardTitle>
                  <CardDescription>Total: {fmt(competitor.totalCost)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CostLine label="Commission split" amount={competitor.splitCost} />
                  <CostLine label="Monthly fees" amount={competitor.monthlyFees} />
                  <CostLine label="Transaction fees" amount={competitor.transactionFees} />
                  <CostLine label="Franchise/royalty fees" amount={competitor.royaltyFees} />
                  <CostLine label="E&O insurance" amount={competitor.eoFees} />
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total to brokerage</span>
                    <span className="text-red-600">{fmt(competitor.totalCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Your take-home</span>
                    <span>{fmt(competitor.takeHome)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stacked bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdownData} layout="vertical" barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="Commission Split" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Monthly Fees" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Transaction Fees" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="Royalty/Franchise" stackId="a" fill="#ef4444" />
                      <Bar dataKey="E&O Insurance" stackId="a" fill="#6b7280" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── 5-YEAR PROJECTION ── */}
          <TabsContent value="five-year" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  5-Year Cumulative Benefit of Switching to Spyglass
                </CardTitle>
                <CardDescription>
                  Assumes 8% annual GCI growth, 5% deal growth, 2 recruits/year for revenue share
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fiveYearData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="commissionSavings" stackId="1" name="Commission Savings" fill="#22c55e" stroke="#16a34a" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="revShareIncome" stackId="1" name="Revenue Share" fill="#3b82f6" stroke="#2563eb" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="stockEquity" stackId="1" name="Stock Equity" fill="#a855f7" stroke="#9333ea" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 5-year summary cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">5-Year Total Benefit</p>
                  <p className="text-3xl font-bold text-green-600">{fmt(fiveYearData[4]?.totalBenefit || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Commission Savings</p>
                  <p className="text-2xl font-bold">{fmt(fiveYearData[4]?.commissionSavings || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Revenue Share</p>
                  <p className="text-2xl font-bold text-blue-600">{fmt(fiveYearData[4]?.revShareIncome || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Stock Equity</p>
                  <p className="text-2xl font-bold text-purple-600">{fmt(fiveYearData[4]?.stockEquity || 0)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── GCI RANGE ── */}
          <TabsContent value="gci-range" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Savings Across All GCI Levels
                </CardTitle>
                <CardDescription>
                  How much you save at Spyglass vs {showCustom ? "your current brokerage" : compareWith} at every production level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gciRangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="gci" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(v: number, name: string) => [fmt(v), name]}
                        labelFormatter={(label) => `GCI: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="savings" name="Annual Savings" fill="#22c55e">
                        {gciRangeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.gciRaw === gci ? "#16a34a" : "#86efac"}
                            stroke={entry.gciRaw === gci ? "#15803d" : "none"}
                            strokeWidth={entry.gciRaw === gci ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Your selected GCI ({fmt(gci)}) highlighted in dark green
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TOTAL COMPENSATION ── */}
          <TabsContent value="total-comp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Total Compensation Package at Spyglass
                </CardTitle>
                <CardDescription>
                  It's not just about the split — it's about total value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <CompBenefitCard
                    icon={<DollarSign className="h-5 w-5 text-green-600" />}
                    title="85/15 Split → $12K Cap"
                    desc="Once you hit $12K, you keep 100% (minus $285/txn fee). No monthly fees, no franchise royalties."
                    value={`Cap at ${fmt(12000)}`}
                  />
                  <CompBenefitCard
                    icon={<Share2 className="h-5 w-5 text-blue-600" />}
                    title="Revenue Share"
                    desc="5-tier structure: earn 5/4/3/2/1% of your recruits' cap payments. Willable after 5 years. Retirement-eligible income."
                    value={`~${fmt(spyglass.revSharePotential)}/yr`}
                  />
                  <CompBenefitCard
                    icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                    title="REAX Stock Equity"
                    desc="Receive 150 shares when you cap annually. Elite Agents earn up to $16K in stock awards. Build real equity."
                    value={`~${fmt(spyglass.stockEquity)}/yr`}
                  />
                  <CompBenefitCard
                    icon={<Wallet className="h-5 w-5 text-orange-600" />}
                    title="Real Wallet"
                    desc="Get paid the same day your deal closes. No more waiting 2-3 days for commission checks. Instant payouts."
                    value="Same-day pay"
                  />
                  <CompBenefitCard
                    icon={<Shield className="h-5 w-5 text-cyan-600" />}
                    title="E&O Insurance Included"
                    desc="Errors & Omissions coverage is included in your fees. No separate $500-$1,000 annual premium."
                    value="Included ($0)"
                  />
                  <CompBenefitCard
                    icon={<Sparkles className="h-5 w-5 text-yellow-600" />}
                    title="AI-Powered Tools"
                    desc="Mission Control, Pulse market intelligence, Spyglass IDX, CMA Builder, Leo AI assistant — tools your competition doesn't have."
                    value="Custom tech stack"
                  />
                </div>
              </CardContent>
            </Card>

            {/* The Money Talk */}
            <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-blue-500/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-bold">The Bottom Line</h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    At {fmt(gci)} GCI, switching to Spyglass puts{" "}
                    <span className="font-bold text-green-600">{fmt(savings)}</span> more in your pocket annually.
                    Add revenue share and stock equity, and over 5 years you're looking at{" "}
                    <span className="font-bold text-green-600">{fmt(fiveYearData[4]?.totalBenefit || 0)}</span>{" "}
                    in total additional value.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All backed by Real Brokerage — #5 nationally, publicly traded on NASDAQ (REAX), $36.4M cash, zero debt.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Helper Components ──

function CostLine({ label, amount, suffix }: { label: string; amount: number; suffix?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={amount === 0 ? "text-green-600" : ""}>
        {suffix || (amount === 0 ? "$0" : fmt(amount))}
      </span>
    </div>
  );
}

function CompBenefitCard({ icon, title, desc, value }: { icon: React.ReactNode; title: string; desc: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
        <Badge variant="secondary" className="mt-1">{value}</Badge>
      </CardContent>
    </Card>
  );
}