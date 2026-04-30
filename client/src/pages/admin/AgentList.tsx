import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

import { AgentBadge } from "@/components/agents/AgentBadge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Filter,
  ArrowUpDown,
  Building2,
  Mail,
  Phone,
  Loader2,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { AgentDirectoryProfile } from "@shared/schema";

interface AgentsResponse {
  agents: AgentDirectoryProfile[];
}

export default function AgentListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for filters and search
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  // Fetch agents
  const { data: agentsData, isLoading } = useQuery<AgentsResponse>({
    queryKey: ["/api/admin/agents", { search, office: officeFilter, visibility: visibilityFilter, sortBy, order: sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (officeFilter !== "all") params.append("office", officeFilter);
      if (visibilityFilter !== "all") params.append("visibility", visibilityFilter);
      params.append("sortBy", sortBy);
      params.append("order", sortOrder);
      
      const res = await fetch(`/api/admin/agents?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isVisible }),
      });
      if (!res.ok) throw new Error("Failed to update agent visibility");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({ title: "Agent visibility updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update agent visibility", variant: "destructive" });
    },
  });

  // Bulk visibility mutation
  const bulkVisibilityMutation = useMutation({
    mutationFn: async ({ agentIds, isVisible }: { agentIds: string[]; isVisible: boolean }) => {
      const res = await fetch("/api/admin/agents/bulk-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ agentIds, isVisible }),
      });
      if (!res.ok) throw new Error("Failed to update agent visibility");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setSelectedAgents(new Set());
      toast({ title: `Updated ${data.updatedCount} agents` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update agent visibility", variant: "destructive" });
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({ title: "Agent deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete agent", variant: "destructive" });
    },
  });

  const syncFromFubMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/agents/sync-from-fub", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json() as Promise<{ inserted: number; skipped: number; errors: any[] }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({
        title: "Sync complete",
        description: `${data.inserted} new agent${data.inserted === 1 ? '' : 's'} synced from FUB. ${data.skipped} already existed.${data.errors?.length ? ` ${data.errors.length} error(s).` : ''}`,
      });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not sync agents from FUB.", variant: "destructive" });
    },
  });

  const agents = agentsData?.agents || [];

  const pendingCount = (agents || []).filter(
    (a) => !a.isVisible && a.fubAgentId != null
  ).length;
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAgents(new Set(agents.map(agent => agent.id)));
    } else {
      setSelectedAgents(new Set());
    }
  };

  // Handle individual select
  const handleSelectAgent = (agentId: string, checked: boolean) => {
    const newSelected = new Set(selectedAgents);
    if (checked) {
      newSelected.add(agentId);
    } else {
      newSelected.delete(agentId);
    }
    setSelectedAgents(newSelected);
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSeoScoreColor = (score?: number | null) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-[#EF4923]" />
              Agent Directory
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage agent profiles for the public directory and IDX site.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin">
              <Button variant="outline">← Back to Admin</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => syncFromFubMutation.mutate()}
              disabled={syncFromFubMutation.isPending}
            >
              {syncFromFubMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" />Sync from FUB</>
              )}
            </Button>
            <Link href="/admin/agents/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={officeFilter} onValueChange={setOfficeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="Austin">Austin</SelectItem>
                  <SelectItem value="Houston">Houston</SelectItem>
                  <SelectItem value="Corpus Christi">Corpus Christi</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="pending">Pending Review ({pendingCount})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="firstName-asc">First Name A-Z</SelectItem>
                  <SelectItem value="firstName-desc">First Name Z-A</SelectItem>
                  <SelectItem value="lastName-asc">Last Name A-Z</SelectItem>
                  <SelectItem value="lastName-desc">Last Name Z-A</SelectItem>
                  <SelectItem value="office-asc">Office A-Z</SelectItem>
                  <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                  <SelectItem value="seoScore-desc">SEO Score High-Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {pendingCount > 0 && visibilityFilter !== 'pending' && (
          <Card className="border-orange-300 bg-orange-50 mb-4">
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800">
                  <strong>{pendingCount}</strong> agent{pendingCount === 1 ? '' : 's'} synced from FUB awaiting review.
                  Fill in Workspace email and office location before activating.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setVisibilityFilter('pending')}>
                Review Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedAgents.size > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedAgents.size} agents selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkVisibilityMutation.mutate({ agentIds: Array.from(selectedAgents), isVisible: true })}
                  disabled={bulkVisibilityMutation.isPending}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkVisibilityMutation.mutate({ agentIds: Array.from(selectedAgents), isVisible: false })}
                  disabled={bulkVisibilityMutation.isPending}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedAgents(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agents Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No agents found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first agent profile.
                </p>
                <Link href="/admin/agents/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Agent
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedAgents.size === agents.length && agents.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>SEO Score</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <Fragment key={agent.id}>
                      <TableRow>
                        <TableCell>
                          <Checkbox
                            checked={selectedAgents.has(agent.id)}
                            onCheckedChange={(checked) => handleSelectAgent(agent.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {agent.headshotUrl ? (
                              <img
                                src={agent.headshotUrl}
                                alt={`${agent.firstName} ${agent.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {agent.firstName} {agent.lastName}
                                <AgentBadge fubCreatedAt={agent.fubCreatedAt} />
                              </p>
                              {agent.professionalTitle && (
                                <p className="text-sm text-muted-foreground">
                                  {agent.professionalTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{agent.email}</span>
                            </div>
                            {agent.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{agent.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {agent.officeLocation.split(',').filter(Boolean).map((office, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {office.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={agent.isVisible}
                              onCheckedChange={(checked) =>
                                toggleVisibilityMutation.mutate({ id: agent.id, isVisible: checked })
                              }
                              disabled={toggleVisibilityMutation.isPending}
                            />
                            <span className="text-sm text-muted-foreground">
                              {agent.isVisible ? "Visible" : "Hidden"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getSeoScoreColor(agent.seoScore)} text-xs font-medium`}
                          >
                            {agent.seoScore || 0}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(agent.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setLocation(`/admin/agents/${agent.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this agent?")) {
                                    deleteAgentMutation.mutate(agent.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {!agent.isVisible && agent.fubAgentId != null && !agent.email && (
                        <TableRow className="bg-orange-50/50">
                          <TableCell colSpan={8} className="py-2 text-xs text-orange-700">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            Workspace email required for Google Calendar access. FUB ID: {agent.fubAgentId}.{' '}
                            <a href={`/admin/agents/${agent.id}`} className="underline">Edit profile</a>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}