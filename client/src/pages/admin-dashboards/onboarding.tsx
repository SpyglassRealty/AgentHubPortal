import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  FileText,
  Activity,
  BarChart3,
  Pause,
  Play,
  RefreshCw,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  assignee: string;
  autoCheck: boolean;
  dueOffset: number;
}

interface OnboardingPhase {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
}

interface OnboardingTemplate {
  id: number;
  name: string;
  description: string;
  office: string;
  agentType: string;
  phases: OnboardingPhase[];
  welcomeSequence: any[];
  isActive: boolean;
}

interface ChecklistStepState {
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
}

interface AgentOnboarding {
  id: number;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  office: string;
  licenseNumber: string | null;
  startDate: string | null;
  templateId: number | null;
  templateName?: string;
  status: string;
  checklistState: Record<string, Record<string, ChecklistStepState>>;
  progressPct: number;
  completedAt: string | null;
  createdBy: string;
  recruitingSource: string | null;
  notes: string | null;
  metadata: any;
  template?: OnboardingTemplate;
  activity?: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

interface ActivityEntry {
  id: number;
  onboardingId: number;
  action: string;
  phaseId: string | null;
  stepId: string | null;
  performedBy: string;
  details: any;
  createdAt: string;
}

interface Analytics {
  statusCounts: Record<string, number>;
  officeCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  averageProgress: number;
  recentlyCompleted: AgentOnboarding[];
  onboardedThisYear: number;
}

// ── API Helpers ────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "API Error");
  }
  return res.json();
}

