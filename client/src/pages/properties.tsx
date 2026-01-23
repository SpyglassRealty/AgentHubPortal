import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink, Building2 } from "lucide-react";
import MarketPulse from "@/components/market-pulse";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AppUsage {
  appId: string;
  clickCount: number;
}

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  
  const { data: usageData } = useQuery<{ usage: AppUsage[] }>({
    queryKey: ["/api/app-usage/properties"],
    staleTime: 1000 * 60 * 5,
  });

  const trackUsage = useMutation({
    mutationFn: async (appId: string) => {
      return apiRequest("POST", "/api/app-usage/track", { appId, page: "properties" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-usage/properties"] });
    },
  });

  const baseApps = apps.filter(app => 
    app.category === "Sales" || 
    app.id === "client-data" || 
    app.id === "jointly"
  );

  const propertyApps = useMemo(() => {
    if (!usageData?.usage?.length) return baseApps;
    
    const usageMap = new Map(usageData.usage.map(u => [u.appId, u.clickCount]));
    return [...baseApps].sort((a, b) => {
      const countA = usageMap.get(a.id) || 0;
      const countB = usageMap.get(b.id) || 0;
      return countB - countA;
    });
  }, [baseApps, usageData]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Properties</h1>
            </div>
            <p className="text-muted-foreground">
              Access property data, listings, and market insights for the Austin Metro Area.
            </p>
          </div>
        </div>

        <MarketPulse />

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold tracking-tight">Property Apps & Tools</h2>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {propertyApps.map((app) => {
              const handleAppClick = () => {
                trackUsage.mutate(app.id);
                if (app.noIframe && app.url) {
                  window.open(app.url, '_blank', 'noopener,noreferrer');
                }
              };

              const cardContent = (
                <Card className="group relative overflow-hidden border-border hover:border-[#EF4923]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-property-app-${app.id}`}>
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {app.url ? <ExternalLink className="h-5 w-5 text-muted-foreground" /> : <ArrowUpRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                      <app.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-display text-lg">{app.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1.5">
                      {app.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal bg-secondary/80">
                        {app.category}
                      </Badge>
                      {app.url && (
                        <Badge variant="outline" className="text-xs font-normal border-[#EF4923]/30 text-[#EF4923]">
                          Live
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              return (
                <motion.div key={app.id} variants={item}>
                  {app.noIframe && app.url ? (
                    <div onClick={handleAppClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleAppClick()}>
                      {cardContent}
                    </div>
                  ) : (
                    <Link href={`/app/${app.id}`} onClick={() => trackUsage.mutate(app.id)}>
                      {cardContent}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
