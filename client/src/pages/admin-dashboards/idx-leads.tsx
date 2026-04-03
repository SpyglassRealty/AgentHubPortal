import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Search, Download, MessageSquare, Users, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/admin-dashboards/dashboard-layout';
import { KpiCard } from '@/components/admin-dashboards/kpi-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'wouter';

// ── Error Boundary ──────────────────────────────────────────────────────────

class IdxLeadsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600 bg-red-50 rounded-lg m-4">
          <h2 className="font-bold text-lg mb-2">IDX Leads Page Error</h2>
          <pre className="text-sm whitespace-pre-wrap bg-white p-4 rounded border border-red-200 overflow-auto max-h-96">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Interfaces ──────────────────────────────────────────────────────────────

interface IdxLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  formType: 'contact' | 'showing' | 'info';
  source: string;
  listingAddress?: string;
  mlsNumber?: string;
  communityName?: string;
  preferredDate?: string;
  preferredTime?: string;
  status: 'new' | 'contacted' | 'qualified' | 'archived';
  notes?: string;
  assignedTo?: string;
  fubPersonId?: number;
  fubSyncError?: string;
  fubSyncAttempts: number;
  submittedAt: string;
  contactedAt?: string;
  archivedAt?: string;
}

interface McUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface FubPerson {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  assignedTo?: string | null;
  tags?: string[];
  created: string;
  lastActivity?: string;
}

interface FubEvent {
  id: number;
  type?: string;
  personName?: string;
  person?: { id?: number; firstName?: string; lastName?: string; email?: string };
  created?: string;
  dateCreated?: string;
}

interface FubStats {
  totalLeads: number;
  newThisWeek: number;
  registrations: number;
  propertyInquiries: number;
  savedProperties: number;
  savedSearches: number;
  sellerLeads: number;
  unsubscribes: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status) {
    case 'new':
      return 'bg-[#EF4923]';
    case 'contacted':
      return 'bg-yellow-500';
    case 'qualified':
      return 'bg-green-500';
    case 'archived':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

function getFormTypeLabel(formType: string) {
  switch (formType) {
    case 'contact':
      return 'Contact';
    case 'showing':
      return 'Showing Request';
    case 'info':
      return 'Info Request';
    default:
      return formType;
  }
}

function getStageBadge(stage?: string) {
  const s = (stage || '').toLowerCase();
  if (s.includes('new') || s === '') {
    return <Badge className="bg-[#EF4923] text-white hover:bg-[#EF4923]/90">New</Badge>;
  }
  if (s.includes('active') || s.includes('hot') || s.includes('engaged')) {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Active</Badge>;
  }
  if (s.includes('nurture') || s.includes('watch') || s.includes('long')) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Nurture</Badge>;
  }
  if (s.includes('closed') || s.includes('past') || s.includes('dead') || s.includes('lost')) {
    return <Badge className="bg-gray-500 text-white hover:bg-gray-500/90">Closed</Badge>;
  }
  return <Badge variant="outline">{stage || 'Unknown'}</Badge>;
}

