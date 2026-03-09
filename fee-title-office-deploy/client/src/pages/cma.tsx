import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  FileBarChart,
  Home,
  Calendar,
  Trash2,
  Edit,
  MoreVertical,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface CmaItem {
  id: string;
  name: string;
  subjectProperty: any;
  comparableProperties: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CmaPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ cmas: CmaItem[] }>({
    queryKey: ["/api/cma"],
    queryFn: async () => {
      const res = await fetch("/api/cma", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch CMAs");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cma/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cma"] });
      setDeleteId(null);
    },
  });

  const cmas = data?.cmas || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      case "shared":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Shared</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Draft</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileBarChart className="h-7 w-7 text-[#EF4923]" />
              Comparative Market Analysis
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage CMAs for your clients
            </p>
          </div>
          <Button
            className="bg-[#EF4923] hover:bg-[#d4401f] text-white"
            onClick={() => setLocation("/cma/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create CMA
          </Button>
        </div>

        {/* CMA List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cmas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                <FileBarChart className="h-8 w-8 text-[#EF4923]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No CMAs yet</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Create your first Comparative Market Analysis to help your clients understand property values.
              </p>
              <Button
                className="bg-[#EF4923] hover:bg-[#d4401f] text-white"
                onClick={() => setLocation("/cma/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First CMA
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cmas.map((cma) => {
              const subjectAddr = cma.subjectProperty?.address || cma.subjectProperty?.streetAddress || "No subject property";
              const compCount = Array.isArray(cma.comparableProperties)
                ? cma.comparableProperties.length
                : 0;
              return (
                <Card
                  key={cma.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setLocation(`/cma/${cma.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        {cma.name}
                      </CardTitle>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(cma.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/cma/${cma.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(cma.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{subjectAddr}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span>{compCount} comparable{compCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Updated{" "}
                          {formatDistanceToNow(new Date(cma.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CMA?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The CMA and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
