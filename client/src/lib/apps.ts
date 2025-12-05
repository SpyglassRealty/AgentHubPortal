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
  BrainCircuit
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
  { label: "Leads", icon: Users, href: "#" },
  { label: "Properties", icon: Building2, href: "#" },
  { label: "Calendar", icon: Calendar, href: "#" },
  { label: "Marketing", icon: Megaphone, href: "#" },
  { label: "Reports", icon: BarChart3, href: "#" },
];