function getEventTypeBadge(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('registration')) {
    return <Badge className="bg-[#EF4923] text-white hover:bg-[#EF4923]/90">Registration</Badge>;
  }
  if (t.includes('property inquiry') || t.includes('inquiry')) {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600/90">Property Inquiry</Badge>;
  }
  if (t.includes('saved property')) {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Saved Property</Badge>;
  }
  if (t.includes('seller')) {
    return <Badge className="bg-purple-600 text-white hover:bg-purple-600/90">Seller Inquiry</Badge>;
  }
  if (t.includes('unsubscribed')) {
    return <Badge className="bg-gray-500 text-white hover:bg-gray-500/90">Unsubscribed</Badge>;
  }
  return <Badge variant="outline">{type || 'Unknown'}</Badge>;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted animate-pulse rounded w-20" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function IdxLeadsUnifiedPage() {
  const { isAdmin } = useUserRole();
  const [, setLocation] = useLocation();

  // Redirect non-admins
  if (!isAdmin) {
    setLocation('/admin/dashboards');
    return null;
  }

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<IdxLead | null>(null);
  const [notes, setNotes] = useState('');

  // ── Form Submissions queries ────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['idx-leads', statusFilter, formTypeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (formTypeFilter !== 'all') params.append('formType', formTypeFilter);
      if (search) params.append('search', search);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/idx-leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/developer/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // ── FUB Pipeline queries ────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery<FubStats>({
    queryKey: ['/api/fub/admin/stats'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const { data: peopleData, isLoading: peopleLoading } = useQuery<{ people: FubPerson[]; total: number }>({
    queryKey: ['/api/fub/admin/people'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/people');
      if (!res.ok) throw new Error('Failed to fetch people');
      return res.json();
    },
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ events: FubEvent[] }>({
    queryKey: ['/api/fub/admin/events'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IdxLead> }) => {
      const response = await fetch(`/api/admin/idx-leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update lead');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-leads'] });
      toast.success('Lead updated successfully');
      setSelectedLead(null);
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await fetch(`/api/admin/idx-leads/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to assign lead');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-leads'] });
      toast.success('Lead assigned successfully');
    },
    onError: (error) => {
      toast.error(`Failed to assign lead: ${error.message}`);
    },
  });

  const syncToFubMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/idx-leads/${id}/sync-fub`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to sync with FUB');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-leads'] });
      toast.success('Lead synced to Follow Up Boss');
    },
    onError: (error) => {
      toast.error(`FUB sync failed: ${error.message}`);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleStatusChange = (lead: IdxLead, newStatus: string) => {
    updateLeadMutation.mutate({ id: lead.id, updates: { status: newStatus as IdxLead['status'] } });
  };

  const handleAssign = (lead: IdxLead, userId: string) => {
    assignLeadMutation.mutate({ id: lead.id, userId });
  };

  const handleNotesUpdate = () => {
    if (!selectedLead) return;
    updateLeadMutation.mutate({
      id: selectedLead.id,
      updates: { notes },
    });
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const csv = [
      ['Name', 'Email', 'Phone', 'Form Type', 'Status', 'Submitted', 'Property/Community', 'Message'],
      ...leads.map((lead: IdxLead) => [
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.formType || '',
        lead.status || '',
        (() => { try { return lead.submittedAt ? format(new Date(lead.submittedAt), 'yyyy-MM-dd HH:mm') : ''; } catch { return ''; } })(),
        lead.listingAddress || lead.communityName || '',
        lead.message || '',
      ]),
    ]
      .map(row => row.map((cell: string) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idx-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Derived data ────────────────────────────────────────────────────────

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const people = (peopleData?.people || []).slice(0, 50);
  const events = (eventsData?.events || []).slice(0, 20);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="IDX Leads" subtitle="Website leads and FUB pipeline" icon={Users}>
      <Tabs defaultValue="form-submissions">
        <TabsList className="mb-6">
          <TabsTrigger value="form-submissions">
            Form Submissions
            {total > 0 && <span className="ml-2 bg-[#EF4923] text-white text-xs px-2 py-0.5 rounded-full">{total}</span>}
          </TabsTrigger>
          <TabsTrigger value="fub-pipeline">
            FUB Pipeline
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Form Submissions ──────────────────────────────────── */}
        <TabsContent value="form-submissions">
          <IdxLeadsErrorBoundary>
            {error ? (
              <div className="p-6 text-red-600">Error loading leads: {(error as Error).message}</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Form Submissions</h2>
                  <div className="flex gap-2">
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Stats Cards */}
                {!isLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-[#EF4923]">
                          {leads.filter((l: IdxLead) => l.status === 'new').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Contacted</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {leads.filter((l: IdxLead) => l.status === 'contacted').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">FUB Sync Failed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {leads.filter((l: IdxLead) => l.fubSyncError).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Filters */}
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, email, phone, or MLS#..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Forms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      <SelectItem value="contact">Contact</SelectItem>
                      <SelectItem value="showing">Showing Request</SelectItem>
                      <SelectItem value="info">Info Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Leads Table */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Form</TableHead>
                            <TableHead>Property/Community</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : leads.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                No leads found
                              </TableCell>
                            </TableRow>
                          ) : (
                            leads.map((lead: IdxLead) => (
                              <TableRow key={lead.id}>
                                <TableCell className="font-medium">{lead.name || '\u2014'}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-sm">{lead.email || '\u2014'}</div>
                                    {lead.phone && (
                                      <div className="text-xs text-gray-500">{lead.phone}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getFormTypeLabel(lead.formType || 'contact')}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-[200px]">
                                    {lead.listingAddress && (
                                      <div className="text-sm truncate">{lead.listingAddress}</div>
                                    )}
                                    {lead.mlsNumber && (
                                      <div className="text-xs text-gray-500">MLS# {lead.mlsNumber}</div>
                                    )}
                                    {lead.communityName && (
                                      <div className="text-sm">{lead.communityName}</div>
                                    )}
                                    {lead.preferredDate && (
                                      <div className="text-xs text-gray-500">
                                        {lead.preferredDate} {lead.preferredTime ?? ''}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(lead.status || 'new')}>
                                    {lead.status || 'new'}
                                  </Badge>
                                  {lead.fubSyncError && (
                                    <Badge variant="destructive" className="ml-1">
                                      FUB Error
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {(() => { try { return lead.submittedAt ? format(new Date(lead.submittedAt), 'MMM d, h:mm a') : '\u2014'; } catch { return '\u2014'; } })()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {lead.assignedTo ? (
                                    <div className="text-sm">
                                      {(Array.isArray(users) ? users : []).find((u: McUser) => u.id === lead.assignedTo)?.email || 'Unknown'}
                                    </div>
                                  ) : (
                                    <Select onValueChange={(userId) => handleAssign(lead, userId)}>
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue placeholder="Assign..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(Array.isArray(users) ? users : []).filter((u: McUser) => u.role === 'agent' || u.role === 'admin').map((user: McUser) => (
                                          <SelectItem key={user.id} value={user.id}>
                                            {user.firstName || ''} {user.lastName || ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedLead(lead);
                                        setNotes(lead.notes || '');
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                    {lead.fubSyncError && !lead.fubPersonId && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => syncToFubMutation.mutate(lead.id)}
                                        disabled={syncToFubMutation.isPending}
                                      >
                                        {syncToFubMutation.isPending ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                    <Select
                                      value={lead.status || 'new'}
                                      onValueChange={(status) => handleStatusChange(lead, status)}
                                    >
                                      <SelectTrigger className="h-8 w-[100px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="contacted">Contacted</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Details Dialog */}
                <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Lead Details</DialogTitle>
                    </DialogHeader>
                    {selectedLead && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Name</label>
                            <div className="text-sm">{selectedLead.name || '\u2014'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Email</label>
                            <div className="text-sm">{selectedLead.email || '\u2014'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Phone</label>
                            <div className="text-sm">{selectedLead.phone || 'N/A'}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Form Type</label>
                            <div className="text-sm">{getFormTypeLabel(selectedLead.formType || 'contact')}</div>
                          </div>
                        </div>

                        {selectedLead.message && (
                          <div>
                            <label className="text-sm font-medium">Message</label>
                            <div className="text-sm bg-gray-50 p-3 rounded">{selectedLead.message}</div>
                          </div>
                        )}

                        {(selectedLead.listingAddress || selectedLead.communityName) && (
                          <div>
                            <label className="text-sm font-medium">Property Information</label>
                            <div className="text-sm bg-gray-50 p-3 rounded space-y-1">
                              {selectedLead.listingAddress && <div>Address: {selectedLead.listingAddress}</div>}
                              {selectedLead.mlsNumber && <div>MLS#: {selectedLead.mlsNumber}</div>}
                              {selectedLead.communityName && <div>Community: {selectedLead.communityName}</div>}
                              {selectedLead.preferredDate && (
                                <div>Preferred: {selectedLead.preferredDate} {selectedLead.preferredTime ?? ''}</div>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium">Internal Notes</label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add internal notes..."
                            className="mt-1"
                          />
                        </div>

                        {selectedLead.fubSyncError && (
                          <div>
                            <label className="text-sm font-medium text-red-600">FUB Sync Error</label>
                            <div className="text-sm bg-red-50 text-red-700 p-3 rounded">
                              {selectedLead.fubSyncError}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedLead(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleNotesUpdate}>
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </IdxLeadsErrorBoundary>
        </TabsContent>

        {/* ── Tab 2: FUB Pipeline ──────────────────────────────────────── */}
        <TabsContent value="fub-pipeline">
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard
                title="Total IDX Leads"
                value={statsLoading ? '...' : String(stats?.totalLeads ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
              <KpiCard
                title="New This Week"
                value={statsLoading ? '...' : String(stats?.newThisWeek ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
              <KpiCard
                title="Registrations"
                value={statsLoading ? '...' : String(stats?.registrations ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
              <KpiCard
                title="Property Inquiries"
                value={statsLoading ? '...' : String(stats?.propertyInquiries ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
              <KpiCard
                title="Saved Properties"
                value={statsLoading ? '...' : String(stats?.savedProperties ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
              <KpiCard
                title="Seller Leads"
                value={statsLoading ? '...' : String(stats?.sellerLeads ?? 0)}
                category="network"
                className="border-l-[#EF4923]"
              />
            </div>

            {/* Recent Leads Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#222222]">Recent Leads</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Email</TableHead>
                        <TableHead className="min-w-[90px]">Stage</TableHead>
                        <TableHead className="min-w-[130px]">Assigned Agent</TableHead>
                        <TableHead className="min-w-[150px]">Tags</TableHead>
                        <TableHead className="min-w-[110px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {peopleLoading ? (
                        <>
                          <SkeletonRow cols={6} />
                          <SkeletonRow cols={6} />
                          <SkeletonRow cols={6} />
                          <SkeletonRow cols={6} />
                          <SkeletonRow cols={6} />
                        </>
                      ) : people.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No spyglass-idx leads found
                          </TableCell>
                        </TableRow>
                      ) : (
                        people.map((person) => (
                          <TableRow key={person.id} className="min-h-[44px]">
                            <TableCell className="font-medium">
                              <a
                                href={`https://app.followupboss.com/2/people/${person.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#EF4923] hover:underline inline-flex items-center gap-1"
                              >
                                {person.firstName} {person.lastName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell className="text-sm">{person.email || '-'}</TableCell>
                            <TableCell>{getStageBadge(person.stage)}</TableCell>
                            <TableCell className="text-sm">{person.assignedTo || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(person.tags || []).slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {(person.tags || []).length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{(person.tags || []).length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {person.created
                                ? format(new Date(person.created), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {people.length > 0 && (
                  <div className="p-4 border-t text-center">
                    <a
                      href="https://app.followupboss.com/2/people"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#EF4923] hover:underline inline-flex items-center gap-1"
                    >
                      View all in Follow Up Boss
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Events Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#222222]">Recent Events</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Type</TableHead>
                        <TableHead className="min-w-[180px]">Person</TableHead>
                        <TableHead className="min-w-[130px]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventsLoading ? (
                        <>
                          <SkeletonRow cols={3} />
                          <SkeletonRow cols={3} />
                          <SkeletonRow cols={3} />
                        </>
                      ) : events.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No recent events
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event) => {
                          const personName = event.person?.firstName || event.person?.lastName
                            ? `${event.person.firstName || ''} ${event.person.lastName || ''}`.trim()
                            : event.person?.email || event.personName || '-';
                          const fubPersonUrl = event.person?.id
                            ? `https://app.followupboss.com/2/people/view/${event.person.id}`
                            : null;
                          return (
                            <TableRow key={event.id} className="min-h-[44px]">
                              <TableCell>
                                {fubPersonUrl ? (
                                  <a href={fubPersonUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer hover:opacity-80">
                                    {getEventTypeBadge(event.type)}
                                  </a>
                                ) : (
                                  getEventTypeBadge(event.type)
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {fubPersonUrl ? (
                                  <a
                                    href={fubPersonUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline text-[#EF4923] inline-flex items-center gap-1"
                                  >
                                    {personName}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  personName
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {(event.created || event.dateCreated)
                                  ? format(new Date(event.created || event.dateCreated!), 'MMM d, h:mm a')
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
