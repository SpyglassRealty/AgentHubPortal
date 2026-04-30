import { Badge } from "@/components/ui/badge";

interface AgentBadgeProps {
  fubCreatedAt?: string | null;
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export function AgentBadge({ fubCreatedAt }: AgentBadgeProps) {
  if (!fubCreatedAt) return null;
  const createdMs = new Date(fubCreatedAt).getTime();
  if (isNaN(createdMs)) return null;           // invalid date string
  if (createdMs > Date.now()) return null;      // future-dated timestamp
  if (Date.now() - createdMs > FIVE_DAYS_MS) return null;  // older than 5 days
  return (
    <Badge
      variant="secondary"
      className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300"
    >
      New
    </Badge>
  );
}
