import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  FileText,
  Loader2,
  Layers,
  PenLine,
  LayoutTemplate,
  Download,
  BookmarkPlus,
  FolderOpen,
} from "lucide-react";
import {
  SectionsPanel,
  ContentPanel,
  LayoutPanel,
  DEFAULT_SECTIONS,
  type PresentationSection,
  type PresentationConfig,
} from "@/components/cma/presentation-sections";
import { PresentationPreview } from "@/components/cma/presentation-preview";

interface PropertyData {
  mlsNumber: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  listPrice: number;
  soldPrice?: number | null;
  beds: number;
  baths: number;
  sqft: number;
  lotSizeAcres?: number | null;
  yearBuilt?: number | null;
  propertyType?: string;
  status: string;
  listDate?: string;
  soldDate?: string | null;
  daysOnMarket?: number;
  photo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface CmaData {
  id?: string;
  name: string;
  subjectProperty: PropertyData | null;
  comparableProperties: PropertyData[];
  notes: string;
  status: string;
  presentationConfig?: PresentationConfig | null;
}

export default function CmaPresentationPage() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/cma/:id/presentation");
  const cmaId = routeParams?.id;
  const { toast } = useToast();

  const [sections, setSections] = useState<PresentationSection[]>(DEFAULT_SECTIONS);
  const [activeTab, setActiveTab] = useState("sections");
  const [hasChanges, setHasChanges] = useState(false);

  // Load CMA data
  const { data: cma, isLoading } = useQuery<CmaData>({
    queryKey: ["/api/cma", cmaId],
    queryFn: async () => {
      const res = await fetch(`/api/cma/${cmaId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load CMA");
      return res.json();
    },
    enabled: !!cmaId,
  });

  // Initialize sections from saved config
  useEffect(() => {
    if (cma?.presentationConfig?.sections) {
      // Merge saved config with defaults (in case new sections were added)
      const saved = cma.presentationConfig.sections;
      const savedMap = new Map(saved.map((s) => [s.id, s]));
      const merged = DEFAULT_SECTIONS.map((def) => {
        const s = savedMap.get(def.id);
        return s ? { ...def, ...s } : def;
      });
      setSections(merged);
    }
  }, [cma]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (config: PresentationConfig) => {
      return apiRequest("PUT", `/api/cma/${cmaId}`, {
        presentationConfig: config,
      });
    },
    onSuccess: () => {
      setHasChanges(false);
      toast({ title: "Presentation configuration saved" });
    },
    onError: () => {
      toast({
        title: "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate({ sections });
  }, [sections, saveMutation]);

  const handleReset = useCallback(() => {
    setSections(DEFAULT_SECTIONS);
    setHasChanges(true);
    toast({ title: "Reset to defaults" });
  }, [toast]);

  const handleSectionsChange = useCallback(
    (newSections: PresentationSection[]) => {
      setSections(newSections);
      setHasChanges(true);
    },
    []
  );

  if (!cmaId) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Invalid CMA ID.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-[600px] w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const cmaForPreview: CmaData = cma || {
    name: "",
    subjectProperty: null,
    comparableProperties: [],
    notes: "",
    status: "draft",
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/cma/${cmaId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-[#EF4923]" />
                Presentation Builder
              </h1>
              {cma?.name && (
                <p className="text-sm text-muted-foreground">{cma.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button variant="outline" size="sm" disabled>
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Load Template
            </Button>
            <Button variant="outline" size="sm" disabled>
              <BookmarkPlus className="h-4 w-4 mr-1.5" />
              Save as Template
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-1.5" />
              Export PDF
            </Button>
            <Button
              className="bg-[#EF4923] hover:bg-[#d4401f] text-white"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save Configuration
            </Button>
            {hasChanges && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-300"
              >
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>

        {/* Main content — two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          {/* Left panel — Tabs + Section controls */}
          <div className="lg:col-span-2 space-y-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="sections" className="flex-1">
                  <Layers className="h-4 w-4 mr-1.5" />
                  Sections
                </TabsTrigger>
                <TabsTrigger value="content" className="flex-1">
                  <PenLine className="h-4 w-4 mr-1.5" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex-1">
                  <LayoutTemplate className="h-4 w-4 mr-1.5" />
                  Layout
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sections">
                <SectionsPanel
                  sections={sections}
                  onSectionsChange={handleSectionsChange}
                />
              </TabsContent>

              <TabsContent value="content">
                <ContentPanel
                  sections={sections}
                  onSectionsChange={handleSectionsChange}
                />
              </TabsContent>

              <TabsContent value="layout">
                <LayoutPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel — Live Preview */}
          <div className="lg:col-span-3 border rounded-lg overflow-hidden bg-background">
            <PresentationPreview sections={sections} cma={cmaForPreview} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
