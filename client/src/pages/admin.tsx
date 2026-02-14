import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Layout from "@/components/layout";
import { apps, type AppDefinition } from "@/lib/apps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { User, AppVisibility } from "@shared/schema";

// ── Types ──────────────────────────────────────────
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
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
        </div>
      </Layout>
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

  const formatActionLabel = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#EF4923]" />
            Leadership Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage agents, apps, integrations, and company settings.
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <Link href="/admin/dashboards">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors">
                <BarChart3 className="h-4 w-4" />
                Business Dashboards →
              </span>
            </Link>
            <Link href="/admin/beacon">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 cursor-pointer transition-colors">
                <Activity className="h-4 w-4" />
                Beacon Recruiting →
              </span>
            </Link>
            <Link href="/admin/communities">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 cursor-pointer transition-colors">
                <Building2 className="h-4 w-4" />
                Communities →
              </span>
            </Link>
            <Link href="/admin/site-editor">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4" />
                Homepage Editor →
              </span>
            </Link>
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Sidebar */}
      <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm`}>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#EF4923] flex-shrink-0" />
            {sidebarExpanded && (
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Spyglass Admin</h2>
                <p className="text-xs text-gray-500">Content Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Dashboard */}
          <div className="px-4">
            {sidebarExpanded && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Overview
              </h3>
            )}
            <nav className="space-y-1">
              <Link href="/admin/dashboards">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                  <BarChart3 className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Business Dashboards</span>}
                </div>
              </Link>
              <Link href="/admin/beacon">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <Activity className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Beacon Recruiting</span>}
                </div>
              </Link>
            </nav>
          </div>

          {/* Content Management */}
          <div className="px-4">
            {sidebarExpanded && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Content
              </h3>
            )}
            <nav className="space-y-1">
              <Link href="/admin/communities">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <Building2 className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Communities</span>}
                </div>
              </Link>
              <Link href="/admin/blog/posts">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <FileBarChart className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Blog Management</span>}
                </div>
              </Link>
              <Link href="/admin/landing-pages">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <FileText className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Landing Pages</span>}
                </div>
              </Link>
            </nav>
          </div>

          {/* People */}
          <div className="px-4">
            {sidebarExpanded && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                People
              </h3>
            )}
            <nav className="space-y-1">
              <Link href="/admin/agents">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <Users className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Agent Directory</span>}
                </div>
              </Link>
              <Link href="/admin/testimonials">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <MessageSquare className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Testimonials</span>}
                </div>
              </Link>
            </nav>
          </div>

          {/* SEO & Technical */}
          <div className="px-4">
            {sidebarExpanded && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                SEO & Technical
              </h3>
            )}
            <nav className="space-y-1">
              <Link href="/admin/redirects">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <ExternalLink className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Redirects</span>}
                </div>
              </Link>
              <Link href="/admin/global-scripts">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <Code className="h-5 w-5 flex-shrink-0" />
                  {sidebarExpanded && <span>Global Scripts</span>}
                </div>
              </Link>
            </nav>
          </div>
        </div>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full justify-center"
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
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back! Manage your website content and settings.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            {/* Modern Stats Cards */}
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : statsData?.totalUsers ?? "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Active (7d)</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : statsData?.activeLastWeek ?? "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total CMAs</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : statsData?.totalCmas ?? "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <FileBarChart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Sessions Today</p>
                    <p className="text-3xl font-bold">
                      {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : statsData?.loginsToday ?? "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full">
                    <LogIn className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEO Health Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  SEO Health Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pages with Good SEO</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                      </div>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Meta Descriptions</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full w-1/2"></div>
                      </div>
                      <span className="text-sm font-medium">50%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Focus Keywords</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full w-5/6"></div>
                      </div>
                      <span className="text-sm font-medium">83%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Blog post published</span>
                    <span className="text-gray-400 ml-auto">2m ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Community page updated</span>
                    <span className="text-gray-400 ml-auto">1h ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">New agent added</span>
                    <span className="text-gray-400 ml-auto">3h ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Testimonial approved</span>
                    <span className="text-gray-400 ml-auto">6h ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/communities/new">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Building2 className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Add Community</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create new community page</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/admin/blog/posts/new">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <FileBarChart className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Write Blog Post</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create new blog content</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/admin/testimonials/new">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Add Testimonial</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Add customer review</p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/admin/agents/new">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-0 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Add Agent</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create agent profile</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* System Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Integration Status */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5 text-blue-600" />
                  Integration Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.slice(0, 4).map((integ) => (
                    <div key={integ.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${integ.color} rounded-lg flex items-center justify-center`}>
                          <span className="text-white font-bold text-[10px]">{integ.icon}</span>
                        </div>
                        <span className="text-sm font-medium">{integ.displayName}</span>
                      </div>
                      {integ.lastTestResult === "success" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      ) : integ.configured ? (
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Configured</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Management Preview */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers.slice(0, 4).map((user) => {
                    const name = user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.email || "Unknown";
                    return (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        {user.isSuperAdmin && (
                          <Badge className="bg-[#EF4923]/10 text-[#EF4923]">
                            Admin
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">Leadership-Only Apps</h2>
            <Badge variant="secondary" className="ml-2">{hiddenApps.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hiddenApps.map((app) => (
              <Link key={app.id} href={`/app/${app.id}`}>
                <Card className="group cursor-pointer border-border hover:border-[#EF4923]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${app.color} flex items-center justify-center`}>
                        <app.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-display">{app.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1 mt-0.5">
                          {app.description}
                        </CardDescription>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      {app.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                      ))}
                      <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hidden
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {hiddenApps.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No hidden apps.</p>
            )}
          </div>
        </section>

        <Separator />

        {/* ── Section B: Agent Management ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">Agent Management</h2>
            <Badge variant="secondary" className="ml-2">{allUsers.length}</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No users found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">Super Admin</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((u) => {
                        const name =
                          u.firstName && u.lastName
                            ? `${u.firstName} ${u.lastName}`
                            : u.firstName || u.email || "Unknown";
                        const isSelf = u.id === user?.id;

                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {name}
                              {isSelf && (
                                <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {u.email || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  u.isSuperAdmin
                                    ? "bg-[#EF4923]/10 text-[#EF4923] hover:bg-[#EF4923]/20 border-0"
                                    : "bg-secondary text-secondary-foreground"
                                }
                              >
                                {u.isSuperAdmin ? "Admin" : "Agent"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={u.isSuperAdmin ?? false}
                                disabled={isSelf || updateUserMutation.isPending}
                                onCheckedChange={(checked) => {
                                  updateUserMutation.mutate({
                                    id: u.id,
                                    data: { isSuperAdmin: checked },
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleDateString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Section C: Integration Status ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Plug className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">Integration Status</h2>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Plug className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{integrations.length}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{configuredCount}</p>
                    <p className="text-xs text-muted-foreground">Configured</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{connectedCount}</p>
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {integrationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Integration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Tested</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {integrations.map((integ) => (
                        <TableRow key={integ.name}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 ${integ.color} rounded-lg flex items-center justify-center`}>
                                <span className="text-white font-bold text-[10px]">{integ.icon}</span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{integ.displayName}</p>
                                <p className="text-xs text-muted-foreground">{integ.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {!integ.configured ? (
                              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                                Not Configured
                              </Badge>
                            ) : integ.lastTestResult === "success" ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
                                <Check className="w-3 h-3 mr-1" /> Connected
                              </Badge>
                            ) : integ.lastTestResult === "failed" ? (
                              <Badge variant="destructive">
                                <X className="w-3 h-3 mr-1" /> Failed
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100">
                                Untested
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {integ.lastTestedAt
                              ? new Date(integ.lastTestedAt).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {integ.lastTestMessage || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Section D: App Visibility Manager ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">App Visibility Manager</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Control which apps are visible on the agent dashboard. Hidden apps are only accessible from this admin panel.
          </p>

          <Card>
            <CardContent className="p-0">
              {visibilityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>App</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Categories</TableHead>
                        <TableHead className="text-center">Visible to Agents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apps
                        .filter((app) => app.id !== "contract-conduit-marketing")
                        .map((app) => {
                          const appHidden = isAppHidden(app);
                          return (
                            <TableRow key={app.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${app.color} flex items-center justify-center`}>
                                    <app.icon className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium text-sm">{app.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {app.connectionType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {app.categories.map((cat) => (
                                    <Badge key={cat} variant="secondary" className="text-[10px]">
                                      {cat}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={!appHidden}
                                  disabled={updateVisibilityMutation.isPending}
                                  onCheckedChange={(checked) => {
                                    updateVisibilityMutation.mutate({
                                      appId: app.id,
                                      hidden: !checked,
                                    });
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Section E: Activity Log ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">Recent Activity</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              {activityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No activity logs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => {
                        const adminName = log.admin_first_name && log.admin_last_name
                          ? `${log.admin_first_name} ${log.admin_last_name}`
                          : log.admin_email || "System";
                        
                        let details = "";
                        if (log.previous_value && log.new_value) {
                          details = `${log.previous_value} → ${log.new_value}`;
                        } else if (log.new_value) {
                          details = log.new_value;
                        } else if (log.details) {
                          const d = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                          if (d.email) details = d.email;
                          else details = JSON.stringify(d).slice(0, 80);
                        }

                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {formatActionLabel(log.action)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{adminName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                              {details || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Section F: Company Settings ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-[#EF4923]" />
            <h2 className="text-xl font-display font-semibold">Company Settings</h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-lg font-display font-semibold">Spyglass Realty</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Brand Color</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border border-border shadow-sm"
                      style={{ backgroundColor: "#EF4923" }}
                    />
                    <div>
                      <p className="font-mono text-sm font-medium">#EF4923</p>
                      <p className="text-xs text-muted-foreground">Spyglass Orange</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Company settings are read-only for now. Editing support coming soon.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
