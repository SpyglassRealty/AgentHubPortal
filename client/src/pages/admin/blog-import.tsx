import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  row: number;
  title: string;
  slug: string;
  success: boolean;
  pageId?: string;
  error?: string;
}

interface ImportResponse {
  results: ImportResult[];
  successCount: number;
  failCount: number;
  total: number;
}

export default function BlogImportPage() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<{ success: number; fail: number; total: number } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!sheetUrl.trim()) {
      toast({ title: "Error", description: "Please enter a Google Sheets URL", variant: "destructive" });
      return;
    }

    if (!sheetUrl.includes("docs.google.com/spreadsheets")) {
      toast({ title: "Error", description: "Please enter a valid Google Sheets URL", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setResults(null);
    setImportSummary(null);

    try {
      const res = await fetch("/api/admin/blog/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });

      const data: ImportResponse = await res.json();

      if (!res.ok) {
        toast({
          title: "Import failed",
          description: (data as any).error || "Unknown error",
          variant: "destructive",
        });
        return;
      }

      setResults(data.results);
      setImportSummary({
        success: data.successCount,
        fail: data.failCount,
        total: data.total,
      });

      if (data.successCount > 0) {
        toast({
          title: "Import complete",
          description: `${data.successCount} of ${data.total} blogs imported as drafts`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/pages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-[#EF4923]" />
            Import Blogs from Google Sheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste a Google Sheets URL to import blogs into the page builder as drafts
          </p>
        </div>
      </div>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Google Sheets URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              disabled={isImporting}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
            />
            <Button
              onClick={handleImport}
              disabled={isImporting || !sheetUrl.trim()}
              className="bg-[#EF4923] hover:bg-[#d63d1c] min-w-[120px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Expected columns:</strong> Blog Title, URL Slug, Google Doc (HYPERLINK), Hero Image (HYPERLINK), Date Crawled</p>
            <p><strong>Requirements:</strong> The sheet and all linked Google Docs must be shared publicly (Anyone with the link → Viewer)</p>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isImporting && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#EF4923]" />
            <div className="text-center">
              <p className="font-medium">Importing blogs...</p>
              <p className="text-sm text-muted-foreground">Fetching sheet data, downloading Google Docs, parsing HTML content</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && importSummary && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{importSummary.total}</p>
                <p className="text-sm text-muted-foreground">Total rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{importSummary.success}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-red-600">{importSummary.fail}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-row results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-40">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{result.row}</TableCell>
                        <TableCell className="font-medium text-sm">{result.title}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{result.slug}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge className="bg-green-100 text-green-700 gap-1">
                              <CheckCircle className="h-3 w-3" /> OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <Link href={`/admin/pages/blog/${result.pageId}/edit`}>
                              <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                                <FileText className="h-3 w-3" />
                                Edit in page builder
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-red-600 text-xs">{result.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/admin/pages">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Pages
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setSheetUrl("");
                setResults(null);
                setImportSummary(null);
              }}
            >
              Import another sheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
