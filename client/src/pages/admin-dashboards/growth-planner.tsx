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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Rocket,
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ArrowRight,
  Zap,
  Building2,
  UserPlus,
  UserMinus,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Line,
  ComposedChart,
  Cell,
} from "recharts";
import { useMemo, useState } from "react";
import {
  useXanoRoster,
  useXanoTransactionsClosed,
  formatCurrency,
} from "@/lib/xano";

// ── Constants ──────────────────────────────────────
const GOAL_AGENTS = 300;
const GOAL_VOLUME = 1_000_000_000;
const CURRENT_YEAR = 2026;

// Austin market average production per agent (conservative)
const AVG_VOLUME_PER_AGENT = 3_200_000; // $3.2M avg per agent annually
const AVG_GCI_PER_TRANSACTION = 8_500;
const AVG_TRANSACTIONS_PER_AGENT = 6.5; // industry average for mid-tier

// Brokerage economics
const AVG_CAP = 12_000;
const PRE_CAP_SPLIT_RATE = 0.15; // 15% of GCI pre-cap
const POST_CAP_TXN_FEE = 285;
const CAP_RATE = 0.65; // ~65% of agents cap in a year

// ── Month labels ──────────────────────────────────
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Recruiting seasonality (when agents typically join)
const RECRUIT_SEASONALITY: Record<string, number> = {
  Jan: 1.4, Feb: 1.2, Mar: 1.1, Apr: 1.0, May: 0.9,
  Jun: 0.8, Jul: 0.7, Aug: 0.8, Sep: 1.0, Oct: 1.1,
  Nov: 1.0, Dec: 0.9,
};

// ── Types ──────────────────────────────────────────

interface ScenarioParams {
  name: string;
  color: string;
  startAgents: number;
  targetAgents: number;
  monthlyAttritionRate: number; // % per month
  avgRecruitPerMonth: number;
  avgVolumePerNewAgent: number; // first-year production
  avgVolumePerExistingAgent: number;
  rampMonths: number; // months for new agent to reach full production
}

interface MonthProjection {
  month: string;
  monthIndex: number;
  startCount: number;
  recruited: number;
  departed: number;
  endCount: number;
  cumulativeRecruited: number;
  cumulativeDeparted: number;
  projectedVolume: number;
  projectedRevenue: number;
  onTrack: boolean;
}

// ── Scenario Presets ──────────────────────────────

const PRESET_SCENARIOS: Record<string, Omit<ScenarioParams, "name" | "color" | "startAgents" | "targetAgents">> = {
  conservative: {
    monthlyAttritionRate: 2.5,
    avgRecruitPerMonth: 15,
    avgVolumePerNewAgent: 1_800_000,
    avgVolumePerExistingAgent: 3_500_000,
    rampMonths: 6,
  },
  moderate: {
    monthlyAttritionRate: 2.0,
    avgRecruitPerMonth: 18,
    avgVolumePerNewAgent: 2_200_000,
    avgVolumePerExistingAgent: 3_800_000,
    rampMonths: 4,
  },
  aggressive: {
    monthlyAttritionRate: 1.5,
    avgRecruitPerMonth: 22,
    avgVolumePerNewAgent: 2_500_000,
    avgVolumePerExistingAgent: 4_200_000,
    rampMonths: 3,
  },
};

// ── Projection Engine ────────────────────────────

