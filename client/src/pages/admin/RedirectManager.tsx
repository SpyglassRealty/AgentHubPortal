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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface Redirect {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  redirectType: '301' | '302';
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

// ── Custom hooks ───────────────────────────────────────

function useRedirects(search: string, filter: string, page: number) {
  const [data, setData] = useState<RedirectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRedirects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        filter,
        page: page.toString(),
        limit: '20',
      });
      
      const response = await fetch(`/api/admin/redirects?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch redirects');
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
    fetchRedirects();
  }, [search, filter, page]);

  return { data, isLoading, error, refetch: fetchRedirects };
}

// ── Redirect Form Dialog ───────────────────────────────

interface RedirectFormDialogProps {
  redirect?: Redirect;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function RedirectFormDialog({ redirect, isOpen, onClose, onSuccess }: RedirectFormDialogProps) {
  const [formData, setFormData] = useState({
    sourceUrl: redirect?.sourceUrl || '',
    destinationUrl: redirect?.destinationUrl || '',
    redirectType: redirect?.redirectType || '301' as '301' | '302',
    description: redirect?.description || '',
    isActive: redirect?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && redirect) {
      setFormData({
        sourceUrl: redirect.sourceUrl,
        destinationUrl: redirect.destinationUrl,
        redirectType: redirect.redirectType,
        description: redirect.description || '',
        isActive: redirect.isActive,
      });
    } else if (isOpen) {
      setFormData({
        sourceUrl: '',
        destinationUrl: '',
        redirectType: '301',
        description: '',
        isActive: true,
      });
    }
    setError(null);
  }, [isOpen, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate source URL starts with /
      if (!formData.sourceUrl.startsWith('/')) {
        setError('Source URL must start with /');
        return;
      }

      const url = redirect 
        ? `/api/admin/redirects/${redirect.id}`
        : '/api/admin/redirects';
      
      const method = redirect ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save redirect');
      }

      toast({
        title: redirect ? 'Redirect Updated' : 'Redirect Created',
        description: `${formData.sourceUrl} → ${formData.destinationUrl}`,
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{redirect ? 'Edit Redirect' : 'Create Redirect'}</DialogTitle>
          <DialogDescription>
            {redirect 
              ? 'Update the redirect settings.' 
              : 'Create a new URL redirect for SEO and site maintenance.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sourceUrl">Source URL *</Label>
            <Input
              id="sourceUrl"
              value={formData.sourceUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
              placeholder="/old-page"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must start with / (e.g., /old-page or /old-section/page)
            </p>
          </div>

          <div>
            <Label htmlFor="destinationUrl">Destination URL *</Label>
            <Input
              id="destinationUrl"
              value={formData.destinationUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, destinationUrl: e.target.value }))}
              placeholder="/new-page or https://external-site.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Can be relative (/new-page) or absolute (https://external-site.com)
            </p>
          </div>

          <div>
            <Label htmlFor="redirectType">Redirect Type</Label>
            <Select 
              value={formData.redirectType} 
              onValueChange={(value: '301' | '302') => setFormData(prev => ({ ...prev, redirectType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                <SelectItem value="302">302 - Temporary Redirect</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              301 for permanent moves (SEO friendly), 302 for temporary redirects
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Reason for this redirect..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive">Active</Label>
            <p className="text-xs text-muted-foreground">
              Only active redirects will be processed
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
              {redirect ? 'Update' : 'Create'} Redirect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────

export default function RedirectManager() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRedirect, setSelectedRedirect] = useState<Redirect | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useRedirects(search, filter, page);

  // ── Actions ────────────────────────────────────────

  const handleToggleActive = async (redirect: Redirect) => {
    try {
      const response = await fetch(`/api/admin/redirects/${redirect.id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle redirect');
      }

      toast({
        title: redirect.isActive ? 'Redirect Disabled' : 'Redirect Enabled',
        description: redirect.sourceUrl,
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

  const handleDelete = async (redirect: Redirect) => {
    if (!confirm(`Are you sure you want to delete the redirect from ${redirect.sourceUrl}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/redirects/${redirect.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete redirect');
      }

      toast({
        title: 'Redirect Deleted',
        description: redirect.sourceUrl,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete redirect',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setSelectedRedirect(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (redirect: Redirect) => {
    setSelectedRedirect(redirect);
    setIsFormOpen(true);
  };

  // ── Render ─────────────────────────────────────────

  const redirects = data?.redirects || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">URL Redirects</h1>
            <p className="text-sm text-muted-foreground">
              Manage URL redirects for SEO and site maintenance
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Redirect
          </Button>
        </div>

        {/* ── Filters ────────────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search redirects..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select 
                value={filter} 
                onValueChange={(v) => {
                  setFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
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

        {/* ── Table ──────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">Error loading redirects</p>
                <p className="text-sm">{error}</p>
                <Button variant="outline" className="mt-4" onClick={refetch}>
                  Try Again
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : redirects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ExternalLink className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-lg font-medium">No redirects found</p>
                <p className="text-sm">Create your first redirect to get started</p>
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Redirect
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source → Destination</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hits</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redirects.map((redirect) => (
                    <TableRow key={redirect.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">
                            {redirect.sourceUrl}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            {redirect.destinationUrl}
                          </div>
                          {redirect.description && (
                            <div className="text-xs text-muted-foreground">
                              {redirect.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {redirect.redirectType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={redirect.isActive ? "default" : "secondary"}
                          className={redirect.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                        >
                          {redirect.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {redirect.hitCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {redirect.lastAccessed 
                          ? new Date(redirect.lastAccessed).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(redirect)}
                          >
                            {redirect.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(redirect)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(redirect)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ─────────────────────────────── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Redirect Form Dialog ──────────────────── */}
        <RedirectFormDialog
          redirect={selectedRedirect}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={refetch}
        />
      </div>
    </Layout>
  );
}