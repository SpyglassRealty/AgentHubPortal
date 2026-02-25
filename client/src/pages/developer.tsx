import React from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Shield, Code } from "lucide-react";

export default function DeveloperPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin mb-4" />
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Not Authenticated</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Code className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Welcome, {user.email}</p>
        <p className="mt-4">Developer tools coming soon.</p>
      </div>
    </Layout>
  );
}