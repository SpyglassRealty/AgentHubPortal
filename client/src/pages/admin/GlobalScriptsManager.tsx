import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Code,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  GripVertical,
  Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

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

interface ScriptsResponse {
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

// ── Custom hooks ───────────────────────────────────────

function useGlobalScripts() {
  const [data, setData] = useState<ScriptsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScripts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/global-scripts', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  return { data, isLoading, error, refetch: fetchScripts };
}

function useScriptTemplates() {
  const [templates, setTemplates] = useState<Record<string, ScriptTemplate>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/admin/global-scripts/templates', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const result: ScriptTemplatesResponse = await response.json();
          setTemplates(result.templates);
        }
      } catch (error) {
        console.error('Failed to fetch script templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return { templates, isLoading };
}

// ── Script Type Icons ──────────────────────────────────

function ScriptTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'google_analytics':
      return <div className="w-4 h-4 bg-orange-500 rounded text-xs text-white flex items-center justify-center font-bold">GA</div>;
    case 'google_tag_manager':
      return <div className="w-4 h-4 bg-blue-500 rounded text-xs text-white flex items-center justify-center font-bold">GTM</div>;
    case 'meta_pixel':
      return <div className="w-4 h-4 bg-blue-600 rounded text-xs text-white flex items-center justify-center font-bold">FB</div>;
    case 'microsoft_clarity':
      return <div className="w-4 h-4 bg-purple-500 rounded text-xs text-white flex items-center justify-center font-bold">MC</div>;
    case 'custom':
      return <Code className="w-4 h-4 text-gray-500" />;
    default:
      return <Code className="w-4 h-4 text-gray-500" />;
  }
}

// ── Template Selector Dialog ───────────────────────────

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateKey: string, configuration: Record<string, any>) => void;
  templates: Record<string, ScriptTemplate>;
}

