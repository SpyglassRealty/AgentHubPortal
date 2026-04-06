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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, AlertCircle, ExternalLink, MapPin, FileText, Users, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useState, useMemo, useCallback, useEffect, useRef, type MouseEvent } from "react";
import type { GoogleCalendarEvent } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

// ── Merged event type ───────────────────────────────────────────────────
interface MergedCalendarEvent extends GoogleCalendarEvent {
  source: 'fub' | 'google_company' | 'google_fub' | 'google_personal' | 'us_holiday' | 'birthday';
  /** Google company calendar color keyword (training, zillow, company, admin) */
  googleColor?: string;
  /** Calendar name from Google API */
  calendarName?: string;
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
  calendarName?: string;
  description: string | null;
  color: string;
  source: 'google_company' | 'google_fub' | 'google_personal';
}

interface GoogleCompanyResponse {
  events: GoogleCompanyEvent[];
}

interface FubCalendarResponse {
  events: GoogleCalendarEvent[];
  message?: string;
}

interface BirthdayEntry {
  name: string;
  birthday: string; // MM-DD
}

interface HolidayEntry {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  source: 'us_holiday';
}

// ── Spyglass color system ───────────────────────────────────────────────
const SPYGLASS_CATEGORIES = {
  training:   { hex: '#EF4923', label: 'Training',   keywords: ['training'] },
  zillow:     { hex: '#185FA5', label: 'Zillow',     keywords: ['zillow'] },
  company:    { hex: '#3B6D11', label: 'Company',    keywords: ['company', 'meeting'] },
  admin:      { hex: '#534AB7', label: 'Admin',      keywords: ['admin'] },
  fub:        { hex: '#7F77DD', label: 'FUB',        keywords: [] },
  google_fub: { hex: '#9B8FEE', label: 'FUB (Cal)',  keywords: [] },
  personal:   { hex: '#2196F3', label: 'Personal',   keywords: [] },
  birthday:   { hex: '#E91E8C', label: 'Birthday',   keywords: [] },
  us_holiday: { hex: '#888888', label: 'Holiday',    keywords: [] },
} as const;

type CategoryKey = keyof typeof SPYGLASS_CATEGORIES;

