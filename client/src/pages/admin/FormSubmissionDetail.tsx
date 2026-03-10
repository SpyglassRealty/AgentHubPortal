import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function FormSubmissionDetailPage() {
  const { id } = useParams();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: [`/api/admin/idx-leads/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/idx-leads/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
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
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Loading...</h1>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6">
        <Link href="/admin/form-submissions">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Submissions
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Submission Not Found</h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link href="/admin/form-submissions">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Submissions
        </Button>
      </Link>
      
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">Form Submission #{lead.id.slice(-8)}</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <div className="text-sm text-gray-900">{lead.name}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="text-sm text-gray-900">{lead.email}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Form Type</label>
              <div className="text-sm text-gray-900">{lead.formType}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="text-sm text-gray-900">{lead.status}</div>
            </div>
            {lead.message && (
              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{lead.message}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}