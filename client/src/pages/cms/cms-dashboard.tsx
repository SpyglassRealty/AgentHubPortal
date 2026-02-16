import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  PenTool,
  Plus,
  LayoutDashboard,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CmsStats {
  totalPages: number;
  totalBlogPosts: number;
  published: number;
  drafts: number;
  recentlyEdited: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    updatedAt: string;
  }>;
}

export default function CmsDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<CmsStats>({
    queryKey: ["/api/cms/stats"],
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage pages, blog posts, and website content
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/cms/editor/new?type=blog")}
          >
            <PenTool className="mr-2 h-4 w-4" />
            New Blog Post
          </Button>
          <Button
            onClick={() => setLocation("/admin/cms/editor/new?type=page")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pages"
          value={stats?.totalPages}
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Blog Posts"
          value={stats?.totalBlogPosts}
          icon={<PenTool className="h-5 w-5 text-purple-500" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Published"
          value={stats?.published}
          icon={<Eye className="h-5 w-5 text-green-500" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Drafts"
          value={stats?.drafts}
          icon={<EyeOff className="h-5 w-5 text-orange-500" />}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/admin/cms/editor/new?type=page")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Page
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/admin/cms/editor/new?type=blog")}
            >
              <PenTool className="mr-2 h-4 w-4" />
              Create Blog Post
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/admin/cms/editor/new?type=community")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Create Community Page
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/admin/cms/editor/new?type=landing")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Landing Page
            </Button>
            <div className="pt-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setLocation("/admin/cms/pages")}
              >
                View All Content
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Edited
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.recentlyEdited && stats.recentlyEdited.length > 0 ? (
              <div className="space-y-2">
                {stats.recentlyEdited.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/admin/cms/editor/${page.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{page.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {page.updatedAt
                            ? formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {page.type}
                      </Badge>
                      <Badge
                        variant={page.status === "published" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {page.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No content yet</p>
                <p className="text-sm">Create your first page to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  isLoading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{value ?? 0}</p>
            )}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
