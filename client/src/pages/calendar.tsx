import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSelector } from "@/components/agent-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, MapPin, FileText, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { useState, type MouseEvent } from "react";
import type { FubEvent } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface CalendarResponse {
  events: FubEvent[];
  tasks: FubEvent[];
  message?: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FubEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<FubEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

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

  const getEventTypeLabel = (type: FubEvent['type']) => {
    switch (type) {
      case 'appointment': return 'Appointment';
      case 'task': return 'Task';
      case 'deal_closing': return 'Deal Closing';
      default: return 'Event';
    }
  };

  const handleEventClick = (event: FubEvent, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDayEvents(null);
  };

  const handleDayClick = (date: Date, dayItems: FubEvent[]) => {
    if (dayItems.length === 0) return;
    if (dayItems.length === 1) {
      setSelectedEvent(dayItems[0]);
      setSelectedDayEvents(null);
    } else {
      setSelectedDate(date);
      setSelectedDayEvents(dayItems);
      setSelectedEvent(null);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-calendar-title">Calendar</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {selectedAgentId 
                ? "Viewing agent's calendar" 
                : "Your appointments & tasks"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {user?.isSuperAdmin && (
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentChange={setSelectedAgentId}
              />
            )}
            <a href="https://app.followupboss.com/calendar" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-[#EF4923]/30 hover:bg-[#EF4923]/10 h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm">
                <span className="hidden sm:inline">Open in FUB</span>
                <span className="sm:hidden">FUB</span>
                <ExternalLink className="ml-1 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-lg sm:text-xl">
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex gap-0.5 sm:gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="bg-background p-1 sm:p-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground">
                          <span className="sm:hidden">{day}</span>
                          <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                        </div>
                      ))}
                      
                      {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-background p-1 sm:p-2 min-h-[60px] sm:min-h-[80px] md:min-h-[100px]" />
                      ))}
                      
                      {days.map(day => {
                        const dayItems = getItemsForDay(day);
                        const hasEvents = dayItems.length > 0;
                        return (
                          <div 
                            key={day.toISOString()} 
                            className={`bg-background p-1.5 sm:p-2 min-h-[70px] sm:min-h-[80px] md:min-h-[100px] border-t ${
                              isToday(day) ? 'bg-[#EF4923]/5' : ''
                            } ${hasEvents ? 'cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/70' : ''}`}
                            onClick={() => handleDayClick(day, dayItems)}
                            data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                          >
                            <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                              isToday(day) 
                                ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-[#EF4923] text-white flex items-center justify-center text-[10px] sm:text-sm' 
                                : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              {dayItems.slice(0, 2).map((item, idx) => (
                                <div 
                                  key={item.id} 
                                  className={`text-[9px] sm:text-xs p-1 sm:p-1.5 rounded truncate border cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity min-h-[24px] sm:min-h-[28px] ${getEventTypeColor(item.type)} ${idx > 0 ? 'hidden sm:block' : ''}`}
                                  title={item.title}
                                  onClick={(e) => handleEventClick(item, e)}
                                  data-testid={`event-${item.id}`}
                                >
                                  <span className="hidden sm:inline">{item.title}</span>
                                  <span className="sm:hidden">{item.title.substring(0, 6)}..</span>
                                </div>
                              ))}
                              {dayItems.length > 2 && (
                                <div className="text-[9px] sm:text-xs text-muted-foreground cursor-pointer hover:text-foreground hidden sm:block">
                                  +{dayItems.length - 2} more
                                </div>
                              )}
                              {dayItems.length > 1 && (
                                <div className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground sm:hidden">
                                  +{dayItems.length - 1}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-blue-200" />
                        <span className="text-muted-foreground">Appointments</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-amber-200" />
                        <span className="text-muted-foreground">Tasks</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-orange-200" />
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
                  {selectedAgentId ? "Agent's next 5 items" : "Your next 5 items"}
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
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedEvent(item)}
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
                  <Badge className="bg-[#EF4923]">
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

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarIcon className="h-5 w-5 text-[#EF4923]" />
              Event Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && getEventTypeLabel(selectedEvent.type)}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <Badge className={`mt-2 ${getEventTypeColor(selectedEvent.type)}`}>
                  {getEventTypeLabel(selectedEvent.type)}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {format(parseISO(selectedEvent.startDate), "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-muted-foreground">
                      {format(parseISO(selectedEvent.startDate), "h:mm a")}
                      {selectedEvent.endDate && ` - ${format(parseISO(selectedEvent.endDate), "h:mm a")}`}
                    </p>
                  </div>
                </div>

                {selectedEvent.personName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Contact</p>
                      <p className="text-muted-foreground">{selectedEvent.personName}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Notes</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                {selectedEvent.personId && (
                  <a 
                    href={`https://app.followupboss.com/people/${selectedEvent.personId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" data-testid="button-view-in-fub">
                      View in FUB
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                )}
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setSelectedEvent(null)}
                  data-testid="button-close-modal"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDayEvents} onOpenChange={() => setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-day-events">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarIcon className="h-5 w-5 text-[#EF4923]" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d")}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEvents?.length} events on this day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedDayEvents?.map(item => (
              <div 
                key={item.id} 
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedEvent(item);
                  setSelectedDayEvents(null);
                }}
                data-testid={`day-event-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(item.startDate), "h:mm a")}
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
