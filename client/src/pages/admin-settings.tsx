import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Key,
  Check,
  X,
  Loader2,
  Trash2,
  TestTube,
  Eye,
  EyeOff,
  Shield,
  Plug,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password";
  default?: string;
  optional?: boolean;
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
  additionalConfig: Record<string, any> | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  lastTestMessage: string | null;
  updatedAt: string | null;
  fields: IntegrationField[];
  additionalFields: IntegrationField[];
  testEndpoint: boolean;
}

interface IntegrationsResponse {
  integrations: Integration[];
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [additionalValues, setAdditionalValues] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { apiKey };
      if (integration.additionalFields?.length > 0) {
        const additionalConfig: Record<string, any> = {};
        integration.additionalFields.forEach((field) => {
          const val = additionalValues[field.key];
          if (val !== undefined && val !== "") {
            additionalConfig[field.key] = val;
          } else if (field.default) {
            additionalConfig[field.key] = field.default;
          }
        });
        if (Object.keys(additionalConfig).length > 0) {
          body.additionalConfig = additionalConfig;
        }
      }
      const res = await fetch(`/api/admin/integrations/${integration.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      setIsEditing(false);
      setApiKey("");
      setAdditionalValues({});
      toast({ title: "Integration saved", description: `${integration.displayName} API key has been updated.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save integration", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      setIsTesting(true);
      const res = await fetch(`/api/admin/integrations/${integration.name}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Test failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsTesting(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setIsTesting(false);
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/integrations/${integration.name}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations"] });
      toast({ title: "Integration removed", description: `${integration.displayName} configuration has been removed.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = () => {
    if (!integration.configured) {
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Not Configured</Badge>;
    }
    if (integration.lastTestResult === "success") {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">Connected</Badge>;
    }
    if (integration.lastTestResult === "failed") {
      return <Badge variant="destructive">Connection Failed</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100">Untested</Badge>;
  };

  const getStatusIcon = () => {
    if (!integration.configured) return <X className="h-4 w-4 text-muted-foreground" />;
    if (integration.lastTestResult === "success") return <Check className="h-4 w-4 text-green-500" />;
    if (integration.lastTestResult === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Plug className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${
        !integration.configured ? 'bg-muted-foreground/20' : 
        integration.lastTestResult === 'success' ? 'bg-green-500' : 
        integration.lastTestResult === 'failed' ? 'bg-red-500' : 
        'bg-yellow-500'
      }`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center`}>
              <span className="text-white font-bold text-xs">{integration.icon}</span>
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {integration.displayName}
                {getStatusIcon()}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{integration.description}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {integration.configured && !isEditing && (
          <>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <code className="text-sm font-mono flex-1 truncate">{integration.maskedApiKey}</code>
              {integration.updatedAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Updated {new Date(integration.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {integration.additionalConfig && Object.keys(integration.additionalConfig).length > 0 && (
              <div className="text-xs space-y-1 text-muted-foreground">
                {Object.entries(integration.additionalConfig).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="truncate">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {integration.lastTestMessage && (
              <p className={`text-xs ${integration.lastTestResult === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {integration.lastTestMessage}
                {integration.lastTestedAt && (
                  <span className="text-muted-foreground ml-1">
                    — {new Date(integration.lastTestedAt).toLocaleString()}
                  </span>
                )}
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              {integration.testEndpoint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={isTesting || testMutation.isPending}
                >
                  {isTesting || testMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <TestTube className="h-3 w-3 mr-1" />
                  )}
                  Test Connection
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  setApiKey("");
                  // Pre-fill additional values from current config
                  if (integration.additionalConfig) {
                    const values: Record<string, string> = {};
                    Object.entries(integration.additionalConfig).forEach(([k, v]) => {
                      // Don't pre-fill masked values
                      if (typeof v === 'string' && !v.startsWith('•')) {
                        values[k] = v;
                      }
                    });
                    setAdditionalValues(values);
                  }
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Update Key
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {integration.displayName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the API key for {integration.displayName}. The integration will stop working until you add a new key. The app will fall back to environment variables if configured.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {(!integration.configured || isEditing) && (
          <div className="space-y-3">
            {isEditing && (
              <p className="text-xs text-muted-foreground">Enter a new API key to replace the current one.</p>
            )}
            
            {integration.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`${integration.name}-${field.key}`} className="text-sm">{field.label}</Label>
                <div className="relative">
                  <Input
                    id={`${integration.name}-${field.key}`}
                    type={field.type === "password" && !showApiKey ? "password" : "text"}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {integration.additionalFields?.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`${integration.name}-${field.key}`} className="text-sm">
                  {field.label}
                  {field.optional && <span className="text-muted-foreground ml-1">(optional)</span>}
                </Label>
                <Input
                  id={`${integration.name}-${field.key}`}
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={field.default || `Enter ${field.label.toLowerCase()}...`}
                  value={additionalValues[field.key] || ""}
                  onChange={(e) => setAdditionalValues({ ...additionalValues, [field.key]: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!apiKey || saveMutation.isPending}
                size="sm"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                {isEditing ? "Update" : "Save"} API Key
              </Button>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey("");
                    setAdditionalValues({});
                    setShowApiKey(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<IntegrationsResponse>({
    queryKey: ["/api/admin/integrations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/integrations", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied");
        throw new Error("Failed to fetch integrations");
      }
      return res.json();
    },
  });

  // Guard: not admin
  if (!user?.isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  const integrations = data?.integrations || [];
  const configuredCount = integrations.filter((i) => i.configured).length;
  const connectedCount = integrations.filter((i) => i.lastTestResult === "success").length;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-[#EF4923]" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys and integrations for the platform
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Plug className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{integrations.length}</p>
                  <p className="text-xs text-muted-foreground">Available Integrations</p>
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

        <Separator />

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{(error as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Integration Cards */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <IntegrationCard key={integration.name} integration={integration} />
            ))}
          </div>
        )}

        {/* Info Box */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[#EF4923] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Security Note</p>
                <p className="text-muted-foreground">
                  API keys are stored encrypted in the database. Only the last 4 characters are shown in the UI. 
                  Keys configured here take priority over environment variables. If a key is removed, 
                  the system will fall back to environment variables if available.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
