import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LinkIcon,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Globe,
  BookOpen,
  Video,
  FileText,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";

interface LinkItem {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  icon: string;
}

// Starter links for when nothing is configured
const STARTER_LINKS: LinkItem[] = [
  {
    id: 1,
    title: "eXp Realty Workplace",
    url: "https://workplace.expcommercial.com",
    description: "Access eXp enterprise tools, training, and resources",
    category: "Company",
    icon: "globe",
  },
  {
    id: 2,
    title: "Skyslope",
    url: "https://www.skyslope.com",
    description: "Transaction management and document storage",
    category: "Tools",
    icon: "file",
  },
  {
    id: 3,
    title: "kvCORE",
    url: "https://kvcore.com",
    description: "CRM and lead management platform",
    category: "Tools",
    icon: "globe",
  },
  {
    id: 4,
    title: "eXp Learning Hub",
    url: "https://expworldholdings.com",
    description: "Training courses and professional development",
    category: "Training",
    icon: "book",
  },
  {
    id: 5,
    title: "eXp World",
    url: "https://expworld.com",
    description: "Virtual campus and live events",
    category: "Company",
    icon: "video",
  },
  {
    id: 6,
    title: "Spyglass Realty Website",
    url: "https://spyglassrealty.com",
    description: "Company website and property search",
    category: "Company",
    icon: "globe",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Company: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Tools: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Training: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Resources: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const ICON_MAP: Record<string, any> = {
  globe: Globe,
  book: BookOpen,
  video: Video,
  file: FileText,
  training: GraduationCap,
};

export default function LinksPage() {
  const [links] = useState<LinkItem[]>(STARTER_LINKS);
  const [showManage, setShowManage] = useState(false);

  const categories = Array.from(new Set(links.map((l) => l.category)));

  return (
    <DashboardLayout
      title="Links"
      subtitle="Important 3rd party websites and resources for your team"
      icon={LinkIcon}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManage(!showManage)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Manage Links
        </Button>
      }
    >
      {/* Info Banner */}
      <Card className="mb-6 bg-muted/50">
        <CardContent className="p-4 flex items-center gap-3">
          <LinkIcon className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Add cards for important 3rd party websites that your entire team can access.
            These links are shared with all team members.
          </p>
        </CardContent>
      </Card>

      {showManage && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Add New Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input placeholder="Link Title" disabled />
              <Input placeholder="URL (https://...)" disabled />
              <Input placeholder="Description" disabled />
              <Input placeholder="Category" disabled />
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-1" />
              Add Link
            </Button>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Link management coming soon — requires AgentDashboards API integration
            </p>
          </CardContent>
        </Card>
      )}

      {/* Links by Category */}
      {categories.map((category) => (
        <div key={category} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {links
              .filter((l) => l.category === category)
              .map((link) => {
                const IconComponent = ICON_MAP[link.icon] || Globe;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                {link.title}
                              </h4>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {link.description}
                            </p>
                            <Badge
                              className={`text-[10px] mt-2 ${
                                CATEGORY_COLORS[link.category] || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {link.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
          </div>
        </div>
      ))}

      {links.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Links Configured</h2>
            <p className="text-muted-foreground mb-4">
              Add important 3rd party websites for your team to access.
            </p>
            <Button disabled>
              <Plus className="h-4 w-4 mr-1" />
              Add First Link
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
