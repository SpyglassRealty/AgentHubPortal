import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Users, ExternalLink } from 'lucide-react';
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

interface FubPerson {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stage?: string;
  assignedTo?: string | null;
  tags?: string[];
  created: string;
  lastActivity?: string;
}

interface FubEvent {
  id: number;
  type?: string;
  personName?: string;
  person?: { id?: number; firstName?: string; lastName?: string; email?: string };
  created?: string;
  dateCreated?: string;
}

interface FubStats {
  totalLeads: number;
  newThisWeek: number;
  registrations: number;
  propertyInquiries: number;
  savedProperties: number;
  savedSearches: number;
  sellerLeads: number;
  unsubscribes: number;
}

function getStageBadge(stage?: string) {
  const s = (stage || '').toLowerCase();
  if (s.includes('new') || s === '') {
    return <Badge className="bg-[#EF4923] text-white hover:bg-[#EF4923]/90">New</Badge>;
  }
  if (s.includes('active') || s.includes('hot') || s.includes('engaged')) {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Active</Badge>;
  }
  if (s.includes('nurture') || s.includes('watch') || s.includes('long')) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Nurture</Badge>;
  }
  if (s.includes('closed') || s.includes('past') || s.includes('dead') || s.includes('lost')) {
    return <Badge className="bg-gray-500 text-white hover:bg-gray-500/90">Closed</Badge>;
  }
  return <Badge variant="outline">{stage || 'Unknown'}</Badge>;
}

function getEventTypeBadge(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('registration')) {
    return <Badge className="bg-[#EF4923] text-white hover:bg-[#EF4923]/90">Registration</Badge>;
  }
  if (t.includes('property inquiry') || t.includes('inquiry')) {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600/90">Property Inquiry</Badge>;
  }
  if (t.includes('saved property')) {
    return <Badge className="bg-green-600 text-white hover:bg-green-600/90">Saved Property</Badge>;
  }
  if (t.includes('seller')) {
    return <Badge className="bg-purple-600 text-white hover:bg-purple-600/90">Seller Inquiry</Badge>;
  }
  if (t.includes('unsubscribed')) {
    return <Badge className="bg-gray-500 text-white hover:bg-gray-500/90">Unsubscribed</Badge>;
  }
  return <Badge variant="outline">{type || 'Unknown'}</Badge>;
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

export default function FubDashboard() {
  const { isAdmin } = useUserRole();
  const [, setLocation] = useLocation();

  // Redirect non-admins
  if (!isAdmin) {
    setLocation('/admin/dashboards');
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<FubStats>({
    queryKey: ['/api/fub/admin/stats'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const { data: peopleData, isLoading: peopleLoading } = useQuery<{ people: FubPerson[]; total: number }>({
    queryKey: ['/api/fub/admin/people'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/people');
      if (!res.ok) throw new Error('Failed to fetch people');
      return res.json();
    },
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ events: FubEvent[] }>({
    queryKey: ['/api/fub/admin/events'],
    queryFn: async () => {
      const res = await fetch('/api/fub/admin/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
  });

  const people = (peopleData?.people || []).slice(0, 50);
  const events = (eventsData?.events || []).slice(0, 20);

  return (
    <DashboardLayout
      title="IDX Lead Pipeline"
      subtitle="Follow Up Boss leads from spyglass-idx"
      icon={Users}
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Total IDX Leads"
            value={statsLoading ? '...' : String(stats?.totalLeads ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="New This Week"
            value={statsLoading ? '...' : String(stats?.newThisWeek ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="Registrations"
            value={statsLoading ? '...' : String(stats?.registrations ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="Property Inquiries"
            value={statsLoading ? '...' : String(stats?.propertyInquiries ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="Saved Properties"
            value={statsLoading ? '...' : String(stats?.savedProperties ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
          <KpiCard
            title="Seller Leads"
            value={statsLoading ? '...' : String(stats?.sellerLeads ?? 0)}
            category="network"
            className="border-l-[#EF4923]"
          />
        </div>

        {/* Recent Leads Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#222222]">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[90px]">Stage</TableHead>
                    <TableHead className="min-w-[130px]">Assigned Agent</TableHead>
                    <TableHead className="min-w-[150px]">Tags</TableHead>
                    <TableHead className="min-w-[110px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peopleLoading ? (
                    <>
                      <SkeletonRow cols={6} />
                      <SkeletonRow cols={6} />
                      <SkeletonRow cols={6} />
                      <SkeletonRow cols={6} />
                      <SkeletonRow cols={6} />
                    </>
                  ) : people.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No spyglass-idx leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    people.map((person) => (
                      <TableRow key={person.id} className="min-h-[44px]">
                        <TableCell className="font-medium">
                          <a
                            href={`https://app.followupboss.com/2/people/${person.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#EF4923] hover:underline inline-flex items-center gap-1"
                          >
                            {person.firstName} {person.lastName}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">{person.email || '-'}</TableCell>
                        <TableCell>{getStageBadge(person.stage)}</TableCell>
                        <TableCell className="text-sm">{person.assignedTo || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(person.tags || []).slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(person.tags || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(person.tags || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {person.created
                            ? format(new Date(person.created), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {people.length > 0 && (
              <div className="p-4 border-t text-center">
                <a
                  href="https://app.followupboss.com/2/people"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#EF4923] hover:underline inline-flex items-center gap-1"
                >
                  View all in Follow Up Boss
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#222222]">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Type</TableHead>
                    <TableHead className="min-w-[180px]">Person</TableHead>
                    <TableHead className="min-w-[130px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsLoading ? (
                    <>
                      <SkeletonRow cols={3} />
                      <SkeletonRow cols={3} />
                      <SkeletonRow cols={3} />
                    </>
                  ) : events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No recent events
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => {
                      const personName = event.person?.firstName || event.person?.lastName
                        ? `${event.person.firstName || ''} ${event.person.lastName || ''}`.trim()
                        : event.person?.email || event.personName || '-';
                      const fubPersonUrl = event.person?.id
                        ? `https://app.followupboss.com/2/people/view/${event.person.id}`
                        : null;
                      return (
                        <TableRow key={event.id} className="min-h-[44px]">
                          <TableCell>
                            {fubPersonUrl ? (
                              <a href={fubPersonUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer hover:opacity-80">
                                {getEventTypeBadge(event.type)}
                              </a>
                            ) : (
                              getEventTypeBadge(event.type)
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {fubPersonUrl ? (
                              <a
                                href={fubPersonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-[#EF4923] inline-flex items-center gap-1"
                              >
                                {personName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              personName
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(event.created || event.dateCreated)
                              ? format(new Date(event.created || event.dateCreated!), 'MMM d, h:mm a')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
