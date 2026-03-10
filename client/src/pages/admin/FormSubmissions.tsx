import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormSubmissionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/idx-leads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/idx-leads", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading submissions...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error: {error instanceof Error ? error.message : 'Failed to load submissions'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leads = data?.leads || [];
  const total = data?.total || 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Form Submissions</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Submissions ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No form submissions found.</p>
              <p className="text-sm mt-2">Form submissions will appear here when users submit forms on your website.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead: any) => (
                <div key={lead.id} className="border p-4 rounded-lg">
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-sm text-gray-600">{lead.email}</div>
                  <div className="text-sm text-gray-500">Form Type: {lead.formType}</div>
                  <div className="text-sm text-gray-500">Status: {lead.status}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}