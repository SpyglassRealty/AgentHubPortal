import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Mail, ExternalLink, User } from "lucide-react";

export default function EmailPage() {
  const { user } = useAuth();

  const handleMailto = () => {
    if (user?.email) {
      window.location.href = `mailto:${user.email}`;
    }
  };

  const openGmail = () => {
    window.open("https://mail.google.com", "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-8 w-8 text-[#EF4923]" />
          <h1 className="text-3xl font-display font-bold">Email</h1>
        </div>

        {/* Email Information Card */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#EF4923] text-white flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Your Email Account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Account information and quick actions
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email Address
              </label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-[#EF4923]" />
                <span className="font-mono text-sm">
                  {user?.email || 'Not available'}
                </span>
              </div>
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Account Type
              </label>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Google Workspace
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Single Sign-On (SSO)
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium text-muted-foreground">
                Quick Actions
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleMailto}
                  className="bg-[#EF4923] hover:bg-[#EF4923]/90 text-white"
                  disabled={!user?.email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email to Me
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={openGmail}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Gmail
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Use "Send Email to Me" to quickly compose an email to your own address, 
                or click "Open Gmail" to access your full inbox.
              </p>
            </div>

            {/* Account Info */}
            {(user?.firstName || user?.lastName) && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground">
                  Account Holder
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-[#EF4923] text-white flex items-center justify-center text-sm font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <span className="text-sm">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="bg-muted/30 border border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Spyglass Realty Email</p>
                <p className="text-xs text-muted-foreground">
                  This is your official Spyglass Realty email address. 
                  All business communications should use this address for 
                  professional correspondence with clients, colleagues, and partners.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}