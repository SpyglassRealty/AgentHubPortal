// This is the content of AdminSiteEditorPage but without the AdminLayout wrapper
// To be used inside the admin interface

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Globe,
  Save,
  Loader2,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  Star,
  Home,
  Users,
  BarChart3,
  Award,
  MessageSquare,
  Quote,
  HelpCircle,
  ListChecks,
  FileText,
  Youtube,
  Megaphone,
  Footprints,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Import all the editor components and helpers from the original file
// (Copy the interfaces and helper functions from admin-site-editor.tsx)

interface SiteContentResponse {
  sections: Record<string, any>;
  savedSections: string[];
}

// Section metadata for display
const SECTION_META: { key: string; label: string; icon: any; description: string }[] = [
  { key: "hero", label: "Hero Section", icon: Home, description: "Main headline, background, CTA" },
  { key: "navigation", label: "Navigation Bar", icon: Globe, description: "Header navigation, logo, menu items, and CTA button" },
  { key: "stats", label: "Stats Bar", icon: BarChart3, description: "3 stat items below hero" },
  { key: "awards", label: "Awards Section", icon: Award, description: "Award badges and review platforms" },
  { key: "seller", label: "Seller Section", icon: Users, description: "Seller-focused content block" },
  { key: "buyer", label: "Buyer Section", icon: Users, description: "Buyer-focused content block" },
  { key: "testimonials", label: "Testimonials", icon: Quote, description: "Customer testimonial carousel" },
  { key: "reviews", label: "Reviews Section", icon: Star, description: "5-star reviews feature" },
  { key: "whyChoose", label: "Why Choose Section", icon: HelpCircle, description: "Why Choose Spyglass" },
  { key: "threeReasons", label: "Three Reasons", icon: ListChecks, description: "3 reason cards" },
  { key: "newForm", label: "New Form Section", icon: FileText, description: "New Form of Realty" },
  { key: "youtube", label: "YouTube Section", icon: Youtube, description: "YouTube video showcase" },
  { key: "cta", label: "CTA Bar", icon: Megaphone, description: "Call-to-action banner" },
  { key: "footer", label: "Footer", icon: Footprints, description: "Site footer content" },
];

export default function SiteEditorContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state for each section's edited content
  const [editedSections, setEditedSections] = useState<Record<string, any>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  // Fetch all site content
  const { data: contentData, isLoading } = useQuery<SiteContentResponse>({
    queryKey: ["/api/admin/site-content"],
    queryFn: async () => {
      const res = await fetch("/api/admin/site-content", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch site content");
      return res.json();
    },
  });

  // Initialize local state from server data
  useEffect(() => {
    if (contentData?.sections) {
      setEditedSections((prev) => {
        const next: Record<string, any> = {};
        for (const key of Object.keys(contentData.sections)) {
          next[key] = prev[key] && dirtyKeys.has(key) ? prev[key] : contentData.sections[key];
        }
        return next;
      });
    }
  }, [contentData]);

  const handleSectionChange = useCallback((key: string, data: any) => {
    setEditedSections((prev) => ({ ...prev, [key]: data }));
    setDirtyKeys((prev) => new Set(prev).add(key));
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ section, content }: { section: string; content: any }) => {
      const res = await fetch(`/api/admin/site-content/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Saved!", description: `${variables.section} section updated successfully.` });
    },
    onError: (error: Error, variables) => {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(variables.section);
        return next;
      });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async (section: string) => {
      const res = await fetch(`/api/admin/site-content/${section}/reset`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: (data, section) => {
      setEditedSections((prev) => ({ ...prev, [section]: data.content }));
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Reset", description: `${section} section restored to defaults.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = (sectionKey: string) => {
    setSavingKeys((prev) => new Set(prev).add(sectionKey));
    saveMutation.mutate({ section: sectionKey, content: editedSections[sectionKey] });
  };

  const handleReset = (sectionKey: string) => {
    if (confirm(`Reset "${sectionKey}" to default values? Your customizations will be lost.`)) {
      resetMutation.mutate(sectionKey);
    }
  };

  // Guard: admin only (this shouldn't be needed since it's inside admin interface, but keeping for safety)
  if (!user?.isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("https://spyglass-idx.vercel.app", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Live Site
        </Button>
      </div>

      {/* Dirty indicator */}
      {dirtyKeys.size > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
          You have unsaved changes in: {Array.from(dirtyKeys).join(", ")}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {SECTION_META.map((meta) => {
            const isSaved = contentData?.savedSections?.includes(meta.key);
            const isDirty = dirtyKeys.has(meta.key);
            const isSaving = savingKeys.has(meta.key);
            const Icon = meta.icon;

            return (
              <AccordionItem key={meta.key} value={meta.key} className="border rounded-lg px-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <div className="p-1.5 rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{meta.label}</span>
                        {isSaved && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Customized
                          </Badge>
                        )}
                        {isDirty && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-500 text-yellow-600">
                            Unsaved
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-4 pb-4">
                  {/* Section editor content would go here - simplified for now */}
                  <div className="p-4 bg-gray-50 rounded text-center text-gray-600">
                    Editor for {meta.label} section
                    <br />
                    <small className="text-gray-500">
                      (Editor components need to be imported from the original file)
                    </small>
                  </div>
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(meta.key)}
                      disabled={resetMutation.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset to Defaults
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(meta.key)}
                      disabled={!isDirty || isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      Save {meta.label}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}