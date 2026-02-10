import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AgentSelector } from "@/components/agent-selector";
import { RefreshButton } from "@/components/ui/refresh-button";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useAuth } from "@/hooks/useAuth";
import {
  Mail,
  Search,
  ExternalLink,
  ArrowLeft,
  ChevronDown,
  Inbox,
  MailOpen,
  Tag,
  Users,
  MessageCircle,
} from "lucide-react";
import type { GmailMessage } from "@shared/schema";

// ── Category Tabs ────────────────────────────────────────────────
type CategoryId = 'primary' | 'promotions' | 'social' | 'forums';

const categories: { id: CategoryId; label: string; icon: typeof Inbox }[] = [
  { id: 'primary', label: 'Primary', icon: Inbox },
  { id: 'promotions', label: 'Promotions', icon: Tag },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'forums', label: 'Forums', icon: MessageCircle },
];

interface InboxResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
  message?: string;
}

interface MessageResponse {
  message: GmailMessage;
}

interface CategoryUnreadCounts {
  primary: number;
  promotions: number;
  social: number;
  forums: number;
}

// ── Date formatting ──────────────────────────────────────────────
function formatEmailDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    const sameYear = date.getFullYear() === now.getFullYear();
    if (sameYear) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// Extract a clean sender name from "Name <email>" format
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, '').trim(), email: match[2] };
  }
  return { name: from, email: from };
}

