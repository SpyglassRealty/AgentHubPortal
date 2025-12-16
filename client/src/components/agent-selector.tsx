import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: number;
  name: string;
  email: string;
}

interface AgentSelectorProps {
  selectedAgentId: string | null;
  onAgentChange: (agentId: string | null) => void;
}

export function AgentSelector({ selectedAgentId, onAgentChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: agentsData, isLoading } = useQuery<{ agents: Agent[] }>({
    queryKey: ["/api/fub/agents"],
    queryFn: async () => {
      const res = await fetch("/api/fub/agents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const filteredAgents = useMemo(() => {
    if (!agentsData?.agents) return [];
    if (!searchQuery.trim()) return agentsData.agents;
    const query = searchQuery.toLowerCase();
    return agentsData.agents.filter(agent => 
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query)
    );
  }, [agentsData?.agents, searchQuery]);

  const selectedAgent = selectedAgentId 
    ? agentsData?.agents.find(a => a.id.toString() === selectedAgentId) 
    : null;

  const displayValue = selectedAgent ? selectedAgent.name : "My Data";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between"
          data-testid="select-agent"
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="input-search-agent"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-1">
            <button
              className={cn(
                "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                !selectedAgentId && "bg-accent"
              )}
              onClick={() => {
                onAgentChange(null);
                setOpen(false);
                setSearchQuery("");
              }}
              data-testid="option-agent-my-data"
            >
              <Check className={cn("h-4 w-4", !selectedAgentId ? "opacity-100" : "opacity-0")} />
              <span className="font-medium">My Data</span>
            </button>
            
            {isLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                Loading agents...
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No agents found
              </div>
            ) : (
              filteredAgents.map(agent => (
                <button
                  key={agent.id}
                  className={cn(
                    "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                    selectedAgentId === agent.id.toString() && "bg-accent"
                  )}
                  onClick={() => {
                    onAgentChange(agent.id.toString());
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  data-testid={`option-agent-${agent.id}`}
                >
                  <Check className={cn("h-4 w-4", selectedAgentId === agent.id.toString() ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{agent.name}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