function projectGrowth(params: ScenarioParams): MonthProjection[] {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const remainingMonths = 12 - currentMonth;

  const projections: MonthProjection[] = [];
  let currentCount = params.startAgents;
  let cumulativeRecruited = 0;
  let cumulativeDeparted = 0;

  // Target path: linear from current to goal
  const monthlyTargetGrowth = (params.targetAgents - params.startAgents) / remainingMonths;

  for (let i = 0; i < remainingMonths; i++) {
    const monthIdx = currentMonth + i;
    const monthName = MONTHS[monthIdx];
    const seasonality = RECRUIT_SEASONALITY[monthName] || 1.0;

    const startCount = currentCount;

    // Departures (attrition)
    const departed = Math.round(startCount * (params.monthlyAttritionRate / 100));

    // Recruits (seasonality-adjusted)
    const recruited = Math.round(params.avgRecruitPerMonth * seasonality);

    const endCount = startCount - departed + recruited;
    cumulativeRecruited += recruited;
    cumulativeDeparted += departed;

    // Volume projection (pro-rated for remaining year)
    // Existing agents produce at full rate, new agents ramp
    const existingAgentCount = Math.max(0, startCount - cumulativeDeparted);
    const newAgentMonths = Math.min(i + 1, params.rampMonths);
    const rampFactor = newAgentMonths / params.rampMonths;

    const monthlyExistingVolume = (params.avgVolumePerExistingAgent / 12) * Math.min(startCount, params.startAgents);
    const monthlyNewVolume = (params.avgVolumePerNewAgent / 12) * rampFactor * cumulativeRecruited;
    const projectedVolume = monthlyExistingVolume + monthlyNewVolume;

    // Revenue: simplified (cap revenue + post-cap fees)
    const projectedRevenue = endCount * (AVG_CAP / 12) * CAP_RATE +
      endCount * POST_CAP_TXN_FEE * (AVG_TRANSACTIONS_PER_AGENT / 12) * (1 - CAP_RATE);

    // On track if agent count meets or exceeds linear target
    const targetCount = params.startAgents + monthlyTargetGrowth * (i + 1);
    const onTrack = endCount >= targetCount - 5; // 5-agent tolerance

    projections.push({
      month: monthName,
      monthIndex: monthIdx,
      startCount,
      recruited,
      departed,
      endCount,
      cumulativeRecruited,
      cumulativeDeparted,
      projectedVolume,
      projectedRevenue,
      onTrack,
    });

    currentCount = endCount;
  }

  return projections;
}

// ── Component ────────────────────────────────────

