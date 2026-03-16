import { useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import ShiftSlot, { type SlotData, type AvailableUser } from "./ShiftSlot";

const SHIFT_TYPES = ["morning", "midday", "evening"] as const;

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
};

const SHIFT_TIMES: Record<string, string> = {
  morning: "8AM – 12PM",
  midday: "12PM – 4PM",
  evening: "4PM – 8PM",
};

interface ShiftCalendarProps {
  weekStart: Date;
  slots: SlotData[];
  onSignUp: (slotId: string) => void;
  onCancel: (slotId: string) => void;
  onJoinWaitlist: (slotId: string) => void;
  isLoading?: boolean;
  // Admin props
  isAdmin?: boolean;
  availableUsers?: AvailableUser[];
  usersLoading?: boolean;
  onAssignAgent?: (slotId: string, userId: string) => void;
  onAssignByEmail?: (slotId: string, name: string, email: string) => void;
  onRemoveAgent?: (slotId: string, signupId: string, agentName: string) => void;
}

export default function ShiftCalendar({
  weekStart,
  slots,
  onSignUp,
  onCancel,
  onJoinWaitlist,
  isLoading,
  isAdmin,
  availableUsers,
  usersLoading,
  onAssignAgent,
  onAssignByEmail,
  onRemoveAgent,
}: ShiftCalendarProps) {
  // Build 7-day array from weekStart (Monday)
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Index slots by "date|shiftType" for fast lookup
  const slotIndex = useMemo(() => {
    const map = new Map<string, SlotData>();
    for (const slot of slots) {
      map.set(`${slot.date}|${slot.shiftType}`, slot);
    }
    return map;
  }, [slots]);

  return (
    <div className="overflow-x-auto pb-40">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2">
          <div /> {/* spacer for shift label column */}
          {days.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`text-center py-2 rounded-lg ${
                  today
                    ? "bg-[#EF4923]/10 dark:bg-[#EF4923]/20"
                    : ""
                }`}
              >
                <div className={`text-xs font-medium ${today ? "text-[#EF4923]" : "text-muted-foreground"}`}>
                  {format(day, "EEE")}
                </div>
                <div className={`text-sm font-semibold ${today ? "text-[#EF4923]" : "text-foreground"}`}>
                  {format(day, "MMM d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shift rows */}
        {SHIFT_TYPES.map((shiftType) => (
          <div
            key={shiftType}
            className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2"
          >
            {/* Shift label */}
            <div className="flex flex-col justify-center px-2 py-3">
              <span className="text-sm font-medium text-foreground">{SHIFT_LABELS[shiftType]}</span>
              <span className="text-[10px] text-muted-foreground">{SHIFT_TIMES[shiftType]}</span>
            </div>

            {/* Slots for each day */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const slot = slotIndex.get(`${dateStr}|${shiftType}`);

              if (!slot) {
                return (
                  <div
                    key={`${dateStr}-${shiftType}`}
                    className="rounded-lg border border-dashed border-muted p-3 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-muted-foreground">No slot</span>
                  </div>
                );
              }

              return (
                <ShiftSlot
                  key={slot.id}
                  slot={slot}
                  onSignUp={onSignUp}
                  onCancel={onCancel}
                  onJoinWaitlist={onJoinWaitlist}
                  isLoading={isLoading}
                  isAdmin={isAdmin}
                  availableUsers={availableUsers}
                  usersLoading={usersLoading}
                  onAssignAgent={onAssignAgent}
                  onAssignByEmail={onAssignByEmail}
                  onRemoveAgent={onRemoveAgent}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
