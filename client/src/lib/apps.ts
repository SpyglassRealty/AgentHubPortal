import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Megaphone, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Search,
  BrainCircuit,
  BookOpen,
  Mail,
  MessageSquare
} from "lucide-react";

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: "Core" | "Marketing" | "Sales" | "Admin";
  color: string;
  url?: string;
}

export const apps: AppDefinition[] = [
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
    url: "https://blog-to-email-automator--ryan1648.replit.app"
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
    id: "lead-command",
    name: "LeadCommand",
    description: "Manage your client relationships and pipeline.",
    icon: Users,
    category: "Sales",
    color: "bg-blue-100 text-blue-700"
  },
  {
    id: "proplist",
    name: "PropList",
    description: "MLS integration and listing management tool.",
    icon: Building2,
    category: "Core",
    color: "bg-emerald-100 text-emerald-700"
  },
  {
    id: "market-mate",
    name: "MarketMate",
    description: "Create flyers, social posts, and email campaigns.",
    icon: Megaphone,
    category: "Marketing",
    color: "bg-purple-100 text-purple-700"
  },
  {
    id: "docu-flow",
    name: "DocuFlow",
    description: "Digital signatures and contract management.",
    icon: FileText,
    category: "Admin",
    color: "bg-amber-100 text-amber-700"
  },
  {
    id: "show-time",
    name: "ShowTime",
    description: "Schedule and manage property viewings.",
    icon: Calendar,
    category: "Sales",
    color: "bg-rose-100 text-rose-700"
  },
  {
    id: "analytics",
    name: "AgentStats",
    description: "Performance metrics and commission tracking.",
    icon: BarChart3,
    category: "Admin",
    color: "bg-indigo-100 text-indigo-700"
  }
];

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Leads", icon: Users, href: "#" },
  { label: "Properties", icon: Building2, href: "#" },
  { label: "Marketing", icon: Megaphone, href: "#" },
];