// ── Loading Skeletons ────────────────────────────────────────────
function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailDetailSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// ── Email List Item ──────────────────────────────────────────────
function EmailListItem({
  email,
  isSelected,
  onClick,
}: {
  email: GmailMessage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const sender = parseSender(email.from);
  const initials = sender.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer
        ${isSelected
          ? 'bg-[#EF4923]/10 border border-[#EF4923]/20'
          : email.isRead
            ? 'hover:bg-muted/50'
            : 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
        }
      `}
    >
      {/* Avatar */}
      <div className={`
        shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold
        ${email.isRead
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          : 'bg-[#EF4923] text-white'
        }
      `}>
        {initials || '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${email.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
            {sender.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatEmailDate(email.date)}
          </span>
        </div>
        <p className={`text-sm truncate ${email.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
          {email.subject}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {email.snippet}
        </p>
      </div>

      {/* Unread dot */}
      {!email.isRead && (
        <div className="shrink-0 mt-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#EF4923]" />
        </div>
      )}
    </button>
  );
}

// ── Email Detail View ────────────────────────────────────────────
function EmailDetail({
  messageId,
  agentId,
  onBack,
}: {
  messageId: string;
  agentId: string | null;
  onBack: () => void;
}) {
  const queryParams = new URLSearchParams();
  if (agentId) queryParams.set('agentId', agentId);
  const queryString = queryParams.toString();
  const url = `/api/gmail/message/${messageId}${queryString ? `?${queryString}` : ''}`;

  const { data, isLoading, error } = useQuery<MessageResponse>({
    queryKey: ['/api/gmail/message', messageId, agentId],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch message');
      return res.json();
    },
  });

  if (isLoading) return <EmailDetailSkeleton />;

  if (error || !data?.message) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-muted-foreground">Failed to load message.</p>
      </div>
    );
  }

  const msg = data.message;
  const sender = parseSender(msg.from);
  const initials = sender.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold flex-1 truncate">{msg.subject}</h2>
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in Gmail
            </Button>
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#EF4923] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{sender.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {sender.email} · {formatFullDate(msg.date)}
            </p>
            {msg.to && (
              <p className="text-xs text-muted-foreground truncate">
                To: {msg.to}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4">
        {msg.body ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none email-content"
            dangerouslySetInnerHTML={{ __html: msg.body }}
          />
        ) : (
          <p className="text-muted-foreground italic">No message body</p>
        )}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {hasSearch ? (
          <Search className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Inbox className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasSearch ? 'No results found' : 'Inbox is empty'}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {hasSearch
          ? 'Try adjusting your search terms'
          : 'No emails to show right now'
        }
      </p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function EmailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('primary');
  const [pageTokens, setPageTokens] = useState<string[]>([]);
  const { lastManualRefresh, lastAutoRefresh, isLoading: isSyncing, refresh: refreshSync } = useSyncStatus('calendar'); // reuse calendar sync section

  // Build inbox URL with category + search
  const buildInboxUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('maxResults', '20');
    if (selectedAgentId) params.set('agentId', selectedAgentId);
    // Combine category filter with optional search query
    const categoryQuery = `category:${activeCategory}`;
    const q = searchQuery ? `${categoryQuery} ${searchQuery}` : categoryQuery;
    params.set('q', q);
    const currentPageToken = pageTokens[pageTokens.length - 1];
    if (currentPageToken) params.set('pageToken', currentPageToken);
    return `/api/gmail/inbox?${params.toString()}`;
  }, [selectedAgentId, searchQuery, activeCategory, pageTokens]);

  const inboxUrl = buildInboxUrl();

  const { data: inboxData, isLoading, error, refetch } = useQuery<InboxResponse>({
    queryKey: ['/api/gmail/inbox', { agentId: selectedAgentId, q: searchQuery, category: activeCategory, pageTokens }],
    queryFn: async () => {
      const res = await fetch(inboxUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch inbox');
      return res.json();
    },
  });

  const messages = inboxData?.messages || [];
  const unreadCount = useMemo(
    () => messages.filter(m => !m.isRead).length,
    [messages]
  );

  // Fetch unread counts for category tabs
  const { data: unreadCounts } = useQuery<CategoryUnreadCounts>({
    queryKey: ['/api/gmail/unread-counts', { agentId: selectedAgentId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAgentId) params.set('agentId', selectedAgentId);
      const url = `/api/gmail/unread-counts${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch unread counts');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPageTokens([]);
    setSelectedMessageId(null);
  };

  const handleCategoryChange = (category: CategoryId) => {
    setActiveCategory(category);
    setPageTokens([]);
    setSelectedMessageId(null);
  };

  const handleRefresh = async () => {
    await refreshSync(async () => {
      await refetch();
      // Also refresh unread counts
      await queryClient.invalidateQueries({ queryKey: ['/api/gmail/unread-counts'] });
    });
  };

  const handleLoadMore = () => {
    if (inboxData?.nextPageToken) {
      setPageTokens(prev => [...prev, inboxData.nextPageToken!]);
    }
  };

  const handleGoBack = () => {
    if (pageTokens.length > 0) {
      setPageTokens(prev => prev.slice(0, -1));
    }
  };

  const handleAgentChange = (agentId: string | null) => {
    setSelectedAgentId(agentId);
    setSelectedMessageId(null);
    setPageTokens([]);
  };

  const handleMessageClick = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const isErrorState = !!error;
  const errorMessage = isErrorState
    ? (error as any)?.message || 'Failed to load inbox'
    : inboxData?.message;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Page header */}
        <div className="px-4 md:px-6 py-4 border-b bg-background shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-[#EF4923]" />
              <h1 className="text-2xl font-display font-bold">Email</h1>
              {unreadCount > 0 && (
                <Badge className="bg-[#EF4923] text-white hover:bg-[#EF4923]/90">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {user?.isSuperAdmin && (
                <AgentSelector
                  selectedAgentId={selectedAgentId}
                  onAgentChange={handleAgentChange}
                />
              )}
              <RefreshButton
                onRefresh={handleRefresh}
                lastManualRefresh={lastManualRefresh}
                lastAutoRefresh={lastAutoRefresh}
                isLoading={isSyncing || isLoading}
                size="sm"
                showLabel={false}
              />
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Open Gmail</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search emails..."
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="px-4">
              Search
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setPageTokens([]);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>

        {/* Category Tabs */}
        <div className="px-4 md:px-6 border-b bg-background shrink-0">
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const unreadCountForCategory = unreadCounts?.[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer relative
                    ${isActive
                      ? 'border-[#EF4923] text-[#EF4923]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                  {unreadCountForCategory > 0 && (
                    <Badge 
                      variant="secondary"
                      className="ml-1 bg-[#EF4923] text-white text-xs px-2 py-0 h-5 min-w-[20px] rounded-full"
                    >
                      {unreadCountForCategory > 99 ? '99+' : unreadCountForCategory}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content area: split view on desktop, single view on mobile */}
        <div className="flex-1 overflow-hidden flex">
          {/* Email List */}
          <div
            className={`
              ${selectedMessageId ? 'hidden md:flex' : 'flex'}
              flex-col w-full md:w-[380px] lg:w-[420px] md:border-r overflow-hidden shrink-0
            `}
          >
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <EmailListSkeleton />
              ) : isErrorState ? (
                <div className="p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              ) : messages.length === 0 ? (
                <EmptyState hasSearch={!!searchQuery} />
              ) : (
                <div className="p-1 space-y-0.5">
                  {messages.map(email => (
                    <EmailListItem
                      key={email.id}
                      email={email}
                      isSelected={selectedMessageId === email.id}
                      onClick={() => handleMessageClick(email.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && messages.length > 0 && (
              <div className="p-3 border-t flex items-center justify-between shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  disabled={pageTokens.length === 0}
                >
                  ← Newer
                </Button>
                {inboxData?.resultSizeEstimate && (
                  <span className="text-xs text-muted-foreground">
                    ~{inboxData.resultSizeEstimate} results
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={!inboxData?.nextPageToken}
                >
                  Older →
                </Button>
              </div>
            )}
          </div>

          {/* Email Detail */}
          <div
            className={`
              ${selectedMessageId ? 'flex' : 'hidden md:flex'}
              flex-col flex-1 overflow-hidden
            `}
          >
            {selectedMessageId ? (
              <EmailDetail
                messageId={selectedMessageId}
                agentId={selectedAgentId}
                onBack={() => setSelectedMessageId(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MailOpen className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Select an email to read</p>
                <p className="text-sm mt-1">Choose from your inbox on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
