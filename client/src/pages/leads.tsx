import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ListTodo
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
  homePurchaseAnniversary?: string;
}

interface Task {
  id: number;
  name: string;
  dueDate: string;
  completed: boolean;
  personId?: number;
  personName?: string;
}

function LeadCard({ lead, type }: { lead: Lead; type: 'anniversary' | 'activity' }) {
  const getAnniversaryInfo = () => {
    if (!lead.homePurchaseAnniversary) return null;
    const anniversary = new Date(lead.homePurchaseAnniversary);
    const today = new Date();
    const thisYearAnniversary = new Date(today.getFullYear(), anniversary.getMonth(), anniversary.getDate());
    const nextYearAnniversary = new Date(today.getFullYear() + 1, anniversary.getMonth(), anniversary.getDate());
    
    const diffThis = differenceInDays(thisYearAnniversary, today);
    const diffNext = differenceInDays(nextYearAnniversary, today);
    
    const daysUntil = Math.abs(diffThis) < Math.abs(diffNext) ? diffThis : diffNext;
    const yearsAgo = today.getFullYear() - anniversary.getFullYear();
    
    return { daysUntil, yearsAgo, originalDate: anniversary };
  };

  const anniversaryInfo = type === 'anniversary' ? getAnniversaryInfo() : null;

  return (
    <Card className="hover:bg-accent/50 transition-colors" data-testid={`card-lead-${lead.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</h3>
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

            {type === 'activity' && lead.lastActivity && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Last activity: {formatDistanceToNow(new Date(lead.lastActivity), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {type === 'anniversary' && anniversaryInfo && (
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-[hsl(28,94%,54%)]">
                <PartyPopper className="h-4 w-4" />
                <span className="font-semibold">{anniversaryInfo.yearsAgo} years</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {anniversaryInfo.daysUntil === 0 ? (
                  <span className="text-[hsl(28,94%,54%)] font-medium">Today!</span>
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
      className={`hover:bg-accent/50 transition-colors ${isOverdue ? 'border-red-500/50' : isDueToday ? 'border-[hsl(28,94%,54%)]/50' : ''}`}
      data-testid={`card-task-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
            {task.personName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{task.personName}</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueToday ? 'text-[hsl(28,94%,54%)]' : 'text-muted-foreground'}`}>
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
  const { data: anniversaryData, isLoading: loadingAnniversary } = useQuery({
    queryKey: ['/api/fub/leads/anniversary'],
    queryFn: async () => {
      const res = await fetch('/api/fub/leads/anniversary');
      if (!res.ok) throw new Error('Failed to fetch anniversary leads');
      return res.json();
    }
  });

  const { data: recentActivityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['/api/fub/leads/recent-activity'],
    queryFn: async () => {
      const res = await fetch('/api/fub/leads/recent-activity');
      if (!res.ok) throw new Error('Failed to fetch recent activity leads');
      return res.json();
    }
  });

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/fub/tasks/due'],
    queryFn: async () => {
      const res = await fetch('/api/fub/tasks/due');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    }
  });

  const anniversaryLeads: Lead[] = anniversaryData?.leads || [];
  const recentActivityLeads: Lead[] = recentActivityData?.leads || [];
  const dueTasks: Task[] = tasksData?.tasks || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Smart lists to help you stay connected with your clients
          </p>
        </div>

        <Tabs defaultValue="anniversary" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="anniversary" className="gap-2" data-testid="tab-anniversary">
              <PartyPopper className="h-4 w-4" />
              <span className="hidden sm:inline">Anniversary</span>
              {anniversaryLeads.length > 0 && (
                <Badge variant="secondary" className="ml-1">{anniversaryLeads.length}</Badge>
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

          <TabsContent value="anniversary" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-[hsl(28,94%,54%)]" />
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
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[hsl(28,94%,54%)]" />
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
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-[hsl(28,94%,54%)]" />
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
