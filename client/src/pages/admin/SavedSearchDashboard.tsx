import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Play,
  Pause,
  Eye,
  Heart,
  MessageSquare,
  Send,
  RefreshCw,
  Loader2,
  Building2,
  DollarSign,
  Bed,
  Bath,
  MapPin,
  Calendar,
  Home,
  Mail,
  Phone,
  UserPlus,
  ChevronDown,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface RepliersClient {
  clientId: string;
  fname: string;
  lname: string;
  email: string;
  phone?: string;
  createdAt?: string;
  preferences?: {
    email?: boolean;
    sms?: boolean;
  };
}

interface SavedSearch {
  searchId: string;
  clientId: string;
  name?: string;
  active?: boolean;
  notificationFrequency?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  cities?: string[];
  areas?: string[];
  neighborhoods?: string[];
  propertyTypes?: string[];
  class?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMatchDate?: string;
  matchCount?: number;
  soldNotifications?: boolean;
  priceChangeNotifications?: boolean;
}

interface SearchMatch {
  mlsNumber: string;
  address?: string;
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status?: string;
  photos?: string[];
  matchedAt?: string;
  viewed?: boolean;
  favorited?: boolean;
}

interface MessageItem {
  id: string;
  clientId: string;
  agentId?: string;
  message: string;
  subject?: string;
  type?: string;
  direction?: string;
  createdAt?: string;
}

interface AgentOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  repliersAgentId?: string | null;
}

// ── Helper Functions ──────────────────────────────────────────────────────

function formatPrice(price?: number): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function summarizeCriteria(search: SavedSearch): string {
  const parts: string[] = [];
  if (search.minPrice || search.maxPrice) {
    parts.push(`${formatPrice(search.minPrice)}-${formatPrice(search.maxPrice)}`);
  }
  if (search.minBeds) parts.push(`${search.minBeds}+ beds`);
  if (search.minBaths) parts.push(`${search.minBaths}+ baths`);
  if (search.cities?.length) parts.push(search.cities.join(", "));
  if (search.areas?.length) parts.push(search.areas.join(", "));
  if (search.neighborhoods?.length) parts.push(search.neighborhoods.join(", "));
  if (search.propertyTypes?.length) parts.push(search.propertyTypes.join(", "));
  return parts.join(" · ") || "No criteria set";
}

// ── Main Component ────────────────────────────────────────────────────────

