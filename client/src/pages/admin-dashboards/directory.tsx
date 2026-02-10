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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookUser,
  RefreshCw,
  Search,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  useXanoNetwork,
  useXanoRoster,
} from "@/lib/xano";
import { useMemo, useState } from "react";

export default function DirectoryPage() {
  const network = useXanoNetwork();
  const roster = useXanoRoster();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const isLoading = network.isLoading && roster.isLoading;

  // Merge network and roster data for the most complete directory
  const members = useMemo(() => {
    const networkData = Array.isArray(network.data) ? network.data : [];
    const rosterData = Array.isArray(roster.data) ? roster.data : [];

    // Use network data as primary (has tier info), merge roster extras
    const memberMap = new Map<string, any>();

    networkData.forEach((m) => {
      const name = (m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim()).toLowerCase();
      memberMap.set(name, {
        ...m,
        displayName: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—",
        memberType: "Agent",
      });
    });

    rosterData.forEach((m) => {
      const name = (m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim()).toLowerCase();
      if (!memberMap.has(name)) {
        memberMap.set(name, {
          ...m,
          displayName: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—",
          memberType: "Agent",
        });
      } else {
        // Merge roster data into existing entry
        const existing = memberMap.get(name)!;
        memberMap.set(name, {
          ...existing,
          location: existing.location || m.location,
          last_login: existing.last_login || m.last_login,
          phone: existing.phone || m.phone,
          email: existing.email || m.email,
        });
      }
    });

    return Array.from(memberMap.values()).sort((a, b) =>
      (a.displayName || "").localeCompare(b.displayName || "")
    );
  }, [network.data, roster.data]);

  // Get unique states
  const states = useMemo(() => {
    const stateSet = new Set<string>();
    members.forEach((m) => {
      const state = m.state || m.location;
      if (state) stateSet.add(state);
    });
    return Array.from(stateSet).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    let data = members;

    if (stateFilter !== "all") {
      data = data.filter((m) => m.state === stateFilter || m.location === stateFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (m) =>
          (m.displayName || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q) ||
          (m.phone || "").includes(q) ||
          (m.location || "").toLowerCase().includes(q) ||
          (m.state || "").toLowerCase().includes(q)
      );
    }

    return data;
  }, [members, stateFilter, search]);

  const paginatedData = filteredMembers.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  return (
    <DashboardLayout
      title="Directory"
      subtitle="Agent directory with search, filters, and contact info"
      icon={BookUser}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            network.refetch();
            roster.refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookUser className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-2xl font-bold">{members.length}</span>
            <span className="text-muted-foreground ml-2">Team Members</span>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, location, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        {states.length > 0 && (
          <Select
            value={stateFilter}
            onValueChange={(v) => {
              setStateFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Directory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Join Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(10)
                  .fill(null)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((m, i) => (
                  <TableRow key={m.id || i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {(m.displayName || "?")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium">{m.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.memberType || "Agent"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.tier ? (
                        <Badge
                          className={`text-xs ${
                            m.tier === 1
                              ? "bg-teal-500 text-white"
                              : m.tier === 2
                              ? "bg-pink-500 text-white"
                              : m.tier === 3
                              ? "bg-purple-500 text-white"
                              : m.tier === 4
                              ? "bg-yellow-500 text-white"
                              : "bg-pink-400 text-white"
                          }`}
                        >
                          Tier {m.tier}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === "Active" || m.status === "active" ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        {m.status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.location || m.state ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {m.location || m.state}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.phone ? (
                        <a
                          href={`tel:${m.phone}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {m.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.email ? (
                        <a
                          href={`mailto:${m.email}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[180px]">{m.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.join_date ? new Date(m.join_date).toLocaleDateString() : "—"}
                    </TableCell>
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
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredMembers.length)}{" "}
            of {filteredMembers.length} members
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
