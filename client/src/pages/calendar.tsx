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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, MapPin, FileText, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { useState, useMemo, type MouseEvent } from "react";
import type { GoogleCalendarEvent } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

// ── Merged event type ───────────────────────────────────────────────────
// Extends GoogleCalendarEvent with source tracking and Google company fields
interface MergedCalendarEvent extends GoogleCalendarEvent {
  source: 'fub' | 'google_company';
  /** Google company calendar color keyword (training, zillow, company, admin) */
  googleColor?: string;
  /** Attendee RSVP status for the current user — only on google_company events */
  rsvpStatus?: 'accepted' | 'needsAction' | 'declined' | 'tentative';
  personName?: string;
  personId?: number;
}

// ── Google company-calendar API shape ───────────────────────────────────
interface GoogleCompanyEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  description: string | null;
  color: string;
  source: 'google_company';
}

interface GoogleCompanyResponse {
  events: GoogleCompanyEvent[];
}

interface FubCalendarResponse {
  events: GoogleCalendarEvent[];
  message?: string;
}

// ── Spyglass color system ───────────────────────────────────────────────
// Color coding based on keyword matching in event title
const SPYGLASS_CATEGORIES = {
  training: { hex: '#EF4923', label: 'Training', keywords: ['training'] },
  zillow:   { hex: '#185FA5', label: 'Zillow',   keywords: ['zillow'] },
  company:  { hex: '#3B6D11', label: 'Company',  keywords: ['company', 'meeting'] },
  admin:    { hex: '#534AB7', label: 'Admin',     keywords: ['admin'] },
  fub:      { hex: '#7F77DD', label: 'FUB',       keywords: [] },
} as const;

type CategoryKey = keyof typeof SPYGLASS_CATEGORIES;

function categorizeEvent(event: MergedCalendarEvent): CategoryKey {
  if (event.source === 'fub') return 'fub';
  const titleLower = (event.title || '').toLowerCase();
  for (const [key, cat] of Object.entries(SPYGLASS_CATEGORIES)) {
    if (key === 'fub') continue;
    if (cat.keywords.some(kw => titleLower.includes(kw))) return key as CategoryKey;
  }
  return 'company'; // default Google events to company color
}

function getCategoryHex(category: CategoryKey): string {
  return SPYGLASS_CATEGORIES[category].hex;
}

// ── Role label helpers ──────────────────────────────────────────────────
function roleLabel(role: string): string {
  return role === 'developer' ? 'Developer' : role === 'admin' ? 'Admin' : 'Agent';
}

