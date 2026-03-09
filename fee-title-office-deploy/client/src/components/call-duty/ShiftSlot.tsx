import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, User } from "lucide-react";

export interface SlotSignup {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  signedUpAt: string;
}

export interface SlotData {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  maxSignups: number;
  isActive: boolean;
  signupCount: number;
  isFull: boolean;
  isSignedUp: boolean;
  signups: SlotSignup[];
}

interface ShiftSlotProps {
  slot: SlotData;
  onSignUp: (slotId: string) => void;
  onCancel: (slotId: string) => void;
  isLoading?: boolean;
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

function getInitials(first: string | null, last: string | null): string {
  return `${(first || "?")[0]}${(last || "?")[0]}`.toUpperCase();
}

export default function ShiftSlot({ slot, onSignUp, onCancel, isLoading }: ShiftSlotProps) {
  const isPast = new Date(`${slot.date}T${slot.startTime}:00`) < new Date();

  // Determine visual state
  let stateClass = "";
  let stateLabel = "";

  if (slot.isSignedUp) {
    stateClass = "border-[#EF4923]/40 bg-[#EF4923]/5 dark:bg-[#EF4923]/10";
    stateLabel = "My Shift";
  } else if (slot.isFull) {
    stateClass = "border-muted bg-muted/30 dark:bg-muted/20";
    stateLabel = "Filled";
  } else if (isPast) {
    stateClass = "border-muted bg-muted/20 opacity-60";
    stateLabel = "Past";
  } else {
    stateClass = "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30";
    stateLabel = "Open";
  }

  return (
    <div className={`rounded-lg border p-3 transition-all ${stateClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {formatTimeRange(slot.startTime, slot.endTime)}
          </span>
        </div>
        <Badge
          variant={slot.isSignedUp ? "default" : slot.isFull ? "secondary" : "outline"}
          className={`text-[10px] px-1.5 py-0 ${
            slot.isSignedUp
              ? "bg-[#EF4923] hover:bg-[#EF4923]"
              : !slot.isFull && !isPast
              ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
              : ""
          }`}
        >
          {stateLabel}
        </Badge>
      </div>

      {/* Signups */}
      {slot.signups.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {slot.signups.map((signup) => (
            <div key={signup.id} className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={signup.profileImageUrl || undefined} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {getInitials(signup.firstName, signup.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-foreground truncate">
                {signup.firstName} {signup.lastName}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Capacity indicator */}
      {slot.maxSignups > 1 && (
        <div className="flex items-center gap-1 mb-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {slot.signupCount}/{slot.maxSignups} spots
          </span>
        </div>
      )}

      {/* Actions */}
      {!isPast && (
        <div>
          {slot.isSignedUp ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onCancel(slot.id)}
              disabled={isLoading}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel Shift
            </Button>
          ) : !slot.isFull ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-emerald-700 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950"
              onClick={() => onSignUp(slot.id)}
              disabled={isLoading}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Sign Up
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