export default function SavedSearchDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClient, setSelectedClient] = useState<RepliersClient | null>(null);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateSearch, setShowCreateSearch] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // ── Fetch agents with Repliers IDs ──────────────────────────────────────

  const { data: agentsData, isLoading: agentsLoading } = useQuery<{ agents: AgentOption[] }>({
    queryKey: ["/api/admin/agents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/agents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const agents = agentsData?.agents || [];
  const linkedAgents = agents.filter((a) => a.repliersAgentId);
  const currentAgent = agents.find((a) => a.id === selectedAgentId);
  const currentRepliersAgentId = currentAgent?.repliersAgentId;

  // ── Dashboard data ──────────────────────────────────────────────────────

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ["/api/admin/saved-searches/dashboard", currentRepliersAgentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/saved-searches/dashboard?agentId=${currentRepliersAgentId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!currentRepliersAgentId,
  });

  // ── Match data for selected search ──────────────────────────────────────

  const { data: matchesData, isLoading: matchesLoading } = useQuery<{ matches: SearchMatch[] }>({
    queryKey: ["/api/admin/saved-searches/searches", selectedSearch?.searchId, "matches"],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/saved-searches/searches/${selectedSearch!.searchId}/matches`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: !!selectedSearch?.searchId,
  });

  // ── Messages for selected client ────────────────────────────────────────

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: MessageItem[] }>({
    queryKey: ["/api/admin/saved-searches/messages", selectedClient?.clientId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/saved-searches/messages?clientId=${selectedClient!.clientId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedClient?.clientId && activeTab === "messages",
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const pauseSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const res = await fetch(`/api/admin/saved-searches/searches/${searchId}/pause`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to pause search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/dashboard"] });
      toast({ title: "Search paused" });
    },
  });

  const resumeSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const res = await fetch(`/api/admin/saved-searches/searches/${searchId}/resume`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to resume search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/dashboard"] });
      toast({ title: "Search resumed" });
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const res = await fetch(`/api/admin/saved-searches/searches/${searchId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete search");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/dashboard"] });
      setSelectedSearch(null);
      toast({ title: "Search deleted" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { clientId: string; message: string; subject?: string }) => {
      const res = await fetch("/api/admin/saved-searches/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, agentId: currentRepliersAgentId }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/messages"] });
      toast({ title: "Message sent" });
      setShowMessageDialog(false);
    },
  });

  // ── Derived data ────────────────────────────────────────────────────────

  const clients: RepliersClient[] = dashboardData?.clients || [];
  const allSearches: SavedSearch[] = dashboardData?.searches || [];

  // Group searches by clientId
  const searchesByClient = useMemo(() => {
    const map = new Map<string, SavedSearch[]>();
    for (const s of allSearches) {
      const arr = map.get(s.clientId) || [];
      arr.push(s);
      map.set(s.clientId, arr);
    }
    return map;
  }, [allSearches]);

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  // ── No agent selected / no linked agents ────────────────────────────────

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-[#EF4923]" />
            Saved Searches
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client saved searches, alerts, and messaging via Repliers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentRepliersAgentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDashboard()}
              disabled={dashboardLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${dashboardLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Agent Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="whitespace-nowrap font-medium">Select Agent:</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {linkedAgents.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No agents linked to Repliers yet
                  </div>
                )}
                {linkedAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} — Repliers ID: {agent.repliersAgentId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agents.filter((a) => !a.repliersAgentId).length > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {agents.filter((a) => !a.repliersAgentId).length} agents not linked
              </Badge>
            )}
          </div>
          {!currentRepliersAgentId && selectedAgentId && (
            <div className="mt-3 p-3 bg-amber-50 text-amber-800 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              This agent doesn't have a Repliers Agent ID. Go to{" "}
              <Link href={`/admin/agents/${selectedAgentId}`}>
                <span className="underline cursor-pointer">Agent Editor</span>
              </Link>{" "}
              to link one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* No agent selected state */}
      {!currentRepliersAgentId && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Repliers-linked Agent</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose an agent from the dropdown above to view their clients, saved searches, and messaging dashboard.
              Agents must have a Repliers Agent ID linked in their profile.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      {currentRepliersAgentId && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.totalClients ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Search className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.totalSearches ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">Total Searches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Bell className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.activeSearches ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">Active Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <BellOff className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dashboardData?.pausedSearches ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">Paused</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">
                <Users className="h-4 w-4 mr-2" />
                Clients & Searches
              </TabsTrigger>
              <TabsTrigger value="matches">
                <Home className="h-4 w-4 mr-2" />
                Match Activity
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </TabsTrigger>
            </TabsList>

            {/* ── Clients & Searches Tab ─────────────────────────── */}
            <TabsContent value="overview" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Clients & Their Saved Searches</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateClient(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateSearch(true)}
                    disabled={clients.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Search
                  </Button>
                </div>
              </div>

              {dashboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No clients found for this agent.</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => setShowCreateClient(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Client
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {clients.map((client) => {
                    const clientSearches = searchesByClient.get(client.clientId) || [];
                    const isExpanded = expandedClients.has(client.clientId);

                    return (
                      <Card key={client.clientId} className="overflow-hidden">
                        {/* Client Header Row */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleClient(client.clientId)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {client.fname} {client.lname}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </span>
                                {client.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {client.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                              {clientSearches.length} search{clientSearches.length !== 1 ? "es" : ""}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                clientSearches.some((s) => s.active !== false)
                                  ? "text-green-600 border-green-300"
                                  : "text-gray-500"
                              }
                            >
                              {clientSearches.filter((s) => s.active !== false).length} active
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                                setShowMessageDialog(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded: Search List */}
                        {isExpanded && (
                          <div className="border-t bg-muted/25 px-4 pb-4">
                            {clientSearches.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                No saved searches for this client.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Search</TableHead>
                                    <TableHead>Criteria</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {clientSearches.map((search) => (
                                    <TableRow key={search.searchId}>
                                      <TableCell className="font-medium">
                                        {search.name || `Search ${search.searchId}`}
                                      </TableCell>
                                      <TableCell className="max-w-[250px]">
                                        <span className="text-sm text-muted-foreground truncate block">
                                          {summarizeCriteria(search)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                          {search.notificationFrequency || "instant"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {search.active !== false ? (
                                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                            Active
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary">Paused</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(search.createdAt)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    setSelectedSearch(search);
                                                    setActiveTab("matches");
                                                  }}
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>View Matches</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>

                                          {search.active !== false ? (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => pauseSearchMutation.mutate(search.searchId)}
                                                    disabled={pauseSearchMutation.isPending}
                                                  >
                                                    <Pause className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Pause</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          ) : (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => resumeSearchMutation.mutate(search.searchId)}
                                                    disabled={resumeSearchMutation.isPending}
                                                  >
                                                    <Play className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Resume</TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}

                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-destructive hover:text-destructive"
                                                  onClick={() => {
                                                    if (confirm("Delete this saved search?")) {
                                                      deleteSearchMutation.mutate(search.searchId);
                                                    }
                                                  }}
                                                  disabled={deleteSearchMutation.isPending}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Delete</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Match Activity Tab ──────────────────────────────── */}
            <TabsContent value="matches" className="space-y-4">
              {!selectedSearch ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Home className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Select a saved search from the Clients & Searches tab to view matched listings.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Search info bar */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {selectedSearch.name || `Search ${selectedSearch.searchId}`}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {summarizeCriteria(selectedSearch)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={selectedSearch.active !== false ? "default" : "secondary"}
                          >
                            {selectedSearch.active !== false ? "Active" : "Paused"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSearch(null);
                              setActiveTab("overview");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Matches list */}
                  {matchesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (matchesData?.matches || []).length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No matches found for this search yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(matchesData?.matches || []).map((match) => (
                        <Card key={match.mlsNumber} className="overflow-hidden">
                          {match.photos?.[0] && (
                            <div className="h-40 bg-muted overflow-hidden">
                              <img
                                src={match.photos[0]}
                                alt={match.address || "Listing"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="pt-4">
                            <p className="font-semibold text-lg">{formatPrice(match.listPrice)}</p>
                            <p className="text-sm text-muted-foreground">{match.address || "Address N/A"}</p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              {match.bedrooms != null && (
                                <span className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  {match.bedrooms}
                                </span>
                              )}
                              {match.bathrooms != null && (
                                <span className="flex items-center gap-1">
                                  <Bath className="h-3 w-3" />
                                  {match.bathrooms}
                                </span>
                              )}
                              {match.sqft && (
                                <span>{match.sqft.toLocaleString()} sqft</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {match.status || "Active"}
                              </Badge>
                              {match.viewed && (
                                <Badge variant="secondary" className="text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Viewed
                                </Badge>
                              )}
                              {match.favorited && (
                                <Badge className="bg-red-100 text-red-600 text-xs hover:bg-red-100">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Favorited
                                </Badge>
                              )}
                            </div>
                            {match.matchedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Matched {formatDate(match.matchedAt)}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Messages Tab ────────────────────────────────────── */}
            <TabsContent value="messages" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Client Messages</h3>
                {selectedClient && (
                  <Button size="sm" onClick={() => setShowMessageDialog(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                )}
              </div>

              {/* Client selector for messages */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Label className="whitespace-nowrap">Client:</Label>
                    <Select
                      value={selectedClient?.clientId || ""}
                      onValueChange={(val) => {
                        const client = clients.find((c) => c.clientId === val);
                        setSelectedClient(client || null);
                      }}
                    >
                      <SelectTrigger className="w-[350px]">
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.clientId} value={c.clientId}>
                            {c.fname} {c.lname} ({c.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {!selectedClient ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Select a client to view message history.</p>
                  </CardContent>
                </Card>
              ) : messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (messagesData?.messages || []).length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No messages yet with this client.</p>
                    <Button
                      className="mt-4"
                      onClick={() => setShowMessageDialog(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send First Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(messagesData?.messages || []).map((msg) => (
                    <Card key={msg.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={msg.direction === "outgoing" ? "default" : "secondary"}>
                              {msg.direction === "outgoing" ? "Sent" : "Received"}
                            </Badge>
                            {msg.type && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {msg.type}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="font-medium text-sm">{msg.subject}</p>
                        )}
                        <p className="text-sm mt-1">{msg.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ── Create Client Dialog ─────────────────────────────────────── */}
      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        agentId={currentRepliersAgentId || ""}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/dashboard"] });
        }}
      />

      {/* ── Create Search Dialog ─────────────────────────────────────── */}
      <CreateSearchDialog
        open={showCreateSearch}
        onOpenChange={setShowCreateSearch}
        clients={clients}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-searches/dashboard"] });
        }}
      />

      {/* ── Send Message Dialog ──────────────────────────────────────── */}
      <SendMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        client={selectedClient}
        agentId={currentRepliersAgentId || ""}
        onSend={(data) => sendMessageMutation.mutate(data)}
        isSending={sendMessageMutation.isPending}
      />
    </div>
  );
}

// ── Dialog Components ─────────────────────────────────────────────────────────

function CreateClientDialog({
  open,
  onOpenChange,
  agentId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fname: "", lname: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.fname || !form.lname || !form.email) {
      toast({ title: "First name, last name, and email are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/saved-searches/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, agentId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create client");
      }

      toast({ title: "Client created" });
      setForm({ fname: "", lname: "", email: "", phone: "" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Create a new consumer client linked to this agent in Repliers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.fname} onChange={(e) => setForm({ ...form, fname: e.target.value })} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lname} onChange={(e) => setForm({ ...form, lname: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone (11-digit: 1XXXXXXXXXX)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="1XXXXXXXXXX" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSearchDialog({
  open,
  onOpenChange,
  clients,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: RepliersClient[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    minPrice: "",
    maxPrice: "",
    minBeds: "",
    maxBeds: "",
    minBaths: "",
    maxBaths: "",
    minSqft: "",
    maxSqft: "",
    minYearBuilt: "",
    maxYearBuilt: "",
    cities: "",
    areas: "",
    neighborhoods: "",
    propertyTypes: [] as string[],
    classType: "residential",
    type: "sale",
    notificationFrequency: "instant",
    soldNotifications: false,
    priceChangeNotifications: false,
  });

  const handleSubmit = async () => {
    if (!form.clientId) {
      toast({ title: "Please select a client", variant: "destructive" });
      return;
    }
    if (!form.minPrice || !form.maxPrice) {
      toast({ title: "Price range is required for saved searches", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        clientId: form.clientId,
        name: form.name || undefined,
        minPrice: parseInt(form.minPrice),
        maxPrice: parseInt(form.maxPrice),
        classType: form.classType,
        type: form.type,
        notificationFrequency: form.notificationFrequency,
        soldNotifications: form.soldNotifications,
        priceChangeNotifications: form.priceChangeNotifications,
      };

      if (form.minBeds) body.minBeds = parseInt(form.minBeds);
      if (form.maxBeds) body.maxBeds = parseInt(form.maxBeds);
      if (form.minBaths) body.minBaths = parseInt(form.minBaths);
      if (form.maxBaths) body.maxBaths = parseInt(form.maxBaths);
      if (form.minSqft) body.minSqft = parseInt(form.minSqft);
      if (form.maxSqft) body.maxSqft = parseInt(form.maxSqft);
      if (form.minYearBuilt) body.minYearBuilt = parseInt(form.minYearBuilt);
      if (form.maxYearBuilt) body.maxYearBuilt = parseInt(form.maxYearBuilt);
      if (form.cities) body.cities = form.cities.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.areas) body.areas = form.areas.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.neighborhoods) body.neighborhoods = form.neighborhoods.split(",").map((s) => s.trim()).filter(Boolean);
      if (form.propertyTypes.length) body.propertyTypes = form.propertyTypes;

      const res = await fetch("/api/admin/saved-searches/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details?.message || "Failed to create search");
      }

      toast({ title: "Saved search created" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyTypeOptions = [
    { value: "Detached", label: "Single Family (Detached)" },
    { value: "Townhouse", label: "Townhouse" },
    { value: "Duplex", label: "Duplex" },
    { value: "Triplex", label: "Triplex" },
    { value: "Quadruplex", label: "Quadruplex" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Saved Search</DialogTitle>
          <DialogDescription>
            Set up a new saved search with email alerts for a client. Note: the initial search must return ≤100 results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.clientId} value={c.clientId}>
                      {c.fname} {c.lname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Dream Home Search"
              />
            </div>
          </div>

          <Separator />

          {/* Price Range */}
          <div>
            <Label className="text-sm font-semibold">Price Range *</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Min Price</Label>
                <Input
                  type="number"
                  value={form.minPrice}
                  onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                  placeholder="200000"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Price</Label>
                <Input
                  type="number"
                  value={form.maxPrice}
                  onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                  placeholder="500000"
                />
              </div>
            </div>
          </div>

          {/* Beds / Baths */}
          <div>
            <Label className="text-sm font-semibold">Bedrooms & Bathrooms</Label>
            <div className="grid grid-cols-4 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Min Beds</Label>
                <Input
                  type="number"
                  value={form.minBeds}
                  onChange={(e) => setForm({ ...form, minBeds: e.target.value })}
                  placeholder="2"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Beds</Label>
                <Input
                  type="number"
                  value={form.maxBeds}
                  onChange={(e) => setForm({ ...form, maxBeds: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min Baths</Label>
                <Input
                  type="number"
                  value={form.minBaths}
                  onChange={(e) => setForm({ ...form, minBaths: e.target.value })}
                  placeholder="2"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Baths</Label>
                <Input
                  type="number"
                  value={form.maxBaths}
                  onChange={(e) => setForm({ ...form, maxBaths: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Sqft / Year Built */}
          <div>
            <Label className="text-sm font-semibold">Square Footage & Year Built</Label>
            <div className="grid grid-cols-4 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Min Sqft</Label>
                <Input
                  type="number"
                  value={form.minSqft}
                  onChange={(e) => setForm({ ...form, minSqft: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Sqft</Label>
                <Input
                  type="number"
                  value={form.maxSqft}
                  onChange={(e) => setForm({ ...form, maxSqft: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Min Year</Label>
                <Input
                  type="number"
                  value={form.minYearBuilt}
                  onChange={(e) => setForm({ ...form, minYearBuilt: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Year</Label>
                <Input
                  type="number"
                  value={form.maxYearBuilt}
                  onChange={(e) => setForm({ ...form, maxYearBuilt: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-semibold">Location</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Cities (comma-separated)</Label>
                <Input
                  value={form.cities}
                  onChange={(e) => setForm({ ...form, cities: e.target.value })}
                  placeholder="Austin, Round Rock"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Areas / Counties</Label>
                <Input
                  value={form.areas}
                  onChange={(e) => setForm({ ...form, areas: e.target.value })}
                  placeholder="Travis, Williamson"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Neighborhoods</Label>
                <Input
                  value={form.neighborhoods}
                  onChange={(e) => setForm({ ...form, neighborhoods: e.target.value })}
                  placeholder="Westlake, Barton Hills"
                />
              </div>
            </div>
          </div>

          {/* Property Type & Class */}
          <div>
            <Label className="text-sm font-semibold">Property Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Class</Label>
                <Select value={form.classType} onValueChange={(v) => setForm({ ...form, classType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {propertyTypeOptions.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={form.propertyTypes.includes(opt.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      propertyTypes: prev.propertyTypes.includes(opt.value)
                        ? prev.propertyTypes.filter((v) => v !== opt.value)
                        : [...prev.propertyTypes, opt.value],
                    }));
                  }}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Alert Configuration */}
          <div>
            <Label className="text-sm font-semibold">Alert Configuration</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Notification Frequency</Label>
                <Select
                  value={form.notificationFrequency}
                  onValueChange={(v) => setForm({ ...form, notificationFrequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="sold"
                  checked={form.soldNotifications}
                  onChange={(e) => setForm({ ...form, soldNotifications: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="sold" className="text-sm">Sold notifications</Label>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="priceChange"
                  checked={form.priceChangeNotifications}
                  onChange={(e) => setForm({ ...form, priceChangeNotifications: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="priceChange" className="text-sm">Price change alerts</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendMessageDialog({
  open,
  onOpenChange,
  client,
  agentId,
  onSend,
  isSending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: RepliersClient | null;
  agentId: string;
  onSend: (data: { clientId: string; message: string; subject?: string }) => void;
  isSending: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Message to {client.fname} {client.lname}
          </DialogTitle>
          <DialogDescription>
            Send a message to your client via the Repliers messaging system.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New listings in your area"
            />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I wanted to let you know about some great new listings..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!message.trim()) return;
              onSend({
                clientId: client.clientId,
                message,
                subject: subject || undefined,
              });
              setSubject("");
              setMessage("");
            }}
            disabled={isSending || !message.trim()}
          >
            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
