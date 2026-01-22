import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Link2, Unlink, Check, AlertCircle, Bell, Users, Calendar, Home, CheckSquare, Megaphone, Moon, Mail, Smartphone, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  rezenYentaId?: string | null;
}

interface NotificationSettings {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  leadAssignedEnabled: boolean;
  appointmentReminderEnabled: boolean;
  dealUpdateEnabled: boolean;
  taskDueEnabled: boolean;
  systemEnabled: boolean;
  appointmentReminderTimes: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
}

const defaultNotificationSettings: Partial<NotificationSettings> = {
  notificationsEnabled: true,
  leadAssignedEnabled: true,
  appointmentReminderEnabled: true,
  dealUpdateEnabled: true,
  taskDueEnabled: true,
  systemEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: false,
};

export default function SettingsPage() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const [localNotifSettings, setLocalNotifSettings] = useState<Partial<NotificationSettings> | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: notifData } = useQuery<{ settings: NotificationSettings }>({
    queryKey: ["/api/notifications/settings"],
  });

  const notifSettings = localNotifSettings || notifData?.settings || defaultNotificationSettings;

  const updateNotifMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
      toast({ title: "Settings saved", description: "Your notification preferences have been updated." });
      setLocalNotifSettings(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" });
    },
  });

  const updateNotifSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setLocalNotifSettings((prev) => ({ ...prev, ...notifSettings, [key]: value }));
  };

  const handleSaveNotifSettings = () => {
    if (localNotifSettings) {
      updateNotifMutation.mutate(localNotifSettings);
    }
  };

  const hasNotifChanges = localNotifSettings !== null;

  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (yentaId: string) => {
      const res = await fetch("/api/rezen/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ yentaId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to link account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setYentaIdInput("");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rezen/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rezen/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const isRezenLinked = !!userProfile?.rezenYentaId;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account integrations and preferences</p>
        </div>

        <Card data-testid="card-rezen-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              ReZen Integration
            </CardTitle>
            <CardDescription>
              Connect your ReZen account to view your GCI, deals, and performance metrics on the My Performance page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isRezenLinked ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900">Account Connected</p>
                    <p className="text-sm text-emerald-700">
                      Yenta ID: <code className="bg-emerald-100 px-1 rounded">{userProfile?.rezenYentaId}</code>
                    </p>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="button-disconnect-rezen">
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect ReZen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect ReZen Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your ReZen integration. You won't be able to see your performance data until you reconnect.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => unlinkMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="button-confirm-disconnect"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">Not Connected</p>
                    <p className="text-sm text-amber-700">
                      Enter your Yenta ID below to connect your ReZen account.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yentaId">Yenta ID</Label>
                  <Input
                    id="yentaId"
                    placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={yentaIdInput}
                    onChange={(e) => setYentaIdInput(e.target.value)}
                    data-testid="input-settings-yenta-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Yenta ID can be found in your ReZen profile URL or ask your team leader.
                  </p>
                </div>

                <Button
                  onClick={() => linkMutation.mutate(yentaIdInput)}
                  disabled={!yentaIdInput || linkMutation.isPending}
                  data-testid="button-connect-rezen"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {linkMutation.isPending ? "Connecting..." : "Connect ReZen Account"}
                </Button>

                {linkMutation.isError && (
                  <p className="text-sm text-red-600" data-testid="error-link">
                    {linkMutation.error?.message || "Failed to link account"}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card data-testid="card-notification-settings">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[hsl(28,94%,54%)]" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled" className="text-base font-medium">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications for important updates</p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={notifSettings.notificationsEnabled}
                onCheckedChange={(checked) => updateNotifSetting("notificationsEnabled", checked)}
                data-testid="switch-notifications-enabled"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Notification Types</h3>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label htmlFor="lead-assigned" className="text-sm font-medium">New Lead Assigned</Label>
                    <p className="text-xs text-muted-foreground">When a new lead is assigned to you</p>
                  </div>
                </div>
                <Switch
                  id="lead-assigned"
                  checked={notifSettings.leadAssignedEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("leadAssignedEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-lead-assigned"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <div>
                    <Label htmlFor="appointment-reminder" className="text-sm font-medium">Appointment Reminders</Label>
                    <p className="text-xs text-muted-foreground">Reminders before scheduled appointments</p>
                  </div>
                </div>
                <Switch
                  id="appointment-reminder"
                  checked={notifSettings.appointmentReminderEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("appointmentReminderEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-appointment-reminder"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-orange-500" />
                  <div>
                    <Label htmlFor="deal-update" className="text-sm font-medium">Deal Updates</Label>
                    <p className="text-xs text-muted-foreground">When deal status changes</p>
                  </div>
                </div>
                <Switch
                  id="deal-update"
                  checked={notifSettings.dealUpdateEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("dealUpdateEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-deal-update"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <Label htmlFor="task-due" className="text-sm font-medium">Task Due</Label>
                    <p className="text-xs text-muted-foreground">When tasks are due or overdue</p>
                  </div>
                </div>
                <Switch
                  id="task-due"
                  checked={notifSettings.taskDueEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("taskDueEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-task-due"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-5 w-5 text-red-500" />
                  <div>
                    <Label htmlFor="system" className="text-sm font-medium">System Announcements</Label>
                    <p className="text-xs text-muted-foreground">Important system updates and news</p>
                  </div>
                </div>
                <Switch
                  id="system"
                  checked={notifSettings.systemEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("systemEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-system"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <div>
                    <Label htmlFor="quiet-hours" className="text-sm font-medium">Quiet Hours</Label>
                    <p className="text-xs text-muted-foreground">Don't send notifications during these times</p>
                  </div>
                </div>
                <Switch
                  id="quiet-hours"
                  checked={notifSettings.quietHoursEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("quietHoursEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-quiet-hours"
                />
              </div>

              {notifSettings.quietHoursEnabled && (
                <div className="ml-8 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">From:</Label>
                    <Select
                      value={notifSettings.quietHoursStart}
                      onValueChange={(value) => updateNotifSetting("quietHoursStart", value)}
                    >
                      <SelectTrigger className="w-28" data-testid="select-quiet-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["20:00", "21:00", "22:00", "23:00", "00:00"].map((time) => (
                          <SelectItem key={time} value={time}>
                            {time === "00:00" ? "12:00 AM" : `${parseInt(time) > 12 ? parseInt(time) - 12 : parseInt(time)}:00 ${parseInt(time) >= 12 ? "PM" : "AM"}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">To:</Label>
                    <Select
                      value={notifSettings.quietHoursEnd}
                      onValueChange={(value) => updateNotifSetting("quietHoursEnd", value)}
                    >
                      <SelectTrigger className="w-28" data-testid="select-quiet-end">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["05:00", "06:00", "07:00", "08:00", "09:00"].map((time) => (
                          <SelectItem key={time} value={time}>
                            {`${parseInt(time)}:00 AM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Delivery Methods</h3>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-cyan-500" />
                  <div>
                    <Label htmlFor="push" className="text-sm font-medium">Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications on this device</p>
                  </div>
                </div>
                <Switch
                  id="push"
                  checked={notifSettings.pushNotificationsEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("pushNotificationsEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-push"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-amber-500" />
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Also receive notifications via email</p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={notifSettings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => updateNotifSetting("emailNotificationsEnabled", checked)}
                  disabled={!notifSettings.notificationsEnabled}
                  data-testid="switch-email"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveNotifSettings} 
                disabled={!hasNotifChanges || updateNotifMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-save-notification-settings"
              >
                {updateNotifMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details from your login provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">
                  {userProfile?.firstName} {userProfile?.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{userProfile?.email || "Not available"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
