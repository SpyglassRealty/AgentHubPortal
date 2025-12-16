import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, Plus, ExternalLink, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SuggestionCard } from "@/components/suggestion-card";
import type { ContextSuggestion, AgentProfile } from "@shared/schema";

interface ProfileResponse {
  profile: AgentProfile | null;
  needsOnboarding: boolean;
}

interface SuggestionsResponse {
  suggestions: ContextSuggestion[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [showAllApps, setShowAllApps] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileResponse>({
    queryKey: ["/api/context/profile"],
    queryFn: async () => {
      const res = await fetch("/api/context/profile", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<SuggestionsResponse>({
    queryKey: ["/api/context/suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/context/suggestions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
    enabled: !profileData?.needsOnboarding || onboardingComplete,
  });

  const showOnboarding = profileData?.needsOnboarding && !onboardingComplete;
  const suggestions = suggestionsData?.suggestions || [];
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.firstName || user?.email?.split('@')[0] || "Agent";

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
        
        <OnboardingModal 
          open={showOnboarding || false} 
          onComplete={() => setOnboardingComplete(true)} 
        />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {suggestions.length > 0 
                ? "Here's what you should focus on right now."
                : "Welcome to Mission Control. What would you like to work on today?"}
            </p>
          </div>
        </div>

        {suggestionsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              <h2 className="text-xl font-display font-semibold tracking-tight">Your Action Items</h2>
              <Badge className="bg-[hsl(28,94%,54%)] text-white">{suggestions.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.slice(0, 4).map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
            {suggestions.length > 4 && (
              <p className="text-sm text-center text-muted-foreground">
                +{suggestions.length - 4} more action items
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Action Items", value: suggestions.length.toString(), sublabel: "To Review" },
            { label: "Active Apps", value: apps.filter(a => a.url).length.toString(), sublabel: "Connected" },
            { label: "Resources", value: "24/7", sublabel: "Available" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card border-border shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-bold font-display">{stat.value}</h3>
                  <Badge variant="secondary" className="bg-[hsl(28,94%,54%)]/10 text-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,54%)]/20 border-0">
                    {stat.sublabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold tracking-tight">Your Applications</h2>
          </div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {apps.map((app) => (
              <motion.div key={app.id} variants={item}>
                <Link href={`/app/${app.id}`}>
                  <Card className="group relative overflow-hidden border-border hover:border-[hsl(28,94%,54%)]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-app-${app.id}`}>
                    <div className={`absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
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
                          <Badge variant="outline" className="text-xs font-normal border-[hsl(28,94%,54%)]/30 text-[hsl(28,94%,54%)]">
                            Live
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
            
            <motion.div variants={item}>
              <button className="w-full h-full min-h-[220px] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-[hsl(28,94%,54%)]/50 hover:bg-[hsl(28,94%,54%)]/5 flex flex-col items-center justify-center gap-3 transition-all group text-muted-foreground hover:text-foreground">
                <div className="h-12 w-12 rounded-full bg-secondary group-hover:bg-[hsl(28,94%,54%)]/10 flex items-center justify-center transition-colors">
                  <Plus className="h-6 w-6 group-hover:text-[hsl(28,94%,54%)]" />
                </div>
                <span className="font-medium">Request New App</span>
              </button>
            </motion.div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-display font-semibold tracking-tight mb-4">Company Updates</h2>
            <Card>
              <CardContent className="p-0">
                {[
                  { 
                    title: "New Training Module Available",
                    desc: "Check out the latest contract negotiation training in RealtyHack AI.",
                    time: "Today"
                  },
                  { 
                    title: "Q4 Goals & Incentives",
                    desc: "Review the updated commission structure and bonus opportunities for top performers.",
                    time: "Yesterday"
                  }
                ].map((news, i) => (
                  <div key={i} className="p-6 flex gap-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="h-12 w-12 rounded-lg bg-[hsl(28,94%,54%)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[hsl(28,94%,54%)] font-display font-bold text-lg">S</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="secondary" className="h-5 text-[10px]">Announcement</Badge>
                        <span>{news.time}</span>
                      </div>
                      <h3 className="font-medium text-foreground mb-1">{news.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{news.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h2 className="text-xl font-display font-semibold tracking-tight mb-4">Quick Links</h2>
            <Card>
              <CardContent className="p-6 space-y-3">
                {[
                  { label: "Company Handbook", href: "#" },
                  { label: "Submit IT Request", href: "#" },
                  { label: "Marketing Resources", href: "#" },
                  { label: "Contact Support", href: "#" },
                ].map((link, i) => (
                  <a 
                    key={i} 
                    href={link.href}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-sm font-medium">{link.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(28,94%,54%)] transition-colors" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}
