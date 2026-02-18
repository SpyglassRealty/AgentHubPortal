import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Code,
  Eye,
  EyeOff,
  Loader2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Copy,
  AlertTriangle,
} from "lucide-react";

interface GlobalScript {
  id: string;
  name: string;
  scriptType: 'google_analytics' | 'google_tag_manager' | 'meta_pixel' | 'microsoft_clarity' | 'custom';
  position: 'head' | 'body';
  scriptContent: string;
  isEnabled: boolean;
  priority: number;
  description?: string;
  configuration?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface GlobalScriptsResponse {
  scripts: GlobalScript[];
}

interface ScriptTemplate {
  name: string;
  content: string;
  position: 'head' | 'body';
  description: string;
}

interface ScriptTemplatesResponse {
  templates: Record<string, ScriptTemplate>;
}

interface CreateScriptData {
  name: string;
  scriptType: 'google_analytics' | 'google_tag_manager' | 'meta_pixel' | 'microsoft_clarity' | 'custom';
  position: 'head' | 'body';
  scriptContent: string;
  isEnabled: boolean;
  priority: number;
  description?: string;
  configuration?: Record<string, any>;
}

const SCRIPT_TYPE_COLORS = {
  google_analytics: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  google_tag_manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  meta_pixel: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  microsoft_clarity: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function GlobalScriptsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────
  const [filter, setFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateConfig, setTemplateConfig] = useState<Record<string, string>>({});
  const [editingScript, setEditingScript] = useState<GlobalScript | null>(null);
  const [formData, setFormData] = useState<CreateScriptData>({
    name: "",
    scriptType: "custom",
    position: "head",
    scriptContent: "",
    isEnabled: false,
    priority: 0,
    description: "",
    configuration: {},
  });

  // ── Queries ──────────────────────────────────────────
  const { data: scriptsData, isLoading: scriptsLoading, error: scriptsError } = useQuery<GlobalScriptsResponse>({
    queryKey: ["/api/admin/global-scripts", filter, positionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("filter", filter);
      if (positionFilter !== "all") params.append("position", positionFilter);

      const res = await fetch(`/api/admin/global-scripts?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
    retry: 1,
  });

  const { data: templatesData } = useQuery<ScriptTemplatesResponse>({
    queryKey: ["/api/admin/global-scripts/templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/global-scripts/templates", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: isTemplateMode,
  });

  const scripts = scriptsData?.scripts || [];
  const templates = templatesData?.templates || {};

  // ── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateScriptData) => {
      const res = await fetch("/api/admin/global-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create script");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script created successfully" });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating script",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateKey, configuration }: { templateKey: string; configuration: Record<string, string> }) => {
      const res = await fetch("/api/admin/global-scripts/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateKey, configuration }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create script from template");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script created from template successfully" });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating script from template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateScriptData> }) => {
      const res = await fetch(`/api/admin/global-scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update script");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script updated successfully" });
      setEditingScript(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating script",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/global-scripts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete script");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting script",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/global-scripts/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to toggle script");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling script",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (scriptIds: string[]) => {
      const res = await fetch("/api/admin/global-scripts/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scriptIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reorder scripts");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Script order updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-scripts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error reordering scripts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Handlers ─────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      name: "",
      scriptType: "custom",
      position: "head",
      scriptContent: "",
      isEnabled: false,
      priority: 0,
      description: "",
      configuration: {},
    });
    setIsTemplateMode(false);
    setSelectedTemplate("");
    setTemplateConfig({});
  };

  const handleCreate = () => {
    if (isTemplateMode && selectedTemplate) {
      createFromTemplateMutation.mutate({
        templateKey: selectedTemplate,
        configuration: templateConfig,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (script: GlobalScript) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      scriptType: script.scriptType,
      position: script.position,
      scriptContent: script.scriptContent,
      isEnabled: script.isEnabled,
      priority: script.priority,
      description: script.description || "",
      configuration: script.configuration || {},
    });
    setIsTemplateMode(false);
  };

  const handleUpdate = () => {
    if (!editingScript) return;
    updateMutation.mutate({
      id: editingScript.id,
      data: formData,
    });
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = templates[templateKey];
    if (template) {
      // Extract configuration keys from template content ({{KEY}} placeholders)
      const configKeys = template.content.match(/\{\{([^}]+)\}\}/g);
      const config: Record<string, string> = {};
      if (configKeys) {
        configKeys.forEach(key => {
          const cleanKey = key.replace(/[{}]/g, '');
          config[cleanKey] = '';
        });
      }
      setTemplateConfig(config);
    }
  };

  const moveScript = (scriptId: string, direction: 'up' | 'down') => {
    const currentIndex = scripts.findIndex(s => s.id === scriptId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= scripts.length) return;

    const reorderedScripts = [...scripts];
    [reorderedScripts[currentIndex], reorderedScripts[newIndex]] = [reorderedScripts[newIndex], reorderedScripts[currentIndex]];
    
    reorderMutation.mutate(reorderedScripts.map(s => s.id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTemplateConfigForm = () => {
    const configKeys = Object.keys(templateConfig);
    if (configKeys.length === 0) return null;

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">Template Configuration</Label>
        {configKeys.map(key => (
          <div key={key}>
            <Label htmlFor={key} className="text-xs">{key.replace(/_/g, ' ')}</Label>
            <Input
              id={key}
              placeholder={`Enter ${key.toLowerCase()}`}
              value={templateConfig[key] || ''}
              onChange={(e) => setTemplateConfig(prev => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    );
  };

  if (scriptsError) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Global Scripts</h1>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Unable to load Global Scripts</p>
                  <p className="text-sm text-red-700 mt-1">
                    The global_scripts table may need to be created. Run the migration: <code className="bg-red-100 px-1 rounded">0003_cms_enhancement_phase1.sql</code>
                  </p>
                  <p className="text-xs text-red-600 mt-2">Error: {(scriptsError as Error).message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Global Scripts</h1>
              <p className="text-sm text-muted-foreground">
                Manage tracking scripts and custom code for the website
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Script
          </Button>
        </div>

        {/* ── Warning Banner ────────────────────────── */}
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Global scripts affect all website pages
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Test scripts carefully before enabling. Scripts load in priority order (higher numbers load first).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Filters ───────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scripts</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="head">Head</SelectItem>
                  <SelectItem value="body">Body</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Scripts Table ─────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {scriptsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Code className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">No scripts found</p>
                <p className="text-sm">Create your first global script to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Script</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scripts.map((script, index) => (
                    <TableRow key={script.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{script.name}</p>
                          {script.description && (
                            <p className="text-sm text-muted-foreground">{script.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={SCRIPT_TYPE_COLORS[script.scriptType]}>
                          {script.scriptType.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {script.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{script.priority}</span>
                          <div className="flex flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => moveScript(script.id, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => moveScript(script.id, 'down')}
                              disabled={index === scripts.length - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {script.isEnabled ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Eye className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(script.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(script.scriptContent)}
                            className="h-8 w-8 p-0"
                            title="Copy script"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(script)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleMutation.mutate(script.id)}>
                                {script.isEnabled ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMutation.mutate(script.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Create/Edit Dialog ────────────────────── */}
        <Dialog 
          open={isCreateOpen || !!editingScript} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingScript(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScript ? "Edit Script" : "Add Global Script"}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={isTemplateMode ? "template" : "manual"} onValueChange={(value) => setIsTemplateMode(value === "template")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="template">
                  <Sparkles className="h-4 w-4 mr-2" />
                  From Template
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Code className="h-4 w-4 mr-2" />
                  Custom Script
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4">
                <div>
                  <Label>Script Template</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a script template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && templates[selectedTemplate] && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {templates[selectedTemplate].description}
                    </p>
                  )}
                </div>

                {getTemplateConfigForm()}

                {selectedTemplate && templates[selectedTemplate] && (
                  <div>
                    <Label>Preview</Label>
                    <Textarea
                      value={templates[selectedTemplate].content}
                      readOnly
                      rows={8}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Script Name *</Label>
                    <Input
                      id="name"
                      placeholder="Google Analytics"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scriptType">Script Type</Label>
                    <Select 
                      value={formData.scriptType} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, scriptType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_analytics">Google Analytics</SelectItem>
                        <SelectItem value="google_tag_manager">Google Tag Manager</SelectItem>
                        <SelectItem value="meta_pixel">Meta Pixel</SelectItem>
                        <SelectItem value="microsoft_clarity">Microsoft Clarity</SelectItem>
                        <SelectItem value="custom">Custom Script</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select 
                      value={formData.position} 
                      onValueChange={(value: "head" | "body") => setFormData(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head">Head</SelectItem>
                        <SelectItem value="body">Body</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      placeholder="0"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                    />
                    <Label htmlFor="isEnabled">Enabled</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this script..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="scriptContent">Script Code *</Label>
                  <Textarea
                    id="scriptContent"
                    placeholder="<script>...</script>"
                    value={formData.scriptContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, scriptContent: e.target.value }))}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingScript(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingScript ? handleUpdate : handleCreate}
                disabled={
                  editingScript 
                    ? !formData.name || !formData.scriptContent || updateMutation.isPending
                    : isTemplateMode 
                      ? !selectedTemplate || Object.values(templateConfig).some(v => !v) || createFromTemplateMutation.isPending
                      : !formData.name || !formData.scriptContent || createMutation.isPending
                }
              >
                {createMutation.isPending || createFromTemplateMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingScript ? "Update Script" : "Create Script"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
