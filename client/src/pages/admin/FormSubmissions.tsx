import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Shield } from "lucide-react";

export default function FormSubmissionsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/admin/idx-leads"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/idx-leads", {
          credentials: "include",
        });
        
        if (res.status === 401) {
          throw new Error("Authentication required - please sign in");
        }
        
        if (res.status === 403) {
          throw new Error("Admin access required - insufficient permissions");
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server error (${res.status}): ${errorText}`);
        }
        
        return await res.json();
      } catch (err) {
        console.error("Form submissions API error:", err);
        throw err;
      }
    },
    retry: false,
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Loading form submissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('sign in');
    const isPermissionError = errorMessage.includes('Admin access') || errorMessage.includes('permission');

    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            {isAuthError ? (
              <>
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">Authentication Required</h3>
                <p className="text-red-700 mb-4">Please sign in to access form submissions.</p>
                <Button 
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sign In with Google
                </Button>
              </>
            ) : isPermissionError ? (
              <>
                <Shield className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
                <p className="text-red-700 mb-4">You need admin permissions to view form submissions.</p>
                <p className="text-sm text-red-600 mb-4">Contact your administrator to request access.</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Submissions</h3>
                <p className="text-red-700 mb-4">{errorMessage}</p>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-900">{total}</div>
            <div className="text-sm text-blue-700">Total Submissions</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-900">
              {leads.filter(l => l.status === "new").length}
            </div>
            <div className="text-sm text-green-700">New Leads</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-900">
              {leads.filter(l => l.formType === "contact").length}
            </div>
            <div className="text-sm text-purple-700">Contact Forms</div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Submissions ({total})</CardTitle>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
              <p>Form submissions will appear here when users submit forms on your website.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.slice(0, 10).map((lead: any) => (
                <div key={lead.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-600">{lead.email}</div>
                      <div className="text-sm text-gray-500">
                        {lead.formType} • {lead.status}
                        {lead.phone && ` • ${lead.phone}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(lead.submittedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(lead.submittedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {lead.message && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {lead.message.length > 100 ? `${lead.message.slice(0, 100)}...` : lead.message}
                    </div>
                  )}
                </div>
              ))}
              {leads.length > 10 && (
                <div className="text-center pt-4 text-gray-500">
                  <p>Showing 10 of {leads.length} submissions</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}