import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Megaphone, 
  FileText, 
  Calendar, 
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
  Settings
} from "lucide-react";

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: "Core" | "Marketing" | "Sales" | "Admin";
  color: string;
  url?: string;
  noIframe?: boolean;
}

export const apps: AppDefinition[] = [
  {
    id: "contract-conduit",
    name: "Contract Conduit",
    description: "Your first step to entering a transaction.",
    icon: FileText,
    category: "Core",
    color: "bg-amber-100 text-amber-700",
    url: "https://contract-conduit--ryan1648.replit.app",
    noIframe: true
  },
  {
    id: "rechat",
    name: "ReChat",
    description: "The Real Estate Super App. CRM, Marketing, and Transaction Management in one.",
    icon: MessageSquare,
    category: "Core",
    color: "bg-violet-100 text-violet-700",
    url: "https://app.rechat.com"
  },
  {
    id: "blog-email-automator",
    name: "Blog to Email Automator",
    description: "Automatically convert your blog posts into engaging email newsletters.",
    icon: Mail,
    category: "Marketing",
    color: "bg-pink-100 text-pink-700",
    url: "https://blog-to-email-automator-2--caleb254.replit.app"
  },
  {
    id: "realty-hack-ai",
    name: "RealtyHack AI",
    description: "AI Training Assistant. Instant answers from your training library, handbook, and resources.",
    icon: BookOpen,
    category: "Core",
    color: "bg-orange-100 text-orange-700",
    url: "https://www.realtyhack.com/ai/"
  },
  {
    id: "home-review-ai",
    name: "Home Review AI",
    description: "Generate comprehensive annual real estate market reviews with AI-driven insights.",
    icon: BrainCircuit,
    category: "Core",
    color: "bg-sky-100 text-sky-700",
    url: "https://home-review-ai-ryan1648.replit.app"
  },
  {
    id: "follow-up-boss",
    name: "Follow Up Boss",
    description: "Your CRM for managing leads, contacts, and follow-ups. Opens in a new tab.",
    icon: Contact,
    category: "Sales",
    color: "bg-green-100 text-green-700",
    url: "https://login.followupboss.com/login",
    noIframe: true
  },
  {
    id: "ylopo-add-lead",
    name: "Ylopo Add Lead",
    description: "Quickly add new leads to your Ylopo account. Opens in a new tab.",
    icon: UserPlus,
    category: "Sales",
    color: "bg-cyan-100 text-cyan-700",
    url: "https://stars.ylopo.com/auth",
    noIframe: true
  },
  {
    id: "ylopo-tools",
    name: "Ylopo Tools",
    description: "Access Ylopo marketing tools and resources.",
    icon: Wrench,
    category: "Marketing",
    color: "bg-teal-100 text-teal-700",
    url: "https://www.austinhomesaleguide.com/tools"
  },
  {
    id: "rezen",
    name: "ReZen",
    description: "Real Brokerage's agent portal for transactions, commissions, and more.",
    icon: Building,
    category: "Core",
    color: "bg-blue-100 text-blue-700",
    url: "https://bolt.therealbrokerage.com/"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and collaboration hub. Opens in a new tab.",
    icon: Hash,
    category: "Core",
    color: "bg-purple-100 text-purple-700",
    url: "https://app.slack.com/client/T08T7BSLZV4",
    noIframe: true
  },
  {
    id: "canva",
    name: "Canva",
    description: "Create beautiful marketing materials, flyers, and social media graphics. Opens in a new tab.",
    icon: Palette,
    category: "Marketing",
    color: "bg-violet-100 text-violet-700",
    url: "https://www.canva.com/projects",
    noIframe: true
  },
  {
    id: "client-data",
    name: "Client Data",
    description: "Access and manage client property data and listings.",
    icon: Database,
    category: "Sales",
    color: "bg-indigo-100 text-indigo-700",
    url: "https://idx-grid-data-ryan1648.replit.app"
  },
  {
    id: "jointly",
    name: "Jointly",
    description: "Collaborate with clients and partners on real estate transactions.",
    icon: Handshake,
    category: "Sales",
    color: "bg-teal-100 text-teal-700",
    url: "https://app.jointly.com/login"
  },
];

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "My Performance", icon: TrendingUp, href: "/my-performance" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Properties", icon: Building2, href: "/properties" },
  { label: "Marketing", icon: Megaphone, href: "/marketing" },
  { label: "Settings", icon: Settings, href: "/settings" },
];
