import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  Home,
  BarChart3,
  Activity,
  PenTool,
  Building2,
  FileText,
  FileBarChart,
  Globe,
  Users,
  MessageSquare,
  Star,
  Code,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft as RedirectIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigationSections = [
  {
    title: "TOOLS",
    items: [
      { name: "Dashboard", href: "/admin", icon: Home, exact: true },
      { name: "Dashboards", href: "/admin/dashboards", icon: BarChart3 },
      { name: "Beacon", href: "/admin/beacon", icon: Activity },
      { name: "Site Editor", href: "/admin/site-editor", icon: PenTool },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { name: "Communities", href: "/admin/communities", icon: Building2 },
      { name: "Blog Posts", href: "/admin/blog/posts", icon: FileText },
      { name: "Blog Categories", href: "/admin/blog/categories", icon: FileBarChart },
      { name: "Landing Pages", href: "/admin/landing-pages", icon: Globe },
    ],
  },
  {
    title: "PEOPLE",
    items: [
      { name: "Agents", href: "/admin/agents", icon: Users },
      { name: "Testimonials", href: "/admin/testimonials", icon: MessageSquare },
      { name: "Review Sources", href: "/admin/review-sources", icon: Star },
    ],
  },
  {
    title: "SEO & TECHNICAL",
    items: [
      { name: "Redirects", href: "/admin/redirects", icon: RedirectIcon },
      { name: "Global Scripts", href: "/admin/global-scripts", icon: Code },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location === href || location.startsWith(href + "/");
  };

  // Breadcrumb generation
  const breadcrumbs = [{ name: "Admin", href: "/admin" }];
  if (location !== "/admin") {
    const pathSegments = location.split("/").filter((s) => s);
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const href = "/" + pathSegments.slice(0, i + 1).join("/");
      breadcrumbs.push({
        name: segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        href,
      });
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarExpanded ? "w-64" : "w-16"
        } transition-all duration-300 bg-[#1a1a2e] flex flex-col shadow-lg flex-shrink-0`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <Link href="/admin">
            <div className="flex items-center gap-3 cursor-pointer">
              <Shield className="h-8 w-8 text-[#EF4923] flex-shrink-0" />
              {sidebarExpanded && (
                <div>
                  <h2 className="font-bold text-white">Spyglass Admin</h2>
                  <p className="text-xs text-gray-400">Content Management</p>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6">
          {navigationSections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className={`px-4 ${sectionIndex > 0 ? "mt-8" : ""}`}
            >
              {sidebarExpanded && (
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href, (item as any).exact);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          active
                            ? "bg-[#EF4923] text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {sidebarExpanded && (
                          <span className="text-sm font-medium">
                            {item.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User + Toggle */}
        <div className="p-4 border-t border-gray-700">
          {sidebarExpanded && user && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EF4923] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(
                      (user as any).firstName?.[0] ||
                      (user as any).email?.[0] ||
                      "A"
                    ).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">
                    {(user as any).firstName && (user as any).lastName
                      ? `${(user as any).firstName} ${(user as any).lastName}`
                      : (user as any).email}
                  </div>
                  <div className="text-gray-400 text-xs">Administrator</div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="w-full flex justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-2 transition-colors"
          >
            {sidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <nav className="flex text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href}>
                {index > 0 && <span className="mx-2">/</span>}
                <Link
                  href={crumb.href}
                  className="hover:text-gray-700"
                >
                  {crumb.name}
                </Link>
              </span>
            ))}
          </nav>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
