import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Megaphone, 
  FileText, 
  Calendar, 
  CalendarDays,
  BarChart3, 
  BrainCircuit,
  BookOpen,
  Mail,
  MessageSquare,
  UserPlus,
  Wrench,
  Contact,
  Building,
  Hash,
  Palette,
  Database,
  Handshake,
  TrendingUp,
  Settings,
  GraduationCap,
  FileBarChart,
  Activity,
  Shield
} from "lucide-react";

export type AppConnectionType = 
  | 'embedded'      // Works inside portal (iframe)
  | 'external'      // Opens in new tab, external app
  | 'redirect';     // Just a link to external site

export type AppCategory = "Core" | "Marketing" | "Sales" | "Admin";

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  categories: AppCategory[];
  color: string;
  url?: string;
  noIframe?: boolean;
  connectionType: AppConnectionType;
  hidden?: boolean;
}

export const apps: AppDefinition[] = [
  {
    id: "contract-conduit",
    name: "Contract Conduit",
    description: "Manage real estate transactions, marketing materials, and CMAs.",
    icon: FileText,
    categories: ["Core", "Marketing"],
    color: "bg-amber-100 text-amber-700",
    url: "https://mission-control-contract-conduit.onrender.com/",
    connectionType: "embedded"
  },
  {
    id: "rechat",
    name: "ReChat",
    description: "The Real Estate Super App. CRM, Marketing, and Transaction Management in one.",
    icon: MessageSquare,
    categories: ["Core"],
    color: "bg-violet-100 text-violet-700",
    url: "https://app.rechat.com",
    connectionType: "external"
  },
  {
    id: "blog-email-automator",
    name: "Blog to Email Automator",
    description: "Automatically convert your blog posts into engaging email newsletters.",
    icon: Mail,
    categories: ["Marketing"],
    color: "bg-pink-100 text-pink-700",
    url: "https://blog-to-email-automator-2--caleb254.replit.app",
    connectionType: "embedded"
  },
  {
    id: "realty-hack-ai",
    name: "RealtyHack AI",
    description: "AI Training Assistant. Instant answers from your training library, handbook, and resources.",
    icon: BookOpen,
    categories: ["Core"],
    color: "bg-[#FDDDD5] text-[#B83A1A]",
    url: "https://www.realtyhack.com/ai/",
    connectionType: "external"
  },
  {
    id: "home-review-ai",
    name: "Home Review AI",
    description: "Generate comprehensive annual real estate market reviews with AI-driven insights.",
    icon: BrainCircuit,
    categories: ["Core"],
    color: "bg-sky-100 text-sky-700",
    url: "https://home-review-ai-ryan1648.replit.app",
    connectionType: "embedded",
    hidden: true
  },
  {
    id: "follow-up-boss",
    name: "Follow Up Boss",
    description: "Your CRM for managing leads, contacts, and follow-ups. Opens in a new tab.",
    icon: Contact,
    categories: ["Sales"],
    color: "bg-green-100 text-green-700",
    url: "https://login.followupboss.com/login",
    noIframe: true,
    connectionType: "redirect"
  },
  {
    id: "ylopo-add-lead",
    name: "Ylopo Add Lead",
    description: "Quickly add new leads to your Ylopo account. Opens in a new tab.",
    icon: UserPlus,
    categories: ["Sales"],
    color: "bg-cyan-100 text-cyan-700",
    url: "https://stars.ylopo.com/auth",
    noIframe: true,
    connectionType: "redirect"
  },
  {
    id: "ylopo-tools",
    name: "Ylopo Tools",
    description: "Access Ylopo marketing tools and resources.",
    icon: Wrench,
    categories: ["Marketing"],
    color: "bg-teal-100 text-teal-700",
    url: "https://www.austinhomesaleguide.com/tools",
    connectionType: "external"
  },
  {
    id: "rezen",
    name: "ReZen",
    description: "Real Brokerage's agent portal for transactions, commissions, and more.",
    icon: Building,
    categories: ["Core"],
    color: "bg-blue-100 text-blue-700",
    url: "https://bolt.therealbrokerage.com/",
    connectionType: "redirect"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and collaboration hub. Opens in a new tab.",
    icon: Hash,
    categories: ["Core"],
    color: "bg-purple-100 text-purple-700",
    url: "https://app.slack.com/client/T08T7BSLZV4",
    noIframe: true,
    connectionType: "redirect"
  },
  {
    id: "canva",
    name: "Canva",
    description: "Create beautiful marketing materials, flyers, and social media graphics. Opens in a new tab.",
    icon: Palette,
    categories: ["Marketing"],
    color: "bg-violet-100 text-violet-700",
    url: "https://www.canva.com/projects",
    noIframe: true,
    connectionType: "redirect"
  },
  {
    id: "contract-conduit-marketing",
    name: "Contract Conduit",
    description: "Turn your marketing leads into contracts. Streamline the transition from prospect to signed deal.",
    icon: FileText,
    categories: ["Marketing"],
    color: "bg-amber-100 text-amber-700",
    url: "https://mission-control-contract-conduit.onrender.com/",
    connectionType: "embedded"
  },
  {
    id: "agent-dashboards",
    name: "Agent Dashboards",
    description: "Business intelligence dashboards with KPIs, transactions, revenue, network analytics, and leaderboards.",
    icon: BarChart3,
    categories: ["Admin"],
    color: "bg-violet-100 text-violet-700",
    url: "/admin/dashboards",
    connectionType: "embedded",
    hidden: true
  },
  {
    id: "client-data",
    name: "Client Data Portal",
    description: "Access and manage client property data and MLS listings.",
    icon: Database,
    categories: ["Sales"],
    color: "bg-indigo-100 text-indigo-700",
    url: "https://idx-grid-data-ryan1648.replit.app",
    connectionType: "embedded",
    hidden: true
  },
  {
    id: "cma-builder",
    name: "CMA Builder",
    description: "Create professional Comparative Market Analyses with live MLS data and adjustments.",
    icon: FileBarChart,
    categories: ["Core", "Sales"],
    color: "bg-emerald-100 text-emerald-700",
    url: "/cma",
    connectionType: "embedded"
  },
  {
    id: "jointly",
    name: "Jointly",
    description: "Collaborate with clients and partners on real estate transactions.",
    icon: Handshake,
    categories: ["Sales"],
    color: "bg-teal-100 text-teal-700",
    url: "https://app.jointly.com/login",
    connectionType: "redirect"
  },
];

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Performance", icon: TrendingUp, href: "/my-performance" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Email", icon: Mail, href: "/email" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Properties", icon: Building2, href: "/properties" },
  { label: "CMA", icon: FileBarChart, href: "/cma" },
  { label: "Pulse", icon: Activity, href: "/pulse" },
  { label: "Marketing", icon: Megaphone, href: "/marketing" },
  { label: "Marketing Calendar", icon: CalendarDays, href: "/marketing-calendar" },
  { label: "Pages", icon: FileText, href: "/admin/pages" },
  { label: "Training", icon: GraduationCap, href: "/training" },
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "Admin", icon: Shield, href: "/admin" },
];
