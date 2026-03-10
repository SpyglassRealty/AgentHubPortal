import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  MessageSquare,
  Clock,
  Home,
  ExternalLink,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  notes?: string;
  createdAt: string;
  submittedAt: string;
  updatedAt: string;
}

export default function FormSubmissionDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  const { data: lead, isLoading, error } = useQuery<IdxLead>({
    queryKey: [`/api/admin/idx-leads/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/idx-leads/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    onSuccess: (data) => {
      setNotes(data.notes || "");
      setStatus(data.status);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { status?: string; notes?: string; assignedTo?: string }) => {
      const res = await fetch(`/api/admin/idx-leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/idx-leads/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/idx-leads"] });
      toast({ title: "Lead updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const updates: any = {};
    if (status !== lead?.status) updates.status = status;
    if (notes !== lead?.notes) updates.notes = notes;
    
    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    }
  };

  const handleCopyContact = () => {
    const contactInfo = `${lead?.name}\n${lead?.email}${lead?.phone ? `\n${lead.phone}` : ''}`;
    navigator.clipboard.writeText(contactInfo);
    toast({ title: "Contact info copied to clipboard" });
  };

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
      case "contact": return <Mail className="h-5 w-5" />;
      case "showing": return <Calendar className="h-5 w-5" />;
      case "info": return <MessageSquare className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500">Loading submission details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Submission Not Found</h2>
        <p className="text-gray-600 mb-4">The form submission you're looking for doesn't exist or has been deleted.</p>
        <Link href="/admin/form-submissions">
          <Button>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/form-submissions">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Submissions
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Form Submission #{lead.id.slice(-8)}</h1>
          <p className="text-gray-600 mt-1">
            Submitted {formatDistanceToNow(new Date(lead.submittedAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(lead.status)}>
            {lead.status}
          </Badge>
          {lead.fubPersonId && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Synced to FUB
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Lead Information
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyContact}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <div className="mt-1 text-sm text-gray-900 font-medium">{lead.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </a>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="mt-1">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">Not provided</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Form Type</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getFormTypeIcon(lead.formType)}
                    <Badge variant="outline" className="capitalize">
                      {lead.formType}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          {lead.message && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {lead.message}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Information */}
          {(lead.listingAddress || lead.mlsNumber || lead.communityName) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.listingAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Listing Address</label>
                    <div className="mt-1 text-sm text-gray-900">{lead.listingAddress}</div>
                  </div>
                )}
                {lead.mlsNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">MLS Number</label>
                    <div className="mt-1 text-sm text-gray-900">{lead.mlsNumber}</div>
                  </div>
                )}
                {lead.communityName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Community</label>
                    <div className="mt-1 text-sm text-gray-900">{lead.communityName}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Showing Preferences */}
          {(lead.preferredDate || lead.preferredTime) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Showing Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.preferredDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Preferred Date</label>
                      <div className="mt-1 text-sm text-gray-900">{lead.preferredDate}</div>
                    </div>
                  )}
                  {lead.preferredTime && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Preferred Time</label>
                      <div className="mt-1 text-sm text-gray-900">{lead.preferredTime}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Add internal notes about this lead</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead, follow-up actions, or other relevant information..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
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
              
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="w-full"
              >
                {updateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>

              <div className="border-t pt-4 space-y-2">
                <a
                  href={`mailto:${lead.email}?subject=Re: Your inquiry from Spyglass Realty&body=Hi ${lead.name},%0D%0A%0D%0AThank you for your inquiry.`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg inline-flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Lead
                </a>
                
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg inline-flex items-center justify-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Call Lead
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Submitted</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(lead.submittedAt).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  ({formatDistanceToNow(new Date(lead.submittedAt), { addSuffix: true })})
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Source</label>
                <div className="mt-1 text-sm text-gray-900">{lead.source}</div>
              </div>

              {lead.pageUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Page URL</label>
                  <div className="mt-1">
                    <a
                      href={lead.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 break-all flex items-center gap-1"
                    >
                      {lead.pageUrl.length > 40 
                        ? `${lead.pageUrl.substring(0, 40)}...` 
                        : lead.pageUrl
                      }
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FUB Sync Status */}
          {lead.fubPersonId || lead.fubSyncError && (
            <Card>
              <CardHeader>
                <CardTitle>Follow Up Boss</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.fubPersonId ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Successfully synced</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Sync failed</span>
                  </div>
                )}
                
                {lead.fubPersonId && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">FUB Person ID</label>
                    <div className="text-sm text-gray-900 font-mono">{lead.fubPersonId}</div>
                  </div>
                )}
                
                {lead.fubSyncError && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Error Message</label>
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {lead.fubSyncError}
                    </div>
                  </div>
                )}
                
                {lead.fubSyncAttempts && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Sync Attempts</label>
                    <div className="text-sm text-gray-900">{lead.fubSyncAttempts}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}