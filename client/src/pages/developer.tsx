import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Code,
  Activity,
  Users,
  Shield,
  Plus,
  Filter,
  Search,
  Calendar,
  GitCommit,
  User,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Plug,
  Loader2,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ActivityLog {
  id: number;
  user_id?: string;
  user_email: string;
  user_name: string;
  action_type: string;
  description: string;
  metadata?: any;
  ip_address?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_super_admin?: boolean;
  created_at: string;
  activity_count: number;
  last_activity?: string;
}

interface ChangelogEntry {
  id: number;
  description: string;
  developer_name: string;
  developer_email: string;
  requested_by?: string;
  commit_hash?: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SystemHealth {
  database_stats: {
    total_users: number;
    total_cmas: number;
    total_activity_logs: number;
  };
  integrations: Array<{
    name: string;
    display_name: string;
    is_active: boolean;
    last_tested_at?: string;
    last_test_result?: string;
    last_test_message?: string;
  }>;
  deployment: {
    last_deployed: string;
    commit_hash: string;
    environment: string;
    version: string;
  };
  recent_errors: Array<{
    created_at: string;
    description: string;
    metadata?: any;
  }>;
}

const actionTypeColors: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  view: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  login: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  export: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  search: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const categoryColors: Record<string, string> = {
  bug_fix: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  feature: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ui: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  database: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  api: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  deployment: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  deployed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  reverted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function DeveloperPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState("activity");
  const [activityFilters, setActivityFilters] = useState({
    search: "",
    action_type: "",
    user_id: "",
    start_date: "",
    end_date: "",
  });
  const [changelogFilters, setChangelogFilters] = useState({
    category: "",
    status: "",
    developer_email: "",
  });
  const [newChangelogOpen, setNewChangelogOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [newChangelogForm, setNewChangelogForm] = useState({
    description: "",
    commit_hash: "",
    category: "feature",
    status: "deployed",
    requested_by: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");

  // Access control check
  if (!user || user.role !== 'developer') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need developer privileges to access this page.</p>
        </div>
      </Layout>
    );
  }

  // Data queries
  const { data: activityData, isLoading: activityLoading } = useQuery<{
    logs: ActivityLog[];
    pagination: any;
  }>({
    queryKey: ["/api/developer/activity-logs", activityFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(activityFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await fetch(`/api/developer/activity-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/developer/users"],
    queryFn: async () => {
      const res = await fetch("/api/developer/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: changelogData, isLoading: changelogLoading } = useQuery<{
    changelog: ChangelogEntry[];
    pagination: any;
  }>({
    queryKey: ["/api/developer/changelog", changelogFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(changelogFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await fetch(`/api/developer/changelog?${params}`);
      if (!res.ok) throw new Error("Failed to fetch changelog");
      return res.json();
    },
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ["/api/developer/system-health"],
    queryFn: async () => {
      const res = await fetch("/api/developer/system-health");
      if (!res.ok) throw new Error("Failed to fetch system health");
      return res.json();
    },
  });

  // Mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/developer/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/users"] });
      toast({ title: "User role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addChangelogMutation = useMutation({
    mutationFn: async (data: typeof newChangelogForm) => {
      const res = await fetch("/api/developer/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add changelog entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/changelog"] });
      setNewChangelogOpen(false);
      setNewChangelogForm({
        description: "",
        commit_hash: "",
        category: "feature",
        status: "deployed",
        requested_by: "",
      });
      toast({ title: "Changelog entry added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/developer/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to invite user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/users"] });
      setInviteUserOpen(false);
      setInviteEmail("");
      toast({ title: "User invited as co-developer successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Prepare chart data
  const activityChartData = React.useMemo(() => {
    if (!activityData?.logs) return [];
    
    const dailyActivity: Record<string, number> = {};
    activityData.logs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });
    
    return Object.entries(dailyActivity)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days
  }, [activityData]);

  const integrationStatusData = React.useMemo(() => {
    if (!systemHealth?.integrations) return [];
    
    const connected = systemHealth.integrations.filter(i => i.last_test_result === 'success').length;
    const failed = systemHealth.integrations.filter(i => i.last_test_result === 'failed').length;
    const untested = systemHealth.integrations.length - connected - failed;
    
    return [
      { name: 'Connected', value: connected, color: '#10b981' },
      { name: 'Failed', value: failed, color: '#ef4444' },
      { name: 'Untested', value: untested, color: '#f59e0b' },
    ];
  }, [systemHealth]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Code className="h-8 w-8 text-[#EF4923]" />
            Developer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive development tools, activity monitoring, and system management
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Overview
            </TabsTrigger>
            <TabsTrigger value="changelog" className="flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Development Changelog
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Activity Overview */}
          <TabsContent value="activity" className="space-y-6">
            {/* Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline (Last 7 Days)</CardTitle>
                <CardDescription>Daily activity volume across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {activityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#EF4923" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No activity data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
                <CardDescription>Real-time log of all user actions across the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search activities..."
                      value={activityFilters.search}
                      onChange={(e) => setActivityFilters({ ...activityFilters, search: e.target.value })}
                      className="pl-8"
                    />
                  </div>
                  <Select
                    value={activityFilters.action_type}
                    onValueChange={(value) => setActivityFilters({ ...activityFilters, action_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                      <SelectItem value="search">Search</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={activityFilters.start_date}
                      onChange={(e) => setActivityFilters({ ...activityFilters, start_date: e.target.value })}
                      placeholder="Start date"
                    />
                    <Input
                      type="date"
                      value={activityFilters.end_date}
                      onChange={(e) => setActivityFilters({ ...activityFilters, end_date: e.target.value })}
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Activity List */}
                <ScrollArea className="h-[500px]">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : activityData?.logs?.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No activity found matching the current filters
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activityData?.logs?.map((log) => (
                        <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <Badge className={actionTypeColors[log.action_type] || "bg-gray-100 text-gray-700"}>
                            {log.action_type}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{log.user_name}</span>
                              <span className="text-xs text-muted-foreground">({log.user_email})</span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                            {log.ip_address && (
                              <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Development Changelog */}
          <TabsContent value="changelog" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Development Changelog</h3>
                <p className="text-sm text-muted-foreground">Track all code changes, deployments, and development milestones</p>
              </div>
              <Dialog open={newChangelogOpen} onOpenChange={setNewChangelogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Changelog Entry</DialogTitle>
                    <DialogDescription>
                      Log a new development change or milestone
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what was changed..."
                        value={newChangelogForm.description}
                        onChange={(e) => setNewChangelogForm({ ...newChangelogForm, description: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newChangelogForm.category}
                          onValueChange={(value) => setNewChangelogForm({ ...newChangelogForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bug_fix">Bug Fix</SelectItem>
                            <SelectItem value="feature">Feature</SelectItem>
                            <SelectItem value="ui">UI Update</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="deployment">Deployment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newChangelogForm.status}
                          onValueChange={(value) => setNewChangelogForm({ ...newChangelogForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deployed">Deployed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reverted">Reverted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="commit_hash">Commit Hash</Label>
                        <Input
                          id="commit_hash"
                          placeholder="abc123..."
                          value={newChangelogForm.commit_hash}
                          onChange={(e) => setNewChangelogForm({ ...newChangelogForm, commit_hash: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="requested_by">Requested By</Label>
                        <Input
                          id="requested_by"
                          placeholder="Ryan, Daryl, etc."
                          value={newChangelogForm.requested_by}
                          onChange={(e) => setNewChangelogForm({ ...newChangelogForm, requested_by: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => addChangelogMutation.mutate(newChangelogForm)}
                      disabled={!newChangelogForm.description || addChangelogMutation.isPending}
                    >
                      {addChangelogMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add Entry
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Changelog Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                value={changelogFilters.category}
                onValueChange={(value) => setChangelogFilters({ ...changelogFilters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="bug_fix">Bug Fix</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="ui">UI Update</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="deployment">Deployment</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={changelogFilters.status}
                onValueChange={(value) => setChangelogFilters({ ...changelogFilters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reverted">Reverted</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={changelogFilters.developer_email}
                onValueChange={(value) => setChangelogFilters({ ...changelogFilters, developer_email: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by developer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Developers</SelectItem>
                  {Array.from(new Set(changelogData?.changelog?.map(c => c.developer_email) || [])).map((email) => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Changelog List */}
            <Card>
              <CardContent className="p-6">
                {changelogLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : changelogData?.changelog?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No changelog entries yet</p>
                    <p className="text-sm">Add your first development milestone</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {changelogData?.changelog?.map((entry) => (
                      <div key={entry.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={categoryColors[entry.category] || "bg-gray-100 text-gray-700"}>
                                {entry.category.replace('_', ' ')}
                              </Badge>
                              <Badge className={statusColors[entry.status] || "bg-gray-100 text-gray-700"}>
                                {entry.status.replace('_', ' ')}
                              </Badge>
                              {entry.commit_hash && (
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {entry.commit_hash}
                                </code>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">{entry.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>By {entry.developer_name}</span>
                              {entry.requested_by && <span>Requested by {entry.requested_by}</span>}
                              <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: User Management */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage user roles and permissions across the platform</p>
              </div>
              <Dialog open={inviteUserOpen} onOpenChange={setInviteUserOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Co-Developer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Co-Developer</DialogTitle>
                    <DialogDescription>
                      Invite a user to become a co-developer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite_email">Email Address</Label>
                      <Input
                        id="invite_email"
                        type="email"
                        placeholder="user@spyglassrealty.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => inviteUserMutation.mutate(inviteEmail)}
                      disabled={!inviteEmail || inviteUserMutation.isPending}
                    >
                      {inviteUserMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-6">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {usersData?.users?.map((user) => (
                      <Card key={user.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#EF4923] flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}` 
                                  : user.email}
                              </span>
                              {user.is_super_admin && (
                                <Badge variant="outline" className="text-xs">Admin</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            
                            <div className="mt-3">
                              <Label htmlFor={`role-${user.id}`} className="text-xs">Role</Label>
                              <Select
                                value={user.role}
                                onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="developer">Developer</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Activity:</span>
                                <span>{user.activity_count} actions</span>
                              </div>
                              {user.last_activity && (
                                <div className="flex justify-between">
                                  <span>Last seen:</span>
                                  <span>{formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Joined:</span>
                                <span>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: System Health */}
          <TabsContent value="health" className="space-y-6">
            <h3 className="text-lg font-semibold">System Health</h3>
            
            {healthLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Database Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{systemHealth?.database_stats?.total_users || 0}</p>
                          <p className="text-xs text-muted-foreground">Total Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <FileBarChart className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{systemHealth?.database_stats?.total_cmas || 0}</p>
                          <p className="text-xs text-muted-foreground">Total CMAs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{systemHealth?.database_stats?.total_activity_logs || 0}</p>
                          <p className="text-xs text-muted-foreground">Activity Logs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deployment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Deployment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Environment</Label>
                        <p className="font-mono text-sm">{systemHealth?.deployment?.environment}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Version</Label>
                        <p className="font-mono text-sm">{systemHealth?.deployment?.version}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Commit Hash</Label>
                        <p className="font-mono text-sm">{systemHealth?.deployment?.commit_hash}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Last Deployed</Label>
                        <p className="text-sm">
                          {systemHealth?.deployment?.last_deployed 
                            ? formatDistanceToNow(new Date(systemHealth.deployment.last_deployed), { addSuffix: true })
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Integration Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Integration Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {systemHealth?.integrations?.map((integration) => (
                          <div key={integration.name} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                integration.last_test_result === 'success' ? 'bg-green-500' :
                                integration.last_test_result === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                              }`} />
                              <span className="font-medium text-sm">{integration.display_name}</span>
                            </div>
                            <Badge variant={
                              integration.last_test_result === 'success' ? 'default' :
                              integration.last_test_result === 'failed' ? 'destructive' : 'secondary'
                            }>
                              {integration.last_test_result === 'success' ? 'Connected' :
                               integration.last_test_result === 'failed' ? 'Failed' : 'Untested'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Integration Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {integrationStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={integrationStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {integrationStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          No integration data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Errors */}
                {systemHealth?.recent_errors?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Errors</CardTitle>
                      <CardDescription>Latest errors and issues detected</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {systemHealth.recent_errors.map((error, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error.description}</p>
                              <p className="text-xs text-red-600 dark:text-red-500">
                                {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}