export default function GrowthPlannerPage() {
  const { data: roster } = useXanoRoster();
  const { data: closedTxns } = useXanoTransactionsClosed();

  // Current agent count from live data
  const currentAgents = useMemo(() => {
    if (!roster) return 179;
    return roster.filter(
      (m) => m.status?.toLowerCase() !== "terminated" && m.status?.toLowerCase() !== "inactive"
    ).length;
  }, [roster]);

  // Live production data
  const currentYearVolume = useMemo(() => {
    if (!closedTxns) return 0;
    const yearStart = new Date(CURRENT_YEAR, 0, 1);
    return closedTxns
      .filter((t) => {
        const d = new Date(t.close_date || t.closing_date || t.created_at || "");
        return d >= yearStart;
      })
      .reduce((sum, t) => sum + (t.volume || t.price || t.sale_price || t.close_price || 0), 0);
  }, [closedTxns]);

  // Scenario state
  const [attritionRate, setAttritionRate] = useState(2.0);
  const [recruitRate, setRecruitRate] = useState(18);
  const [newAgentVolume, setNewAgentVolume] = useState(2.2); // millions
  const [existingAgentVolume, setExistingAgentVolume] = useState(3.8); // millions
  const [rampMonths, setRampMonths] = useState(4);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("moderate");

  // Apply preset
  const applyPreset = (presetName: string) => {
    const preset = PRESET_SCENARIOS[presetName];
    if (!preset) return;
    setAttritionRate(preset.monthlyAttritionRate);
    setRecruitRate(preset.avgRecruitPerMonth);
    setNewAgentVolume(preset.avgVolumePerNewAgent / 1_000_000);
    setExistingAgentVolume(preset.avgVolumePerExistingAgent / 1_000_000);
    setRampMonths(preset.rampMonths);
    setActivePreset(presetName);
  };

  // Build scenarios
  const customScenario: ScenarioParams = {
    name: "Your Scenario",
    color: "#3b82f6",
    startAgents: currentAgents,
    targetAgents: GOAL_AGENTS,
    monthlyAttritionRate: attritionRate,
    avgRecruitPerMonth: recruitRate,
    avgVolumePerNewAgent: newAgentVolume * 1_000_000,
    avgVolumePerExistingAgent: existingAgentVolume * 1_000_000,
    rampMonths,
  };

  const projections = useMemo(() => projectGrowth(customScenario), [
    currentAgents, attritionRate, recruitRate, newAgentVolume, existingAgentVolume, rampMonths,
  ]);

  // Compare scenarios
  const allScenarios = useMemo(() => {
    const scenarios = [
      { ...PRESET_SCENARIOS.conservative, name: "Conservative", color: "#eab308", startAgents: currentAgents, targetAgents: GOAL_AGENTS },
      { ...PRESET_SCENARIOS.moderate, name: "Moderate", color: "#3b82f6", startAgents: currentAgents, targetAgents: GOAL_AGENTS },
      { ...PRESET_SCENARIOS.aggressive, name: "Aggressive", color: "#22c55e", startAgents: currentAgents, targetAgents: GOAL_AGENTS },
    ];
    return scenarios.map((s) => ({
      name: s.name,
      color: s.color,
      projections: projectGrowth(s as ScenarioParams),
    }));
  }, [currentAgents]);

  // Chart data combining all scenarios
  const comparisonChartData = useMemo(() => {
    if (allScenarios.length === 0 || allScenarios[0].projections.length === 0) return [];
    return allScenarios[0].projections.map((_, i) => {
      const row: any = { month: allScenarios[0].projections[i].month };
      allScenarios.forEach((s) => {
        row[s.name] = s.projections[i]?.endCount || 0;
      });
      row["Target"] = Math.round(currentAgents + ((GOAL_AGENTS - currentAgents) / allScenarios[0].projections.length) * (i + 1));
      return row;
    });
  }, [allScenarios, currentAgents]);

  // Final numbers
  const finalCount = projections.length > 0 ? projections[projections.length - 1].endCount : currentAgents;
  const totalRecruited = projections.length > 0 ? projections[projections.length - 1].cumulativeRecruited : 0;
  const totalDeparted = projections.length > 0 ? projections[projections.length - 1].cumulativeDeparted : 0;
  const netGrowth = finalCount - currentAgents;
  const hitsGoal = finalCount >= GOAL_AGENTS;
  const agentGap = GOAL_AGENTS - finalCount;

  // Projected annual volume
  const projectedAnnualVolume = projections.reduce((sum, p) => sum + p.projectedVolume, 0) + currentYearVolume;
  const projectedAnnualRevenue = projections.reduce((sum, p) => sum + p.projectedRevenue, 0);

  // Required recruit rate to hit goal (solve backwards)
  const requiredRecruitRate = useMemo(() => {
    const remainingMonths = projections.length || 9;
    const avgSeasonality = Object.values(RECRUIT_SEASONALITY).reduce((a, b) => a + b, 0) / 12;
    // agents_needed = goal - current + attrition_losses
    const attritionLosses = currentAgents * (attritionRate / 100) * remainingMonths;
    const agentsNeeded = GOAL_AGENTS - currentAgents + attritionLosses;
    return Math.ceil(agentsNeeded / (remainingMonths * avgSeasonality));
  }, [currentAgents, attritionRate, projections.length]);

  // Revenue model data
  const revenueChartData = projections.map((p) => ({
    month: p.month,
    volume: Math.round(p.projectedVolume),
    revenue: Math.round(p.projectedRevenue),
    agents: p.endCount,
  }));

  // Flow chart (recruited vs departed)
  const flowChartData = projections.map((p) => ({
    month: p.month,
    recruited: p.recruited,
    departed: -p.departed,
    net: p.recruited - p.departed,
  }));

  // Break-even analysis: at what agent count does Spyglass hit $1B?
  const agentsFor1B = Math.ceil(GOAL_VOLUME / AVG_VOLUME_PER_AGENT);

  return (
    <DashboardLayout
      title="Growth Scenario Planner"
      subtitle={`Model the path from ${currentAgents} → ${GOAL_AGENTS} agents`}
      icon={Rocket}
    >
      <div className="space-y-6">
        {/* ── KPI Row ── */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                Current Agents
              </div>
              <div className="text-3xl font-bold">{currentAgents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {GOAL_AGENTS - currentAgents} to goal
              </p>
            </CardContent>
          </Card>

          <Card className={hitsGoal ? "border-green-500/30" : "border-orange-500/30"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Target className={`h-4 w-4 ${hitsGoal ? "text-green-600" : "text-orange-600"}`} />
                <span className={hitsGoal ? "text-green-600" : "text-orange-600"}>
                  Projected EOY
                </span>
              </div>
              <div className={`text-3xl font-bold ${hitsGoal ? "text-green-600" : "text-orange-600"}`}>
                {finalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hitsGoal ? `✓ Exceeds goal by ${finalCount - GOAL_AGENTS}` : `${agentGap} short of ${GOAL_AGENTS}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <UserPlus className="h-4 w-4" />
                Total Recruits Needed
              </div>
              <div className="text-3xl font-bold">{totalRecruited}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ~{recruitRate}/mo avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <UserMinus className="h-4 w-4" />
                Projected Attrition
              </div>
              <div className="text-3xl font-bold text-red-600">{totalDeparted}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {attritionRate}% monthly rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Projected Volume
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(projectedAnnualVolume, true)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectedAnnualVolume >= GOAL_VOLUME ? "✓ On pace for $1B" : `${Math.round((projectedAnnualVolume / GOAL_VOLUME) * 100)}% of $1B goal`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Scenario Builder ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Scenario Builder
            </CardTitle>
            <CardDescription>
              Adjust parameters to model different growth paths. Required recruiting rate to hit {GOAL_AGENTS}: <span className="font-bold text-foreground">{requiredRecruitRate}/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="flex gap-2">
              {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={activePreset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(key)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  <span className="ml-1 text-xs opacity-70">
                    ({preset.avgRecruitPerMonth}/mo, {preset.monthlyAttritionRate}% churn)
                  </span>
                </Button>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Recruiting Rate */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Monthly Recruits
                  </span>
                  <span className="font-bold text-lg">{recruitRate}</span>
                </Label>
                <Slider
                  value={[recruitRate]}
                  onValueChange={([v]) => { setRecruitRate(v); setActivePreset(""); }}
                  min={5}
                  max={40}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 (slow)</span>
                  <span>40 (blitz)</span>
                </div>
              </div>

              {/* Attrition Rate */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4" />
                    Monthly Attrition Rate
                  </span>
                  <span className="font-bold text-lg">{attritionRate}%</span>
                </Label>
                <Slider
                  value={[attritionRate * 10]}
                  onValueChange={([v]) => { setAttritionRate(v / 10); setActivePreset(""); }}
                  min={5}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5% (best-in-class)</span>
                  <span>5.0% (high churn)</span>
                </div>
              </div>
            </div>

            {/* Advanced toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-muted-foreground"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Advanced Parameters
            </Button>

            {showAdvanced && (
              <div className="grid gap-6 md:grid-cols-3 pl-4 border-l-2">
                <div className="space-y-2">
                  <Label>New Agent Avg Volume (annual)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={newAgentVolume}
                      onChange={(e) => { setNewAgentVolume(parseFloat(e.target.value) || 0); setActivePreset(""); }}
                      step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">M</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Existing Agent Avg Volume (annual)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={existingAgentVolume}
                      onChange={(e) => { setExistingAgentVolume(parseFloat(e.target.value) || 0); setActivePreset(""); }}
                      step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">M</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>New Agent Ramp (months to full production)</Label>
                  <Slider
                    value={[rampMonths]}
                    onValueChange={([v]) => { setRampMonths(v); setActivePreset(""); }}
                    min={1}
                    max={12}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground text-center">{rampMonths} months</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="trajectory">
          <TabsList>
            <TabsTrigger value="trajectory">📈 Growth Trajectory</TabsTrigger>
            <TabsTrigger value="compare">⚖️ Compare Scenarios</TabsTrigger>
            <TabsTrigger value="economics">💰 Revenue Model</TabsTrigger>
            <TabsTrigger value="flow">🔄 Agent Flow</TabsTrigger>
          </TabsList>

          {/* ── TRAJECTORY TAB ── */}
          <TabsContent value="trajectory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Count Trajectory</CardTitle>
                <CardDescription>
                  Projected growth path from {currentAgents} to{" "}
                  {hitsGoal ? `${finalCount} (exceeds ${GOAL_AGENTS} goal)` : `${finalCount} (${agentGap} short of goal)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={projections.map((p) => ({
                    month: p.month,
                    agents: p.endCount,
                    target: Math.round(currentAgents + ((GOAL_AGENTS - currentAgents) / projections.length) * (projections.indexOf(p) + 1)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[Math.min(currentAgents - 20, 150), Math.max(GOAL_AGENTS + 20, 320)]} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={GOAL_AGENTS} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `${GOAL_AGENTS} Goal`, position: "right" }} />
                    <ReferenceLine y={currentAgents} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Current", position: "left" }} />
                    <Area type="monotone" dataKey="agents" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Projected" strokeWidth={2} />
                    <Line type="monotone" dataKey="target" stroke="#22c55e" strokeDasharray="5 5" name="Linear Target" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Month-by-month table */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3 text-right">Start</th>
                        <th className="py-2 px-3 text-right text-green-600">+Recruited</th>
                        <th className="py-2 px-3 text-right text-red-600">-Departed</th>
                        <th className="py-2 px-3 text-right font-bold">End</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projections.map((p) => (
                        <tr key={p.month} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{p.month} {CURRENT_YEAR}</td>
                          <td className="py-2 px-3 text-right">{p.startCount}</td>
                          <td className="py-2 px-3 text-right text-green-600">+{p.recruited}</td>
                          <td className="py-2 px-3 text-right text-red-600">-{p.departed}</td>
                          <td className="py-2 px-3 text-right font-bold">{p.endCount}</td>
                          <td className="py-2 px-3 text-right">
                            {p.onTrack ? (
                              <Badge variant="outline" className="text-green-600 border-green-300">On Track</Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-300">Behind</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMPARE TAB ── */}
          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Comparison</CardTitle>
                <CardDescription>
                  Three growth paths: Conservative, Moderate, and Aggressive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[Math.min(currentAgents - 20, 150), Math.max(GOAL_AGENTS + 30, 330)]} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={GOAL_AGENTS} stroke="#64748b" strokeDasharray="5 5" label={{ value: `${GOAL_AGENTS} Goal`, position: "right" }} />
                    <Line type="monotone" dataKey="Conservative" stroke="#eab308" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Moderate" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Aggressive" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Target" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Scenario summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {allScenarios.map((s) => {
                const final = s.projections.length > 0 ? s.projections[s.projections.length - 1] : null;
                const hits = final ? final.endCount >= GOAL_AGENTS : false;
                return (
                  <Card key={s.name} style={{ borderColor: s.color + "40" }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">EOY Agents</span>
                        <span className="font-bold">{final?.endCount || "–"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Recruited</span>
                        <span>{final?.cumulativeRecruited || "–"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Departed</span>
                        <span className="text-red-600">{final?.cumulativeDeparted || "–"}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Hits 300?</span>
                        {hits ? (
                          <Badge className="bg-green-100 text-green-700">Yes ✓</Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">No ({final ? GOAL_AGENTS - final.endCount : "?"} short)</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── ECONOMICS TAB ── */}
          <TabsContent value="economics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Projected Brokerage Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(projectedAnnualRevenue, true)}</div>
                  <p className="text-xs text-muted-foreground mt-1">From caps + transaction fees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Revenue per Agent</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(finalCount > 0 ? projectedAnnualRevenue / finalCount : 0, true)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Annual avg contribution</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Agents Needed for $1B Volume</div>
                  <div className="text-2xl font-bold">{agentsFor1B}</div>
                  <p className="text-xs text-muted-foreground mt-1">At ${(AVG_VOLUME_PER_AGENT / 1_000_000).toFixed(1)}M avg/agent</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v, true)} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === "Agents") return value;
                      return formatCurrency(value, true);
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="volume" fill="#3b82f6" fillOpacity={0.3} name="Volume" />
                    <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" name="Revenue" />
                    <Line yAxisId="right" type="monotone" dataKey="agents" stroke="#f97316" strokeWidth={2} name="Agents" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FLOW TAB ── */}
          <TabsContent value="flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Flow: Recruits vs Departures</CardTitle>
                <CardDescription>
                  Monthly inflow/outflow with net change. Positive = growing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={flowChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="recruited" fill="#22c55e" name="Recruited" />
                    <Bar dataKey="departed" fill="#ef4444" name="Departed" />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Net Change" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key insight */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">Key Insight: </span>
                At {attritionRate}% monthly attrition with {currentAgents} agents, you lose ~{Math.round(currentAgents * attritionRate / 100)} agents/month.
                To net {GOAL_AGENTS - currentAgents} agents by EOY, you need to recruit {requiredRecruitRate}+ agents/month consistently.
                {requiredRecruitRate > 20 && (
                  <span className="text-orange-600 font-medium"> This is aggressive — consider reducing attrition as a lever.</span>
                )}
              </AlertDescription>
            </Alert>

            {/* The math */}
            <Card>
              <CardHeader>
                <CardTitle>The Math</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Starting roster</p>
                    <p className="font-bold text-lg">{currentAgents}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target roster</p>
                    <p className="font-bold text-lg">{GOAL_AGENTS}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gap to close</p>
                    <p className="font-bold text-lg">{GOAL_AGENTS - currentAgents}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Months remaining in {CURRENT_YEAR}</p>
                    <p className="font-bold text-lg">{projections.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Projected attrition losses</p>
                    <p className="font-bold text-lg text-red-600">{totalDeparted}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gross recruits needed</p>
                    <p className="font-bold text-lg text-green-600">{GOAL_AGENTS - currentAgents + totalDeparted}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <p className="text-muted-foreground">
                  Every 1% reduction in monthly attrition saves ~{Math.round(currentAgents * 0.01 * projections.length)} agents over the remaining year.
                  Retention is cheaper than recruiting.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}