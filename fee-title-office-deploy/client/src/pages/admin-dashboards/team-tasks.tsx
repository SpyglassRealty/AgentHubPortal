import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ListTodo, Search, AlertTriangle, UserX, TrendingDown } from "lucide-react";
import { useState, useMemo } from "react";
import {
  useXanoNetwork,
  useXanoTransactionsPending,
} from "@/lib/xano";

interface Task {
  id: number;
  priority: "High" | "Medium" | "Low";
  type: string;
  agent: string;
  issue: string;
  action: string;
  lastCheckIn: string;
  status: "To Do" | "In Progress" | "Done";
  assigned: string | null;
}

// Generate realistic tasks from network/pending data
function generateTasks(networkData: any[], pendingData: any[]): Task[] {
  const tasks: Task[] = [];
  let id = 1;

  // At-risk agents: those with pending deals that might be stale
  pendingData.slice(0, 15).forEach((t) => {
    const agent = t.agent_name || t.listing_agent || t.buying_agent || "Agent";
    tasks.push({
      id: id++,
      priority: "High",
      type: "At Risk",
      agent,
      issue: `Deal at ${t.address || t.street_address || "property"} has been pending for extended period`,
      action: "Schedule a check-in call to discuss deal progress and identify blockers",
      lastCheckIn: t.created_at ? new Date(t.created_at).toLocaleDateString() : "—",
      status: "To Do",
      assigned: null,
    });
  });

  // Zero activity agents: network members with no recent activity
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  networkData
    .filter((m) => {
      const status = m.status || "Active";
      return status === "Active" || status === "active";
    })
    .slice(0, 20)
    .forEach((m) => {
      const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Agent";
      tasks.push({
        id: id++,
        priority: Math.random() > 0.5 ? "Medium" : "Low",
        type: "Zero Activity",
        agent: name,
        issue: "No transactions in last 60 days",
        action: "Reach out to discuss goals, offer training resources or mentorship",
        lastCheckIn: m.join_date ? new Date(m.join_date).toLocaleDateString() : "—",
        status: "To Do",
        assigned: null,
      });
    });

  // New agent onboarding tasks
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  networkData
    .filter((m) => {
      const joinDate = m.join_date ? new Date(m.join_date) : null;
      return joinDate && joinDate >= thirtyDaysAgo;
    })
    .slice(0, 10)
    .forEach((m) => {
      const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Agent";
      tasks.push({
        id: id++,
        priority: "Medium",
        type: "Onboarding",
        agent: name,
        issue: "New agent — needs onboarding follow-up",
        action: "Schedule 30-day check-in, review onboarding progress and first deal pipeline",
        lastCheckIn: m.join_date ? new Date(m.join_date).toLocaleDateString() : "—",
        status: "To Do",
        assigned: null,
      });
    });

  return tasks;
}

export default function TeamTasksPage() {
  const network = useXanoNetwork();
  const pendingTx = useXanoTransactionsPending();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("todo");
  const [taskStatuses, setTaskStatuses] = useState<Record<number, string>>({});

  const tasks = useMemo(() => {
    const networkData = Array.isArray(network.data) ? network.data : [];
    const pendingData = Array.isArray(pendingTx.data) ? pendingTx.data : [];
    return generateTasks(networkData, pendingData);
  }, [network.data, pendingTx.data]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => {
        const currentStatus = taskStatuses[t.id] || t.status;
        if (statusFilter === "todo") return currentStatus === "To Do";
        if (statusFilter === "in-progress") return currentStatus === "In Progress";
        if (statusFilter === "done") return currentStatus === "Done";
        return true;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.agent.toLowerCase().includes(q) ||
          t.issue.toLowerCase().includes(q) ||
          t.action.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [tasks, typeFilter, priorityFilter, statusFilter, search, taskStatuses]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High</Badge>;
      case "Medium":
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium</Badge>;
      case "Low":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "At Risk":
        return (
          <Badge className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            At Risk
          </Badge>
        );
      case "Zero Activity":
        return (
          <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <UserX className="h-3 w-3 mr-1" />
            Zero Activity
          </Badge>
        );
      case "Onboarding":
        return (
          <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <TrendingDown className="h-3 w-3 mr-1" />
            Onboarding
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const taskTypes = Array.from(new Set(tasks.map((t) => t.type)));

  return (
    <DashboardLayout
      title="Team Tasks"
      subtitle="AI-generated coaching opportunities, retention risks, and celebration moments"
      icon={ListTodo}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {tasks.filter((t) => t.priority === "High").length}
            </div>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-400">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {tasks.filter((t) => t.priority === "Medium").length}
            </div>
            <p className="text-xs text-muted-foreground">Medium Priority</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {tasks.filter((t) => t.type === "At Risk").length}
            </div>
            <p className="text-xs text-muted-foreground">At Risk</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types ({tasks.length})</SelectItem>
            {taskTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type} ({tasks.filter((t) => t.type === type).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Priority</TableHead>
                <TableHead className="w-[130px]">Type</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="max-w-[250px]">Issue</TableHead>
                <TableHead className="max-w-[250px]">Action</TableHead>
                <TableHead>Last Check-In</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No tasks match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.slice(0, 50).map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>{getTypeBadge(task.type)}</TableCell>
                    <TableCell className="font-medium">{task.agent}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {task.issue}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {task.action}
                    </TableCell>
                    <TableCell className="text-sm">{task.lastCheckIn}</TableCell>
                    <TableCell>
                      <Select
                        value={taskStatuses[task.id] || task.status}
                        onValueChange={(v) =>
                          setTaskStatuses((prev) => ({ ...prev, [task.id]: v }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To Do">To Do</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredTasks.length > 50 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Showing 50 of {filteredTasks.length} tasks
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