// ── Role badge component ────────────────────────────────────────────────
function RoleBadge({ role, viewAsRole }: { role: string; viewAsRole?: string }) {
  const styles = role === 'developer'
    ? 'bg-[#534AB7] text-white'
    : role === 'admin'
    ? 'bg-[#222222] text-white'
    : 'bg-gray-100 text-gray-700';
  const label = viewAsRole && viewAsRole !== role
    ? `${roleLabel(role)} (viewing as ${roleLabel(viewAsRole)})`
    : roleLabel(role);
  return <Badge className={`${styles} text-xs`}>{label}</Badge>;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { isDeveloper, isAdmin } = useUserRole();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MergedCalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<MergedCalendarEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { lastManualRefresh, lastAutoRefresh, isLoading: isSyncing, refresh: refreshSync } = useSyncStatus('calendar');

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const actualRole = user?.role || 'agent';
  const [viewAsRole, setViewAsRole] = useState<string>(actualRole);

  const canSeeAllAgents = viewAsRole === 'admin' || viewAsRole === 'developer';

  // ── FUB calendar fetch ──────────────────────────────────────────────
  const fubUrl = selectedAgentId
    ? `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}&agentId=${selectedAgentId}`
    : `/api/fub/calendar?startDate=${startDate}&endDate=${endDate}`;

  const { data: fubData, isLoading: fubLoading, error: fubError, refetch: refetchFub } = useQuery<FubCalendarResponse>({
    queryKey: ["/api/fub/calendar", { startDate, endDate, agentId: selectedAgentId }],
    queryFn: async () => {
      const res = await fetch(fubUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch FUB calendar events");
      return res.json();
    },
  });

  // ── Google company calendar fetch ───────────────────────────────────
  const { data: googleData, isLoading: googleLoading, error: googleError, refetch: refetchGoogle, dataUpdatedAt: googleSyncTime } = useQuery<GoogleCompanyResponse>({
    queryKey: ["/api/google/company-calendar"],
    queryFn: async () => {
      const res = await fetch("/api/google/company-calendar", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Google company calendar");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const isLoading = fubLoading || googleLoading;
  const error = fubError || googleError;

  const handleRefresh = async () => {
    await refreshSync(async () => {
      await Promise.all([refetchFub(), refetchGoogle()]);
    });
  };

  // ── Merge events from both sources ──────────────────────────────────
  const allItems = useMemo<MergedCalendarEvent[]>(() => {
    const fubEvents: MergedCalendarEvent[] = (fubData?.events || [])
      .filter(e => e.status !== 'cancelled')
      .map(e => ({
        ...e,
        source: 'fub' as const,
      }));

    const googleEvents: MergedCalendarEvent[] = (googleData?.events || [])
      .map((e): MergedCalendarEvent => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        startDate: e.start,
        endDate: e.end,
        allDay: e.allDay,
        type: 'event' as const,
        status: 'confirmed' as const,
        source: 'google_company' as const,
        googleColor: e.color,
      }))
      // Don't show declined events
      .filter(e => e.rsvpStatus !== 'declined');

    // Merge and sort by start date
    return [...fubEvents, ...googleEvents].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [fubData, googleData]);

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

  // Check if a day has any training event
  const dayHasTraining = (dayItems: MergedCalendarEvent[]): boolean => {
    return dayItems.some(item => {
      const cat = categorizeEvent(item);
      return cat === 'training';
    });
  };

  const handleEventClick = (event: MergedCalendarEvent, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDayEvents(null);
  };

  const handleDayClick = (date: Date, dayItems: MergedCalendarEvent[]) => {
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

  const formatEventTime = (event: MergedCalendarEvent) => {
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
    .slice(0, 5);

  // Quick stats by source
  const fubCount = allItems.filter(e => e.source === 'fub').length;
  const googleCount = allItems.filter(e => e.source === 'google_company').length;

  // Stats by category
  const eventsByCategory = allItems.reduce<Record<string, number>>((acc, item) => {
    const cat = categorizeEvent(item);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Pending event check (dashed border)
  const isPending = (event: MergedCalendarEvent): boolean => {
    return event.source === 'google_company' && event.rsvpStatus === 'needsAction';
  };

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Unable to Load Calendar</h2>
          <p className="text-muted-foreground mb-4">
            {(error as Error).message || "Please check your connections."}
          </p>
          <p className="text-sm text-muted-foreground">
            Events synced from Follow Up Boss + Google Calendar
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold" data-testid="text-calendar-title">Calendar</h1>
              <RoleBadge role={actualRole} viewAsRole={viewAsRole} />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {selectedAgentId
                ? "Viewing agent's calendar"
                : canSeeAllAgents
                  ? "All agents' schedules & company events"
                  : "Your schedule & company events"}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Role switcher — developer sees all 3, admin sees admin+agent, agent sees nothing */}
            {(isDeveloper || (isAdmin && !isDeveloper)) && (
              <Select
                value={viewAsRole}
                onValueChange={(val) => {
                  setViewAsRole(val);
                  // Reset agent filter when switching to agent view (agent can't filter)
                  if (val === 'agent') setSelectedAgentId(null);
                }}
              >
                <SelectTrigger className="w-[160px] h-9 text-sm" data-testid="select-view-as-role">
                  <span className="text-muted-foreground mr-1">View as:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isDeveloper && <SelectItem value="developer">Developer</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            )}
            {canSeeAllAgents && (
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
            {googleSyncTime > 0 && (
              <div className="text-xs text-muted-foreground px-2">
                Synced from Google {format(new Date(googleSyncTime), "h:mm a")}
              </div>
            )}
          </div>
        </div>

        {fubData?.message && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">{fubData.message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* ── Calendar grid ──────────────────────────────────────── */}
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

                {/* ── Color legend row ────────────────────────────── */}
                <div className="flex flex-wrap gap-3 sm:gap-5 mt-2 text-[10px] sm:text-xs">
                  {Object.entries(SPYGLASS_CATEGORIES).map(([key, cat]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full"
                        style={{ backgroundColor: cat.hex }}
                      />
                      <span className="text-muted-foreground">{cat.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-dashed"
                      style={{ borderColor: '#EF4923' }}
                    />
                    <span className="text-muted-foreground">Pending invite</span>
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
                      const hasTraining = dayHasTraining(dayItems);
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
                            {dayItems.slice(0, 2).map((item, idx) => {
                              const category = categorizeEvent(item);
                              const hex = getCategoryHex(category);
                              const pending = isPending(item);
                              return (
                                <div
                                  key={item.id}
                                  className={`text-[9px] sm:text-xs p-1 sm:p-1.5 rounded truncate cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity min-h-[24px] sm:min-h-[28px] ${
                                    pending ? 'border-2 border-dashed bg-transparent' : 'border'
                                  } ${idx > 0 ? 'hidden sm:block' : ''}`}
                                  style={pending ? {
                                    borderColor: hex,
                                    color: hex,
                                  } : {
                                    backgroundColor: `${hex}20`,
                                    color: hex,
                                    borderColor: `${hex}40`
                                  }}
                                  title={item.title + (pending ? ' (invited)' : '')}
                                  onClick={(e) => handleEventClick(item, e)}
                                  data-testid={`event-${item.id}`}
                                >
                                  <span className="hidden sm:inline">
                                    {item.title}{pending ? ' (invited)' : ''}
                                  </span>
                                  <span className="sm:hidden">{item.title.substring(0, 6)}..</span>
                                </div>
                              );
                            })}
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
                            {/* No Training Today pill */}
                            {!hasTraining && dayItems.length < 3 && (
                              <div className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-50 rounded px-1 py-0.5 truncate hidden sm:block">
                                No Training
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
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
                  upcomingItems.map(item => {
                    const category = categorizeEvent(item);
                    const hex = getCategoryHex(category);
                    const pending = isPending(item);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                        style={{ borderLeftWidth: '3px', borderLeftColor: hex }}
                        onClick={() => setSelectedEvent(item)}
                        data-testid={`card-event-${item.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.title}{pending ? ' (invited)' : ''}
                            </p>
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
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                            style={{ color: hex, borderColor: `${hex}60` }}
                          >
                            {item.source === 'fub' ? 'FUB' : SPYGLASS_CATEGORIES[category].label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
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
                  <Badge className="bg-[#222222]">
                    {allItems.length} events
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SPYGLASS_CATEGORIES.fub.hex }} />
                    FUB
                  </span>
                  <span className="font-medium">{fubCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SPYGLASS_CATEGORIES.company.hex }} />
                    Google
                  </span>
                  <span className="font-medium">{googleCount}</span>
                </div>
                <div className="border-t pt-2 mt-2" />
                {Object.entries(eventsByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: SPYGLASS_CATEGORIES[cat as CategoryKey]?.hex || '#999' }}
                        />
                        {SPYGLASS_CATEGORIES[cat as CategoryKey]?.label || cat}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                }
                {Object.keys(eventsByCategory).length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">No events this month</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Event Detail Dialog ───────────────────────────────────── */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <CalendarIcon className="h-5 w-5" style={{ color: selectedEvent ? getCategoryHex(categorizeEvent(selectedEvent)) : '#222' }} />
              Event Details
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span className="flex items-center gap-2">
                  {selectedEvent.source === 'fub' ? 'Follow Up Boss' : 'Google Calendar'}
                  {isPending(selectedEvent) && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Pending invite</Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (() => {
            const category = categorizeEvent(selectedEvent);
            const hex = getCategoryHex(category);
            return (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge style={{ backgroundColor: `${hex}20`, color: hex, borderColor: `${hex}40` }}>
                      {SPYGLASS_CATEGORIES[category].label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedEvent.source === 'fub' ? 'FUB' : 'Google'}
                    </Badge>
                    {isPending(selectedEvent) && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 border-dashed">Invited</Badge>
                    )}
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

                  {selectedEvent.personName && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Contact</p>
                        <p className="text-muted-foreground">{selectedEvent.personName}</p>
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
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Day Events List Dialog ────────────────────────────────── */}
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
            {selectedDayEvents?.map(item => {
              const category = categorizeEvent(item);
              const hex = getCategoryHex(category);
              const pending = isPending(item);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  style={{ borderLeftWidth: '3px', borderLeftColor: hex }}
                  onClick={() => {
                    setSelectedEvent(item);
                    setSelectedDayEvents(null);
                  }}
                  data-testid={`day-event-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {item.title}{pending ? ' (invited)' : ''}
                      </p>
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
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${pending ? 'border-dashed' : ''}`}
                      style={{ color: hex, borderColor: `${hex}60` }}
                    >
                      {item.source === 'fub' ? 'FUB' : SPYGLASS_CATEGORIES[category].label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
