import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText,
  RefreshCw,
  AlertTriangle,
  Download,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  useTransactionsTable,
  useRefreshDashboard,
  formatCurrency,
  formatDate,
  type TransactionRow,
} from "@/lib/rezen-dashboard";
import { useMemo, useState, useCallback } from "react";

type SortField = "date" | "address" | "agent" | "type" | "side" | "price" | "grossCommission" | "status";
type SortDirection = "asc" | "desc";

export default function TransactionsPage() {
  const [status, setStatus] = useState<string>("CLOSED");
  const { data, isLoading, isError, error } = useTransactionsTable(status);
  const refreshMutation = useRefreshDashboard();

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  // Filter & sort
  const filteredTransactions = useMemo(() => {
    let rows = data?.transactions || [];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.address.toLowerCase().includes(q) ||
          t.agent.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          (t.code || "").toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      rows = rows.filter((t) => {
        if (!t.date) return false;
        return new Date(t.date).getTime() >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // end of day
      rows = rows.filter((t) => {
        if (!t.date) return false;
        return new Date(t.date).getTime() < to;
      });
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp =
            (a.date ? new Date(a.date).getTime() : 0) -
            (b.date ? new Date(b.date).getTime() : 0);
          break;
        case "address":
          cmp = a.address.localeCompare(b.address);
          break;
        case "agent":
          cmp = a.agent.localeCompare(b.agent);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "side":
          cmp = a.side.localeCompare(b.side);
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "grossCommission":
          cmp = a.grossCommission - b.grossCommission;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [data?.transactions, search, dateFrom, dateTo, sortField, sortDir]);

  // CSV Export
  const handleExport = useCallback(() => {
    if (!filteredTransactions.length) return;

    const headers = [
      "Date",
      "Address",
      "City",
      "State",
      "Agent",
      "Type",
      "Side",
      "Close Price",
      "Gross Commission",
      "Net Payout",
      "Status",
      "Property Type",
    ];

    const csvRows = filteredTransactions.map((t) => [
      t.date ? new Date(t.date).toLocaleDateString() : "",
      `"${t.address.replace(/"/g, '""')}"`,
      t.city,
      t.state,
      `"${t.agent.replace(/"/g, '""')}"`,
      t.type,
      t.side,
      t.price,
      t.grossCommission,
      t.netPayout,
      t.status,
      t.propertyType,
    ]);

    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${status.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, status]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  return (
    <DashboardLayout
      title="Transactions"
      subtitle="Browse, search, and export all transactions — powered by ReZen"
      icon={FileText}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!filteredTransactions.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || refreshMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                isLoading || refreshMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>
      }
    >
      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as any)?.message || "Failed to load transactions."}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(["CLOSED", "OPEN", "TERMINATED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                status === s
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search address, agent, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] text-sm"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] text-sm"
            placeholder="To"
          />
        </div>

        {/* Count badge */}
        {data && (
          <Badge variant="secondary" className="text-xs">
            {filteredTransactions.length}
            {filteredTransactions.length !== data.totalCount
              ? ` / ${data.totalCount}`
              : ""}{" "}
            transactions
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(8)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No transactions found
              {search || dateFrom || dateTo ? " matching your filters" : ""}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("address")}
                    >
                      <div className="flex items-center">
                        Address
                        <SortIcon field="address" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("agent")}
                    >
                      <div className="flex items-center">
                        Agent
                        <SortIcon field="agent" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon field="type" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("side")}
                    >
                      <div className="flex items-center">
                        Side
                        <SortIcon field="side" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-end">
                        Close Price
                        <SortIcon field="price" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("grossCommission")}
                    >
                      <div className="flex items-center justify-end">
                        Gross Commission
                        <SortIcon field="grossCommission" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {t.address}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{t.agent}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            t.side === "Listing"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {t.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(t.price)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(t.grossCommission)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            t.status.includes("CLOSED") || t.status.includes("Closed")
                              ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                              : t.status.includes("TERMINATED") || t.status.includes("Terminated")
                              ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
