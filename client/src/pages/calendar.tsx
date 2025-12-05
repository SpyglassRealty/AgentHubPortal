import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { useState } from "react";
import type { FubEvent } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface CalendarResponse {
  events: FubEvent[];
  tasks: FubEvent[];
  message?: string;
}

interface FubAgent {
  id: number;
  name: string;
  email: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery<{ agents: FubAgent[] }>({
    queryKey: ["/api/fub/agents"],
    queryFn: async () => {
      console.log("[Calendar] Fetching agents...");
      const res = await fetch("/api/fub/agents", { credentials: "include" });
      if (!res.ok) {
        console.error("[Calendar] Failed to fetch agents:", res.status, res.statusText);
        throw new Error("Failed to fetch agents");
      }
      const data = await res.json();
      console.log("[Calendar] Got agents:", data.agents?.length);
      return data;
    },
    enabled: !!user?.isSuperAdmin,
  });

  console.log("[Calendar] user?.isSuperAdmin:", user?.isSuperAdmin, "agentsData:", agentsData?.agents?.length, "agentsLoading:", agentsLoading, "agentsError:", agentsError);

  const calendarUrl = selectedAgentId 
    ? `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}&agentId=${selectedAgentId}`
    : `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}`;

  const { data, isLoading, error } = useQuery<CalendarResponse>({
    queryKey: ["/api/fub/calendar", { startDate, endDate, agentId: selectedAgentId }],
    queryFn: async () => {
      const res = await fetch(calendarUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calendar");
      return res.json();
    },
  });

  const selectedAgent = selectedAgentId 
    ? agentsData?.agents.find(a => a.id.toString() === selectedAgentId) 
    : null;

  const allItems = [...(data?.events || []), ...(data?.tasks || [])];
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getItemsForDay = (date: Date) => {
    return allItems.filter(item => {
      const itemDate = parseISO(item.startDate);
      return isSameDay(itemDate, date);
    });
  };

  const getEventTypeColor = (type: FubEvent['type']) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'task': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'deal_closing': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const upcomingItems = allItems
    .filter(item => new Date(item.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Unable to Load Calendar</h2>
          <p className="text-muted-foreground mb-4">
            {(error as Error).message || "Please check your Follow Up Boss connection."}
          </p>
          <a href="https://app.followupboss.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              Open Follow Up Boss
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold" data-testid="text-calendar-title">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              {selectedAgent 
                ? `Viewing ${selectedAgent.name}'s calendar` 
                : "Your appointments and tasks from Follow Up Boss"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.isSuperAdmin && (
              <Select 
                value={selectedAgentId || "my-data"} 
                onValueChange={(value) => setSelectedAgentId(value === "my-data" ? null : value)}
              >
                <SelectTrigger className="w-[220px]" data-testid="select-agent">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my-data" data-testid="option-agent-my-data">
                    My Data
                  </SelectItem>
                  {agentsLoading ? (
                    <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                  ) : (
                    agentsData?.agents.map(agent => (
                      <SelectItem 
                        key={agent.id} 
                        value={agent.id.toString()}
                        data-testid={`option-agent-${agent.id}`}
                      >
                        {agent.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            <a href="https://app.followupboss.com/calendar" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-[hsl(28,94%,54%)]/30 hover:bg-[hsl(28,94%,54%)]/10">
                Open in Follow Up Boss
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {data?.message && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">{data.message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl">
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                          {day}
                        </div>
                      ))}
                      
                      {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-background p-2 min-h-[100px]" />
                      ))}
                      
                      {days.map(day => {
                        const dayItems = getItemsForDay(day);
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={`bg-background p-2 min-h-[100px] border-t ${
                              isToday(day) ? 'bg-[hsl(28,94%,54%)]/5' : ''
                            }`}
                          >
                            <div className={`text-sm font-medium mb-1 ${
                              isToday(day) 
                                ? 'h-6 w-6 rounded-full bg-[hsl(28,94%,54%)] text-white flex items-center justify-center' 
                                : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            <div className="space-y-1">
                              {dayItems.slice(0, 2).map(item => (
                                <div 
                                  key={item.id} 
                                  className={`text-xs p-1 rounded truncate border ${getEventTypeColor(item.type)}`}
                                  title={item.title}
                                >
                                  {item.title}
                                </div>
                              ))}
                              {dayItems.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayItems.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-blue-200" />
                        <span className="text-muted-foreground">Appointments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-amber-200" />
                        <span className="text-muted-foreground">Tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded bg-orange-200" />
                        <span className="text-muted-foreground">Closings</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Upcoming
                </CardTitle>
                <CardDescription>
                  {selectedAgent ? `${selectedAgent.name}'s next 5 items` : "Your next 5 items"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : upcomingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming items
                  </p>
                ) : (
                  upcomingItems.map(item => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      data-testid={`card-event-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {format(parseISO(item.startDate), "MMM d, h:mm a")}
                          </div>
                          {item.personName && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {item.personName}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${getEventTypeColor(item.type)}`}>
                          {item.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <Badge className="bg-[hsl(28,94%,54%)]">
                    {allItems.length} items
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Appointments</span>
                  <span className="font-medium">
                    {allItems.filter(i => i.type === 'appointment').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tasks</span>
                  <span className="font-medium">
                    {allItems.filter(i => i.type === 'task').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