// ── Status Badge ───────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-200" },
    completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
    paused: { label: "Paused", className: "bg-gray-100 text-gray-800 border-gray-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const v = variants[status] || variants.pending;
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

// ── New Onboarding Dialog ──────────────────────────────

function NewOnboardingDialog({ templates, onCreated }: { templates: OnboardingTemplate[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    agentName: "",
    agentEmail: "",
    agentPhone: "",
    office: "austin",
    licenseNumber: "",
    startDate: "",
    templateId: "",
    recruitingSource: "",
    notes: "",
  });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/onboarding", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          templateId: form.templateId ? parseInt(form.templateId) : null,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Onboarding started!", description: `${form.agentName} has been added to the pipeline.` });
      setOpen(false);
      setForm({ agentName: "", agentEmail: "", agentPhone: "", office: "austin", licenseNumber: "", startDate: "", templateId: "", recruitingSource: "", notes: "" });
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Auto-select template based on office
  useEffect(() => {
    if (form.office && templates.length > 0) {
      const match = templates.find(
        (t) => t.isActive && (t.office === form.office || t.office === "all")
      );
      if (match) {
        setForm((prev) => ({ ...prev, templateId: String(match.id) }));
      }
    }
  }, [form.office, templates]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Start New Onboarding
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Agent Onboarding</DialogTitle>
          <DialogDescription>Add a new agent to the onboarding pipeline</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Agent Name *</Label>
              <Input
                placeholder="Jane Smith"
                value={form.agentName}
                onChange={(e) => setForm({ ...form, agentName: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="jane@email.com"
                value={form.agentEmail}
                onChange={(e) => setForm({ ...form, agentEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="(512) 555-0123"
                value={form.agentPhone}
                onChange={(e) => setForm({ ...form, agentPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>Office</Label>
              <Select value={form.office} onValueChange={(v) => setForm({ ...form, office: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="austin">Austin</SelectItem>
                  <SelectItem value="houston">Houston</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>License #</Label>
              <Input
                placeholder="TX-12345678"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template</Label>
              <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.isActive).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recruiting Source</Label>
              <Select value={form.recruitingSource} onValueChange={(v) => setForm({ ...form, recruitingSource: v })}>
                <SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beacon">Beacon (Recruiting Platform)</SelectItem>
                  <SelectItem value="referral">Agent Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="event">Event / Meetup</SelectItem>
                  <SelectItem value="walk-in">Walk-in / Cold Outreach</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Any additional context about this agent..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.agentName || !form.agentEmail || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Start Onboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Onboarding Detail View ─────────────────────────────

function OnboardingDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");

  const { data: onboarding, isLoading } = useQuery<AgentOnboarding>({
    queryKey: ["onboarding", id],
    queryFn: () => apiFetch(`/api/admin/onboarding/${id}`),
  });

  const toggleStep = useMutation({
    mutationFn: ({ phaseId, stepId, completed }: { phaseId: string; stepId: string; completed: boolean }) =>
      apiFetch(`/api/admin/onboarding/${id}/step`, {
        method: "PATCH",
        body: JSON.stringify({ phaseId, stepId, completed }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", id] });
      queryClient.invalidateQueries({ queryKey: ["onboardings"] });
    },
  });

  const addNote = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/onboarding/${id}/note`, {
        method: "POST",
        body: JSON.stringify({ note: noteText }),
      }),
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["onboarding", id] });
      toast({ title: "Note added" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/api/admin/onboarding/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", id] });
      queryClient.invalidateQueries({ queryKey: ["onboardings"] });
    },
  });

  if (isLoading || !onboarding) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const phases = (onboarding.template?.phases || []) as OnboardingPhase[];
  const checklistState = onboarding.checklistState || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{onboarding.agentName}</h2>
            <StatusBadge status={onboarding.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {onboarding.agentEmail}
            {onboarding.agentPhone && ` • ${onboarding.agentPhone}`}
            {onboarding.office && ` • ${onboarding.office.charAt(0).toUpperCase() + onboarding.office.slice(1)} office`}
          </p>
        </div>
        <div className="flex gap-2">
          {onboarding.status === "in_progress" && (
            <Button variant="outline" size="sm" onClick={() => updateStatus.mutate("paused")}>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </Button>
          )}
          {onboarding.status === "paused" && (
            <Button variant="outline" size="sm" onClick={() => updateStatus.mutate("in_progress")}>
              <Play className="h-4 w-4 mr-1" /> Resume
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{onboarding.progressPct}%</span>
          </div>
          <Progress value={onboarding.progressPct} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {phases.map((phase) => {
              const phaseState = checklistState[phase.id] || {};
              const total = phase.steps?.length || 0;
              const done = Object.values(phaseState).filter((s: any) => s.completed).length;
              return (
                <span key={phase.id}>
                  {phase.name}: {done}/{total}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Office:</span>
              <span className="font-medium capitalize">{onboarding.office}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Start:</span>
              <span className="font-medium">
                {onboarding.startDate ? new Date(onboarding.startDate).toLocaleDateString() : "TBD"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">License:</span>
              <span className="font-medium">{onboarding.licenseNumber || "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium capitalize">{onboarding.recruitingSource || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Phases */}
      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseState = checklistState[phase.id] || {};
          const total = phase.steps?.length || 0;
          const done = Object.values(phaseState).filter((s: any) => s.completed).length;
          const isPhaseComplete = total > 0 && done === total;

          return (
            <Card key={phase.id} className={isPhaseComplete ? "border-green-200 bg-green-50/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPhaseComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                    <CardTitle className="text-lg">{phase.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">{done}/{total}</Badge>
                </div>
                {phase.description && (
                  <CardDescription>{phase.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(phase.steps || []).map((step) => {
                    const stepState = phaseState[step.id] || { completed: false };
                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          stepState.completed
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200 hover:border-blue-200"
                        }`}
                      >
                        <Checkbox
                          checked={stepState.completed}
                          onCheckedChange={(checked) =>
                            toggleStep.mutate({
                              phaseId: phase.id,
                              stepId: step.id,
                              completed: !!checked,
                            })
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${stepState.completed ? "line-through text-muted-foreground" : ""}`}>
                              {step.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {step.assignee === "admin" ? "Admin" : step.assignee === "system" ? "Auto" : "Agent"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          {stepState.completed && stepState.completedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Completed {new Date(stepState.completedAt).toLocaleString()} by {stepState.completedBy || "admin"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes + Activity */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Add Note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboarding.notes && (
              <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted rounded">{onboarding.notes}</p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && noteText && addNote.mutate()}
              />
              <Button size="sm" onClick={() => addNote.mutate()} disabled={!noteText || addNote.isPending}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(onboarding.activity || []).slice(0, 15).map((act) => (
                <div key={act.id} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span>
                    {act.action === "created" && "🆕 Onboarding created"}
                    {act.action === "step_completed" && `✅ Completed: ${act.stepId}`}
                    {act.action === "step_unchecked" && `↩️ Unchecked: ${act.stepId}`}
                    {act.action === "status_changed" && `📋 Status → ${act.details?.newStatus}`}
                    {act.action === "note_added" && `💬 ${act.details?.note}`}
                    {act.action === "email_sent" && `📧 Email sent`}
                    <span className="text-muted-foreground ml-1">by {act.performedBy}</span>
                  </span>
                </div>
              ))}
              {(!onboarding.activity || onboarding.activity.length === 0) && (
                <p className="text-xs text-muted-foreground">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function OnboardingPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: onboardings = [], isLoading } = useQuery<AgentOnboarding[]>({
    queryKey: ["onboardings", statusFilter, officeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (officeFilter !== "all") params.set("office", officeFilter);
      return apiFetch(`/api/admin/onboarding?${params}`);
    },
  });

  const { data: templates = [] } = useQuery<OnboardingTemplate[]>({
    queryKey: ["onboarding-templates"],
    queryFn: () => apiFetch("/api/admin/onboarding/templates"),
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["onboarding-analytics"],
    queryFn: () => apiFetch("/api/admin/onboarding/analytics"),
  });

  const filtered = onboardings.filter((o) =>
    o.agentName.toLowerCase().includes(search.toLowerCase()) ||
    o.agentEmail.toLowerCase().includes(search.toLowerCase())
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["onboardings"] });
    queryClient.invalidateQueries({ queryKey: ["onboarding-analytics"] });
  }, [queryClient]);

  // Detail view
  if (selectedId !== null) {
    return (
      <DashboardLayout title="Agent Onboarding">
        <OnboardingDetail id={selectedId} onBack={() => setSelectedId(null)} />
      </DashboardLayout>
    );
  }

  const inProgress = (analytics?.statusCounts?.in_progress || 0) + (analytics?.statusCounts?.pending || 0);
  const completed = analytics?.statusCounts?.completed || 0;
  const thisYear = analytics?.onboardedThisYear || 0;
  const avgProgress = analytics?.averageProgress || 0;

  return (
    <DashboardLayout title="Agent Onboarding">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Onboarding</h1>
            <p className="text-muted-foreground">Track and manage new agent onboarding for Spyglass Realty</p>
          </div>
          <NewOnboardingDialog templates={templates} onCreated={invalidateAll} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold">{inProgress}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">{completed}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Onboarded 2026</p>
                  <p className="text-3xl font-bold">{thisYear}</p>
                  <p className="text-xs text-muted-foreground">Goal: 121 new agents</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Progress</p>
                  <p className="text-3xl font-bold">{avgProgress}%</p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={officeFilter} onValueChange={setOfficeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Office" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offices</SelectItem>
              <SelectItem value="austin">Austin</SelectItem>
              <SelectItem value="houston">Houston</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Onboarding List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No onboardings yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start onboarding new agents to track their progress
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <Card
                key={o.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedId(o.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{o.agentName}</span>
                        <StatusBadge status={o.status} />
                        <Badge variant="outline" className="text-xs capitalize">{o.office}</Badge>
                        {o.recruitingSource && (
                          <Badge variant="secondary" className="text-xs capitalize">{o.recruitingSource}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {o.agentEmail}
                        {o.startDate && ` • Start: ${new Date(o.startDate).toLocaleDateString()}`}
                        {o.templateName && ` • ${o.templateName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{o.progressPct}%</span>
                        </div>
                        <Progress value={o.progressPct} className="h-2" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
