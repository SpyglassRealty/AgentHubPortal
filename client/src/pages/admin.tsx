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
  Palette,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2,
  Key,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

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

// ── Component ──────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // App visibility state (client-side)
  const [appVisibility, setAppVisibility] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    apps.forEach((app) => {
      map[app.id] = !app.hidden;
    });
    return map;
  });

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

  const hiddenApps = apps.filter((app) => app.hidden);
  const allUsers = usersData?.users || [];
  const integrations = integrationsData?.integrations || [];
  const configuredCount = integrations.filter((i) => i.configured).length;
  const connectedCount = integrations.filter((i) => i.lastTestResult === "success").length;

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
        </div>

        {/* ── Section A: Hidden Apps ── */}
        <section>
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
                      .map((app) => (
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
                              checked={appVisibility[app.id] ?? !app.hidden}
                              onCheckedChange={(checked) => {
                                setAppVisibility((prev) => ({
                                  ...prev,
                                  [app.id]: checked,
                                }));
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-2">
            Note: Visibility toggles are currently client-side only. Persistent server-side control coming soon.
          </p>
        </section>

        <Separator />

        {/* ── Section E: Company Settings ── */}
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
