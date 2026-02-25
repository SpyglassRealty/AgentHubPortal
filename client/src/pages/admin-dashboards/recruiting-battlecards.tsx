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
import { Separator } from "@/components/ui/separator";
import {
  Swords,
  Building2,
  DollarSign,
  Trophy,
  Shield,
  Users,
  Zap,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  ChevronDown,
  Sparkles,
  Target,
  Heart,
  Laptop,
  MapPin,
  Award,
  Minus,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

// ── Competitor Data ──────────────────────────────────

interface CompetitorProfile {
  name: string;
  shortName: string;
  tier: "major" | "cloud" | "indie";
  color: string;
  split: string;
  cap: string;
  capAmount: number;
  monthlyFee: string;
  monthlyFeeAmount: number;
  transactionFee: string;
  transactionFeeAmount: number;
  royaltyFee: string;
  eoFee: string;
  hasRevShare: boolean;
  revShareDesc: string;
  hasStock: boolean;
  stockDesc: string;
  techStack: string[];
  strengths: string[];
  weaknesses: string[];
  austinPresence: string;
  agentCount: string;
  recruitingAngle: string;
  objectionHandlers: { objection: string; response: string }[];
  targetProfiles: string[];
}

const SPYGLASS_PROFILE = {
  name: "Spyglass Realty (Real Brokerage Private Label)",
  split: "85/15",
  cap: "$12,000/yr",
  capAmount: 12000,
  monthlyFee: "$0",
  monthlyFeeAmount: 0,
  transactionFee: "$285 after cap ($129 for Elite)",
  royaltyFee: "$0",
  eoFee: "Included",
  hasRevShare: true,
  revShareDesc: "5-tier revenue share (5/4/3/2/1% of referred agent's cap). Willable after 5 years. Retirement-eligible.",
  hasStock: true,
  stockDesc: "REAX stock grants for capping agents (150 shares). Elite Agent awards up to $16K in stock.",
  techStack: [
    "Mission Control (custom admin portal)",
    "Pulse V2 (market intelligence)",
    "Beacon (recruiting intelligence)",
    "Spyglass IDX (AI-powered search)",
    "Contract Conduit (transaction mgmt)",
    "reZEN platform (Real's backend)",
    "Leo AI (47% of support handled by AI)",
    "Real Wallet (instant commission payouts)",
    "Commission Calculator",
    "CMA Presentation Builder",
  ],
  strengths: [
    "Boutique culture — agents know the owner",
    "#5 largest brokerage nationally (via Real)",
    "Zero debt, $36.4M cash reserves",
    "Custom-built tech stack (not generic vendor tools)",
    "Revenue share + stock equity model",
    "Austin + Houston infrastructure",
    "AI-powered tools for agents",
    "Instant commission payouts via Real Wallet",
  ],
};

const COMPETITORS: CompetitorProfile[] = [
  {
    name: "Compass (incl. Realty Austin + Anywhere brands)",
    shortName: "Compass",
    tier: "major",
    color: "#000000",
    split: "Varies (negotiated, typically 70/30 to 90/10)",
    cap: "Varies by market/negotiation",
    capAmount: 25000,
    monthlyFee: "$0 (absorbed into split)",
    monthlyFeeAmount: 0,
    transactionFee: "Varies",
    transactionFeeAmount: 0,
    royaltyFee: "None (not franchise)",
    eoFee: "Varies",
    hasRevShare: false,
    revShareDesc: "No revenue share program",
    hasStock: false,
    stockDesc: "Was COMP stock (pre-IPO equity gone). No meaningful agent equity program now.",
    techStack: [
      "Compass Platform (CRM + marketing)",
      "Compass Marketing Center",
      "Compass Markets (market data)",
      "Compass CRM",
    ],
    strengths: [
      "World's largest brokerage (post-Anywhere merger)",
      "Strong luxury brand recognition",
      "Heavy marketing spend",
      "Large Austin presence (Realty Austin absorbed)",
      "Staging & photography resources",
    ],
    weaknesses: [
      "Corporate culture — agents are a number",
      "Compass-Anywhere integration chaos (Jan 2026)",
      "Agent turnover historically high",
      "Tech is good but generic (not customized)",
      "No revenue share or stock equity",
      "Split negotiations can feel arbitrary",
      "Former Realty Austin agents felt culture eroded",
    ],
    austinPresence: "1,500+ agents (largest in Austin post-merger)",
    agentCount: "50,000+ globally",
    recruitingAngle: "Agents displaced by Compass-Anywhere merger integration. Former Realty Austin agents who miss boutique culture.",
    objectionHandlers: [
      {
        objection: "Compass has better brand recognition",
        response: "Brand matters less than results. Your clients hire YOU, not Compass. And with 50,000+ agents, your individual brand gets diluted. At Spyglass, our marketing tools (Studio, IDX) make YOUR brand stand out — not ours.",
      },
      {
        objection: "Compass has better tech",
        response: "We actually have MORE tech — Mission Control, Pulse market intelligence, AI contract reader, CMA builder. Plus Real's reZEN platform AND Leo AI. Our tools are built specifically for Austin agents, not a one-size-fits-all platform for 50K agents.",
      },
      {
        objection: "I'm worried about leaving a big company",
        response: "Spyglass is backed by Real Brokerage — the #5 largest brokerage in the US, publicly traded (NASDAQ: REAX), $36.4M cash, zero debt. You get big-company stability with boutique attention. That's the best of both worlds.",
      },
      {
        objection: "My split at Compass is good",
        response: "Even at 90/10, you're paying more than our 85/15 with a $12K cap because Compass has no cap. Do $500K in GCI? At Compass (90/10) you pay $50K. At Spyglass, you pay $12K cap then keep 100%. That's $38K back in your pocket. Plus rev share and stock.",
      },
    ],
    targetProfiles: [
      "Former Realty Austin agents uncomfortable in Compass corporate culture",
      "Coldwell Banker/Century 21 agents absorbed into Compass via Anywhere",
      "Mid-performers (15-30 deals) who feel invisible at Compass",
      "Agents who want equity/revenue share (Compass offers neither)",
    ],
  },
  {
    name: "Keller Williams",
    shortName: "KW",
    tier: "major",
    color: "#B5121B",
    split: "70/30 → negotiable up to 100/0",
    cap: "$22,000-$28,000 (varies by market center)",
    capAmount: 25000,
    monthlyFee: "$50-$100+ technology fee",
    monthlyFeeAmount: 75,
    transactionFee: "$0 (absorbed in split)",
    transactionFeeAmount: 0,
    royaltyFee: "6% franchise fee on GCI (until capped)",
    eoFee: "~$500-$1,000/yr",
    hasRevShare: true,
    revShareDesc: "Profit sharing model (7 tiers) — based on market center profit, not guaranteed. Complex calculation, often disappointing for mid-tier agents.",
    hasStock: false,
    stockDesc: "No stock equity. KWx (holding company) is publicly traded but agents don't receive shares.",
    techStack: [
      "KW Command (CRM + lead gen)",
      "KW Designs (marketing)",
      "KWAN AI (new, limited)",
      "Dotloop (transactions)",
    ],
    strengths: [
      "Industry's best training program (BOLD, Ignite)",
      "Strong culture and community",
      "Austin HQ advantage — very established",
      "Large referral network",
      "Good for new agents learning the business",
    ],
    weaknesses: [
      "Higher effective costs (cap + 6% royalty + tech fees)",
      "Profit share ≠ revenue share (complicated, market center dependent)",
      "Tech (KW Command) often criticized as clunky",
      "Slower innovation pace",
      "Franchise model means each office is different",
      "6% royalty fee eats into GCI significantly",
    ],
    austinPresence: "1,300+ agents across multiple market centers",
    agentCount: "190,000+ globally",
    recruitingAngle: "Agents outgrowing KW's training wheels. Productive agents tired of paying 6% royalty. Tech-savvy agents frustrated with KW Command.",
    objectionHandlers: [
      {
        objection: "KW has the best training",
        response: "KW's training is great for getting started. But once you're producing, you're paying for training you no longer need — through higher caps and that 6% royalty. At Spyglass, we have Mission Control with built-in analytics, CMA tools, and market intelligence. Training AND tools.",
      },
      {
        objection: "I like KW's profit sharing",
        response: "Let's compare. KW profit share depends on your market center's profitability — it's not guaranteed and you have no visibility into the math. Real's revenue share is transparent: 5/4/3/2/1% of your recruit's $12K cap. It's willable and retirement-eligible. Plus you get stock equity. Run the numbers — Real's model is materially better.",
      },
      {
        objection: "KW cap is competitive",
        response: "KW's cap is $22-28K plus the 6% franchise royalty. On $300K GCI, that's $18K royalty + cap = $40K+. At Spyglass, your total cap is $12K. Period. No royalty, no franchise fees. That difference pays for a lot of marketing.",
      },
      {
        objection: "I've been at KW for years, I'm comfortable",
        response: "Comfort is the enemy of growth. You know that — you tell your clients the same thing. The question is: are you where you want to be in 5 years? Revenue share, stock equity, AI tools, instant payouts — these things compound. Starting now is better than starting later.",
      },
    ],
    targetProfiles: [
      "Productive agents (15+ deals) tired of paying 6% royalty",
      "Tech-savvy agents frustrated with KW Command",
      "Agents who've outgrown training programs",
      "Team leaders wanting better operational tools",
    ],
  },
  {
    name: "eXp Realty",
    shortName: "eXp",
    tier: "cloud",
    color: "#0066CC",
    split: "80/20",
    cap: "$16,000/yr",
    capAmount: 16000,
    monthlyFee: "$85/mo ($1,020/yr)",
    monthlyFeeAmount: 85,
    transactionFee: "$250/deal (first 20 after cap), then $75",
    transactionFeeAmount: 250,
    royaltyFee: "None",
    eoFee: "Included in monthly fee",
    hasRevShare: true,
    revShareDesc: "Revenue share up to 7 tiers. Complex structure. Harder to build than Real's — requires large downline. Revenue share ≠ willable immediately.",
    hasStock: true,
    stockDesc: "ICON Agent award can reimburse full cap in EXPI shares (high bar). Agent stock purchase plan available.",
    techStack: [
      "kvCORE (CRM)",
      "eXp World (VR campus)",
      "SkySlope (transactions)",
      "eXp Marketing Center",
    ],
    strengths: [
      "Large referral network (85K+ agents globally)",
      "Revenue share + stock model (pioneer)",
      "ICON award is meaningful for top producers",
      "Strong virtual collaboration tools",
      "No physical office overhead",
    ],
    weaknesses: [
      "Higher total cost than Real ($16K cap + $85/mo + transaction fees)",
      "eXp World (VR) feels gimmicky and underused",
      "Culture fragmentation — too many agents, no local identity",
      "Revenue share is harder to build (complex, not willable by default)",
      "No local brand presence — just 'eXp' everywhere",
      "Agent growth has plateaued (flat Q2 2025)",
      "Net income still negative",
    ],
    austinPresence: "800-1,000+ agents (no physical office)",
    agentCount: "85,000+ globally",
    recruitingAngle: "eXp agents tired of 'culture fatigue' and impersonal virtual model. Agents wanting a local brand identity. Cost-sensitive agents who realize eXp isn't actually cheapest.",
    objectionHandlers: [
      {
        objection: "eXp has revenue share too",
        response: "Both have rev share, but Real's is better. Real: 5/4/3/2/1% = up to $4K/yr per tier 1 recruit. It's willable after 5 years and retirement-eligible. eXp's requires a much larger downline to be meaningful, and isn't willable by default. Plus Real adds stock grants on top.",
      },
      {
        objection: "eXp is cheaper than traditional brokerages",
        response: "But not cheaper than Spyglass. eXp: $16K cap + $1,020/yr monthly fees + $250/deal after cap. Spyglass: $12K cap + $0 monthly + $285/deal after cap. At 20 deals/year, Spyglass saves you $5K+ annually. Run the Commission Calculator and see.",
      },
      {
        objection: "I like the virtual model",
        response: "Spyglass is cloud-first too — via Real's platform. But we ALSO have a local Austin presence, a team that knows your name, and custom tools built for this market. Best of both worlds. eXp's virtual campus is interesting but ask yourself: when's the last time you actually used eXp World?",
      },
      {
        objection: "eXp has ICON awards",
        response: "ICON is great — if you hit it. It requires top production PLUS cultural contribution (attending meetings, mentoring, etc.). Real's stock grants are automatic when you cap. 150 shares just for doing your job. No jumping through hoops.",
      },
    ],
    targetProfiles: [
      "eXp agents wanting local community and brand identity",
      "Cost-conscious agents who realize Real/Spyglass is actually cheaper",
      "Agents tired of eXp's 'culture fatigue' and VR gimmicks",
      "Agents with small downlines who'd benefit more from Real's rev share structure",
    ],
  },
  {
    name: "RE/MAX",
    shortName: "RE/MAX",
    tier: "major",
    color: "#003DA5",
    split: "95/5 to 100/0 (varies by office)",
    cap: "None (flat fee model)",
    capAmount: 0,
    monthlyFee: "$1,500-$3,000+/mo desk fee",
    monthlyFeeAmount: 2000,
    transactionFee: "Varies by office",
    transactionFeeAmount: 0,
    royaltyFee: "3% dues to RE/MAX International",
    eoFee: "~$500-$1,000/yr",
    hasRevShare: false,
    revShareDesc: "No revenue share program",
    hasStock: false,
    stockDesc: "No agent stock equity",
    techStack: [
      "remax.com (consumer portal)",
      "booj (proprietary CRM)",
      "RE/MAX University (training)",
    ],
    strengths: [
      "Strong consumer brand recognition (balloon)",
      "High splits (after desk fee)",
      "Good for experienced agents with established business",
      "International referral network",
    ],
    weaknesses: [
      "Expensive desk fees ($1,500-$3,000+/mo = $18-36K/yr)",
      "Bleeding agents to cloud brokerages",
      "Aging brand — doesn't appeal to younger agents",
      "3% international dues on top of desk fees",
      "No equity, no revenue share, no stock",
      "Tech is dated compared to modern platforms",
      "Office model = overhead in a remote-first world",
    ],
    austinPresence: "300-400 agents across multiple offices",
    agentCount: "140,000+ globally (declining)",
    recruitingAngle: "RE/MAX agents paying $24K-$36K/yr in desk fees alone. Show them how much they'd save with an $12K cap.",
    objectionHandlers: [
      {
        objection: "RE/MAX has better brand recognition",
        response: "RE/MAX is a known brand, absolutely. But consumers increasingly search online first — they find agents through Google, Zillow, and referrals, not brokerage signs. Our Spyglass IDX and AI-powered search actually get YOUR listings in front of buyers. That's more valuable than a balloon logo.",
      },
      {
        objection: "I like my office and the people there",
        response: "Community is important — we agree. That's exactly what Spyglass offers, but without the $2K+/month desk fee. We have offices when you need them, a tight-knit team, and technology that keeps everyone connected. Ask yourself: is that office worth $24K+ a year?",
      },
      {
        objection: "I keep a high split at RE/MAX",
        response: "A 100/0 split sounds great until you add the desk fee ($24-36K/yr) and 3% RE/MAX dues. At Spyglass, you pay $12K max, period. Even at 85/15, your take-home is higher because our total costs are dramatically lower. Plus you get revenue share and stock equity that RE/MAX doesn't offer.",
      },
    ],
    targetProfiles: [
      "Experienced agents tired of paying high desk fees",
      "Agents wanting equity and passive income opportunities",
      "Agents seeing their colleagues leave for cloud brokerages",
      "Cost-conscious producers looking to maximize take-home",
    ],
  },
  {
    name: "Real Broker (Direct — not via Spyglass)",
    shortName: "Real (Direct)",
    tier: "cloud",
    color: "#FF4D00",
    split: "85/15",
    cap: "$12,000/yr",
    capAmount: 12000,
    monthlyFee: "$0",
    monthlyFeeAmount: 0,
    transactionFee: "$285 after cap ($129 for Elite)",
    transactionFeeAmount: 285,
    royaltyFee: "$0",
    eoFee: "Included",
    hasRevShare: true,
    revShareDesc: "Same 5-tier model as Spyglass (because Spyglass IS Real). Identical economics.",
    hasStock: true,
    stockDesc: "Same stock program as Spyglass.",
    techStack: [
      "reZEN platform",
      "Leo AI assistant",
      "Real Wallet",
      "Chime CRM (discounted)",
    ],
    strengths: [
      "Same economic model as Spyglass",
      "Growing fast (#5 nationally)",
      "Good tech platform",
    ],
    weaknesses: [
      "No local brand identity in Austin",
      "No custom tools (Mission Control, Pulse, Beacon, IDX)",
      "No local community or office presence",
      "Generic onboarding experience",
      "You're just another agent in a 30K+ roster",
    ],
    austinPresence: "Growing, no centralized presence",
    agentCount: "30,000+ nationally",
    recruitingAngle: "If someone is already considering Real, show them why Spyglass Private Label is the BETTER way to join Real.",
    objectionHandlers: [
      {
        objection: "Why not just join Real directly?",
        response: "Same splits, same cap, same rev share, same stock. But with Spyglass, you ALSO get: Mission Control dashboards, Pulse market intelligence, Beacon recruiting tools, Spyglass IDX, CMA builder, local Austin community, and Ryan's personal mentorship. It's Real + MORE. No extra cost.",
      },
      {
        objection: "Is there any cost difference?",
        response: "Zero. Identical economics — 85/15 split, $12K cap, same rev share, same stock. Spyglass is Real's Private Label, so you get everything Real offers PLUS our custom tech stack and local community. It's strictly additive.",
      },
    ],
    targetProfiles: [
      "Agents considering Real Brokerage directly",
      "Real agents in Austin without a team/community",
      "Agents who want Real's economics but with local support",
    ],
  },
];

// ── Financial Scenario Calculator ──────────────────

interface FinancialScenario {
  gci: number;
  deals: number;
  label: string;
}

const SCENARIOS: FinancialScenario[] = [
  { gci: 100000, deals: 8, label: "Developing Agent" },
  { gci: 200000, deals: 15, label: "Solid Producer" },
  { gci: 350000, deals: 25, label: "Top Producer" },
  { gci: 500000, deals: 35, label: "Elite Agent" },
];

function calculateCompetitorCost(comp: CompetitorProfile, gci: number, deals: number): number {
  // Simplified cost model
  let cost = 0;

  // Monthly fees
  cost += comp.monthlyFeeAmount * 12;

  // Split-based costs (approximate)
  if (comp.shortName === "Compass") {
    // Compass: estimate 20% take until negotiated cap (usually ~$20-25K)
    cost += Math.min(gci * 0.2, comp.capAmount);
  } else if (comp.shortName === "KW") {
    // KW: 30% split capped at ~$25K, plus 6% royalty
    const splitCost = Math.min(gci * 0.3, comp.capAmount);
    const royalty = gci * 0.06; // 6% franchise fee
    cost += splitCost + Math.min(royalty, 5000); // royalty usually caps
  } else if (comp.shortName === "eXp") {
    // eXp: 20% split, $16K cap, then transaction fees
    const splitCost = Math.min(gci * 0.2, 16000);
    const dealsAfterCap = Math.max(0, deals - Math.ceil(16000 / (gci / deals * 0.2)));
    const txnFees = Math.min(dealsAfterCap, 20) * 250 + Math.max(0, dealsAfterCap - 20) * 75;
    cost += splitCost + txnFees;
  } else if (comp.shortName === "RE/MAX") {
    // RE/MAX: Desk fee + 3% dues
    cost += comp.monthlyFeeAmount * 12; // desk fee already counted above, but recalculate
    cost = comp.monthlyFeeAmount * 12 + gci * 0.03; // 3% RE/MAX dues
  } else if (comp.shortName === "Real (Direct)") {
    // Same as Spyglass
    const splitCost = Math.min(gci * 0.15, 12000);
    const dealsAfterCap = gci > 80000 ? Math.max(0, deals - Math.ceil(12000 / (gci / deals * 0.15))) : 0;
    cost += splitCost + dealsAfterCap * 285;
  }

  return cost;
}

function calculateSpyglassCost(gci: number, deals: number): number {
  const splitCost = Math.min(gci * 0.15, 12000);
  const avgGCIPerDeal = gci / deals;
  const dealsToHitCap = Math.ceil(12000 / (avgGCIPerDeal * 0.15));
  const dealsAfterCap = Math.max(0, deals - dealsToHitCap);
  return splitCost + dealsAfterCap * 285;
}

// ── Component ──────────────────────────────────────

export default function RecruitingBattlecardsPage() {
  const [selectedComp, setSelectedComp] = useState<string>("Compass");
  const [activeScenario, setActiveScenario] = useState(1); // Solid Producer

  const competitor = useMemo(
    () => COMPETITORS.find((c) => c.shortName === selectedComp)!,
    [selectedComp]
  );

  const scenario = SCENARIOS[activeScenario];

  const spyglassCost = useMemo(
    () => calculateSpyglassCost(scenario.gci, scenario.deals),
    [scenario]
  );

  const compCost = useMemo(
    () => calculateCompetitorCost(competitor, scenario.gci, scenario.deals),
    [competitor, scenario]
  );

  const savings = compCost - spyglassCost;

  const copyBattleCard = useCallback(() => {
    const text = `SPYGLASS vs ${competitor.shortName} — Battle Card\n\n` +
      `At $${scenario.gci.toLocaleString()} GCI (${scenario.deals} deals/yr):\n` +
      `• ${competitor.shortName} cost: ~$${Math.round(compCost).toLocaleString()}\n` +
      `• Spyglass cost: ~$${Math.round(spyglassCost).toLocaleString()}\n` +
      `• YOU SAVE: ~$${Math.round(savings).toLocaleString()}/year\n\n` +
      `PLUS at Spyglass:\n` +
      `✓ Revenue share (5-tier, willable, retirement-eligible)\n` +
      `✓ REAX stock grants when you cap\n` +
      `✓ Mission Control, Pulse, IDX, CMA tools\n` +
      `✓ Boutique culture — know your broker's name\n` +
      `✓ Real Wallet instant payouts\n\n` +
      `Backed by Real Brokerage (#5 nationally, NASDAQ: REAX)`;
    navigator.clipboard.writeText(text);
  }, [competitor, scenario, compCost, spyglassCost, savings]);

  return (
    <DashboardLayout
      title="Recruiting Battle Cards"
      subtitle="Competitive intelligence for recruiting conversations"
      icon={Swords}
    >
      <div className="space-y-6">
        {/* ── Competitor Selector ── */}
        <div className="flex flex-wrap gap-2">
          {COMPETITORS.map((c) => (
            <Button
              key={c.shortName}
              variant={selectedComp === c.shortName ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedComp(c.shortName)}
              className="gap-2"
            >
              <Building2 className="h-3 w-3" />
              {c.shortName}
            </Button>
          ))}
        </div>

        {/* ── Overview Cards ── */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Spyglass Realty
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Split:</strong> 85/15</p>
              <p><strong>Cap:</strong> $12,000/yr</p>
              <p><strong>Monthly:</strong> $0</p>
              <p><strong>Rev Share:</strong> ✅ 5-tier (willable)</p>
              <p><strong>Stock:</strong> ✅ REAX grants</p>
              <p><strong>Backed by:</strong> Real Brokerage (#5 nationally)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {competitor.shortName}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><strong>Split:</strong> {competitor.split}</p>
              <p><strong>Cap:</strong> {competitor.cap}</p>
              <p><strong>Monthly:</strong> {competitor.monthlyFee}</p>
              <p><strong>Rev Share:</strong> {competitor.hasRevShare ? "⚠️ " + competitor.revShareDesc.split(".")[0] : "❌ None"}</p>
              <p><strong>Stock:</strong> {competitor.hasStock ? "⚠️ Limited" : "❌ None"}</p>
              <p><strong>Austin agents:</strong> {competitor.austinPresence}</p>
            </CardContent>
          </Card>

          <Card className={savings > 0 ? "border-green-500/30 bg-green-500/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Annual Savings
              </CardTitle>
              <CardDescription>
                At {scenario.label} level ({scenario.deals} deals, ${scenario.gci.toLocaleString()} GCI)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {savings > 0 ? `+$${Math.round(savings).toLocaleString()}` : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Spyglass: ${Math.round(spyglassCost).toLocaleString()} vs {competitor.shortName}: ${Math.round(compCost).toLocaleString()}
              </p>
              <div className="flex gap-1 mt-3">
                {SCENARIOS.map((s, i) => (
                  <Button
                    key={i}
                    variant={activeScenario === i ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setActiveScenario(i)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="talking-points">
          <TabsList>
            <TabsTrigger value="talking-points">💬 Talking Points</TabsTrigger>
            <TabsTrigger value="objections">🛡️ Objection Handlers</TabsTrigger>
            <TabsTrigger value="comparison">📊 Full Comparison</TabsTrigger>
            <TabsTrigger value="targets">🎯 Target Profiles</TabsTrigger>
          </TabsList>

          {/* ── TALKING POINTS ── */}
          <TabsContent value="talking-points" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Their Weaknesses = Our Opportunity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    {competitor.shortName} Pain Points
                  </CardTitle>
                  <CardDescription>Weaknesses to highlight in conversation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {competitor.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Our Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-500" />
                    Spyglass Advantages
                  </CardTitle>
                  <CardDescription>Lead with these in your pitch</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {SPYGLASS_PROFILE.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recruiting Angle */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Best Recruiting Angle vs {competitor.shortName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                    {competitor.recruitingAngle}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── OBJECTION HANDLERS ── */}
          <TabsContent value="objections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Common Objections & Responses
                </CardTitle>
                <CardDescription>
                  What {competitor.shortName} agents say, and how to respond
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {competitor.objectionHandlers.map((oh, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 p-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">"{oh.objection}"</span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-muted-foreground">{oh.response}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FULL COMPARISON ── */}
          <TabsContent value="comparison" className="space-y-4">
            <div className="grid gap-4">
              {/* Economics Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Economics Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Feature</th>
                          <th className="text-left p-2 text-primary">Spyglass</th>
                          <th className="text-left p-2">{competitor.shortName}</th>
                          <th className="text-left p-2">Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { feature: "Commission Split", spy: SPYGLASS_PROFILE.split, comp: competitor.split, winner: "spyglass" },
                          { feature: "Annual Cap", spy: SPYGLASS_PROFILE.cap, comp: competitor.cap, winner: competitor.capAmount > 12000 || competitor.capAmount === 0 ? "spyglass" : "tie" },
                          { feature: "Monthly Fees", spy: SPYGLASS_PROFILE.monthlyFee, comp: competitor.monthlyFee, winner: competitor.monthlyFeeAmount > 0 ? "spyglass" : "tie" },
                          { feature: "Revenue Share", spy: "5-tier (willable)", comp: competitor.hasRevShare ? "Yes (limited)" : "None", winner: "spyglass" },
                          { feature: "Stock Equity", spy: "REAX grants", comp: competitor.hasStock ? "Limited" : "None", winner: "spyglass" },
                          { feature: "E&O Insurance", spy: SPYGLASS_PROFILE.eoFee, comp: competitor.eoFee, winner: "spyglass" },
                          { feature: "Royalty/Franchise Fee", spy: SPYGLASS_PROFILE.royaltyFee, comp: competitor.royaltyFee, winner: competitor.royaltyFee !== "None" && competitor.royaltyFee !== "$0" ? "spyglass" : "tie" },
                        ].map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2 font-medium">{row.feature}</td>
                            <td className="p-2">{row.spy}</td>
                            <td className="p-2">{row.comp}</td>
                            <td className="p-2">
                              {row.winner === "spyglass" ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-300">
                                  Spyglass ✓
                                </Badge>
                              ) : row.winner === "comp" ? (
                                <Badge variant="outline">{competitor.shortName}</Badge>
                              ) : (
                                <Badge variant="secondary">Tie</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tech Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Laptop className="h-5 w-5" />
                    Technology Stack Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-primary mb-2">Spyglass ({SPYGLASS_PROFILE.techStack.length} tools)</h4>
                      <ul className="space-y-1">
                        {SPYGLASS_PROFILE.techStack.map((t, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Zap className="h-3 w-3 text-primary" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">{competitor.shortName} ({competitor.techStack.length} tools)</h4>
                      <ul className="space-y-1">
                        {competitor.techStack.map((t, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Minus className="h-3 w-3 text-muted-foreground" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost Comparison by Production Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Scenario</th>
                          <th className="text-left p-2">GCI</th>
                          <th className="text-left p-2 text-primary">Spyglass Cost</th>
                          <th className="text-left p-2">{competitor.shortName} Cost</th>
                          <th className="text-left p-2 text-green-600">You Save</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SCENARIOS.map((s, i) => {
                          const spyCost = calculateSpyglassCost(s.gci, s.deals);
                          const cCost = calculateCompetitorCost(competitor, s.gci, s.deals);
                          const diff = cCost - spyCost;
                          return (
                            <tr key={i} className="border-b">
                              <td className="p-2 font-medium">{s.label}</td>
                              <td className="p-2">${s.gci.toLocaleString()}</td>
                              <td className="p-2 text-primary font-semibold">
                                ${Math.round(spyCost).toLocaleString()}
                              </td>
                              <td className="p-2">${Math.round(cCost).toLocaleString()}</td>
                              <td className="p-2">
                                {diff > 0 ? (
                                  <span className="text-green-600 font-bold">
                                    +${Math.round(diff).toLocaleString()}
                                  </span>
                                ) : diff < 0 ? (
                                  <span className="text-red-600">
                                    -${Math.round(Math.abs(diff)).toLocaleString()}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Copy Battle Card */}
            <div className="flex justify-end">
              <Button onClick={copyBattleCard} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Battle Card to Clipboard
              </Button>
            </div>
          </TabsContent>

          {/* ── TARGET PROFILES ── */}
          <TabsContent value="targets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ideal Recruiting Targets from {competitor.shortName}
                </CardTitle>
                <CardDescription>
                  These agent profiles are most likely to switch and succeed at Spyglass
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitor.targetProfiles.map((profile, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm">{profile}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* The Spyglass Pitch */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  The Spyglass Elevator Pitch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground">
                  "At Spyglass, you get the economics and backing of the #5 largest brokerage in
                  America — 85/15 split, $12K cap, revenue share, stock equity — but with a
                  boutique Austin culture where your broker knows your name. We've built custom
                  AI-powered tools that the mega-brokerages can't match because we built them for
                  OUR agents, not 50,000 strangers. You keep more money, build long-term wealth
                  through equity, and actually enjoy coming to work."
                </blockquote>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
