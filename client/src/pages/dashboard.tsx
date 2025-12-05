import Layout from "@/components/layout";
import { apps } from "@/lib/apps";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Plus } from "lucide-react";

export default function DashboardPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Good morning, Jane</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening in your network today.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Customize Layout</Button>
            <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> 
              Add Widget
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Active Leads", value: "24", trend: "+12%", trendUp: true },
            { label: "Properties Listed", value: "8", trend: "+2", trendUp: true },
            { label: "Pending Closings", value: "3", trend: "On Track", trendUp: true },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-bold font-sans">{stat.value}</h3>
                  <Badge variant={stat.trendUp ? "default" : "destructive"} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    {stat.trend}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Apps Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Your Applications</h2>
            <Button variant="link" className="text-accent">View All Apps</Button>
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
                  <Card className="group relative overflow-hidden border-border/60 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-card h-full">
                    <div className={`absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardHeader className="pb-4">
                      <div className={`w-12 h-12 rounded-lg ${app.color} flex items-center justify-center mb-4 shadow-inner`}>
                        <app.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="font-sans text-lg">{app.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1.5">
                        {app.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-normal bg-secondary/50">
                          {app.category}
                        </Badge>
                        {app.id === "lead-command" && (
                          <Badge variant="outline" className="text-xs font-normal border-accent/50 text-accent-foreground">
                            3 Notifications
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
            
            {/* Add New App Placeholder */}
            <motion.div variants={item}>
              <button className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-accent/50 hover:bg-accent/5 flex flex-col items-center justify-center gap-3 transition-all group text-muted-foreground hover:text-accent-foreground">
                <div className="h-12 w-12 rounded-full bg-secondary group-hover:bg-background flex items-center justify-center transition-colors">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-medium">Add Application</span>
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Announcements / News */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight mb-4">Company News</h2>
            <Card>
              <CardContent className="p-0">
                {[1, 2].map((i) => (
                  <div key={i} className="p-6 flex gap-4 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="h-16 w-24 bg-muted rounded-md flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80)` }} />
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="secondary" className="h-5 text-[10px]">Announcement</Badge>
                        <span>Today, 9:00 AM</span>
                      </div>
                      <h3 className="font-medium text-foreground mb-1">Q4 Sales Kickoff Meeting Highlights</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        Join us as we review the record-breaking performance of Q3 and set our sights on an even stronger finish to the year. Top producers will be recognized...
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          
          <div>
             <h2 className="text-xl font-semibold tracking-tight mb-4">System Status</h2>
             <Card>
               <CardContent className="p-6 space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                     <span className="text-sm font-medium">All Systems Operational</span>
                   </div>
                   <span className="text-xs text-muted-foreground">Updated 1m ago</span>
                 </div>
                 <div className="space-y-3 pt-2">
                   {apps.slice(0, 3).map(app => (
                     <div key={app.id} className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">{app.name}</span>
                       <span className="text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-full">Online</span>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}
