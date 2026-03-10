import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Mail,
  Phone,
  Calendar,
  MapPin,
  Eye,
  Filter,
  Search,
  Download,
  RefreshCw,
  User,
  MessageSquare,
  Home,
} from "lucide-react";

interface IdxLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  formType: string;
  source: string;
  listingAddress?: string;
  mlsNumber?: string;
  communityName?: string;
  preferredDate?: string;
  preferredTime?: string;
  status: string;
  assignedTo?: string;
  pageUrl?: string;
  fubPersonId?: string;
  fubSyncError?: string;
  fubSyncAttempts?: number;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  leads: IdxLead[];
  total: number;
}

export default function FormSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  const [limit] = useState(50);
  const [offset] = useState(0);

  const { data, isLoading, error, refetch } = useQuery<LeadsResponse>({
    queryKey: ["/api/admin/idx-leads", { search, statusFilter, formTypeFilter, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (formTypeFilter) params.append("formType", formTypeFilter);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      
      const res = await fetch(`/api/admin/idx-leads?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      return res.json();
    },
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "contacted": return "bg-yellow-100 text-yellow-800";
      case "qualified": return "bg-green-100 text-green-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getFormTypeIcon = (formType: string) => {
    switch (formType) {
      case "contact": return <Mail className="h-4 w-4" />;
      case "showing": return <Calendar className="h-4 w-4" />;
      case "info": return <MessageSquare className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 1) return "just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Form Submissions</h1>
        <p className="text-gray-600 mt-1">
          View and manage website form submissions from Spyglass IDX
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">New Leads</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.status === "new").length}
                </p>
              </div>
              <User className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Showings</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.formType === "showing").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Contact Forms</p>
                <p className="text-2xl font-bold">
                  {leads.filter(l => l.formType === "contact").length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or message..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Form Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="showing">Showing</SelectItem>
                <SelectItem value="info">Info Request</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Submissions ({total})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading submissions...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p className="font-medium">Failed to load submissions</p>
              <p className="text-sm mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
              <p className="text-gray-500">
                {search || statusFilter || formTypeFilter 
                  ? "No submissions match your current filters." 
                  : "Form submissions will appear here when users submit forms on your website."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Info</TableHead>
                    <TableHead>Form Type</TableHead>
                    <TableHead>Property Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{lead.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                              {lead.email}
                            </a>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                {lead.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFormTypeIcon(lead.formType)}
                          <Badge variant="outline" className="capitalize">
                            {lead.formType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.listingAddress && (
                            <div className="flex items-center gap-2 text-sm">
                              <Home className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-32" title={lead.listingAddress}>
                                {lead.listingAddress}
                              </span>
                            </div>
                          )}
                          {lead.communityName && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="truncate max-w-32" title={lead.communityName}>
                                {lead.communityName}
                              </span>
                            </div>
                          )}
                          {lead.mlsNumber && (
                            <div className="text-xs text-gray-500">MLS: {lead.mlsNumber}</div>
                          )}
                          {lead.preferredDate && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {lead.preferredDate} {lead.preferredTime}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(lead.submittedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(lead.submittedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/form-submissions/${lead.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
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