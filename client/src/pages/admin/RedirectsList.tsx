import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  ExternalLink,
  Copy,
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";

interface Redirect {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  redirectType: "301" | "302";
  description?: string;
  isActive: boolean;
  hitCount: number;
  lastAccessed?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface RedirectsResponse {
  redirects: Redirect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateRedirectData {
  sourceUrl: string;
  destinationUrl: string;
  redirectType: "301" | "302";
  description?: string;
  isActive: boolean;
}

// ── Bulk Upload Dialog Component ─────────────────────────────────
interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkUploadDialog({ isOpen, onClose, onSuccess }: BulkUploadDialogProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'sheets'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [range, setRange] = useState('A:B');
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setGoogleSheetsUrl('');
      setSheetName('Sheet1');
      setRange('A:B');
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  const handleFileUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/redirects/bulk-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      setResults(result);
      
      toast({
        title: 'Bulk Upload Complete',
        description: `${result.results.created} redirects created, ${result.results.skipped} skipped`,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl) return;
    setIsUploading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/admin/redirects/google-sheets-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetUrl: googleSheetsUrl,
          sheetName,
          range,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();
      setResults(result);
      
      toast({
        title: 'Google Sheets Import Complete',
        description: `${result.results.created} redirects created, ${result.results.skipped} skipped`,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "old,new\n/old-page,/new-page\n/another-old-page,https://external-site.com/page";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redirect-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Redirects</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={uploadMethod === 'file' ? 'default' : 'outline'}
              onClick={() => setUploadMethod('file')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              File Upload
            </Button>
            <Button
              type="button"
              variant={uploadMethod === 'sheets' ? 'default' : 'outline'}
              onClick={() => setUploadMethod('sheets')}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Google Sheets
            </Button>
          </div>

          {uploadMethod === 'file' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">CSV or Excel File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts CSV, XLSX, or XLS files. Must have 'old' and 'new' columns.
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded text-sm">
                <p className="font-medium mb-2">Expected Format:</p>
                <div className="font-mono bg-background p-2 rounded border">
                  old,new<br />
                  /old-page,/new-page<br />
                  /another-old-page,https://external-site.com/page
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={downloadTemplate}
                  className="h-auto p-0 mt-2"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Template
                </Button>
              </div>

              <Button
                onClick={handleFileUpload}
                disabled={!file || isUploading}
                className="w-full"
              >
                {isUploading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />}
                Upload Redirects
              </Button>
            </div>
          )}

          {uploadMethod === 'sheets' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sheetsUrl">Google Sheets URL</Label>
                <Input
                  id="sheetsUrl"
                  value={googleSheetsUrl}
                  onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the sheet is publicly viewable or shared with view access
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sheetName">Sheet Name</Label>
                  <Input
                    id="sheetName"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label htmlFor="range">Range</Label>
                  <Input
                    id="range"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    placeholder="A:B"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded text-sm">
                <p className="font-medium mb-2">Required Columns:</p>
                <ul className="space-y-1">
                  <li>• <strong>old</strong> - Source URL (must start with /)</li>
                  <li>• <strong>new</strong> - Destination URL</li>
                </ul>
              </div>

              <Button
                onClick={handleGoogleSheetsImport}
                disabled={!googleSheetsUrl || isUploading}
                className="w-full"
              >
                {isUploading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />}
                Import from Google Sheets
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
              <ExternalLink className="h-4 w-4" />
              {error}
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  Upload Complete
                </h4>
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <p>✅ {results.results.created} redirects created</p>
                  <p>⏭️ {results.results.skipped} rows skipped</p>
                  <p>📝 {results.results.total} total rows processed</p>
                </div>
              </div>

              {results.results.errors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    Issues Found ({results.results.errors.length})
                  </h4>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200 max-h-32 overflow-y-auto">
                    {results.results.errors.map((error: string, i: number) => (
                      <p key={i}>• {error}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RedirectsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [formData, setFormData] = useState<CreateRedirectData>({
    sourceUrl: "",
    destinationUrl: "",
    redirectType: "301",
    description: "",
    isActive: true,
  });
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // ── Query ────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery<RedirectsResponse>({
    queryKey: ["/api/admin/redirects", search, filter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (search) params.append("search", search);
      if (filter !== "all") params.append("filter", filter);

      const res = await fetch(`/api/admin/redirects?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch redirects");
      return res.json();
    },
  });

  const redirects = data?.redirects || [];
  const pagination = data?.pagination;

  // ── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateRedirectData) => {
      const res = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create redirect");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Redirect created successfully" });
      setIsCreateOpen(false);
      setFormData({
        sourceUrl: "",
        destinationUrl: "",
        redirectType: "301",
        description: "",
        isActive: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redirects"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating redirect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateRedirectData> }) => {
      const res = await fetch(`/api/admin/redirects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update redirect");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Redirect updated successfully" });
      setEditingRedirect(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redirects"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating redirect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/redirects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete redirect");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Redirect deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redirects"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting redirect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/redirects/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to toggle redirect");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Redirect status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redirects"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling redirect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Handlers ─────────────────────────────────────────
  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (redirect: Redirect) => {
    setEditingRedirect(redirect);
    setFormData({
      sourceUrl: redirect.sourceUrl,
      destinationUrl: redirect.destinationUrl,
      redirectType: redirect.redirectType,
      description: redirect.description || "",
      isActive: redirect.isActive,
    });
  };

  const handleUpdate = () => {
    if (!editingRedirect) return;
    updateMutation.mutate({
      id: editingRedirect.id,
      data: formData,
    });
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

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Redirects Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage URL redirects for the website
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Redirect
            </Button>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search redirects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ─────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : redirects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ExternalLink className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">No redirects found</p>
                <p className="text-sm">Create your first redirect to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source URL</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects.map((redirect) => (
                    <TableRow key={redirect.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {redirect.sourceUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(redirect.sourceUrl)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <a
                            href={redirect.destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline max-w-[200px] truncate"
                          >
                            {redirect.destinationUrl}
                          </a>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {redirect.redirectType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {redirect.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <Eye className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {redirect.hitCount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(redirect.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(redirect)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleMutation.mutate(redirect.id)}>
                              {redirect.isActive ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteMutation.mutate(redirect.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total.toLocaleString()} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Create/Edit Dialog ────────────────────── */}
        <Dialog 
          open={isCreateOpen || !!editingRedirect} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingRedirect(null);
              setFormData({
                sourceUrl: "",
                destinationUrl: "",
                redirectType: "301",
                description: "",
                isActive: true,
              });
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRedirect ? "Edit Redirect" : "Create New Redirect"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sourceUrl">Source URL *</Label>
                  <Input
                    id="sourceUrl"
                    placeholder="/old-page"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must start with /
                  </p>
                </div>
                <div>
                  <Label htmlFor="redirectType">Redirect Type</Label>
                  <Select 
                    value={formData.redirectType} 
                    onValueChange={(value: "301" | "302") => 
                      setFormData(prev => ({ ...prev, redirectType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="301">301 - Permanent</SelectItem>
                      <SelectItem value="302">302 - Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="destinationUrl">Destination URL *</Label>
                <Input
                  id="destinationUrl"
                  placeholder="https://example.com/new-page"
                  value={formData.destinationUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationUrl: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description for this redirect..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingRedirect(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={editingRedirect ? handleUpdate : handleCreate}
                  disabled={!formData.sourceUrl || !formData.destinationUrl || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingRedirect ? "Update Redirect" : "Create Redirect"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Bulk Upload Dialog ────────────────────── */}
        <BulkUploadDialog
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={refetch}
        />
      </div>
  );
}