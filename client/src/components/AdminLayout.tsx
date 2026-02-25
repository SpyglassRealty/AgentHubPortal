import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  Building2,
  BarChart3,
  Activity,
  PenTool,
  FileText,
  FileBarChart,
  Globe,
  MessageSquare,
  Star,
  ArrowRightLeft as RedirectIcon,
  Code,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function AdminLayout({ children, title = "Admin Dashboard", description }: AdminLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Navigation configuration (same as admin.tsx)
  const navigationSections = [
    {
      title: "TOOLS",
      items: [
        { name: "Dashboard", href: "/admin", icon: Home, active: location === "/admin" },
        { name: "Dashboards", href: "/admin/dashboards", icon: BarChart3 },
        { name: "Beacon", href: "/admin/beacon", icon: Activity },
        { name: "Site Editor", href: "/admin/site-editor", icon: PenTool },
      ]
    },
    {
      title: "CONTENT", 
      items: [
        { name: "Communities", href: "/admin/communities", icon: Building2 },
        { name: "Blog Posts", href: "/admin/blog/posts", icon: FileText },
        { name: "Blog Categories", href: "/admin/blog/categories", icon: FileBarChart },
        { name: "Landing Pages", href: "/admin/landing-pages", icon: Globe },
        { name: "Page Builder", href: "/admin/pages", icon: FileText },
      ]
    },
    {
      title: "PEOPLE",
      items: [
        { name: "Agents", href: "/admin/agents", icon: Users },
        { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquare },
        { name: "Review Sources", href: "/admin/review-sources", icon: Star },
      ]
    },
    {
      title: "SEO & TECHNICAL",
      items: [
        { name: "Redirects", href: "/admin/redirects", icon: RedirectIcon },
        { name: "Global Scripts", href: "/admin/global-scripts", icon: Code },
      ]
    }
  ];

  // Breadcrumb generation
  const breadcrumbs = [
    { name: "Admin", href: "/admin" }
  ];

  if (location !== "/admin") {
    const pathSegments = location.split('/').filter(segment => segment);
    for (let i = 2; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const href = '/' + pathSegments.slice(0, i + 1).join('/');
      breadcrumbs.push({
        name: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
        href
      });
    }
  }

  // Guard: admin only
  if (!user?.isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Content Management Sidebar */}
      <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 bg-[#1a1a2e] flex flex-col shadow-lg`}>
        {/* Logo/Brand */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#EF4923] flex-shrink-0" />
            {sidebarExpanded && (
              <div>
                <h2 className="font-bold text-white">Spyglass Admin</h2>
                <p className="text-xs text-gray-400">Content Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-6">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title} className={`px-4 ${sectionIndex > 0 ? 'mt-8' : ''}`}>
              {sidebarExpanded && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      item.active || location === item.href || location.startsWith(item.href + '/') 
                        ? 'bg-[#EF4923] text-white border-l-4 border-[#EF4923]' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarExpanded && <span className="text-sm font-medium">{item.name}</span>}
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* User Info & Sidebar Toggle */}
        <div className="p-4 border-t border-gray-700">
          {sidebarExpanded && user && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EF4923] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(user.firstName?.[0] || user.email?.[0] || 'A').toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                  </div>
                  <div className="text-gray-400 text-xs">Administrator</div>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full justify-center text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {sidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex text-sm text-gray-500 mb-2">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href}>
                    {index > 0 && <span className="mx-2">/</span>}
                    <Link href={crumb.href} className="hover:text-gray-700">
                      {crumb.name}
                    </Link>
                  </span>
                ))}
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {description && (
                <p className="text-gray-600">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}