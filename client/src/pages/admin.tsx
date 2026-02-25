import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apps, type AppDefinition } from "@/lib/apps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Eye,
  EyeOff,
  Plug,
  Building2,
  ExternalLink,
  Check,
  X,
  Loader2,
  Key,
  Lock,
  Activity,
  BarChart3,
  FileBarChart,
  LogIn,
  Clock,
  UserCheck,
  Code,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Settings,
  Home,
  Star,
  ArrowRightLeft as RedirectIcon,
  PenTool,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isSuperAdmin?: boolean;
  createdAt?: string;
}

interface UsersResponse {
  users: User[];
}

interface Integration {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  configured: boolean;
  isActive: boolean;
  maskedApiKey: string | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  lastTestMessage: string | null;
  updatedAt: string | null;
}

interface IntegrationsResponse {
  integrations: Integration[];
}

interface AppVisibility {
  appId: string;
  hidden: boolean;
}

interface AppVisibilityResponse {
  visibility: AppVisibility[];
}

interface AdminStats {
  totalUsers: number;
  activeLastWeek: number;
  totalCmas: number;
  loginsToday: number;
}

interface ActivityLog {
  id: number;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  previous_value: string | null;
  new_value: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_email: string | null;
  admin_first_name: string | null;
  admin_last_name: string | null;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
}

// ── Component ──────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // ── Data queries ──
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: integrationsData, isLoading: integrationsLoading } = useQuery<IntegrationsResponse>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
  });

  const { data: visibilityData, isLoading: visibilityLoading } = useQuery<AppVisibilityResponse>({
    queryKey: ["/api/admin/app-visibility"],
    queryFn: async () => {
      const res = await fetch("/api/admin/app-visibility", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch app visibility");
      return res.json();
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: activityData, isLoading: activityLoading } = useQuery<ActivityLogsResponse>({
    queryKey: ["/api/admin/activity-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/activity-logs?limit=20", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
  });

  // Build a map of app_id -> hidden from the DB
  const hiddenMap: Record<string, boolean> = {};
  (visibilityData?.visibility || []).forEach((v) => {
    hiddenMap[v.appId] = v.hidden ?? false;
  });

  // ── Mutations ──
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { isSuperAdmin?: boolean } }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ appId, hidden }: { appId: string; hidden: boolean }) => {
      const res = await fetch(`/api/admin/app-visibility/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update visibility");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/app-visibility"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app-visibility"] });
      toast({ title: "App visibility updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ── Guard ──
  if (!user?.isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  // Determine which apps are hidden based on DB data (with fallback to static definition)
  const isAppHidden = (app: AppDefinition): boolean => {
    if (hiddenMap[app.id] !== undefined) return hiddenMap[app.id];
    return app.hidden ?? false;
  };

  const hiddenApps = apps.filter((app) => isAppHidden(app));
  const allUsers = usersData?.users || [];
  const integrations = integrationsData?.integrations || [];
  const configuredCount = integrations.filter((i) => i.configured).length;
  const connectedCount = integrations.filter((i) => i.lastTestResult === "success").length;
  const activityLogs = activityData?.logs || [];

  // Navigation configuration
  const navigationSections = [
    {
      title: "TOOLS",
      items: [
        { name: "Dashboard", href: "/admin", icon: Home, active: location === "/admin" },
        { name: "Dashboards", href: "/admin/dashboards", icon: BarChart3 },
        { name: "Beacon", href: "/admin/beacon", icon: Activity },
        { name: "Site Editor", href: "/admin/site-editor", icon: PenTool },
      ]
    },
    {
      title: "CONTENT", 
      items: [
        { name: "Communities", href: "/admin/communities", icon: Building2 },
        { name: "Blog Posts", href: "/admin/blog/posts", icon: FileText },
        { name: "Blog Categories", href: "/admin/blog/categories", icon: FileBarChart },
        { name: "Landing Pages", href: "/admin/landing-pages", icon: Globe },
        { name: "Page Builder", href: "/admin/pages", icon: FileText },
      ]
    },
    {
      title: "PEOPLE",
      items: [
        { name: "Agents", href: "/admin/agents", icon: Users },
        { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquare },
        { name: "Review Sources", href: "/admin/review-sources", icon: Star },
      ]
    },
    {
      title: "SEO & TECHNICAL",
      items: [
        { name: "Redirects", href: "/admin/redirects", icon: RedirectIcon },
        { name: "Global Scripts", href: "/admin/global-scripts", icon: Code },
      ]
    }
  ];

  // Breadcrumb generation
  const breadcrumbs = [
    { name: "Admin", href: "/admin" }
  ];

  if (location !== "/admin") {
    const pathSegments = location.split('/').filter(segment => segment);
    for (let i = 2; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const href = '/' + pathSegments.slice(0, i + 1).join('/');
      breadcrumbs.push({
        name: segment.charAt(0).toUpperCase() + segment.slice(1),
        href
      });
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Modern Sidebar */}
      <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 bg-[#1a1a2e] flex flex-col shadow-lg`}>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#EF4923] flex-shrink-0" />
            {sidebarExpanded && (
              <div>
                <h2 className="font-bold text-white">Spyglass Admin</h2>
                <p className="text-xs text-gray-400">Content Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-6">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title} className={`px-4 ${sectionIndex > 0 ? 'mt-8' : ''}`}>
              {sidebarExpanded && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      item.active || location.startsWith(item.href + '/') 
                        ? 'bg-[#EF4923] text-white border-l-4 border-[#EF4923]' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* User Info & Sidebar Toggle */}
        <div className="p-4 border-t border-gray-700">
          {sidebarExpanded && user && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EF4923] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(user.firstName?.[0] || user.email?.[0] || 'A').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </div>
                  <div className="text-gray-400 text-xs">Administrator</div>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full justify-center text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {sidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex text-sm text-gray-500 mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href}>
                    {index > 0 && <span className="mx-2">/</span>}
                    <Link href={crumb.href} className="hover:text-gray-700">
                      {crumb.name}
                    </Link>
                  </span>
                ))}
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back! Manage your website content and settings.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Communities</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "24"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Blog Posts</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "156"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Agents</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : allUsers.length}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Reviews</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "2,847"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Star className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">New blog post published</span>
                      <p className="text-sm text-gray-600">"Market Trends in Austin Real Estate"</p>
                    </div>
                    <span className="text-gray-400 text-sm">2m ago</span>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">Community page updated</span>
                      <p className="text-sm text-gray-600">Westlake community information refreshed</p>
                    </div>
                    <span className="text-gray-400 text-sm">1h ago</span>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">New agent added</span>
                      <p className="text-sm text-gray-600">Sarah Johnson joined the team</p>
                    </div>
                    <span className="text-gray-400 text-sm">3h ago</span>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">Testimonial approved</span>
                      <p className="text-sm text-gray-600">5-star review from satisfied client</p>
                    </div>
                    <span className="text-gray-400 text-sm">6h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
