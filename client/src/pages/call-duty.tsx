import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from "date-fns";
import Layout from "@/components/layout";
import ShiftCalendar from "@/components/call-duty/ShiftCalendar";
import { type SlotData, type AvailableUser } from "@/components/call-duty/ShiftSlot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronLeft, ChevronRight, Phone, Calendar, Clock, Settings, Trash2, Plus, CalendarDays, AlertTriangle, ChevronDown, BarChart3, TrendingUp, Users, Activity, FileText, Download } from "lucide-react";

interface MyShift {
  signupId: string;
  signedUpAt: string;
  slotId: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  isRecurring: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UnfilledSlot {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  maxSignups: number;
  signupCount: number;
  needsCount: number;
  signups: {
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    signedUpAt: string;
  }[];
}

interface CallDutyReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  coverageStats: {
    totalSlots: number;
    filledSlots: number;
    coveragePercentage: number;
  };
  coverageByWeek: {
    weekStart: string;
    filled: number;
    total: number;
    percentage: number;
  }[];
  agentActivity: {
    userId: string;
    name: string;
    email: string;
    activeShifts: number;
    totalSignups: number;
    cancellations: number;
  }[];
  shiftHistory: {
    id: string;
    agentName: string;
    email: string;
    action: "signup" | "cancellation";
    shiftDate: string;
    shiftType: string;
    shiftTime: string;
    timestamp: string;
    cancellationReason?: string | null;
  }[];
}

