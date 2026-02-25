import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Bell, Search, Settings, LogOut, Menu, ChevronRight, X, Sun, Moon, Monitor, Check, User, Sliders,
  Globe, FileText, Users, BarChart3, Award, Quote, Star, HelpCircle, ListChecks, 
  Youtube, Megaphone, Footprints, Home, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

// Content Management specific navigation items
const contentManagementNavItems = [
  { 
    href: "/admin/site-editor", 
    label: "Site Editor", 
    icon: Globe, 
    description: "Edit homepage sections" 
  },
  { 
    href: "/admin/blog/posts", 
    label: "Blog Posts", 
    icon: FileText, 
    description: "Manage blog content" 
  },
  { 
    href: "/admin/blog/categories", 
    label: "Blog Categories", 
    icon: ListChecks, 
    description: "Organize blog topics" 
  },
  { 
    href: "/admin/pages", 
    label: "Pages", 
    icon: FileText, 
    description: "Static pages" 
  },
  { 
    href: "/admin/landing-pages", 
    label: "Landing Pages", 
    icon: Megaphone, 
    description: "Marketing pages" 
  },
  { 
    href: "/admin/testimonials", 
    label: "Testimonials", 
    icon: Quote, 
    description: "Customer reviews" 
  },
  { 
    href: "/admin/agents", 
    label: "Agents", 
    icon: Users, 
    description: "Team profiles" 
  },
  { 
    href: "/admin/communities", 
    label: "Communities", 
    icon: Home, 
    description: "Area guides" 
  },
  { 
    href: "/admin/redirects", 
    label: "Redirects", 
    icon: ArrowLeft, 
    description: "URL management" 
  },
  { 
    href: "/admin/global-scripts", 
    label: "Global Scripts", 
    icon: Settings, 
    description: "Analytics & tracking" 
  },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function ContentManagementLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificationsData } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const themeMutation = useMutation({
    mutationFn: async (theme: string) => {
      const res = await fetch("/api/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
  });

  const currentTheme = user?.theme || "light";

  const handleThemeChange = (theme: string) => {
    themeMutation.mutate(theme);
  };

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}` 
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email || "Agent";

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "lead_assigned": return "👤";
      case "appointment_reminder": return "📅";
      case "deal_update": return "🏠";
      case "task_due": return "✅";
      default: return "🔔";
    }
  };

  const ContentManagementSidebar = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header with Back Button */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/admin">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity mb-4 text-sidebar-foreground/70">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Admin</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-accent">
            <Globe className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base leading-tight text-white">Content Management</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Site Editor</span>
          </div>
        </div>
      </div>

      {/* Content Management Navigation */}
      <div className="flex-1 px-3 py-6 space-y-1">
        {contentManagementNavItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href);
          const itemId = item.href.replace("/admin/", "").replace("/", "-") || "site-editor";
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`}
                data-testid={`cms-nav-${itemId}`}
                title={item.description}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : ''}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-sidebar-primary" />}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Content Manager</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#222222]">
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-30">
        <ContentManagementSidebar />
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 bg-gray-50 dark:bg-[#222222]">
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 md:hidden">
             <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 min-h-[44px] min-w-[44px]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
                <ContentManagementSidebar />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#EF4923]" />
              <span className="font-display font-bold text-base cursor-pointer hover:opacity-80 transition-opacity">Content Management</span>
            </div>
          </div>

          {mobileSearchOpen ? (
            <div className="absolute inset-x-0 top-0 h-16 bg-background z-30 flex items-center px-4 gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search content..." 
                  className="pl-9 h-10 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-input transition-all"
                  autoFocus
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileSearchOpen(false)}
                className="h-10 w-10 min-h-[44px] min-w-[44px]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : null}

          <div className="hidden md:flex items-center max-w-md w-full">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search content, pages, posts..." 
                className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-input transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9 min-h-[44px] min-w-[44px]"
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Same notification, theme, and settings dropdowns as main layout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative h-9 w-9 min-h-[44px] min-w-[44px]">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#EF4923] text-[10px] font-medium text-white flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2">
                  <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm">
                      <p className="text-muted-foreground mb-3">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-3 py-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                          !notification.isRead ? "bg-muted/30" : ""
                        }`}
                        onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                      >
                        <div className="flex gap-2">
                          <span className="text-base">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <p className={`text-sm truncate flex-1 ${!notification.isRead ? "font-medium" : ""}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-[#EF4923] flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-foreground h-9 w-9 min-h-[44px] min-w-[44px]"
                >
                  {currentTheme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : currentTheme === "system" ? (
                    <Monitor className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                  {currentTheme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                  {currentTheme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                  {currentTheme === "system" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 min-h-[44px] min-w-[44px]">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => setLocation("/settings?section=profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => setLocation("/settings?section=preferences")}
                >
                  <Sliders className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                {user?.isSuperAdmin && (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => setLocation("/admin/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-destructive cursor-pointer">
                  <a href="/api/logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-visible">
          {children}
        </div>
      </main>
    </div>
  );
}