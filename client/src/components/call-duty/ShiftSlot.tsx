import React, { useState, useMemo, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, User, UserMinus, Users, Search, Mail } from "lucide-react";

export interface SlotSignup {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  signedUpAt: string;
}

export interface SlotWaitlist {
  id: string;
  userId: string;
  position: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: string;
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
  isOnWaitlist: boolean;
  waitlistPosition: number | null;
  waitlistCount: number;
  signups: SlotSignup[];
  waitlist: SlotWaitlist[];
}

export interface AvailableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

interface ShiftSlotProps {
  slot: SlotData;
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

export default function ShiftSlot({ 
  slot, 
  onSignUp, 
  onCancel, 
  onJoinWaitlist,
  isLoading,
  isAdmin = false,
  availableUsers = [],
  usersLoading = false,
  onAssignAgent,
  onAssignByEmail,
  onRemoveAgent
}: ShiftSlotProps) {
  const isPast = new Date(`${slot.date}T${slot.startTime}:00`) < new Date();
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmailAssign, setShowEmailAssign] = useState(false);
  const [assignName, setAssignName] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node) && searchTerm.trim()) {
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchTerm]);
  
  // Filter available users to exclude those already signed up for this slot
  const unassignedUsers = availableUsers.filter(user => 
    !slot.signups.some(signup => signup.userId === user.id)
  );

  // Filter users by search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return unassignedUsers;
    
    const term = searchTerm.toLowerCase();
    return unassignedUsers.filter(user => {
      const firstName = (user.firstName || "").toLowerCase();
      const lastName = (user.lastName || "").toLowerCase();
      const email = user.email.toLowerCase();
      return firstName.includes(term) || lastName.includes(term) || email.includes(term);
    });
  }, [unassignedUsers, searchTerm]);

  const handleAssignAgent = (userId: string) => {
    if (onAssignAgent) {
      onAssignAgent(slot.id, userId);
      // Clear search term to close autocomplete dropdown
      setSearchTerm("");
    }
  };

  const handleSelectUser = (userId: string) => {
    handleAssignAgent(userId);
    setSearchTerm("");
  };

  const handleAssignByEmail = () => {
    if (onAssignByEmail && assignName.trim() && assignEmail.trim()) {
      onAssignByEmail(slot.id, assignName.trim(), assignEmail.trim());
      // Reset form
      setAssignName("");
      setAssignEmail("");
      setShowEmailAssign(false);
      setSearchTerm("");
    }
  };

  const handleRemoveAgent = (signupId: string, agentName: string) => {
    if (onRemoveAgent) {
      onRemoveAgent(slot.id, signupId, agentName);
    }
  };

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
          {slot.signups.map((signup) => {
            const agentName = `${signup.firstName || ""} ${signup.lastName || ""}`.trim() || "Agent";
            return (
              <div key={signup.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={signup.fubAvatarUrl || signup.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {getInitials(signup.firstName, signup.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground truncate">
                    {agentName}
                  </span>
                </div>
                {isAdmin && !isPast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => handleRemoveAgent(signup.id, agentName)}
                    disabled={isLoading}
                    title="Remove agent"
                  >
                    <UserMinus className="h-3 w-3" />
                    <span className="sr-only">Remove {agentName}</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Waitlist (admin view) */}
      {isAdmin && slot.waitlist.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            Waitlist ({slot.waitlist.length})
          </div>
          <div className="space-y-1">
            {slot.waitlist.slice(0, 3).map((waitlistEntry) => {
              const agentName = `${waitlistEntry.firstName || ""} ${waitlistEntry.lastName || ""}`.trim() || waitlistEntry.email;
              return (
                <div key={waitlistEntry.id} className="flex items-center gap-1 text-[10px] text-amber-700">
                  <span className="w-4 text-center font-mono">#{waitlistEntry.position}</span>
                  <span className="truncate flex-1">{agentName}</span>
                </div>
              );
            })}
            {slot.waitlist.length > 3 && (
              <div className="text-[9px] text-muted-foreground text-center">
                +{slot.waitlist.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Capacity indicator */}
      {slot.maxSignups > 1 && (
        <div className="flex items-center gap-1 mb-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {slot.signupCount}/{slot.maxSignups} spots
            {slot.waitlistCount > 0 && (
              <span className="text-amber-600 ml-1">
                • {slot.waitlistCount} waiting
              </span>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      {!isPast && (
        <div className="space-y-1">
          {/* User actions */}
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
          ) : slot.isOnWaitlist ? (
            <div className="space-y-1">
              <div className="text-center py-1">
                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                  On Waitlist #{slot.waitlistPosition}
                </Badge>
              </div>
            </div>
          ) : !slot.isFull ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-emerald-700 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950"
              onClick={() => onSignUp(slot.id)}
              disabled={isLoading}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Sign Me Up
            </Button>
          ) : (
            <div className="space-y-1">
              <div className="text-center text-[10px] text-muted-foreground py-1">
                Slot full, try another
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-amber-700 hover:text-amber-700 hover:bg-amber-100 border border-amber-200"
                onClick={() => onJoinWaitlist(slot.id)}
                disabled={isLoading}
              >
                <Users className="h-3 w-3 mr-1" />
                Join Waitlist
                {slot.waitlistCount > 0 && (
                  <span className="ml-1">({slot.waitlistCount + 1})</span>
                )}
              </Button>
            </div>
          )}
          
          {/* Admin actions */}
          {isAdmin && !slot.isFull && (
            <div className="space-y-2">
              {!showEmailAssign && (
                <>
                  {/* Search box */}
                  <div className="relative" ref={searchContainerRef}>
                    <div className="flex items-center gap-1">
                      <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <Input
                        placeholder="Search agents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-7 text-xs flex-1"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Agent suggestions dropdown - show all unassigned users, filtered by search */}
                    {searchTerm.length >= 3 && filteredUsers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                        {filteredUsers.map((user) => {
                          const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
                          return (
                            <button
                              key={user.id}
                              onClick={() => handleAssignAgent(user.id)}
                              disabled={isLoading}
                              className="w-full flex items-center gap-2 p-2 text-xs hover:bg-muted/50 disabled:opacity-50 first:rounded-t-md last:rounded-b-md"
                            >
                              <Avatar className="h-4 w-4 flex-shrink-0">
                                <AvatarImage src={user.profileImageUrl || undefined} />
                                <AvatarFallback className="text-[8px] bg-muted">
                                  {getInitials(user.firstName, user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="truncate font-medium">{userName}</span>
                                <span className="truncate text-muted-foreground text-[10px]">{user.email}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Autocomplete suggestion list */}
                  {searchTerm.length >= 3 && filteredUsers.length > 0 && (
                    <div className="relative">
                      {searchTerm.length >= 3 && filteredUsers.length > 0 && (
                        <div className="absolute top-0 left-0 right-0 z-10 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                          {filteredUsers.map((user) => {
                            const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleSelectUser(user.id)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={user.profileImageUrl || undefined} />
                                  <AvatarFallback className="text-xs bg-muted">
                                    {getInitials(user.firstName, user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                  <span className="truncate font-medium text-sm">{userName}</span>
                                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Email assignment button - show when no users available or search yields no results */}
                  {!usersLoading && (unassignedUsers.length === 0 || (searchTerm.length >= 3 && filteredUsers.length === 0)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-blue-700 hover:text-blue-700 hover:bg-blue-100 border border-blue-200 dark:text-blue-400 dark:hover:bg-blue-950"
                      onClick={() => { setShowEmailAssign(true); setAssignEmail(searchTerm.trim()); }}
                      disabled={isLoading}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Assign by email instead
                    </Button>
                  )}
                </>
              )}

              {/* Email assignment form */}
              {showEmailAssign && (
                <div className="space-y-2 p-2 border rounded-md bg-blue-50/50 dark:bg-blue-950/30">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Name</Label>
                    <Input
                      placeholder="Agent name"
                      value={assignName}
                      onChange={(e) => setAssignName(e.target.value)}
                      className="h-7 text-xs"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="agent@email.com"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      className="h-7 text-xs"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 text-xs flex-1"
                      onClick={handleAssignByEmail}
                      disabled={isLoading || !assignName.trim() || !assignEmail.trim()}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        setShowEmailAssign(false);
                        setAssignName("");
                        setAssignEmail("");
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
