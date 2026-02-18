import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  Home,
  Building2,
  FileText,
  FileBarChart,
  Globe,
  Users,
  MessageSquare,
  Star,
  Code,
  Activity,
  PenTool,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Redirect icon (matching admin.tsx)
const RedirectIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
);

const navigationSections = [
  {
    title: "TOOLS",
    items: [
      { name: "Admin Dashboard", href: "/admin", icon: Home, exact: true },
      { name: "Dashboards", href: "/admin/dashboards", icon: BarChart3 },
      { name: "Beacon", href: "/admin/beacon", icon: Activity },
      { name: "Homepage Editor", href: "/admin/site-editor", icon: PenTool },
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
      { name: "Review Sources", href: "/admin/testimonials/sources", icon: Star },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { user } = useAuth();

  if (!user?.isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location === href || location.startsWith(href + '/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Admin Sidebar */}
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
                      isActive(item.href, (item as any).exact)
                        ? 'bg-[#EF4923] text-white'
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

        {/* User Info & Toggle */}
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
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
                  </div>
                  <div className="text-gray-400 text-xs truncate">Administrator</div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {sidebarExpanded && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
