import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle,
  Settings,
  Home,
  Star,
  Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

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

interface ContentStats {
  communities: number;
  blogPosts: number;
  testimonials: number;
  landingPages: number;
}

// ── Component ──────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: contentStatsData, isLoading: contentStatsLoading } = useQuery<ContentStats>({
    queryKey: ["/api/admin/content-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch content stats");
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

  // Format activity log action for display
  const formatAction = (log: ActivityLog) => {
    const action = log.action || "";
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
        { name: "Review Sources", href: "/admin/testimonials/sources", icon: Star },
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

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const actionColors: Record<string, string> = {
    create: "bg-green-500",
    update: "bg-blue-500",
    delete: "bg-red-500",
    toggle: "bg-yellow-500",
    login: "bg-purple-500",
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    for (const [key, color] of Object.entries(actionColors)) {
      if (lowerAction.includes(key)) return color;
    }
    return "bg-gray-500";
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Manage your website content and settings.</p>
        </div>

        {/* Quick Stats — real data from /api/admin/content-stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Communities</p>
                  <p className="text-3xl font-bold">
                    {contentStatsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (contentStatsData?.communities ?? 0).toLocaleString()}
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
                    {contentStatsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (contentStatsData?.blogPosts ?? 0).toLocaleString()}
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
                  <p className="text-purple-100 text-sm font-medium">Landing Pages</p>
                  <p className="text-3xl font-bold">
                    {contentStatsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (contentStatsData?.landingPages ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <Globe className="h-6 w-6" />
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
                    {contentStatsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (contentStatsData?.testimonials ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <Star className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity — real data from activity logs */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {activityLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 ${getActionColor(log.action)} rounded-full`}></div>
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">{formatAction(log)}</span>
                        <p className="text-sm text-gray-600">
                          by {log.admin_first_name || log.admin_email || "Admin"}
                          {log.details?.name ? ` — ${log.details.name}` : ""}
                        </p>
                      </div>
                      <span className="text-gray-400 text-sm">{formatTimeAgo(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