function TemplateDialog({ isOpen, onClose, onSelect, templates }: TemplateDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [configuration, setConfiguration] = useState<Record<string, string>>({});

  const template = selectedTemplate ? templates[selectedTemplate] : null;

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('');
      setConfiguration({});
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate, configuration);
      onClose();
    }
  };

  const getConfigFields = (templateKey: string) => {
    switch (templateKey) {
      case 'google_analytics':
        return [{ key: 'GA4_ID', label: 'GA4 Measurement ID', placeholder: 'G-XXXXXXXXXX' }];
      case 'google_tag_manager':
        return [{ key: 'GTM_ID', label: 'GTM Container ID', placeholder: 'GTM-XXXXXXX' }];
      case 'meta_pixel':
        return [{ key: 'PIXEL_ID', label: 'Meta Pixel ID', placeholder: '123456789012345' }];
      case 'microsoft_clarity':
        return [{ key: 'CLARITY_ID', label: 'Clarity Project ID', placeholder: 'abcdefghij' }];
      default:
        return [];
    }
  };

  const configFields = selectedTemplate ? getConfigFields(selectedTemplate) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Script from Template</DialogTitle>
          <DialogDescription>
            Choose a pre-built script template and configure it with your tracking IDs.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Script Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <ScriptTypeIcon type={key} />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <div className="space-y-3">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>

              {configFields.map(field => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  <Input
                    value={configuration[field.key] || ''}
                    onChange={(e) => setConfiguration(prev => ({ 
                      ...prev, 
                      [field.key]: e.target.value 
                    }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div>
                <Label>Preview</Label>
                <Textarea
                  value={template.content}
                  readOnly
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedTemplate || (configFields.length > 0 && configFields.some(f => !configuration[f.key]))}
          >
            Add Script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Script Form Dialog ─────────────────────────────────

interface ScriptFormDialogProps {
  script?: GlobalScript;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ScriptFormDialog({ script, isOpen, onClose, onSuccess }: ScriptFormDialogProps) {
  const [formData, setFormData] = useState({
    name: script?.name || '',
    scriptType: script?.scriptType || 'custom' as GlobalScript['scriptType'],
    position: script?.position || 'head' as 'head' | 'body',
    scriptContent: script?.scriptContent || '',
    description: script?.description || '',
    priority: script?.priority || 0,
    isEnabled: script?.isEnabled ?? false, // Start disabled for safety
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && script) {
      setFormData({
        name: script.name,
        scriptType: script.scriptType,
        position: script.position,
        scriptContent: script.scriptContent,
        description: script.description || '',
        priority: script.priority,
        isEnabled: script.isEnabled,
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        scriptType: 'custom',
        position: 'head',
        scriptContent: '',
        description: '',
        priority: 0,
        isEnabled: false,
      });
    }
    setError(null);
  }, [isOpen, script]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = script 
        ? `/api/admin/global-scripts/${script.id}`
        : '/api/admin/global-scripts';
      
      const method = script ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save script');
      }

      toast({
        title: script ? 'Script Updated' : 'Script Created',
        description: formData.name,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{script ? 'Edit Script' : 'Create Custom Script'}</DialogTitle>
          <DialogDescription>
            {script 
              ? 'Update the script settings.' 
              : 'Create a custom tracking script or code snippet.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Script Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom Script"
                required
              />
            </div>

            <div>
              <Label htmlFor="scriptType">Script Type</Label>
              <Select 
                value={formData.scriptType} 
                onValueChange={(value: GlobalScript['scriptType']) => setFormData(prev => ({ ...prev, scriptType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Script</SelectItem>
                  <SelectItem value="google_analytics">Google Analytics</SelectItem>
                  <SelectItem value="google_tag_manager">Google Tag Manager</SelectItem>
                  <SelectItem value="meta_pixel">Meta Pixel</SelectItem>
                  <SelectItem value="microsoft_clarity">Microsoft Clarity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Select 
                value={formData.position} 
                onValueChange={(value: 'head' | 'body') => setFormData(prev => ({ ...prev, position: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="head">Head Section</SelectItem>
                  <SelectItem value="body">Body Section</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher numbers load first
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What does this script do?"
            />
          </div>

          <div>
            <Label htmlFor="scriptContent">Script Content *</Label>
            <Textarea
              id="scriptContent"
              value={formData.scriptContent}
              onChange={(e) => setFormData(prev => ({ ...prev, scriptContent: e.target.value }))}
              placeholder="<script>
// Your script content here
console.log('Hello, world!');
</script>"
              rows={8}
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include the full script tags (&lt;script&gt;...&lt;/script&gt;)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="isEnabled"
              type="checkbox"
              checked={formData.isEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="isEnabled">Enabled</Label>
            <p className="text-xs text-muted-foreground">
              Only enabled scripts will be included on the website
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {script ? 'Update' : 'Create'} Script
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────

export default function GlobalScriptsManager() {
  const [, setLocation] = useLocation();
  const [selectedScript, setSelectedScript] = useState<GlobalScript | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useGlobalScripts();
  const { templates } = useScriptTemplates();

  // ── Actions ────────────────────────────────────────

  const handleToggleEnabled = async (script: GlobalScript) => {
    try {
      const response = await fetch(`/api/admin/global-scripts/${script.id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle script');
      }

      toast({
        title: script.isEnabled ? 'Script Disabled' : 'Script Enabled',
        description: script.name,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (script: GlobalScript) => {
    if (!confirm(`Are you sure you want to delete "${script.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/global-scripts/${script.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete script');
      }

      toast({
        title: 'Script Deleted',
        description: script.name,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete script',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFromTemplate = async (templateKey: string, configuration: Record<string, any>) => {
    try {
      const response = await fetch('/api/admin/global-scripts/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateKey, configuration }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create script from template');
      }

      toast({
        title: 'Script Created',
        description: `Created from ${templateKey} template`,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create script',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setSelectedScript(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (script: GlobalScript) => {
    setSelectedScript(script);
    setIsFormOpen(true);
  };

  // ── Render ─────────────────────────────────────────

  const scripts = data?.scripts || [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Global Scripts</h1>
            <p className="text-sm text-muted-foreground">
              Manage tracking scripts and custom code injection
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              From Template
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Custom Script
            </Button>
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">Error loading scripts</p>
                <p className="text-sm">{error}</p>
                <Button variant="outline" className="mt-4" onClick={refetch}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {scripts.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Code className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-lg font-medium">No scripts configured</p>
                    <p className="text-sm">Add tracking scripts to get started</p>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => setIsTemplateOpen(true)}>
                        <Zap className="h-4 w-4 mr-2" />
                        From Template
                      </Button>
                      <Button variant="outline" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Custom Script
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              scripts.map((script) => (
                <Card key={script.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <ScriptTypeIcon type={script.scriptType} />
                        <div>
                          <CardTitle className="text-base">{script.name}</CardTitle>
                          {script.description && (
                            <p className="text-sm text-muted-foreground">{script.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{script.position}</Badge>
                        <Badge variant="outline">Priority: {script.priority}</Badge>
                        <Badge 
                          variant={script.isEnabled ? "default" : "secondary"}
                          className={script.isEnabled ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                        >
                          {script.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEnabled(script)}
                          >
                            {script.isEnabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(script)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(script)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded p-3">
                      <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                        {script.scriptContent.substring(0, 300)}
                        {script.scriptContent.length > 300 && '...'}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Template Dialog ──────────────────────── */}
        <TemplateDialog
          isOpen={isTemplateOpen}
          onClose={() => setIsTemplateOpen(false)}
          onSelect={handleCreateFromTemplate}
          templates={templates}
        />

        {/* ── Script Form Dialog ───────────────────── */}
        <ScriptFormDialog
          script={selectedScript}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={refetch}
        />
      </div>
    </Layout>
  );
}