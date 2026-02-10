import { DashboardLayout } from "@/components/admin-dashboards/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useXanoTransactionsClosed,
  formatCurrency,
  formatNumber,
} from "@/lib/xano";
import { useMemo, useState } from "react";

interface LeaderboardEntry {
  name: string;
  value: number;
  rank: number;
}

export default function LeaderboardPage() {
  const closedTx = useXanoTransactionsClosed();
  const [view, setView] = useState<"units" | "volume">("units");

  const isLoading = closedTx.isLoading;

  const leaderboard = useMemo(() => {
    const closed = Array.isArray(closedTx.data) ? closedTx.data : [];

    // Aggregate by agent
    const agentStats: Record<string, { units: number; volume: number }> = {};
    closed.forEach((t) => {
      const name = t.agent_name || t.listing_agent || t.buying_agent || "Unknown";
      if (!agentStats[name]) agentStats[name] = { units: 0, volume: 0 };
      agentStats[name].units++;
      agentStats[name].volume += t.close_price || t.sale_price || t.price || t.volume || 0;
    });

    const byUnits: LeaderboardEntry[] = Object.entries(agentStats)
      .sort(([, a], [, b]) => b.units - a.units)
      .map(([name, stats], i) => ({ name, value: stats.units, rank: i + 1 }));

    const byVolume: LeaderboardEntry[] = Object.entries(agentStats)
      .sort(([, a], [, b]) => b.volume - a.volume)
      .map(([name, stats], i) => ({ name, value: stats.volume, rank: i + 1 }));

    return { byUnits, byVolume };
  }, [closedTx.data]);

  const currentData = view === "units" ? leaderboard.byUnits : leaderboard.byVolume;
  const maxValue = currentData.length > 0 ? currentData[0].value : 1;

  const getPodiumColors = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
      case 2:
        return "border-gray-300 bg-gray-50 dark:bg-gray-950/20";
      case 3:
        return "border-amber-600 bg-amber-50 dark:bg-amber-950/20";
      default:
        return "";
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return "1ST PLACE";
      case 2:
        return "2ND PLACE";
      case 3:
        return "3RD PLACE";
      default:
        return `#${rank}`;
    }
  };

  return (
    <DashboardLayout
      title="Leaderboard"
      subtitle="Top performing agents by transactions"
      icon={Trophy}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => closedTx.refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <Tabs value={view} onValueChange={(v) => setView(v as "units" | "volume")}>
        <TabsList className="mb-6">
          <TabsTrigger value="units">By Units</TabsTrigger>
          <TabsTrigger value="volume">By Volume</TabsTrigger>
        </TabsList>

        <TabsContent value={view}>
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
                  ))}
              </div>
              {Array(7)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i + 3} className="h-14 w-full" />
                ))}
            </div>
          ) : (
            <>
              {/* Podium - Top 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {currentData.slice(0, 3).map((entry) => (
                  <Card
                    key={entry.name}
                    className={`border-2 ${getPodiumColors(entry.rank)} ${
                      entry.rank === 1 ? "md:col-start-1 md:row-start-1" : ""
                    }`}
                  >
                    <CardContent className="p-6 text-center">
                      {/* Avatar placeholder */}
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold text-primary">
                          {entry.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          entry.rank === 1
                            ? "text-yellow-600 border-yellow-400"
                            : entry.rank === 2
                            ? "text-gray-500 border-gray-300"
                            : "text-amber-700 border-amber-500"
                        }
                      >
                        {getRankLabel(entry.rank)}
                      </Badge>
                      <h3 className="font-semibold mt-2">{entry.name}</h3>
                      <div className="text-2xl font-bold text-primary mt-1">
                        {view === "units"
                          ? formatNumber(entry.value)
                          : formatCurrency(entry.value, true)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {view === "units" ? "Units" : "Volume"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Rest of the list */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {currentData.slice(3, 20).map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center gap-4 py-2"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-8 text-right">
                        {entry.rank}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {entry.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{entry.name}</div>
                        <Progress
                          value={(entry.value / maxValue) * 100}
                          className="h-2 mt-1"
                        />
                      </div>
                      <span className="font-semibold text-sm">
                        {view === "units"
                          ? formatNumber(entry.value)
                          : formatCurrency(entry.value, true)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
