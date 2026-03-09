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
import { ChevronLeft, ChevronRight, Phone, Calendar, Clock, Settings, Trash2, Plus, CalendarDays, AlertTriangle, ChevronDown } from "lucide-react";

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
    type: "signup" | "cancel" | "delete_holiday" | "assign_agent" | "remove_agent" | "join_waitlist";
    slotId?: string;
    holidayId?: string;
    signupId?: string;
    userId?: string;
    label: string;
  } | null>(null);

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

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signup`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to sign up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Signed up!", description: "You've been added to this shift." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not sign up", description: error.message, variant: "destructive" });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signup`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Shift cancelled", description: "Your signup has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
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

  // Remove agent mutation (admin only)
  const removeAgentMutation = useMutation({
    mutationFn: async ({ slotId, signupId }: { slotId: string; signupId: string }) => {
      const res = await fetch(`/api/call-duty/slots/${slotId}/signups/${signupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove agent");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/my-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/call-duty/unfilled-slots"] });
      toast({ title: "Agent removed", description: "The agent has been removed from this shift." });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove agent", description: error.message, variant: "destructive" });
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
    setConfirmAction({
      type: "signup",
      slotId,
      label: getSlotLabel(slotId),
    });
  }

  function handleCancel(slotId: string) {
    setConfirmAction({
      type: "cancel",
      slotId,
      label: getSlotLabel(slotId),
    });
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
    const slot = slots.find(s => s.id === slotId);
    const slotLabel = slot ? `${formatShiftLabel(slot.shiftType)} (${formatTimeRange(slot.startTime, slot.endTime)}) on ${format(new Date(slot.date + "T00:00:00"), "EEE, MMM d")}` : "this shift";
    
    setConfirmAction({
      type: "remove_agent",
      slotId,
      signupId,
      label: `${agentName} from ${slotLabel}`,
    });
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
      signUpMutation.mutate(confirmAction.slotId);
    } else if (confirmAction.type === "cancel" && confirmAction.slotId) {
      cancelMutation.mutate(confirmAction.slotId);
    } else if (confirmAction.type === "delete_holiday" && confirmAction.holidayId) {
      deleteHolidayMutation.mutate(confirmAction.holidayId);
    } else if (confirmAction.type === "assign_agent" && confirmAction.slotId && confirmAction.userId) {
      assignAgentMutation.mutate({ slotId: confirmAction.slotId, userId: confirmAction.userId });
    } else if (confirmAction.type === "remove_agent" && confirmAction.slotId && confirmAction.signupId) {
      removeAgentMutation.mutate({ slotId: confirmAction.slotId, signupId: confirmAction.signupId });
    } else if (confirmAction.type === "join_waitlist" && confirmAction.slotId) {
      joinWaitlistMutation.mutate(confirmAction.slotId);
    }
    setConfirmAction(null);
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

        {/* Calendar */}
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
                isAdmin={isAdmin}
                availableUsers={availableUsers}
                onAssignAgent={handleAssignAgent}
                onRemoveAgent={handleRemoveAgent}
              />
            )}
          </CardContent>
        </Card>

        {/* My Shifts sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#EF4923]" />
              My Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myShiftsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : myShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming shifts. Sign up from the calendar above!
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

        {/* Unfilled Slots View - Admin/Developer Only */}
        {isAdmin && (
          <Card>
            <Collapsible open={unfilledSlotsOpen} onOpenChange={setUnfilledSlotsOpen}>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-0 h-auto hover:bg-transparent"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Unfilled Slots
                      {unfilledSlots.length > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                          {unfilledSlots.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${unfilledSlotsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <p className="text-sm text-muted-foreground text-left">
                  Current week's shifts needing more agents (Johnny Mac's Leads Huddle)
                </p>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
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
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Holiday Management - Admin/Developer Only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#EF4923]" />
                Holiday Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage holidays and skip days. Slots will not be created on these dates.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Holiday Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Holiday
                </h4>
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
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Current Holidays
                </h4>
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
                : "Join Waitlist"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "signup"
                ? `Are you sure you want to sign up for ${confirmAction.label}?`
                : confirmAction?.type === "cancel"
                ? `Are you sure you want to cancel your signup for ${confirmAction?.label}?`
                : confirmAction?.type === "delete_holiday"
                ? `Are you sure you want to delete "${confirmAction?.label}"? This action cannot be undone.`
                : confirmAction?.type === "assign_agent"
                ? `Are you sure you want to assign ${confirmAction.label}?`
                : confirmAction?.type === "remove_agent"
                ? `Are you sure you want to remove ${confirmAction?.label}?`
                : `Are you sure you want to join the waitlist for ${confirmAction?.label}? You'll be notified if a spot opens up.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.type === "cancel" || confirmAction?.type === "delete_holiday" || confirmAction?.type === "remove_agent"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-[#EF4923] hover:bg-[#EF4923]/90"
              }
            >
              {confirmAction?.type === "signup" 
                ? "Sign Up" 
                : confirmAction?.type === "cancel"
                ? "Cancel Shift"
                : confirmAction?.type === "delete_holiday"
                ? "Delete Holiday"
                : confirmAction?.type === "assign_agent"
                ? "Assign Agent"
                : confirmAction?.type === "remove_agent"
                ? "Remove Agent"
                : "Join Waitlist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
