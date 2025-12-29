import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Link2, Unlink, Check, AlertCircle } from "lucide-react";
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

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  rezenYentaId?: string | null;
}

export default function SettingsPage() {
  const [yentaIdInput, setYentaIdInput] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
