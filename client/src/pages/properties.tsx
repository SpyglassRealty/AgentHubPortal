import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink, Building2, Home, MapPin } from "lucide-react";
import MarketPulse from "@/components/market-pulse";

export default function PropertiesPage() {
  const propertyApps = apps.filter(app => 
    app.category === "Sales" || 
    app.id === "client-data" || 
    app.id === "jointly"
  );

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Home className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-emerald-900">Active Listings</h3>
              </div>
              <p className="text-sm text-emerald-700">
                Browse and manage your property listings across the Austin Metro Area.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <MapPin className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="font-semibold text-blue-900">Market Analysis</h3>
              </div>
              <p className="text-sm text-blue-700">
                Real-time market data and trends for Travis, Williamson, Hays, Bastrop, and Caldwell counties.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Building2 className="h-5 w-5 text-amber-700" />
                </div>
                <h3 className="font-semibold text-amber-900">Property Tools</h3>
              </div>
              <p className="text-sm text-amber-700">
                Access property search, valuation tools, and client data management.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold tracking-tight">Property Apps & Tools</h2>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {propertyApps.map((app) => (
              <motion.div key={app.id} variants={item}>
                <Link href={`/app/${app.id}`}>
                  <Card className="group relative overflow-hidden border-border hover:border-[hsl(28,94%,54%)]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full" data-testid={`card-property-app-${app.id}`}>
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
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
