import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/admin-dashboards/dashboard-layout';
import { KpiCard } from '@/components/admin-dashboards/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'wouter';

interface ResendEmail {
  id: string;
  to: string;
  subject: string;
  created_at: string;
  last_event: string;
}

interface ResendStats {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  bounceRate: number;
  month: string;
  error?: string;
}

function getStatusBadge(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>;
  }
  if (s === 'bounced' || s === 'complained') {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Bounced</Badge>;
  }
  if (s === 'sent') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Sent</Badge>;
  }
  if (s === 'opened' || s === 'clicked') {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{s === 'clicked' ? 'Clicked' : 'Opened'}</Badge>;
  }
  return <Badge variant="outline">{status || 'Unknown'}</Badge>;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted animate-pulse rounded w-20" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function EmailStats() {
  const { isAdmin } = useUserRole();
  const [, setLocation] = useLocation();

  // Redirect non-admins
  if (!isAdmin) {
    setLocation('/admin/dashboards');
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<ResendStats>({
    queryKey: ['/api/resend/stats'],
    queryFn: async () => {
      const res = await fetch('/api/resend/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const { data: emailsData, isLoading: emailsLoading } = useQuery<{ emails: ResendEmail[]; error?: string }>({
    queryKey: ['/api/resend/emails'],
    queryFn: async () => {
      const res = await fetch('/api/resend/emails');
      if (!res.ok) throw new Error('Failed to fetch emails');
      return res.json();
    },
  });

  const emails = (emailsData?.emails || []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const hasError = stats?.error || emailsData?.error;

  return (
    <DashboardLayout
      title="Email Stats"
      subtitle="Transactional email delivery via Resend"
      icon={Mail}
    >
      <div className="space-y-6">
        {/* Error Banner */}
        {hasError && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Resend API unavailable — check RESEND_API_KEY in Render env vars
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Sent This Month"
            value={statsLoading ? '...' : String(stats?.sent ?? 0)}
            subtitle={stats?.month}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="Delivered"
            value={statsLoading ? '...' : String(stats?.delivered ?? 0)}
            subtitle={stats?.month}
            category="transactions"
            className="border-l-green-500"
          />
          <KpiCard
            title="Bounced"
            value={statsLoading ? '...' : String(stats?.bounced ?? 0)}
            subtitle={stats?.month}
            category="network"
            className={(stats?.bounced ?? 0) > 0 ? 'border-l-red-500' : 'border-l-gray-300'}
          />
          <KpiCard
            title="Bounce Rate"
            value={statsLoading ? '...' : `${stats?.bounceRate ?? 0}%`}
            subtitle={stats?.month}
            category="network"
            className={(stats?.bounceRate ?? 0) > 5 ? 'border-l-red-500' : 'border-l-green-500'}
          />
        </div>

        {/* Recent Emails Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#222222]">Recent Emails</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">To</TableHead>
                    <TableHead className="min-w-[250px]">Subject</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[140px]">Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailsLoading ? (
                    <>
                      <SkeletonRow cols={4} />
                      <SkeletonRow cols={4} />
                      <SkeletonRow cols={4} />
                      <SkeletonRow cols={4} />
                      <SkeletonRow cols={4} />
                    </>
                  ) : emails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No emails sent yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    emails.map((email) => (
                      <TableRow key={email.id} className="min-h-[44px]">
                        <TableCell className="text-sm font-medium">{email.to}</TableCell>
                        <TableCell className="text-sm">{email.subject || '-'}</TableCell>
                        <TableCell>{getStatusBadge(email.last_event)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {email.created_at
                            ? format(new Date(email.created_at), 'MMM d, h:mm a')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
