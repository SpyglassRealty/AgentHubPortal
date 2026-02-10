import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileBarChart,
  Download,
  Play,
  FileText,
  DollarSign,
  Network,
  Home,
  Clock,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  columns: number;
  icon: any;
  category: string;
  sampleColumns: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "transaction",
    name: "Transaction Report",
    description: "Complete list of transactions with key details including agent, price, dates, and status",
    columns: 9,
    icon: FileText,
    category: "Production",
    sampleColumns: [
      "Address",
      "Agent",
      "Type",
      "Price",
      "GCI",
      "Close Date",
      "Status",
      "Representation",
      "Days on Market",
    ],
  },
  {
    id: "pipeline",
    name: "Pipeline Report",
    description: "Pending transactions and expected closings with projected revenue",
    columns: 8,
    icon: Clock,
    category: "Production",
    sampleColumns: [
      "Address",
      "Agent",
      "Price",
      "Expected Close",
      "Status",
      "Days Pending",
      "GCI (Est.)",
      "Notes",
    ],
  },
  {
    id: "revenue",
    name: "Revenue Report",
    description: "Detailed breakdown of income by source, agent, and time period",
    columns: 9,
    icon: DollarSign,
    category: "Financial",
    sampleColumns: [
      "Agent",
      "Gross Income",
      "Deductions",
      "Net Income",
      "Transactions",
      "Avg GCI",
      "Cap Status",
      "Period",
      "YoY Change",
    ],
  },
  {
    id: "network",
    name: "Network Report",
    description: "Network members, tiers, RevShare details, and sponsorship information",
    columns: 7,
    icon: Network,
    category: "Network",
    sampleColumns: [
      "Agent Name",
      "Tier",
      "Status",
      "Join Date",
      "Sponsor",
      "Network Size",
      "RevShare Income",
    ],
  },
  {
    id: "listings",
    name: "Listings Report",
    description: "Active and pending listings with market data and agent assignments",
    columns: 9,
    icon: Home,
    category: "Production",
    sampleColumns: [
      "Address",
      "Agent",
      "List Price",
      "Status",
      "List Date",
      "Expiration",
      "Days on Market",
      "Type",
      "Location",
    ],
  },
];

interface SavedReport {
  id: string;
  name: string;
  template: string;
  generatedAt: string;
  rows: number;
  status: "ready" | "generating" | "failed";
}

const MOCK_SAVED_REPORTS: SavedReport[] = [
  {
    id: "1",
    name: "Q2 2025 Transaction Summary",
    template: "Transaction Report",
    generatedAt: "2025-06-28T10:30:00",
    rows: 312,
    status: "ready",
  },
  {
    id: "2",
    name: "June 2025 Revenue Breakdown",
    template: "Revenue Report",
    generatedAt: "2025-06-25T14:15:00",
    rows: 168,
    status: "ready",
  },
  {
    id: "3",
    name: "Network Growth Report",
    template: "Network Report",
    generatedAt: "2025-06-20T09:00:00",
    rows: 162,
    status: "ready",
  },
  {
    id: "4",
    name: "Active Pipeline",
    template: "Pipeline Report",
    generatedAt: "2025-06-28T16:45:00",
    rows: 86,
    status: "ready",
  },
];

export default function ReportsPage() {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleGenerate = (templateId: string) => {
    setGeneratingId(templateId);
    // Simulate generation
    setTimeout(() => setGeneratingId(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Production":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
      case "Financial":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Network":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Generate, view, and export team reports"
      icon={FileBarChart}
    >
      <Tabs defaultValue="templates">
        <TabsList className="mb-6">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="saved">My Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isGenerating = generatingId === template.id;
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium">
                            {template.name}
                          </CardTitle>
                          <Badge
                            className={`text-[10px] mt-1 ${getCategoryColor(template.category)}`}
                          >
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {template.columns} columns
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.sampleColumns.slice(0, 5).map((col) => (
                        <Badge key={col} variant="secondary" className="text-[10px]">
                          {col}
                        </Badge>
                      ))}
                      {template.sampleColumns.length > 5 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{template.sampleColumns.length - 5} more
                        </Badge>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleGenerate(template.id)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-2" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="saved">
          {MOCK_SAVED_REPORTS.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileBarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No Reports Generated</h2>
                <p className="text-muted-foreground">
                  Generate a report from the templates tab to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_SAVED_REPORTS.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {report.template}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(report.generatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{report.rows}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              report.status === "ready"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : report.status === "generating"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }
                          >
                            {report.status === "ready"
                              ? "Ready"
                              : report.status === "generating"
                              ? "Generating"
                              : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                              <BarChart3 className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground mt-4 italic">
            Report viewing and CSV export coming soon — requires AgentDashboards report API
            integration
          </p>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
