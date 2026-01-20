import React, { useEffect, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function AppView() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [, params] = useRoute("/app/:id");
  const [, setLocation] = useLocation();
  const appId = params?.id;
  const app = apps.find((a) => a.id === appId);

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.history.back();
  }, []);

  const iframeUrl = useMemo(() => {
    if (!app?.url) return null;
    const url = new URL(app.url);
    url.searchParams.set('theme', resolvedTheme || 'dark');
    return url.toString();
  }, [app?.url, resolvedTheme]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Please sign in again to continue.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (!app) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-display font-bold mb-2">App Not Found</h2>
          <p className="text-muted-foreground mb-4">The application you requested could not be found.</p>
          <Link href="/">
            <Button className="bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,48%)]">Return to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="-ml-2 text-muted-foreground hover:text-foreground"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className={`p-2 rounded-lg ${app.color}`}>
              <app.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold tracking-tight">{app.name}</h1>
              <p className="text-xs text-muted-foreground hidden md:block">{app.description}</p>
            </div>
          </div>
          
          {app.url && (
            <Button variant="outline" size="sm" asChild className="border-[hsl(28,94%,54%)]/30 hover:bg-[hsl(28,94%,54%)]/10">
              <a href={app.url} target="_blank" rel="noopener noreferrer">
                Open in New Tab
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden shadow-sm relative">
          {app.noIframe ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <div className="text-center p-8 max-w-md">
                <div className={`mx-auto w-16 h-16 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                  <app.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-display font-medium mb-2">{app.name}</h3>
                <p className="text-muted-foreground mb-4">
                  {app.name} opens in a new browser tab for the best experience.
                </p>
                <Button className="bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,48%)]" asChild>
                  <a href={app.url} target="_blank" rel="noopener noreferrer">
                    Open {app.name}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ) : iframeUrl ? (
            <iframe 
              src={iframeUrl} 
              className="w-full h-full border-0"
              title={app.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
               <div className="text-center p-8 max-w-md">
                 <div className={`mx-auto w-16 h-16 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                   <app.icon className="h-8 w-8" />
                 </div>
                 <h3 className="text-lg font-display font-medium mb-2">{app.name}</h3>
                 <p className="text-muted-foreground">
                   This application is coming soon. Contact your administrator to request access.
                 </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
