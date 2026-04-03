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
import { Loader2, RefreshCw, Search, Download, MessageSquare, Home } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/admin-dashboards/dashboard-layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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

export default function IdxLeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<IdxLead | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch leads
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

  // Fetch users for assignment
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/developer/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Update lead mutation
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

  // Assign lead mutation
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

  // Sync to FUB mutation
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
      updates: { notes } 
    });
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;

    const csv = [
      ['Name', 'Email', 'Phone', 'Form Type', 'Status', 'Submitted', 'Property/Community', 'Message'],
      ...leads.map((lead: IdxLead) => [
        lead.name,
        lead.email,
        lead.phone || '',
        lead.formType,
        lead.status,
        lead.submittedAt ? format(new Date(lead.submittedAt), 'yyyy-MM-dd HH:mm') : '',
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

  const getStatusColor = (status: string) => {
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
  };

  const getFormTypeLabel = (formType: string) => {
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
  };

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;

  if (error) {
    return (
      <DashboardLayout title="IDX Lead Capture" subtitle="Website lead management" icon={Home}>
        <div className="p-6 text-red-600">Error loading leads: {(error as Error).message}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="IDX Lead Capture" subtitle="Website lead management" icon={Home}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">IDX Lead Capture</h1>
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
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{lead.email}</div>
                            {lead.phone && (
                              <div className="text-xs text-gray-500">{lead.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFormTypeLabel(lead.formType)}</Badge>
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
                                {lead.preferredDate} {lead.preferredTime}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          {lead.fubSyncError && (
                            <Badge variant="destructive" className="ml-1">
                              FUB Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {lead.submittedAt ? format(new Date(lead.submittedAt), 'MMM d, h:mm a') : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.assignedTo ? (
                            <div className="text-sm">
                              {users?.find((u: McUser) => u.id === lead.assignedTo)?.email || 'Unknown'}
                            </div>
                          ) : (
                            <Select onValueChange={(userId) => handleAssign(lead, userId)}>
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users?.filter((u: McUser) => u.role === 'agent' || u.role === 'admin').map((user: McUser) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
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
                              value={lead.status}
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
                    <div className="text-sm">{selectedLead.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <div className="text-sm">{selectedLead.email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <div className="text-sm">{selectedLead.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Form Type</label>
                    <div className="text-sm">{getFormTypeLabel(selectedLead.formType)}</div>
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
                        <div>Preferred: {selectedLead.preferredDate} {selectedLead.preferredTime}</div>
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
    </DashboardLayout>
  );
}