import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentSelector } from "@/components/agent-selector";
import { useAuth } from "@/hooks/useAuth";
import { FubNotLinkedBanner } from "@/components/leads/FubNotLinkedBanner";
import { useToast } from "@/hooks/use-toast";
import { RefreshButton } from "@/components/ui/refresh-button";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2,
  AlertCircle,
  PartyPopper,
  Activity,
  ListTodo,
  Cake,
  ExternalLink,
  Users
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays, isToday, isPast } from "date-fns";

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  stage?: string;
  source?: string;
  created: string;
  lastActivity?: string;
  lastLeadActivity?: string;
  homePurchaseAnniversary?: string;
  birthday?: string;
}

interface Task {
  id: number;
  name: string;
  dueDate: string;
  completed: boolean;
  personId?: number;
  personName?: string;
}

function LeadCard({ lead, type }: { lead: Lead; type: 'anniversary' | 'activity' | 'birthday' }) {
  const getDateInfo = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const today = new Date();
    const thisYearDate = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    const nextYearDate = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
    
    const diffThis = differenceInDays(thisYearDate, today);
    const diffNext = differenceInDays(nextYearDate, today);
    
    const daysUntil = Math.abs(diffThis) < Math.abs(diffNext) ? diffThis : diffNext;
    const yearsAgo = today.getFullYear() - date.getFullYear();
    
    return { daysUntil, yearsAgo, originalDate: date };
  };

  const anniversaryInfo = type === 'anniversary' ? getDateInfo(lead.homePurchaseAnniversary) : null;
  const birthdayInfo = type === 'birthday' ? getDateInfo(lead.birthday) : null;

  return (
    <Card className="hover:bg-accent/50 transition-colors" data-testid={`card-lead-${lead.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <a 
                href={`https://app.followupboss.com/2/people/view/${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium truncate hover:text-[#EF4923] hover:underline transition-colors flex items-center gap-1.5 group"
                data-testid={`link-lead-${lead.id}`}
              >
                {lead.name}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
              {lead.stage && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {lead.stage}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Phone className="h-3 w-3" />
                  <span>{lead.phone}</span>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{lead.email}</span>
                </a>
              )}
              {lead.source && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{lead.source}</span>
                </span>
              )}
            </div>

            {type === 'activity' && (lead.lastLeadActivity || lead.lastActivity) && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Last activity: {formatDistanceToNow(new Date(lead.lastLeadActivity || lead.lastActivity!), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {type === 'anniversary' && anniversaryInfo && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-[#EF4923]">
                <PartyPopper className="h-4 w-4" />
                <span className="font-semibold">{anniversaryInfo.yearsAgo} years</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {anniversaryInfo.daysUntil === 0 ? (
                  <span className="text-[#EF4923] font-medium">Today!</span>
                ) : anniversaryInfo.daysUntil > 0 ? (
                  <span>In {anniversaryInfo.daysUntil} days</span>
                ) : (
                  <span>{Math.abs(anniversaryInfo.daysUntil)} days ago</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(anniversaryInfo.originalDate, 'MMM d, yyyy')}
              </div>
            </div>
          )}

          {type === 'birthday' && birthdayInfo && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-pink-500">
                <Cake className="h-4 w-4" />
                <span className="font-semibold">Turning {birthdayInfo.yearsAgo + (birthdayInfo.daysUntil >= 0 ? 1 : 0)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {birthdayInfo.daysUntil === 0 ? (
                  <span className="text-pink-500 font-medium">Today!</span>
                ) : birthdayInfo.daysUntil > 0 ? (
                  <span>In {birthdayInfo.daysUntil} days</span>
                ) : (
                  <span>{Math.abs(birthdayInfo.daysUntil)} days ago</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(birthdayInfo.originalDate, 'MMM d')}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: Task }) {
  const dueDate = new Date(task.dueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const isDueToday = isToday(dueDate);

  return (
    <Card 
      className={`hover:bg-accent/50 transition-colors ${isOverdue ? 'border-red-500/50' : isDueToday ? 'border-[#EF4923]/50' : ''}`}
      data-testid={`card-task-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
            {task.personName && task.personId && (
              <a 
                href={`https://app.followupboss.com/2/people/view/${task.personId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground mt-1 hover:text-[#EF4923] hover:underline transition-colors group"
                data-testid={`link-task-person-${task.personId}`}
              >
                <User className="h-3 w-3" />
                <span>{task.personName}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
            {task.personName && !task.personId && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{task.personName}</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueToday ? 'text-[#EF4923]' : 'text-muted-foreground'}`}>
              {isOverdue ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isDueToday ? 'Today' : format(dueDate, 'MMM d')}
              </span>
            </div>
            {isOverdue && (
              <span className="text-xs text-red-500">
                {formatDistanceToNow(dueDate, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Icon className="h-12 w-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [lastManualSync, setLastManualSync] = useState<Date | null>(null);

  const getUrl = (base: string) => {
    return selectedAgentId ? `${base}?agentId=${selectedAgentId}` : base;
  };

  const { data: anniversaryData, isLoading: loadingAnniversary } = useQuery({
    queryKey: ['/api/fub/leads/anniversary', selectedAgentId],
    queryFn: async () => {
      const res = await fetch(getUrl('/api/fub/leads/anniversary'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch anniversary leads');
      return res.json();
    }
  });

  const { data: recentActivityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/fub/leads/recent-activity', selectedAgentId],
    queryFn: async () => {
      const res = await fetch(getUrl('/api/fub/leads/recent-activity'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch recent activity leads');
      return res.json();
    }
  });

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/fub/tasks/due', selectedAgentId],
    queryFn: async () => {
      const res = await fetch(getUrl('/api/fub/tasks/due'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const { data: birthdayData, isLoading: loadingBirthdays } = useQuery({
    queryKey: ['/api/fub/leads/birthdays', selectedAgentId],
    queryFn: async () => {
      const res = await fetch(getUrl('/api/fub/leads/birthdays'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch birthday leads');
      return res.json();
    }
  });

  const { data: allLeadsData, isLoading: loadingAllLeads } = useQuery({
    queryKey: ['/api/fub/leads/all', selectedAgentId],
    queryFn: async () => {
      const res = await fetch(getUrl('/api/fub/leads/all'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch all leads');
      return res.json();
    }
  });

  const handleRefresh = async () => {
    try {
      // Refetch all leads-related queries to get fresh data from FUB
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/fub/leads/anniversary', selectedAgentId], exact: true }),
        queryClient.refetchQueries({ queryKey: ['/api/fub/leads/recent-activity', selectedAgentId], exact: true }),
        queryClient.refetchQueries({ queryKey: ['/api/fub/leads/birthdays', selectedAgentId], exact: true }),
        queryClient.refetchQueries({ queryKey: ['/api/fub/leads/all', selectedAgentId], exact: true }),
        queryClient.refetchQueries({ queryKey: ['/api/fub/tasks/due', selectedAgentId], exact: true }),
      ]);
      
      setLastManualSync(new Date());
      
      toast({
        title: "Leads Refreshed",
        description: "Successfully synced latest data from Follow Up Boss",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh leads. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw so RefreshButton knows refresh failed
    }
  };

  const anniversaryLeads: Lead[] = anniversaryData?.leads || [];
  const recentActivityLeads: Lead[] = recentActivityData?.leads || [];
  const dueTasks: Task[] = tasksData?.tasks || [];
  const birthdayLeads: Lead[] = birthdayData?.leads || [];
  const allLeads: Lead[] = allLeadsData?.leads || [];
  
  // Check if FUB is linked (any response with linked: false means not linked)
  const isFubLinked = anniversaryData?.linked !== false;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Leads</h1>
            <p className="text-muted-foreground mt-1">
              {selectedAgentId 
                ? "Viewing selected agent's leads" 
                : "Smart lists to help you stay connected with your clients"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RefreshButton
              onRefresh={handleRefresh}
              lastManualSync={lastManualSync}
              label="Refresh"
              showTimestamps={true}
            />
            {user?.isSuperAdmin && (
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentChange={setSelectedAgentId}
              />
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all" className="gap-2" data-testid="tab-all-leads">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">All Leads</span>
              {allLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1">{allLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="anniversary" className="gap-2" data-testid="tab-anniversary">
              <PartyPopper className="h-4 w-4" />
              <span className="hidden sm:inline">Anniversary</span>
              {anniversaryLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1">{anniversaryLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="gap-2" data-testid="tab-birthdays">
              <Cake className="h-4 w-4" />
              <span className="hidden sm:inline">Birthdays</span>
              {birthdayLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1">{birthdayLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2" data-testid="tab-recent-activity">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Recent Activity</span>
              {recentActivityLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1">{recentActivityLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Due Tasks</span>
              {dueTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{dueTasks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {!isFubLinked ? (
              <FubNotLinkedBanner />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#EF4923]" />
                    All Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAllLeads ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : allLeads.length === 0 ? (
                    <EmptyState 
                      icon={Users} 
                      message="No leads found assigned to your account. Try refreshing or check your Follow Up Boss lead assignments." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {allLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} type="activity" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="anniversary" className="mt-6">
            {!isFubLinked ? (
              <FubNotLinkedBanner />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PartyPopper className="h-5 w-5 text-[#EF4923]" />
                    Home Purchase Anniversaries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAnniversary ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : anniversaryLeads.length === 0 ? (
                    <EmptyState 
                      icon={PartyPopper} 
                      message="No upcoming anniversaries found. Make sure your leads have the Home Purchase Anniversary field set in Follow Up Boss." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {anniversaryLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} type="anniversary" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="birthdays" className="mt-6">
            {!isFubLinked ? (
              <FubNotLinkedBanner />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cake className="h-5 w-5 text-pink-500" />
                    Client Birthdays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBirthdays ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : birthdayLeads.length === 0 ? (
                    <EmptyState 
                      icon={Cake} 
                      message="No upcoming birthdays found. Make sure your leads have the Birthday field set in Follow Up Boss." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {birthdayLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} type="birthday" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {!isFubLinked ? (
              <FubNotLinkedBanner />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#EF4923]" />
                    Recent Activity
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Leads created over 30 days ago with activity in the last 3 days
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingActivity ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : recentActivityLeads.length === 0 ? (
                    <EmptyState 
                      icon={Activity} 
                      message="No leads matching this criteria. This list shows leads created over 30 days ago that have had activity in the last 3 days." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {recentActivityLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} type="activity" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            {!isFubLinked ? (
              <FubNotLinkedBanner />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-[#EF4923]" />
                    Due Tasks
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Incomplete tasks assigned to you, sorted by due date
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingTasks ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : dueTasks.length === 0 ? (
                    <EmptyState 
                      icon={CheckCircle2} 
                      message="No pending tasks! You're all caught up." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {dueTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
