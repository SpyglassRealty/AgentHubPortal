import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  RefreshCw, 
  AlertCircle, 
  Mail, 
  Phone, 
  User, 
  MessageSquare,
  Calendar,
  Home,
  MapPin
} from "lucide-react";

export default function FormSubmissionDetailPage() {
  const { id } = useParams();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: [`/api/admin/idx-leads/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/idx-leads/${id}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        throw new Error("Authentication required - please sign in");
      }
      if (res.status === 403) {
        throw new Error("Admin access required - insufficient permissions");
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch lead (${res.status})`);
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Link href="/admin/form-submissions">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Submissions
          </Button>
        </Link>
        <div className="mt-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    const errorMessage = error instanceof Error ? error.message : 'Submission not found';
    
    return (
      <div className="p-6">
        <Link href="/admin/form-submissions">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Submissions
          </Button>
        </Link>
        <div className="mt-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Submission</h2>
          <p className="text-gray-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Unknown date";
    }
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

  return (
    <div className="p-6">
      <Link href="/admin/form-submissions">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Submissions
        </Button>
      </Link>
      
      <div className="mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Form Submission #{lead.id.slice(-8)}
            </h1>
            <p className="text-gray-600 mt-1">
              Submitted {formatDate(lead.submittedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
            {lead.fubPersonId && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Synced to FUB
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <div className="text-sm text-gray-900 font-medium">{lead.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="text-sm">
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800">
                    {lead.email}
                  </a>
                </div>
              </div>
              {lead.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="text-sm">
                    <a href={`tel:${lead.phone}`} className="text-blue-600 hover:text-blue-800">
                      {lead.phone}
                    </a>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Form Type</label>
                <div className="flex items-center gap-2 mt-1">
                  {getFormTypeIcon(lead.formType)}
                  <Badge variant="outline" className="capitalize">
                    {lead.formType}
                  </Badge>
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
              <CardContent className="space-y-3">
                {lead.listingAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Listing Address</label>
                    <div className="text-sm text-gray-900">{lead.listingAddress}</div>
                  </div>
                )}
                {lead.mlsNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">MLS Number</label>
                    <div className="text-sm text-gray-900">{lead.mlsNumber}</div>
                  </div>
                )}
                {lead.communityName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Community</label>
                    <div className="text-sm text-gray-900">{lead.communityName}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <a
                  href={`mailto:${lead.email}?subject=Re: Your inquiry from Spyglass Realty&body=Hi ${lead.name},%0D%0A%0D%0AThank you for your inquiry.`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg inline-flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Lead
                </a>
                
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg inline-flex items-center justify-center gap-2"
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
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Source</label>
                <div className="text-sm text-gray-900">{lead.source}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Submitted At</label>
                <div className="text-sm text-gray-900">{formatDate(lead.submittedAt)}</div>
              </div>
              {lead.pageUrl && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Page URL</label>
                  <div className="text-sm">
                    <a
                      href={lead.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 break-all"
                    >
                      {lead.pageUrl}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}