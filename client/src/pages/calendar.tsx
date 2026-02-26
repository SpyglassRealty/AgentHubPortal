import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSelector } from "@/components/agent-selector";
import { RefreshButton } from "@/components/ui/refresh-button";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, MapPin, FileText, X, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { useState, type MouseEvent } from "react";
import type { GoogleCalendarEvent } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface CalendarResponse {
  events: GoogleCalendarEvent[];
  message?: string;
}

const EVENT_TYPE_COLORS: Record<GoogleCalendarEvent['type'], { bg: string; text: string; border: string }> = {
  event: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  meeting: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  showing: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  closing: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  open_house: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  listing: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  inspection: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
};

const EVENT_TYPE_LABELS: Record<GoogleCalendarEvent['type'], string> = {
  event: 'Event',
  meeting: 'Meeting',
  showing: 'Showing',
  closing: 'Closing',
  open_house: 'Open House',
  listing: 'Listing',
  inspection: 'Inspection',
};

function getEventTypeClasses(type: GoogleCalendarEvent['type']): string {
  const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.event;
  return `${c.bg} ${c.text} ${c.border}`;
}

function getEventDotColor(type: GoogleCalendarEvent['type']): string {
  const dotColors: Record<GoogleCalendarEvent['type'], string> = {
    event: 'bg-blue-400',
    meeting: 'bg-indigo-400',
    showing: 'bg-emerald-400',
    closing: 'bg-orange-400',
    open_house: 'bg-purple-400',
    listing: 'bg-cyan-400',
    inspection: 'bg-amber-400',
  };
  return dotColors[type] || dotColors.event;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<GoogleCalendarEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { lastManualRefresh, lastAutoRefresh, isLoading: isSyncing, refresh: refreshSync } = useSyncStatus('calendar');
  
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const calendarUrl = selectedAgentId 
    ? `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}&agentId=${selectedAgentId}`
    : `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}`;

  const { data, isLoading, error, refetch } = useQuery<CalendarResponse>({
    queryKey: ["/api/fub/calendar", { startDate, endDate, agentId: selectedAgentId }],
    queryFn: async () => {
      const res = await fetch(calendarUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
  });

  const handleRefresh = async () => {
    await refreshSync(async () => {
      await refetch();
    });
  };

  const allItems = (data?.events || []).filter(e => e.status !== 'cancelled');
  
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getItemsForDay = (date: Date) => {
    return allItems.filter(item => {
      const itemDate = item.allDay 
        ? new Date(item.startDate + 'T00:00:00') 
        : parseISO(item.startDate);
      return isSameDay(itemDate, date);
    });
  };

  const handleEventClick = (event: GoogleCalendarEvent, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDayEvents(null);
  };

  const handleDayClick = (date: Date, dayItems: GoogleCalendarEvent[]) => {
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

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (event.allDay) return 'All day';
    try {
      const start = parseISO(event.startDate);
      const time = format(start, "h:mm a");
      if (event.endDate) {
        const end = parseISO(event.endDate);
        return `${time} - ${format(end, "h:mm a")}`;
      }
      return time;
    } catch {
      return '';
    }
  };

  const upcomingItems = allItems
    .filter(item => {
      const itemDate = item.allDay 
        ? new Date(item.startDate + 'T23:59:59') 
        : new Date(item.startDate);
      return itemDate >= new Date();
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  // Quick stats
  const eventsByType = allItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Unable to Load Calendar</h2>
          <p className="text-muted-foreground mb-4">
            {(error as Error).message || "Please check your Follow Up Boss connection."}
          </p>
          <p className="text-sm text-muted-foreground">
            Events synced from Follow Up Boss
          </p>
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
                : "Your schedule & appointments"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {user?.isSuperAdmin && (
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentChange={setSelectedAgentId}
              />
            )}
            <RefreshButton
              lastManualRefresh={lastManualRefresh}
              lastAutoRefresh={lastAutoRefresh}
              onRefresh={handleRefresh}
              isLoading={isLoading || isSyncing}
            />
            <div className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-4">
              Events synced from Follow Up Boss
            </div>
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
                              isToday(day) ? 'bg-blue-500/5' : ''
                            } ${hasEvents ? 'cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/70' : ''}`}
                            onClick={() => handleDayClick(day, dayItems)}
                            data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
                          >
                            <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                              isToday(day) 
                                ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-sm' 
                                : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              {dayItems.slice(0, 2).map((item, idx) => (
                                <div 
                                  key={item.id} 
                                  className={`text-[9px] sm:text-xs p-1 sm:p-1.5 rounded truncate border cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity min-h-[24px] sm:min-h-[28px] ${
                                    item.colorHex 
                                      ? '' 
                                      : getEventTypeClasses(item.type)
                                  } ${idx > 0 ? 'hidden sm:block' : ''}`}
                                  style={item.colorHex ? { 
                                    backgroundColor: `${item.colorHex}20`, 
                                    color: item.colorHex,
                                    borderColor: `${item.colorHex}40`
                                  } : undefined}
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
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-blue-300" />
                        <span className="text-muted-foreground">Events</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-indigo-300" />
                        <span className="text-muted-foreground">Meetings</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-emerald-300" />
                        <span className="text-muted-foreground">Showings</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded bg-orange-300" />
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
                  {selectedAgentId ? "Agent's next events" : "Your next events"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : upcomingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming events
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
                            {item.allDay 
                              ? format(new Date(item.startDate + 'T00:00:00'), "MMM d") + ' · All day'
                              : format(parseISO(item.startDate), "MMM d, h:mm a")
                            }
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${getEventTypeClasses(item.type)}`}>
                          {EVENT_TYPE_LABELS[item.type]}
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
                  <Badge className="bg-blue-600">
                    {allItems.length} events
                  </Badge>
                </div>
                {Object.entries(eventsByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground capitalize">
                        {EVENT_TYPE_LABELS[type as GoogleCalendarEvent['type']] || type}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                }
                {Object.keys(eventsByType).length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">No events this month</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              Event Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && EVENT_TYPE_LABELS[selectedEvent.type]}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getEventTypeClasses(selectedEvent.type)}>
                    {EVENT_TYPE_LABELS[selectedEvent.type]}
                  </Badge>
                  {selectedEvent.status === 'tentative' && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">Tentative</Badge>
                  )}
                  {selectedEvent.status === 'cancelled' && (
                    <Badge variant="outline" className="text-red-600 border-red-300">Cancelled</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {selectedEvent.allDay
                        ? format(new Date(selectedEvent.startDate + 'T00:00:00'), "EEEE, MMMM d, yyyy")
                        : format(parseISO(selectedEvent.startDate), "EEEE, MMMM d, yyyy")
                      }
                    </p>
                    <p className="text-muted-foreground">
                      {formatEventTime(selectedEvent)}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Description</p>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs max-h-32 overflow-y-auto">
                        {selectedEvent.description.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                  </div>
                )}

                {selectedEvent.organizer && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Organizer</p>
                      <p className="text-muted-foreground">{selectedEvent.organizer}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Attendees ({selectedEvent.attendees.length})</p>
                      <div className="space-y-1 mt-1">
                        {selectedEvent.attendees.slice(0, 5).map((a, i) => (
                          <p key={i} className="text-muted-foreground text-xs flex items-center gap-1.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                              a.responseStatus === 'accepted' ? 'bg-green-500' :
                              a.responseStatus === 'declined' ? 'bg-red-500' :
                              a.responseStatus === 'tentative' ? 'bg-amber-500' :
                              'bg-gray-400'
                            }`} />
                            {a.displayName || a.email}
                          </p>
                        ))}
                        {selectedEvent.attendees.length > 5 && (
                          <p className="text-muted-foreground text-xs">
                            +{selectedEvent.attendees.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                {selectedEvent.htmlLink && (
                  <a 
                    href={selectedEvent.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" data-testid="button-view-in-gcal">
                      Open in Google Calendar
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

      {/* Day Events List Dialog */}
      <Dialog open={!!selectedDayEvents} onOpenChange={() => setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-day-events">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
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
                      {formatEventTime(item)}
                    </div>
                    {item.location && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${getEventTypeClasses(item.type)}`}>
                    {EVENT_TYPE_LABELS[item.type]}
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
