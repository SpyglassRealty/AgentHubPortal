import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  RefreshCw,
  Search,
  UserPlus,
  MapPin,
  Filter,
} from "lucide-react";
import {
  useXanoRoster,
  useXanoLocations,
  formatCurrency,
  formatNumber,
} from "@/lib/xano";
import { useMemo, useState } from "react";

type FilterType = "all" | "no-seat" | "has-seat" | "inactive" | "capped";

export default function MemberManagementPage() {
  const roster = useXanoRoster();
  const locations = useXanoLocations();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const isLoading = roster.isLoading;

  const metrics = useMemo(() => {
    const data = Array.isArray(roster.data) ? roster.data : [];

    const totalMembers = data.length;
    const withSeat = data.filter((m) => m.has_seat).length;
    const inactive = data.filter(
      (m) => m.status === "Inactive" || m.status === "inactive" || m.team_status === "Inactive"
    ).length;
    const capped = data.filter((m) => m.capped).length;

    // Total seats (mock — from RECON: 100 seats, 3 allocated)
    const totalSeats = 100;
    const allocatedSeats = withSeat || 3;
    const availableSeats = totalSeats - allocatedSeats;

    return {
      totalMembers,
      withSeat,
      inactive,
      capped,
      totalSeats,
      allocatedSeats,
      availableSeats,
    };
  }, [roster.data]);

  const filteredData = useMemo(() => {
    let data = Array.isArray(roster.data) ? roster.data : [];

    // Apply filter
    if (filter === "no-seat") data = data.filter((m) => !m.has_seat);
    if (filter === "has-seat") data = data.filter((m) => m.has_seat);
    if (filter === "inactive")
      data = data.filter(
        (m) => m.status === "Inactive" || m.status === "inactive" || m.team_status === "Inactive"
      );
    if (filter === "capped") data = data.filter((m) => m.capped);

    // Apply search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          (m.name || `${m.first_name || ""} ${m.last_name || ""}`).toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q) ||
          (m.location || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [roster.data, filter, search]);

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getFilterCount = (f: FilterType) => {
    const data = Array.isArray(roster.data) ? roster.data : [];
    if (f === "all") return data.length;
    if (f === "no-seat") return data.filter((m) => !m.has_seat).length;
    if (f === "has-seat") return data.filter((m) => m.has_seat).length;
    if (f === "inactive")
      return data.filter(
        (m) => m.status === "Inactive" || m.status === "inactive" || m.team_status === "Inactive"
      ).length;
    if (f === "capped") return data.filter((m) => m.capped).length;
    return 0;
  };

  return (
    <DashboardLayout
      title="Member Management"
      subtitle="Agent roster, onboarding status, and seat management"
      icon={Users}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => roster.refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(4)
            .fill(null)
            .map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
        ) : (
          <>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <div className="text-2xl font-bold">{metrics.totalMembers}</div>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Total Seats</div>
                <div className="text-2xl font-bold">{metrics.totalSeats}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.allocatedSeats} allocated • {metrics.availableSeats} available
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Inactive</div>
                <div className="text-2xl font-bold">{metrics.inactive}</div>
                <p className="text-xs text-muted-foreground">Members</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-muted-foreground mb-1">Capped</div>
                <div className="text-2xl font-bold">{metrics.capped}</div>
                <p className="text-xs text-muted-foreground">Members</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="outline" size="sm" disabled>
          <UserPlus className="h-4 w-4 mr-1" />
          Purchase Seats
        </Button>
        <Button variant="outline" size="sm" disabled>
          <MapPin className="h-4 w-4 mr-1" />
          Manage Locations
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "no-seat", "has-seat", "inactive", "capped"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
            >
              {f === "all"
                ? "All"
                : f === "no-seat"
                ? "No Seat"
                : f === "has-seat"
                ? "Has Seat"
                : f === "inactive"
                ? "Inactive"
                : "Capped"}{" "}
              ({getFilterCount(f)})
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Team Status</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Team Cap</TableHead>
                <TableHead className="text-right">Team Paid</TableHead>
                <TableHead className="text-right">Brokerage Cap</TableHead>
                <TableHead className="text-right">Brokerage Paid</TableHead>
                <TableHead>Capped</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10)
                  .fill(null)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((m, i) => (
                  <TableRow key={m.id || i}>
                    <TableCell className="font-medium">
                      {m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === "Active" ||
                          m.status === "active" ||
                          m.team_status === "Active"
                            ? "default"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {m.team_status || m.status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.has_seat ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs h-6" disabled>
                          Add Seat
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.last_login ? new Date(m.last_login).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.join_date ? new Date(m.join_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.team_cap ? formatCurrency(m.team_cap) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.team_paid ? formatCurrency(m.team_paid) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.brokerage_cap ? formatCurrency(m.brokerage_cap) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.brokerage_paid ? formatCurrency(m.brokerage_paid) : "—"}
                    </TableCell>
                    <TableCell>
                      {m.capped ? (
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                          Capped
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.location || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredData.length)} of{" "}
            {filteredData.length} members
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
