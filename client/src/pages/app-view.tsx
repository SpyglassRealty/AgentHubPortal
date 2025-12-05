import React from "react";
import { useRoute } from "wouter";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AppView() {
  const [, params] = useRoute("/app/:id");
  const appId = params?.id;
  const app = apps.find((a) => a.id === appId);

  if (!app) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold mb-2">App Not Found</h2>
          <p className="text-muted-foreground mb-4">The application you requested could not be found.</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className={`p-2 rounded-md ${app.color} bg-opacity-20`}>
              <app.icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{app.name}</h1>
              <p className="text-xs text-muted-foreground hidden md:block">{app.description}</p>
            </div>
          </div>
          
          {app.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={app.url} target="_blank" rel="noopener noreferrer">
                Open in New Tab
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden shadow-sm relative">
          {app.url ? (
            <iframe 
              src={app.url} 
              className="w-full h-full border-0"
              title={app.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/20">
               <div className="text-center p-8 max-w-md">
                 <div className={`mx-auto w-16 h-16 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                   <app.icon className="h-8 w-8" />
                 </div>
                 <h3 className="text-lg font-medium mb-2">{app.name} Placeholder</h3>
                 <p className="text-muted-foreground">
                   This is a placeholder for the {app.name} application. In a production environment, this would load the actual application interface.
                 </p>
               </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
