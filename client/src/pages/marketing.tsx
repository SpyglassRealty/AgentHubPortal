import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink, Megaphone, Mail, Palette, Share2 } from "lucide-react";

export default function MarketingPage() {
  const marketingApps = apps.filter(app => app.category === "Marketing");

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
              <div className="p-2 rounded-lg bg-pink-100 text-pink-700">
                <Megaphone className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Marketing</h1>
            </div>
            <p className="text-muted-foreground">
              Create compelling content and grow your brand with powerful marketing tools.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold tracking-tight">Marketing Apps & Tools</h2>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {marketingApps.map((app) => {
              const handleAppClick = () => {
                if (app.noIframe && app.url) {
                  window.open(app.url, '_blank', 'noopener,noreferrer');
                }
              };

              const cardContent = (
                <Card className="group relative overflow-hidden border-border hover:border-[hsl(28,94%,54%)]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-marketing-app-${app.id}`}>
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
                        <Badge variant="outline" className="text-xs font-normal border-[hsl(28,94%,54%)]/30 text-[hsl(28,94%,54%)]">
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
                    <Link href={`/app/${app.id}`}>
                      {cardContent}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {marketingApps.length === 0 && (
            <Card className="flex items-center justify-center h-48">
              <CardContent className="text-center text-muted-foreground">
                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No marketing apps available yet</p>
                <p className="text-sm">Check back later for new tools</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              Marketing Resources
            </CardTitle>
            <CardDescription>
              Quick access to marketing guides and brand assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://docs.google.com/document/d/1LKeF3DPqWelqF-ESWzJe3FEVewVTNaDCt4yv3rMz740/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Brand Guidelines</h4>
                    <p className="text-sm text-muted-foreground">Logo, colors, and typography standards</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(28,94%,54%)] transition-colors" />
                </div>
              </a>
              <Link href="/marketing-calendar">
                <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Calendar</h4>
                      <p className="text-sm text-muted-foreground">AI-powered social media ideas for real estate</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(28,94%,54%)] transition-colors" />
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
