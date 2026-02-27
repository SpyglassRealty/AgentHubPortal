import { useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────

interface CsvRow {
  "Blog Title": string;
  "URL Slug": string;
  "Blog URL": string;
  "Google Doc": string;
  "Hero Image": string;
  "Date Crawled": string;
  [key: string]: string;
}

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

// ── Simple client-side CSV parser ──────────────────────────────────────

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse a CSV line respecting quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row as CsvRow;
  });
}

// ── Component ──────────────────────────────────────────────────────────

export default function BlogImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentRow, setCurrentRow] = useState<number | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<{ successCount: number; failCount: number; total: number } | null>(null);

  // ── File handling ───────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setFile(f);
    setResults(null);
    setImportSummary(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows);
    };
    reader.readAsText(f);
  }, [toast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => setIsDragOver(false);

  // ── Import ──────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!file || !preview.length) return;

    setIsImporting(true);
    setResults(null);
    setImportSummary(null);

    // Show row-by-row progress
    for (let i = 0; i < preview.length; i++) {
      setCurrentRow(i + 1);
      // Small delay so the UI updates between rows on fast responses
      await new Promise((r) => setTimeout(r, 50));
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/blog/import-csv", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }

      const data: ImportResponse = await res.json();
      setResults(data.results);
      setImportSummary({ successCount: data.successCount, failCount: data.failCount, total: data.total });

      toast({
        title: "Import complete",
        description: `${data.successCount} imported, ${data.failCount} failed`,
        variant: data.failCount > 0 ? "default" : "default",
      });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      setCurrentRow(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/pages">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog Posts
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Blogs from CSV</h1>
          <p className="text-gray-600 text-sm">
            Upload a CSV with columns: Blog Title, URL Slug, Blog URL, Google Doc, Hero Image, Date Crawled
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              isDragOver ? "border-[#EF4923] bg-orange-50" : "border-gray-300 hover:border-[#EF4923] hover:bg-gray-50"
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            {file ? (
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{preview.length} rows detected — click to change file</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-700">Drop your CSV here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Accepts .csv files up to 20 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      {preview.length > 0 && !results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Preview — {preview.length} {preview.length === 1 ? "row" : "rows"}
            </CardTitle>
            <Button
              className="bg-[#EF4923] hover:bg-[#d63d1a] text-white gap-2"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing… {currentRow !== null ? `(${currentRow}/${preview.length})` : ""}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Import All ({preview.length})
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Blog Title</TableHead>
                    <TableHead>URL Slug</TableHead>
                    <TableHead>Blog URL</TableHead>
                    <TableHead>Hero Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow
                      key={i}
                      className={
                        isImporting && currentRow !== null && i + 1 === currentRow
                          ? "bg-orange-50"
                          : ""
                      }
                    >
                      <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {row["Blog Title"] || <span className="text-red-400 italic">missing</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 max-w-[160px] truncate">
                        {row["URL Slug"]
                          ? row["URL Slug"].replace(/\.html?$/i, "")
                          : <span className="text-gray-400 italic">auto</span>}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {row["Blog URL"] ? (
                          <a
                            href={row["Blog URL"]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs truncate flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{row["Blog URL"]}</span>
                          </a>
                        ) : (
                          <span className="text-red-400 italic text-xs">missing</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        {row["Hero Image"] ? (
                          <img
                            src={row["Hero Image"]}
                            alt=""
                            className="h-8 w-14 object-cover rounded border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs italic">none</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress indicator during import */}
      {isImporting && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-[#EF4923]" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  Fetching and importing blog content…
                </p>
                {currentRow !== null && (
                  <p className="text-sm text-gray-600">
                    Processing row {currentRow} of {preview.length}
                  </p>
                )}
                <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EF4923] transition-all duration-300 rounded-full"
                    style={{ width: currentRow ? `${(currentRow / preview.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && importSummary && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-gray-200">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{importSummary.total}</p>
                <p className="text-sm text-gray-500">Total rows</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-green-700">{importSummary.successCount}</p>
                <p className="text-sm text-green-600">Imported</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-red-700">{importSummary.failCount}</p>
                <p className="text-sm text-red-600">Failed</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-row results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Details / Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-gray-400 text-xs">{result.row}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{result.title}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-600">{result.slug}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
                              <CheckCircle className="h-3 w-3" /> Imported
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
                setFile(null);
                setPreview([]);
                setResults(null);
                setImportSummary(null);
              }}
            >
              Import another CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