function formatShiftLabel(shiftType: string): string {
  switch (shiftType) {
    case "morning": return "Morning";
    case "midday": return "Midday";
    case "evening": return "Evening";
    default: return shiftType;
  }
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h] = t.split(":");
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function CallDutyPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Week navigation — start on Monday
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "signup" | "cancel" | "delete_holiday" | "assign_agent" | "remove_agent" | "join_waitlist" | "signup_warning" | "cancel_warning" | "cancel_reason" | "admin_remove_reason";
    slotId?: string;
    holidayId?: string;
    signupId?: string;
    userId?: string;
    label: string;
    cancellationReason?: string;
  } | null>(null);

  // Cancellation reason input state
  const [cancellationReason, setCancellationReason] = useState("");

  // Reports state
  const [showReports, setShowReports] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<"thisWeek" | "thisMonth" | "custom">("thisWeek");
  const [customStartDate, setCustomStartDate] = useState(() => {
    // Default to start of current month
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return format(monthStart, "yyyy-MM-dd");
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    // Default to today
    return format(new Date(), "yyyy-MM-dd");
  });

  // Holiday management state
  const [newHoliday, setNewHoliday] = useState({
    name: "",
    date: "",
    isRecurring: false
  });

  // Unfilled slots collapsible state
  const [unfilledSlotsOpen, setUnfilledSlotsOpen] = useState(true);

  // Check if user has admin/developer role
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';

  // Admin/Agent view toggle state (UI only)
  const [viewMode, setViewMode] = useState<'admin' | 'agent'>('admin');

  // Tab state
  const [activeTab, setActiveTab] = useState<'schedule' | 'my-shifts' | 'unfilled' | 'reports' | 'holidays'>('schedule');

  // Date range strings for API
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(weekEnd, "yyyy-MM-dd");

  // Fetch slots for current week
  const {
    data: slots = [],
    isLoading: slotsLoading,
  } = useQuery<SlotData[]>({
    queryKey: ["/api/call-duty/slots", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/call-duty/slots?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch slots");
      return res.json();
    },
  });

  // Fetch my upcoming shifts
  const {
    data: myShifts = [],
    isLoading: myShiftsLoading,
  } = useQuery<MyShift[]>({
    queryKey: ["/api/call-duty/my-shifts"],
    queryFn: async () => {
      const res = await fetch("/api/call-duty/my-shifts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch my shifts");
      return res.json();
    },
  });

  // Fetch holidays (only for admin/developer)
  const {
    data: holidays = [],
    isLoading: holidaysLoading,
  } = useQuery<Holiday[]>({
    queryKey: ["/api/call-duty/holidays"],
    queryFn: async () => {
      const res = await fetch("/api/call-duty/holidays", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch holidays");
      return res.json();
    },
    enabled: isAdmin, // Only fetch if user is admin/developer
  });

  // Fetch available users for assignment (only for admin/developer)
  const {
    data: availableUsers = [],
    isLoading: usersLoading,
  } = useQuery<AvailableUser[]>({
    queryKey: ["/api/auth/users"],
    queryFn: async () => {
      const res = await fetch("/api/auth/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: isAdmin, // Only fetch if user is admin/developer
  });

  // Fetch unfilled slots (only for admin/developer)
  const {
    data: unfilledSlots = [],
    isLoading: unfilledSlotsLoading,
  } = useQuery<UnfilledSlot[]>({
    queryKey: ["/api/call-duty/unfilled-slots"],
    queryFn: async () => {
      const res = await fetch("/api/call-duty/unfilled-slots", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch unfilled slots");
      return res.json();
    },
    enabled: isAdmin, // Only fetch if user is admin/developer
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Calculate report date range (memoized to prevent infinite re-renders)
  const reportsDateRange = useMemo(() => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    if (reportDateRange === "thisWeek") {
      const monday = startOfWeek(today, { weekStartsOn: 1 });
      const sunday = endOfWeek(today, { weekStartsOn: 1 });
      startDate = format(monday, "yyyy-MM-dd");
      endDate = format(sunday, "yyyy-MM-dd");
    } else if (reportDateRange === "thisMonth") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = format(monthStart, "yyyy-MM-dd");
      endDate = format(monthEnd, "yyyy-MM-dd");
    } else {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    return { startDate, endDate };
  }, [reportDateRange, customStartDate, customEndDate]);

  // Fetch reports (only for admin/developer when reports view is active)
  const {
    data: reportData,
    isLoading: reportsLoading,
    error: reportsError,
  } = useQuery<CallDutyReport>({
    queryKey: ["/api/call-duty/reports", reportsDateRange.startDate, reportsDateRange.endDate],
    queryFn: async () => {
      const { startDate, endDate } = reportsDateRange;
      if (!startDate || !endDate) throw new Error("Date range required");
      
      const res = await fetch(
        `/api/call-duty/reports?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: isAdmin && 
              showReports && 
              reportsDateRange?.startDate && 
              reportsDateRange?.endDate && 
              reportsDateRange.startDate.length === 10 && 
              reportsDateRange.endDate.length === 10,
  });

  // Sign up mutation with soft warning support
  const signUpMutation = useMutation({
    mutationFn: async ({ slotId, confirmed = false }: { slotId: string; confirmed?: boolean }) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmed }),
      });
      
      const data = await res.json();
      
      // Handle soft warnings (409 with warning flag)
      if (res.status === 409 && data.warning && data.canProceed) {
        throw { warning: data.warning, message: data.message, slotId };
      }
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to sign up");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Signed up!", description: "You've been added to this shift." });
    },
    onError: (error: any) => {
      // Handle soft warnings by showing confirmation dialog
      if (error.warning) {
        setConfirmAction({
          type: "signup_warning",
          slotId: error.slotId,
          label: error.message,
        });
      } else {
        toast({ title: "Could not sign up", description: error.message, variant: "destructive" });
      }
    },
  });

  // Cancel mutation with soft warning support and cancellation reason
  const cancelMutation = useMutation({
    mutationFn: async ({ slotId, confirmed = false, cancellationReason = "" }: { slotId: string; confirmed?: boolean; cancellationReason?: string }) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signup`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmed, cancellationReason }),
      });
      
      const data = await res.json();
      
      // Handle cancellation reason requirement
      if (res.status === 400 && data.requiresReason) {
        throw { requiresReason: true, slotId };
      }
      
      // Handle soft warnings (409 with warning flag)
      if (res.status === 409 && data.warning && data.canProceed) {
        throw { warning: data.warning, message: data.message, slotId, cancellationReason };
      }
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Shift cancelled", description: "Your signup has been removed." });
    },
    onError: (error: any) => {
      // Handle cancellation reason requirement
      if (error.requiresReason) {
        setConfirmAction({
          type: "cancel_reason",
          slotId: error.slotId,
          label: getSlotLabel(error.slotId),
        });
      } else if (error.warning) {
        // Handle soft warnings by showing confirmation dialog
        setConfirmAction({
          type: "cancel_warning",
          slotId: error.slotId,
          label: error.message,
          cancellationReason: error.cancellationReason,
        });
      } else {
        toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
      }
    },
  });

  // Add holiday mutation
  const addHolidayMutation = useMutation({
    mutationFn: async (holidayData: { name: string; date: string; isRecurring: boolean }) => {
      const res = await fetch("/api/call-duty/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(holidayData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create holiday");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] }); // Refresh slots too since they depend on holidays
      setNewHoliday({ name: "", date: "", isRecurring: false });
      toast({ title: "Holiday added", description: "The holiday has been created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not add holiday", description: error.message, variant: "destructive" });
    },
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const res = await fetch(`/api/call-duty/holidays/${holidayId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete holiday");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] }); // Refresh slots too
      toast({ title: "Holiday deleted", description: "The holiday has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not delete holiday", description: error.message, variant: "destructive" });
    },
  });

  // Assign agent mutation (admin only)
  const assignAgentMutation = useMutation({
    mutationFn: async ({ slotId, userId }: { slotId: string; userId: string }) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to assign agent");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Agent assigned", description: "The agent has been successfully assigned to this shift." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not assign agent", description: error.message, variant: "destructive" });
    },
  });

  // Remove agent mutation (admin only) with cancellation reason
  const removeAgentMutation = useMutation({
    mutationFn: async ({ slotId, signupId, cancellationReason = "" }: { slotId: string; signupId: string; cancellationReason?: string }) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signups/${signupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cancellationReason }),
      });
      
      const data = await res.json();
      
      // Handle cancellation reason requirement
      if (res.status === 400 && data.requiresReason) {
        throw { requiresReason: true, slotId, signupId };
      }
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to remove agent");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Agent removed", description: "The agent has been removed from this shift." });
    },
    onError: (error: any) => {
      // Handle cancellation reason requirement
      if (error.requiresReason) {
        setConfirmAction({
          type: "admin_remove_reason",
          slotId: error.slotId,
          signupId: error.signupId,
          label: "Remove agent from shift",
        });
      } else {
        toast({ title: "Could not remove agent", description: error.message, variant: "destructive" });
      }
    },
  });

  // Join waitlist mutation
  const joinWaitlistMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/waitlist`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to join waitlist");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Joined waitlist!", description: data.message || "You've been added to the waitlist." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not join waitlist", description: error.message, variant: "destructive" });
    },
  });

  const isMutating = signUpMutation.isPending || cancelMutation.isPending || addHolidayMutation.isPending || deleteHolidayMutation.isPending || assignAgentMutation.isPending || removeAgentMutation.isPending || joinWaitlistMutation.isPending;

  // Build slot label for confirmation dialog
  function getSlotLabel(slotId: string): string {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return "this shift";
    return `${formatShiftLabel(slot.shiftType)} (${formatTimeRange(slot.startTime, slot.endTime)}) on ${format(new Date(slot.date + "T00:00:00"), "EEE, MMM d")}`;
  }

  function handleSignUp(slotId: string) {
    // Show confirmation dialog first
    setConfirmAction({
      type: "signup",
      slotId,
      label: getSlotLabel(slotId),
    });
  }

  function handleCancel(slotId: string) {
    // First show cancellation reason dialog
    setConfirmAction({
      type: "cancel_reason",
      slotId,
      label: getSlotLabel(slotId),
    });
    setCancellationReason("");
  }

  function handleDeleteHoliday(holidayId: string, holidayName: string) {
    setConfirmAction({
      type: "delete_holiday",
      holidayId,
      label: holidayName,
    });
  }

  function handleAddHoliday() {
    if (!newHoliday.name.trim() || !newHoliday.date) {
      toast({ title: "Missing information", description: "Please provide both name and date.", variant: "destructive" });
      return;
    }
    addHolidayMutation.mutate(newHoliday);
  }

  function handleAssignAgent(slotId: string, userId: string) {
    const user = availableUsers.find(u => u.id === userId);
    const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Agent";
    const slot = slots.find(s => s.id === slotId);
    const slotLabel = slot ? `${formatShiftLabel(slot.shiftType)} (${formatTimeRange(slot.startTime, slot.endTime)}) on ${format(new Date(slot.date + "T00:00:00"), "EEE, MMM d")}` : "this shift";
    
    setConfirmAction({
      type: "assign_agent",
      slotId,
      userId,
      label: `${userName} to ${slotLabel}`,
    });
  }

  function handleRemoveAgent(slotId: string, signupId: string, agentName: string) {
    // First show cancellation reason dialog for admin removal
    setConfirmAction({
      type: "admin_remove_reason",
      slotId,
      signupId,
      label: `Remove ${agentName} from shift`,
    });
    setCancellationReason("");
  }

  function handleJoinWaitlist(slotId: string) {
    setConfirmAction({
      type: "join_waitlist",
      slotId,
      label: getSlotLabel(slotId),
    });
  }

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "signup" && confirmAction.slotId) {
      // Call mutation directly - let it handle warnings after confirmation
      signUpMutation.mutate({ slotId: confirmAction.slotId });
    } else if (confirmAction.type === "cancel" && confirmAction.slotId) {
      cancelMutation.mutate({ slotId: confirmAction.slotId });
    } else if (confirmAction.type === "delete_holiday" && confirmAction.holidayId) {
      deleteHolidayMutation.mutate(confirmAction.holidayId);
    } else if (confirmAction.type === "assign_agent" && confirmAction.slotId && confirmAction.userId) {
      assignAgentMutation.mutate({ slotId: confirmAction.slotId, userId: confirmAction.userId });
    } else if (confirmAction.type === "remove_agent" && confirmAction.slotId && confirmAction.signupId) {
      removeAgentMutation.mutate({ slotId: confirmAction.slotId, signupId: confirmAction.signupId });
    } else if (confirmAction.type === "join_waitlist" && confirmAction.slotId) {
      joinWaitlistMutation.mutate(confirmAction.slotId);
    } else if (confirmAction.type === "signup_warning" && confirmAction.slotId) {
      // Confirmed signup with warning
      signUpMutation.mutate({ slotId: confirmAction.slotId, confirmed: true });
    } else if (confirmAction.type === "cancel_warning" && confirmAction.slotId) {
      // Confirmed cancel with warning (including reason)
      cancelMutation.mutate({ 
        slotId: confirmAction.slotId, 
        confirmed: true, 
        cancellationReason: confirmAction.cancellationReason || cancellationReason 
      });
    } else if (confirmAction.type === "cancel_reason" && confirmAction.slotId) {
      // Cancel with reason provided
      if (!cancellationReason.trim()) {
        toast({ title: "Reason required", description: "Please provide a reason for cancellation.", variant: "destructive" });
        return;
      }
      cancelMutation.mutate({ slotId: confirmAction.slotId, cancellationReason: cancellationReason.trim() });
    } else if (confirmAction.type === "admin_remove_reason" && confirmAction.slotId && confirmAction.signupId) {
      // Admin remove with reason provided
      if (!cancellationReason.trim()) {
        toast({ title: "Reason required", description: "Please provide a reason for removal.", variant: "destructive" });
        return;
      }
      removeAgentMutation.mutate({ 
        slotId: confirmAction.slotId, 
        signupId: confirmAction.signupId, 
        cancellationReason: cancellationReason.trim() 
      });
    }
    setConfirmAction(null);
    setCancellationReason("");
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Phone className="h-6 w-6 text-[#EF4923]" />
              Call Duty
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign up for lead duty shifts. 3 shifts daily — Morning, Midday, Evening.
            </p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium text-foreground min-w-[180px] text-center">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
          </div>
        </div>

        {/* Admin/Agent View Toggle - Admin/Developer Only */}
        {isAdmin && (
          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={() => {
                const next = viewMode === 'admin' ? 'agent' : 'admin';
                setViewMode(next);
                if (next === 'agent' && ['unfilled', 'reports', 'holidays'].includes(activeTab)) {
                  setActiveTab('schedule');
                }
              }}
              className="min-w-[44px] min-h-[44px] bg-[#EF4923] hover:bg-[#EF4923]/90"
            >
              {viewMode === 'admin' ? 'Switch to Agent View' : 'Switch to Admin View'}
            </Button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden min-h-[44px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 min-h-[44px] flex items-center ${
                activeTab === 'schedule'
                  ? 'border-[#EF4923] text-[#EF4923] bg-[#EF4923]/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('my-shifts')}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 min-h-[44px] flex items-center ${
                activeTab === 'my-shifts'
                  ? 'border-[#EF4923] text-[#EF4923] bg-[#EF4923]/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              My Shifts
            </button>
            {isAdmin && viewMode === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('unfilled')}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 min-h-[44px] flex items-center ${
                    activeTab === 'unfilled'
                      ? 'border-[#EF4923] text-[#EF4923] bg-[#EF4923]/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  Unfilled
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 min-h-[44px] flex items-center ${
                    activeTab === 'reports'
                      ? 'border-[#EF4923] text-[#EF4923] bg-[#EF4923]/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setActiveTab('holidays')}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 min-h-[44px] flex items-center ${
                    activeTab === 'holidays'
                      ? 'border-[#EF4923] text-[#EF4923] bg-[#EF4923]/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  Holidays
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <Card>
          <CardContent className="p-4 md:p-6">
            {slotsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2">
                    <Skeleton className="h-20" />
                    {Array.from({ length: 7 }).map((_, j) => (
                      <Skeleton key={j} className="h-20" />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <ShiftCalendar
                weekStart={weekStart}
                slots={slots}
                onSignUp={handleSignUp}
                onCancel={handleCancel}
                onJoinWaitlist={handleJoinWaitlist}
                isLoading={isMutating}
                isAdmin={isAdmin && viewMode === 'admin'}
                availableUsers={availableUsers}
                onAssignAgent={handleAssignAgent}
                onRemoveAgent={handleRemoveAgent}
              />
            )}
          </CardContent>
          </Card>
        )}

        {activeTab === 'my-shifts' && (
          <Card>
            <CardContent className="p-4 md:p-6">
            {myShiftsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : myShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming shifts. Sign up from the Schedule tab!
              </p>
            ) : (
              <div className="space-y-2">
                {myShifts.map((shift) => (
                  <div
                    key={shift.signupId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#EF4923]/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-[#EF4923]" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {format(new Date(shift.date + "T00:00:00"), "EEE, MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatShiftLabel(shift.shiftType)} · {formatTimeRange(shift.startTime, shift.endTime)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancel(shift.slotId)}
                      disabled={isMutating}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        )}

        {activeTab === 'unfilled' && isAdmin && viewMode === 'admin' && (
          <Card>
            <CardContent className="p-4 md:p-6">
                  {unfilledSlotsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : unfilledSlots.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg bg-green-50 border-green-200">
                      <Phone className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="font-medium text-green-800 mb-1">All Slots Covered! 🎉</div>
                      <div className="text-green-700">Every shift this week has enough agents signed up.</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Group by date */}
                      {Object.entries(
                        unfilledSlots.reduce((acc, slot) => {
                          const date = slot.date;
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(slot);
                          return acc;
                        }, {} as Record<string, UnfilledSlot[]>)
                      ).map(([date, slotsForDate]) => (
                        <div key={date} className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground border-b pb-1">
                            {format(new Date(date + "T00:00:00"), "EEEE, MMM d")}
                          </h4>
                          <div className="space-y-2 ml-4">
                            {slotsForDate.map((slot) => (
                              <div
                                key={slot.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100/50 transition-colors gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px]">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-sm font-medium text-foreground">
                                        {formatShiftLabel(slot.shiftType)} 
                                        <span className="text-muted-foreground ml-1">
                                          ({formatTimeRange(slot.startTime, slot.endTime)})
                                        </span>
                                      </div>
                                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                                        {slot.signupCount}/{slot.maxSignups}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {slot.signups.length > 0 ? (
                                        <>
                                          <span className="text-foreground">Signed up: </span>
                                          {slot.signups.map(signup => 
                                            `${signup.firstName || ""} ${signup.lastName || ""}`.trim() || signup.email
                                          ).join(", ")}
                                          <span className="text-amber-700 ml-2 font-medium">
                                            Need {slot.needsCount} more
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-amber-700 font-medium">Need {slot.needsCount} agents</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'holidays' && isAdmin && viewMode === 'admin' && (
          <Card>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Manage holidays and skip days. Slots will not be created on these dates.
              </p>
              {/* Add Holiday Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday-name" className="text-xs font-medium">
                      Holiday Name
                    </Label>
                    <Input
                      id="holiday-name"
                      placeholder="e.g., Christmas Day"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday-date" className="text-xs font-medium">
                      Date
                    </Label>
                    <Input
                      id="holiday-date"
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2 h-11">
                      <Checkbox
                        id="holiday-recurring"
                        checked={newHoliday.isRecurring}
                        onCheckedChange={(checked) => setNewHoliday(prev => ({ ...prev, isRecurring: !!checked }))}
                      />
                      <Label htmlFor="holiday-recurring" className="text-xs font-medium">
                        Annual
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddHoliday}
                      disabled={isMutating || !newHoliday.name.trim() || !newHoliday.date}
                      className="h-11 w-full sm:w-auto bg-[#EF4923] hover:bg-[#EF4923]/90 min-w-[44px]"
                    >
                      Add Holiday
                    </Button>
                  </div>
                </div>
              </div>

              {/* Holidays List */}
              <div className="space-y-4">
                {holidaysLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No holidays configured yet. Add one above to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-[#EF4923]/10 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="h-4 w-4 text-[#EF4923]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-medium text-foreground">
                                {holiday.name}
                              </div>
                              {holiday.isRecurring && (
                                <Badge variant="secondary" className="text-xs">
                                  Annual
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(holiday.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                          disabled={isMutating}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Delete</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'reports' && isAdmin && viewMode === 'admin' && (
          <Card>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Coverage statistics, agent activity, and shift history for accountability tracking.
              </p>
              {/* Reports Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={showReports ? "default" : "outline"}
                    onClick={() => setShowReports(!showReports)}
                    className={showReports ? "bg-[#EF4923] hover:bg-[#EF4923]/90" : ""}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {showReports ? "Hide Reports" : "Show Reports"}
                  </Button>
                </div>

                {/* Date Range Selector */}
                {showReports && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="text-xs font-medium whitespace-nowrap">Date Range:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={reportDateRange === "thisWeek" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReportDateRange("thisWeek")}
                        className={reportDateRange === "thisWeek" ? "bg-[#EF4923] hover:bg-[#EF4923]/90" : ""}
                      >
                        This Week
                      </Button>
                      <Button
                        variant={reportDateRange === "thisMonth" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReportDateRange("thisMonth")}
                        className={reportDateRange === "thisMonth" ? "bg-[#EF4923] hover:bg-[#EF4923]/90" : ""}
                      >
                        This Month
                      </Button>
                      <Button
                        variant={reportDateRange === "custom" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReportDateRange("custom")}
                        className={reportDateRange === "custom" ? "bg-[#EF4923] hover:bg-[#EF4923]/90" : ""}
                      >
                        Custom
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Date Range Inputs */}
              {showReports && reportDateRange === "custom" && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="report-start-date" className="text-xs font-medium">Start Date</Label>
                    <Input
                      id="report-start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="report-end-date" className="text-xs font-medium">End Date</Label>
                    <Input
                      id="report-end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Reports Content */}
              {showReports && (
                <div className="space-y-6">
                  {reportsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : reportsError ? (
                    <div className="text-center py-8 text-sm text-destructive border-2 border-dashed border-destructive/20 rounded-lg">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      Failed to load reports. Please try again.
                    </div>
                  ) : reportData ? (
                    <>
                      {/* Coverage Statistics */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Coverage Statistics
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="text-2xl font-bold text-foreground">
                              {reportData?.coverageStats?.coveragePercentage ?? 0}%
                            </div>
                            <div className="text-xs text-muted-foreground">Overall Coverage</div>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="text-2xl font-bold text-foreground">
                              {reportData?.coverageStats?.filledSlots ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Filled Slots</div>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="text-2xl font-bold text-foreground">
                              {reportData?.coverageStats?.totalSlots ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Slots</div>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Coverage */}
                      {reportData?.coverageByWeek && reportData.coverageByWeek.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Weekly Coverage
                          </h4>
                          <div className="space-y-2">
                            {reportData.coverageByWeek.map((week) => (
                              <div key={week.weekStart} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="text-sm">
                                  Week of {format(new Date(week.weekStart + "T00:00:00"), "MMM d, yyyy")}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-sm text-muted-foreground">
                                    {week.filled}/{week.total} slots
                                  </div>
                                  <Badge 
                                    variant={week.percentage >= 80 ? "default" : week.percentage >= 50 ? "secondary" : "destructive"}
                                    className="min-w-[48px]"
                                  >
                                    {week.percentage}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agent Activity */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Agent Activity (Ranked by Active Shifts)
                        </h4>
                        <div className="space-y-2">
                          {(reportData?.agentActivity || []).slice(0, 10).map((agent, index) => (
                            <div key={agent.userId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#EF4923]/10 flex items-center justify-center text-xs font-bold text-[#EF4923]">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{agent.name}</div>
                                  <div className="text-xs text-muted-foreground">{agent.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <div className="text-center">
                                  <div className="font-bold text-green-600">{agent.activeShifts}</div>
                                  <div className="text-muted-foreground">Active</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-muted-foreground">{agent.totalSignups}</div>
                                  <div className="text-muted-foreground">Total</div>
                                </div>
                                {agent.cancellations > 0 && (
                                  <div className="text-center">
                                    <div className="font-bold text-red-600">{agent.cancellations}</div>
                                    <div className="text-muted-foreground">Cancelled</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!reportData?.agentActivity || reportData.agentActivity.length === 0) && (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                              No agent activity found in this date range.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shift History */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Recent Shift History ({reportData?.shiftHistory?.length ?? 0} events)
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {(reportData?.shiftHistory || []).slice(0, 50).map((event) => (
                            <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.action === "signup" ? "bg-green-500" : "bg-red-500"}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm">
                                    <span className="font-medium">{event.agentName}</span>
                                    <span className="text-muted-foreground ml-1">
                                      {event.action === "signup" ? "signed up for" : "cancelled"}
                                    </span>
                                    <span className="font-medium ml-1">
                                      {formatShiftLabel(event.shiftType)} shift
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(event.shiftDate + "T00:00:00"), "EEE, MMM d")} • {event.shiftTime}
                                    {event.cancellationReason && (
                                      <span className="ml-2 text-red-600">
                                        Reason: {event.cancellationReason}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground flex-shrink-0">
                                {format(new Date(event.timestamp), "MMM d, h:mm a")}
                              </div>
                            </div>
                          ))}
                          {(!reportData?.shiftHistory || reportData.shiftHistory.length === 0) && (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                              No shift activity found in this date range.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "signup" 
                ? "Sign Up for Shift"
                : confirmAction?.type === "cancel"
                ? "Cancel Shift"
                : confirmAction?.type === "delete_holiday"
                ? "Delete Holiday"
                : confirmAction?.type === "assign_agent"
                ? "Assign Agent"
                : confirmAction?.type === "remove_agent"
                ? "Remove Agent"
                : confirmAction?.type === "signup_warning"
                ? "⚠️ Weekly Limit Warning"
                : confirmAction?.type === "cancel_warning"
                ? "⚠️ Short Notice Cancellation"
                : confirmAction?.type === "cancel_reason"
                ? "Cancel Shift"
                : confirmAction?.type === "admin_remove_reason"
                ? "Remove Agent"
                : "Join Waitlist"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "signup"
                ? `Confirm signup for ${confirmAction.label}?`
                : confirmAction?.type === "cancel"
                ? `Are you sure you want to cancel your signup for ${confirmAction?.label}?`
                : confirmAction?.type === "delete_holiday"
                ? `Are you sure you want to delete "${confirmAction?.label}"? This action cannot be undone.`
                : confirmAction?.type === "assign_agent"
                ? `Are you sure you want to assign ${confirmAction.label}?`
                : confirmAction?.type === "remove_agent"
                ? `Are you sure you want to remove ${confirmAction?.label}?`
                : confirmAction?.type === "signup_warning" || confirmAction?.type === "cancel_warning"
                ? confirmAction.label
                : confirmAction?.type === "cancel_reason"
                ? `Please provide a reason for cancelling your signup for ${confirmAction.label}:`
                : confirmAction?.type === "admin_remove_reason"
                ? `Please provide a reason for removing this agent:`
                : `Are you sure you want to join the waitlist for ${confirmAction?.label}? You'll be notified if a spot opens up.`}
            </AlertDialogDescription>
            
            {/* Cancellation reason input */}
            {(confirmAction?.type === "cancel_reason" || confirmAction?.type === "admin_remove_reason") && (
              <div className="mt-4">
                <Textarea
                  placeholder="Enter reason for cancellation..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="min-h-[80px] resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reason will be recorded and included in notifications.
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {confirmAction?.type === "signup" ? "Cancel" : "Go Back"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={
                (confirmAction?.type === "cancel_reason" || confirmAction?.type === "admin_remove_reason") 
                && !cancellationReason.trim()
              }
              className={
                confirmAction?.type === "cancel" || confirmAction?.type === "delete_holiday" || confirmAction?.type === "remove_agent" || confirmAction?.type === "cancel_reason" || confirmAction?.type === "admin_remove_reason"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : confirmAction?.type === "signup_warning" || confirmAction?.type === "cancel_warning"
                  ? "bg-amber-600 hover:bg-amber-600/90 text-white"
                  : "bg-[#EF4923] hover:bg-[#EF4923]/90"
              }
            >
              {confirmAction?.type === "signup" 
                ? "Confirm" 
                : confirmAction?.type === "cancel"
                ? "Cancel Shift"
                : confirmAction?.type === "delete_holiday"
                ? "Delete Holiday"
                : confirmAction?.type === "assign_agent"
                ? "Assign Agent"
                : confirmAction?.type === "remove_agent"
                ? "Remove Agent"
                : confirmAction?.type === "signup_warning"
                ? "Yes, Sign Up Anyway"
                : confirmAction?.type === "cancel_warning"
                ? "Yes, Cancel Anyway"
                : confirmAction?.type === "cancel_reason"
                ? "Cancel Shift"
                : confirmAction?.type === "admin_remove_reason"
                ? "Remove Agent"
                : "Join Waitlist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
