import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Lightbulb,
  Home,
  FileText,
  DollarSign,
  Network,
  Users,
  TrendingUp,
  Share2,
  UserCheck,
  Target,
  ListTodo,
  Trophy,
  BookUser,
  LinkIcon,
  FileBarChart,
  ChevronLeft,
  Shield,
  Radar,
  ExternalLink,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  section?: string;
  external?: boolean;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/admin/dashboards", icon: LayoutDashboard, section: "DASHBOARD" },
  { label: "Insights", href: "/admin/dashboards/insights", icon: Lightbulb, section: "DASHBOARD" },
  { label: "Leads", href: "/admin/dashboards/leads", icon: Target, section: "DASHBOARD" },
  { label: "Transactions", href: "/admin/dashboards/transactions", icon: FileText, section: "PRODUCTION" },
  { label: "Listings", href: "/admin/dashboards/listings", icon: Home, section: "PRODUCTION" },
  { label: "Revenue", href: "/admin/dashboards/revenue", icon: DollarSign, section: "PRODUCTION" },
  { label: "Network Overview", href: "/admin/dashboards/network", icon: Network, section: "NETWORK" },
  { label: "Frontline", href: "/admin/dashboards/network/frontline", icon: UserCheck, section: "NETWORK" },
  { label: "Trends", href: "/admin/dashboards/network/trends", icon: TrendingUp, section: "NETWORK" },
  { label: "RevShare", href: "/admin/dashboards/network/revshare", icon: Share2, section: "NETWORK" },
  { label: "Members", href: "/admin/dashboards/network/members", icon: Users, section: "NETWORK" },
  { label: "Agent Insights", href: "/admin/dashboards/agent-insights", icon: Target, section: "TEAM" },
  { label: "Member Mgmt", href: "/admin/dashboards/member-management", icon: UserCog, section: "TEAM" },
  { label: "Team Tasks", href: "/admin/dashboards/team-tasks", icon: ListTodo, section: "TEAM" },
  { label: "Leaderboard", href: "/admin/dashboards/leaderboard", icon: Trophy, section: "TEAM" },
  { label: "Directory", href: "/admin/dashboards/directory", icon: BookUser, section: "TEAM" },
  { label: "Links", href: "/admin/dashboards/links", icon: LinkIcon, section: "RESOURCES" },
  { label: "Reports", href: "/admin/dashboards/reports", icon: FileBarChart, section: "RESOURCES" },
];

const externalTools: NavItem[] = [
  {
    label: "Beacon Recruiting",
    href: "https://beacon.realtyhack.com",
    icon: Radar,
    section: "TOOLS",
    external: true,
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: any;
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
}: DashboardLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const sections = Array.from(new Set(navItems.map((item) => item.section)));

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 border-r bg-card transition-all duration-200 overflow-y-auto",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className="p-3 flex items-center justify-between border-b">
          {!collapsed && (
            <Link href="/admin">
              <span className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer">
                <Shield className="h-4 w-4" />
                Admin
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        <nav className="p-2 space-y-1">
          {sections.map((section) => (
            <div key={section} className="mb-2">
              {!collapsed && (
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {section}
                </div>
              )}
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = location === item.href ||
                    (item.href !== "/admin/dashboards" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </span>
                    </Link>
                  );
                })}
            </div>
          ))}

          {/* External Tools Section */}
          <div className="mb-2 pt-2 border-t">
            {!collapsed && (
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                TOOLS
              </div>
            )}
            {externalTools.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                  "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                  </>
                )}
              </a>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