function categorizeEvent(event: MergedCalendarEvent): CategoryKey {
  if (event.source === 'birthday') return 'birthday';
  if (event.source === 'us_holiday') return 'us_holiday';
  if (event.source === 'fub') return 'fub';
  if (event.source === 'google_fub') return 'google_fub';
  if (event.source === 'google_personal') return 'personal';
  const titleLower = (event.title || '').toLowerCase();
  for (const [key, cat] of Object.entries(SPYGLASS_CATEGORIES)) {
    if (['fub', 'google_fub', 'personal', 'birthday', 'us_holiday'].includes(key)) continue;
    if (cat.keywords.some(kw => titleLower.includes(kw))) return key as CategoryKey;
  }
  return 'company';
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
  const [calView, setCalView] = useState<'month' | 'week' | 'day' | 'schedule'>('month');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MergedCalendarEvent | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<MergedCalendarEvent[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    staleTime: 5 * 60 * 1000,
  });

  // ── FUB Birthdays fetch ─────────────────────────────────────────────
  const { data: birthdayData } = useQuery<{ birthdays: BirthdayEntry[] }>({
    queryKey: ["/api/fub/birthdays"],
    queryFn: async () => {
      const res = await fetch("/api/fub/birthdays", { credentials: "include" });
      if (!res.ok) return { birthdays: [] };
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min cache
  });

  // ── US Holidays fetch ───────────────────────────────────────────────
  const { data: holidayData } = useQuery<{ holidays: HolidayEntry[] }>({
    queryKey: ["/api/google/holidays"],
    queryFn: async () => {
      const res = await fetch("/api/google/holidays", { credentials: "include" });
      if (!res.ok) return { holidays: [] };
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });

  const isLoading = fubLoading || googleLoading;
  const error = fubError || googleError;

  const handleRefresh = async () => {
    await refreshSync(async () => {
      await Promise.all([refetchFub(), refetchGoogle()]);
    });
  };

  // ── Convert birthdays to calendar events ────────────────────────────
  const birthdayEvents = useMemo<MergedCalendarEvent[]>(() => {
    if (!birthdayData?.birthdays?.length) return [];
    const year = currentMonth.getFullYear();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return birthdayData.birthdays
      .map((b, idx) => {
        const [mm, dd] = b.birthday.split('-').map(Number);
        if (!mm || !dd) return null;
        const date = new Date(year, mm - 1, dd);
        if (date < monthStart || date > monthEnd) return null;
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
          id: `birthday-${idx}-${b.birthday}`,
          title: `${b.name}'s birthday`,
          startDate: dateStr,
          endDate: dateStr,
          allDay: true,
          type: 'event' as const,
          status: 'confirmed' as const,
          source: 'birthday' as const,
        } as MergedCalendarEvent;
      })
      .filter((e): e is MergedCalendarEvent => e !== null);
  }, [birthdayData, currentMonth]);

  // ── Convert holidays to calendar events ─────────────────────────────
  const holidayEvents = useMemo<MergedCalendarEvent[]>(() => {
    if (!holidayData?.holidays?.length) return [];
    return holidayData.holidays.map((h) => ({
      id: h.id,
      title: h.title,
      startDate: h.start,
      endDate: h.end,
      allDay: h.allDay,
      type: 'event' as const,
      status: 'confirmed' as const,
      source: 'us_holiday' as const,
    } as MergedCalendarEvent));
  }, [holidayData]);

  // ── Merge events from all sources ──────────────────────────────────
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
        source: e.source as MergedCalendarEvent['source'],
        googleColor: e.color,
        calendarName: e.calendarName,
      }))
      .filter(e => e.rsvpStatus !== 'declined');

    return [...fubEvents, ...googleEvents, ...birthdayEvents, ...holidayEvents].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [fubData, googleData, birthdayEvents, holidayEvents]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getItemsForDay = useCallback((date: Date) => {
    return allItems.filter(item => {
      const itemDate = item.allDay
        ? new Date(item.startDate + 'T00:00:00')
        : parseISO(item.startDate);
      return isSameDay(itemDate, date);
    });
  }, [allItems]);

  const dayHasTraining = (dayItems: MergedCalendarEvent[]): boolean => {
    return dayItems.some(item => categorizeEvent(item) === 'training');
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

  // ── This Week summary counts ────────────────────────────────────────
  const thisWeekCounts = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const weekItems = allItems.filter(item => {
      const itemDate = item.allDay
        ? new Date(item.startDate + 'T00:00:00')
        : parseISO(item.startDate);
      return itemDate >= weekStart && itemDate <= weekEnd;
    });

    let trainings = 0;
    let fubAppts = 0;
    let companyEvents = 0;
    let holidays = 0;
    let birthdays = 0;

    for (const item of weekItems) {
      const cat = categorizeEvent(item);
      if (cat === 'training') trainings++;
      else if (cat === 'fub') fubAppts++;
      else if (cat === 'us_holiday') holidays++;
      else if (cat === 'birthday') birthdays++;
      else companyEvents++;
    }

    return { trainings, fubAppts, companyEvents, holidays, birthdays, weekItems };
  }, [allItems]);

  // ── Highlight a date on the calendar (auto-clears after 3s) ─────────
  const highlightDate = useCallback((dateStr: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedDate(dateStr);
    highlightTimerRef.current = setTimeout(() => setHighlightedDate(null), 3000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // ── Navigate to a date's month + highlight it ───────────────────────
  const navigateAndHighlight = useCallback((dateStr: string) => {
    const targetDate = new Date(dateStr + 'T00:00:00');
    const targetMonth = startOfMonth(targetDate);
    const currentMonthStart = startOfMonth(currentMonth);
    if (targetMonth.getTime() !== currentMonthStart.getTime()) {
      setCurrentMonth(targetMonth);
    }
    highlightDate(dateStr);
  }, [currentMonth, highlightDate]);

  // ── Handle "This Week" category click ───────────────────────────────
  const handleWeekCategoryClick = useCallback((category: CategoryKey) => {
    const firstEvent = thisWeekCounts.weekItems.find(item => categorizeEvent(item) === category);
    if (!firstEvent) return;
    const dateStr = firstEvent.allDay
      ? firstEvent.startDate
      : firstEvent.startDate.split('T')[0];
    navigateAndHighlight(dateStr);
  }, [thisWeekCounts.weekItems, navigateAndHighlight]);

  // ── Upcoming 3 events ──────────────────────────────────────────────
  const upcomingThree = useMemo(() => {
    const now = new Date();
    const monthEnd = endOfMonth(currentMonth);
    return allItems
      .filter(item => {
        const itemDate = item.allDay
          ? new Date(item.startDate + 'T23:59:59')
          : new Date(item.startDate);
        return itemDate >= now && itemDate <= monthEnd;
      })
      .slice(0, 3);
  }, [allItems, currentMonth]);

  // ── Sidebar upcoming (5 items) ─────────────────────────────────────
  const upcomingItems = allItems
    .filter(item => {
      const itemDate = item.allDay
        ? new Date(item.startDate + 'T23:59:59')
        : new Date(item.startDate);
      return itemDate >= new Date();
    })
    .slice(0, 5);

  // Quick stats — filtered to current displayed month only
  const currentMonthEvents = useMemo(() => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    return allItems.filter(event => {
      const eventDate = event.allDay
        ? new Date(event.startDate + 'T00:00:00')
        : parseISO(event.startDate);
      return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  }, [allItems, currentMonth]);

  const fubCount = currentMonthEvents.filter(e => e.source === 'fub').length;
  const googleCount = currentMonthEvents.filter(e => e.source === 'google_company' || e.source === 'google_fub' || e.source === 'google_personal').length;

  // Google events breakdown by type
  const googleByType = useMemo(() => {
    const counts: Record<string, number> = { training: 0, zillow: 0, company: 0, admin: 0, google_fub: 0, personal: 0 };
    for (const event of currentMonthEvents) {
      if (!event.source.startsWith('google_')) continue;
      const cat = categorizeEvent(event);
      if (cat in counts) counts[cat]++;
    }
    return counts;
  }, [currentMonthEvents]);

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
                    {calView === 'month' && format(currentMonth, "MMMM yyyy")}
                    {calView === 'week' && `${format(currentWeekStart, "MMM d")} – ${format(endOfWeek(currentWeekStart), "MMM d, yyyy")}`}
                    {calView === 'day' && format(currentDay, "EEEE, MMMM d, yyyy")}
                    {calView === 'schedule' && 'Upcoming 30 Days'}
                  </CardTitle>
                  <div className="flex gap-0.5 sm:gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => {
                        if (calView === 'month') setCurrentMonth(subMonths(currentMonth, 1));
                        else if (calView === 'week') setCurrentWeekStart(prev => subWeeks(prev, 1));
                        else if (calView === 'day') setCurrentDay(prev => subDays(prev, 1));
                      }}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      onClick={() => {
                        const now = new Date();
                        setCurrentMonth(now);
                        setCurrentWeekStart(startOfWeek(now));
                        setCurrentDay(now);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => {
                        if (calView === 'month') setCurrentMonth(addMonths(currentMonth, 1));
                        else if (calView === 'week') setCurrentWeekStart(prev => addWeeks(prev, 1));
                        else if (calView === 'day') setCurrentDay(prev => addDays(prev, 1));
                      }}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* ── View switcher pills ────────────────────────── */}
                <div className="flex gap-1 mt-2">
                  {(['month', 'week', 'day', 'schedule'] as const).map((view) => (
                    <button
                      key={view}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        calView === view
                          ? 'bg-[#EF4923] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setCalView(view)}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
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
                ) : calView === 'month' ? (
                  /* ── MONTH VIEW ─────────────────────────────────── */
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
                      const regularItems = dayItems.filter(i => i.source !== 'birthday' && i.source !== 'us_holiday');
                      const specialItems = dayItems.filter(i => i.source === 'birthday' || i.source === 'us_holiday');
                      return (
                        <div
                          key={day.toISOString()}
                          className={`bg-background p-1.5 sm:p-2 min-h-[70px] sm:min-h-[80px] md:min-h-[100px] border-t ${
                            isToday(day) ? 'bg-[#EF4923]/5' : ''
                          } ${hasEvents ? 'cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/70' : ''} ${
                            highlightedDate === format(day, 'yyyy-MM-dd') ? 'ring-2 ring-[#EF4923] ring-offset-1' : ''
                          }`}
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
                            {specialItems.slice(0, 2).map((item) => {
                              const category = categorizeEvent(item);
                              const hex = getCategoryHex(category);
                              return (
                                <div
                                  key={item.id}
                                  className="text-[8px] sm:text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                                  style={{ backgroundColor: `${hex}15`, color: hex }}
                                  title={item.title}
                                  onClick={(e) => handleEventClick(item, e)}
                                >
                                  {item.title}
                                </div>
                              );
                            })}
                            {regularItems.slice(0, 2).map((item, idx) => {
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
                            {!hasTraining && regularItems.length < 3 && specialItems.length === 0 && (
                              <div className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-50 rounded px-1 py-0.5 truncate hidden sm:block">
                                No Training
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : calView === 'week' ? (
                  /* ── WEEK VIEW ──────────────────────────────────── */
                  (() => {
                    const weekDays = eachDayOfInterval({
                      start: currentWeekStart,
                      end: endOfWeek(currentWeekStart),
                    });
                    const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am-9pm

                    return (
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
                          {/* Header row */}
                          <div className="p-1 text-xs text-muted-foreground border-b" />
                          {weekDays.map((wd) => (
                            <div
                              key={wd.toISOString()}
                              className={`p-2 text-center border-b border-l ${
                                isToday(wd) ? 'bg-[#EF4923]/5' : ''
                              }`}
                            >
                              <div className="text-[10px] text-muted-foreground">
                                {format(wd, 'EEE')}
                              </div>
                              <div className={`text-sm font-medium ${
                                isToday(wd) ? 'h-6 w-6 mx-auto rounded-full bg-[#EF4923] text-white flex items-center justify-center' : ''
                              }`}>
                                {format(wd, 'd')}
                              </div>
                            </div>
                          ))}

                          {/* All-day row */}
                          <div className="p-1 text-[10px] text-muted-foreground border-b flex items-center justify-center">
                            All day
                          </div>
                          {weekDays.map((wd) => {
                            const dayEvents = allItems.filter((item) => {
                              if (!item.allDay) return false;
                              const itemDate = new Date(item.startDate + 'T00:00:00');
                              return isSameDay(itemDate, wd);
                            });
                            return (
                              <div key={`allday-${wd.toISOString()}`} className="p-1 border-b border-l min-h-[32px]">
                                {dayEvents.slice(0, 2).map((item) => {
                                  const hex = getCategoryHex(categorizeEvent(item));
                                  return (
                                    <div
                                      key={item.id}
                                      className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5"
                                      style={{ backgroundColor: `${hex}20`, color: hex }}
                                      onClick={(e) => handleEventClick(item, e as MouseEvent)}
                                    >
                                      {item.title}
                                    </div>
                                  );
                                })}
                                {dayEvents.length > 2 && (
                                  <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</div>
                                )}
                              </div>
                            );
                          })}

                          {/* Time slot rows */}
                          {TIME_SLOTS.map((hour) => (
                            <>
                              <div key={`label-${hour}`} className="p-1 text-[10px] text-muted-foreground border-b text-right pr-2 flex items-start justify-end">
                                {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                              </div>
                              {weekDays.map((wd) => {
                                const slotEvents = allItems.filter((item) => {
                                  if (item.allDay) return false;
                                  try {
                                    const start = parseISO(item.startDate);
                                    return isSameDay(start, wd) && start.getHours() === hour;
                                  } catch { return false; }
                                });
                                return (
                                  <div
                                    key={`slot-${hour}-${wd.toISOString()}`}
                                    className="border-b border-l min-h-[40px] p-0.5 relative"
                                  >
                                    {slotEvents.map((item) => {
                                      const hex = getCategoryHex(categorizeEvent(item));
                                      const pending = isPending(item);
                                      return (
                                        <div
                                          key={item.id}
                                          className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5 ${
                                            pending ? 'border border-dashed bg-transparent' : ''
                                          }`}
                                          style={pending ? { borderColor: hex, color: hex } : { backgroundColor: `${hex}20`, color: hex }}
                                          onClick={(e) => handleEventClick(item, e as MouseEvent)}
                                          title={`${item.title} ${formatEventTime(item)}`}
                                        >
                                          {item.title}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : calView === 'day' ? (
                  /* ── DAY VIEW ───────────────────────────────────── */
                  (() => {
                    const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am-9pm
                    const allDayEvents = allItems.filter((item) => {
                      if (!item.allDay) return false;
                      const itemDate = new Date(item.startDate + 'T00:00:00');
                      return isSameDay(itemDate, currentDay);
                    });

                    return (
                      <div>
                        {/* All-day events */}
                        {allDayEvents.length > 0 && (
                          <div className="mb-3 p-2 bg-muted/30 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">All Day</p>
                            <div className="space-y-1">
                              {allDayEvents.map((item) => {
                                const hex = getCategoryHex(categorizeEvent(item));
                                return (
                                  <div
                                    key={item.id}
                                    className="text-xs px-2 py-1.5 rounded cursor-pointer hover:opacity-80"
                                    style={{ backgroundColor: `${hex}20`, color: hex }}
                                    onClick={(e) => handleEventClick(item, e as MouseEvent)}
                                  >
                                    {item.title}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Time slots */}
                        <div className="space-y-0">
                          {TIME_SLOTS.map((hour) => {
                            const slotEvents = allItems.filter((item) => {
                              if (item.allDay) return false;
                              try {
                                const start = parseISO(item.startDate);
                                return isSameDay(start, currentDay) && start.getHours() === hour;
                              } catch { return false; }
                            });

                            return (
                              <div key={`day-slot-${hour}`} className="flex border-b min-h-[48px]">
                                <div className="w-16 shrink-0 p-2 text-xs text-muted-foreground text-right pr-3 border-r">
                                  {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                                </div>
                                <div className="flex-1 p-1 space-y-1">
                                  {slotEvents.map((item) => {
                                    const hex = getCategoryHex(categorizeEvent(item));
                                    const pending = isPending(item);
                                    return (
                                      <div
                                        key={item.id}
                                        className={`text-xs px-2 py-1.5 rounded cursor-pointer hover:opacity-80 ${
                                          pending ? 'border border-dashed bg-transparent' : ''
                                        }`}
                                        style={pending ? { borderColor: hex, color: hex } : { backgroundColor: `${hex}20`, color: hex }}
                                        onClick={(e) => handleEventClick(item, e as MouseEvent)}
                                      >
                                        <span className="font-medium">{item.title}</span>
                                        {item.endDate && (
                                          <span className="ml-2 opacity-70">{formatEventTime(item)}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* ── SCHEDULE VIEW ──────────────────────────────── */
                  (() => {
                    const scheduleStart = new Date();
                    const scheduleDays = eachDayOfInterval({
                      start: scheduleStart,
                      end: addDays(scheduleStart, 30),
                    });

                    return (
                      <div className="space-y-0">
                        {scheduleDays.map((day) => {
                          const dayItems = allItems.filter((item) => {
                            const itemDate = item.allDay
                              ? new Date(item.startDate + 'T00:00:00')
                              : parseISO(item.startDate);
                            return isSameDay(itemDate, day);
                          });

                          if (dayItems.length === 0) return null;

                          return (
                            <div key={day.toISOString()} className="border-b last:border-b-0">
                              <div className={`px-3 py-2 flex items-center gap-2 ${
                                isToday(day) ? 'bg-[#EF4923]/5' : 'bg-muted/30'
                              }`}>
                                <span className={`text-sm font-medium ${
                                  isToday(day) ? 'text-[#EF4923]' : ''
                                }`}>
                                  {format(day, 'EEEE, MMM d')}
                                </span>
                                {isToday(day) && (
                                  <Badge className="bg-[#EF4923] text-white text-[10px] py-0">Today</Badge>
                                )}
                              </div>
                              <div className="divide-y">
                                {dayItems.map((item) => {
                                  const hex = getCategoryHex(categorizeEvent(item));
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                                      onClick={() => setSelectedEvent(item)}
                                    >
                                      <div
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: hex }}
                                      />
                                      <span className="text-xs text-muted-foreground w-20 shrink-0">
                                        {item.allDay ? 'All day' : (() => {
                                          try {
                                            return format(parseISO(item.startDate), 'h:mm a');
                                          } catch { return ''; }
                                        })()}
                                      </span>
                                      <span className="text-sm truncate">{item.title}</span>
                                      {item.calendarName && (
                                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0 hidden sm:inline">
                                          {item.calendarName}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {scheduleDays.every((day) => {
                          const dayItems = allItems.filter((item) => {
                            const itemDate = item.allDay
                              ? new Date(item.startDate + 'T00:00:00')
                              : parseISO(item.startDate);
                            return isSameDay(itemDate, day);
                          });
                          return dayItems.length === 0;
                        }) && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No events in the next 30 days
                          </p>
                        )}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>

            {/* ── Bottom Panel: This Week + Upcoming ───────────────── */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* This Week summary */}
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">This Week</p>
                  <p className="text-sm">
                    {(() => {
                      const parts: { label: string; category: CategoryKey }[] = [];
                      if (thisWeekCounts.trainings > 0) parts.push({ label: `${thisWeekCounts.trainings} training${thisWeekCounts.trainings > 1 ? 's' : ''}`, category: 'training' });
                      if (thisWeekCounts.fubAppts > 0) parts.push({ label: `${thisWeekCounts.fubAppts} FUB appt${thisWeekCounts.fubAppts > 1 ? 's' : ''}`, category: 'fub' });
                      if (thisWeekCounts.companyEvents > 0) parts.push({ label: `${thisWeekCounts.companyEvents} company event${thisWeekCounts.companyEvents > 1 ? 's' : ''}`, category: 'company' });
                      if (thisWeekCounts.holidays > 0) parts.push({ label: `${thisWeekCounts.holidays} holiday${thisWeekCounts.holidays > 1 ? 's' : ''}`, category: 'us_holiday' });
                      if (thisWeekCounts.birthdays > 0) parts.push({ label: `${thisWeekCounts.birthdays} birthday${thisWeekCounts.birthdays > 1 ? 's' : ''}`, category: 'birthday' });
                      if (parts.length === 0) return 'No events this week';
                      return parts.map((part, idx) => (
                        <span key={part.category}>
                          {idx > 0 && ' \u00B7 '}
                          <span
                            className="cursor-pointer hover:underline"
                            style={{ color: getCategoryHex(part.category) }}
                            onClick={() => handleWeekCategoryClick(part.category)}
                          >
                            {part.label}
                          </span>
                        </span>
                      ));
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Upcoming 3 */}
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming</p>
                  {upcomingThree.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming events this month</p>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingThree.map(item => {
                        const cat = categorizeEvent(item);
                        const hex = getCategoryHex(cat);
                        const dateStr = item.allDay
                          ? item.startDate
                          : item.startDate.split('T')[0];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors"
                            style={{ borderLeft: `3px solid ${hex}` }}
                            onClick={() => {
                              navigateAndHighlight(dateStr);
                              setSelectedEvent(item);
                            }}
                          >
                            <span className="text-muted-foreground text-xs shrink-0 w-12">
                              {item.allDay
                                ? format(new Date(item.startDate + 'T00:00:00'), 'MMM d')
                                : format(parseISO(item.startDate), 'MMM d')}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                                ? format(new Date(item.startDate + 'T00:00:00'), "MMM d") + ' \u00B7 All day'
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
                            {SPYGLASS_CATEGORIES[category].label}
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
                    {currentMonthEvents.length} events
                  </Badge>
                </div>

                {/* By source */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SPYGLASS_CATEGORIES.company.hex }} />
                    Google Calendar
                  </span>
                  <span className="font-medium">{googleCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SPYGLASS_CATEGORIES.fub.hex }} />
                    FUB
                  </span>
                  <span className="font-medium">{fubCount}</span>
                </div>

                {/* Divider */}
                <div className="border-t pt-2 mt-2" />

                {/* Google events by type */}
                {googleCount > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Google by type</p>
                    {Object.entries(googleByType)
                      .filter(([, count]) => count > 0)
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
                  </>
                )}
                {currentMonthEvents.length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">No events this month</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Event Detail Modal (custom overlay) ─────────────────────── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedEvent(null)}
          data-testid="dialog-event-details-backdrop"
        >
          <div
            className="relative bg-background rounded-lg shadow-xl border mx-4 overflow-hidden"
            style={{ minWidth: '320px', maxWidth: '600px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
              onClick={() => setSelectedEvent(null)}
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="overflow-y-auto overflow-x-hidden p-6" style={{ maxHeight: '80vh' }}>
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="h-5 w-5" style={{ color: getCategoryHex(categorizeEvent(selectedEvent)) }} />
                <span className="text-sm text-muted-foreground">
                  {selectedEvent.source === 'fub' ? 'Follow Up Boss'
                    : selectedEvent.source === 'google_fub' ? 'FUB Calendar'
                    : selectedEvent.source === 'google_personal' ? 'Personal Calendar'
                    : selectedEvent.source === 'birthday' ? 'Birthday'
                    : selectedEvent.source === 'us_holiday' ? 'US Holiday'
                    : 'Google Calendar'}
                </span>
                {isPending(selectedEvent) && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Pending invite</Badge>
                )}
              </div>

              {/* Title + badges */}
              <h3 className="text-lg font-semibold mb-3">{selectedEvent.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const category = categorizeEvent(selectedEvent);
                  const hex = getCategoryHex(category);
                  return (
                    <>
                      <Badge style={{ backgroundColor: `${hex}20`, color: hex, borderColor: `${hex}40` }}>
                        {SPYGLASS_CATEGORIES[category].label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedEvent.source === 'fub' ? 'FUB'
                          : selectedEvent.source === 'google_fub' ? 'FUB Cal'
                          : selectedEvent.source === 'google_personal' ? 'Personal'
                          : selectedEvent.source === 'birthday' ? 'Birthday'
                          : selectedEvent.source === 'us_holiday' ? 'Holiday'
                          : 'Google'}
                      </Badge>
                    </>
                  );
                })()}
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

              {/* Content sections */}
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
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs max-h-40 overflow-y-auto break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
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

              <div className="flex gap-3 pt-4 mt-4 border-t">
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
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Day Events List Dialog ────────────────────────────────── */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedDayEvents(null)}
          data-testid="dialog-day-events-backdrop"
        >
          <div
            className="relative bg-background rounded-lg shadow-xl border mx-4"
            style={{ minWidth: '320px', maxWidth: '500px', width: '100%', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
              onClick={() => setSelectedDayEvents(null)}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="h-5 w-5 text-[#EF4923]" />
                <h3 className="text-lg font-display font-semibold">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d")}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedDayEvents.length} events on this day
              </p>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedDayEvents.map(item => {
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
                          {SPYGLASS_CATEGORIES[category].label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
