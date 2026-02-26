import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AgentSelector } from "@/components/agent-selector";
import { RefreshButton } from "@/components/ui/refresh-button";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Send,
  Reply,
  ReplyAll,
  Forward,
  X,
  Plus,
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

// ── Compose Email Sheet ──────────────────────────────────────────
type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

interface ComposeState {
  mode: ComposeMode;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  // Reply/forward context
  originalMessageId?: string;
  threadId?: string;
  quotedHtml?: string;
}

const emptyCompose: ComposeState = {
  mode: 'new',
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
};

function ComposeEmailSheet({
  open,
  onOpenChange,
  compose,
  setCompose,
  agentId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compose: ComposeState;
  setCompose: React.Dispatch<React.SetStateAction<ComposeState>>;
  agentId: string | null;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [showCc, setShowCc] = useState(!!compose.cc);
  const [showBcc, setShowBcc] = useState(!!compose.bcc);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (compose.mode === 'reply' || compose.mode === 'replyAll') {
        // Build full body with quoted text
        const fullBody = compose.quotedHtml
          ? `${compose.body}<br/><br/><div style="border-left:2px solid #ccc; padding-left:12px; margin-left:0; color:#555;">${compose.quotedHtml}</div>`
          : compose.body;

        return apiRequest('POST', `/api/gmail/reply/${compose.originalMessageId}`, {
          body: fullBody,
          replyAll: compose.mode === 'replyAll',
          to: compose.to,
          cc: compose.cc || undefined,
          subject: compose.subject,
          agentId: agentId || undefined,
        });
      } else {
        // New compose or forward
        const fullBody = compose.mode === 'forward' && compose.quotedHtml
          ? `${compose.body}<br/><br/><div style="border-left:2px solid #ccc; padding-left:12px; margin-left:0; color:#555;">---------- Forwarded message ----------<br/>${compose.quotedHtml}</div>`
          : compose.body;

        return apiRequest('POST', '/api/gmail/send', {
          to: compose.to,
          cc: compose.cc || undefined,
          bcc: compose.bcc || undefined,
          subject: compose.subject,
          body: fullBody,
          agentId: agentId || undefined,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Your message has been sent successfully." });
      onOpenChange(false);
      setCompose(emptyCompose);
      onSent();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send",
        description: error.message || "Something went wrong sending your email.",
        variant: "destructive",
      });
    },
  });

  const canSend = compose.to.trim() && compose.subject.trim() && compose.body.trim();

  const modeLabel = {
    new: 'New Message',
    reply: 'Reply',
    replyAll: 'Reply All',
    forward: 'Forward',
  }[compose.mode];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {compose.mode === 'reply' && <Reply className="h-4 w-4" />}
            {compose.mode === 'replyAll' && <ReplyAll className="h-4 w-4" />}
            {compose.mode === 'forward' && <Forward className="h-4 w-4" />}
            {compose.mode === 'new' && <Plus className="h-4 w-4" />}
            {modeLabel}
          </SheetTitle>
          <SheetDescription className="sr-only">Compose and send an email message</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* To */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">To</label>
              <div className="flex gap-1">
                {!showCc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setShowCc(true)}
                  >
                    CC
                  </Button>
                )}
                {!showBcc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setShowBcc(true)}
                  >
                    BCC
                  </Button>
                )}
              </div>
            </div>
            <Input
              value={compose.to}
              onChange={e => setCompose(prev => ({ ...prev, to: e.target.value }))}
              placeholder="recipient@example.com"
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">CC</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => { setShowCc(false); setCompose(prev => ({ ...prev, cc: '' })); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={compose.cc}
                onChange={e => setCompose(prev => ({ ...prev, cc: e.target.value }))}
                placeholder="cc@example.com"
              />
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">BCC</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => { setShowBcc(false); setCompose(prev => ({ ...prev, bcc: '' })); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input
                value={compose.bcc}
                onChange={e => setCompose(prev => ({ ...prev, bcc: e.target.value }))}
                placeholder="bcc@example.com"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={compose.subject}
              onChange={e => setCompose(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Subject"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Message</label>
            <RichTextEditor
              value={compose.body}
              onChange={(html) => setCompose(prev => ({ ...prev, body: html }))}
              placeholder="Write your message..."
              className="min-h-[200px]"
            />
          </div>

          {/* Quoted text preview for replies/forwards */}
          {compose.quotedHtml && (
            <div className="border-l-2 border-muted pl-3 mt-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                {compose.mode === 'forward' ? 'Forwarded message' : 'Original message'}
              </p>
              <div
                className="prose prose-xs dark:prose-invert max-w-none text-muted-foreground max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: compose.quotedHtml }}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={() => { onOpenChange(false); setCompose(emptyCompose); }}
          >
            Discard
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!canSend || sendMutation.isPending}
            className="bg-[#EF4923] hover:bg-[#EF4923]/90 text-white"
          >
            {sendMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Email Detail View ────────────────────────────────────────────
function EmailDetail({
  messageId,
  agentId,
  onBack,
  onCompose,
}: {
  messageId: string;
  agentId: string | null;
  onBack: () => void;
  onCompose: (compose: ComposeState) => void;
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

        {/* Reply / Reply All / Forward buttons */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const fromMatch = msg.from.match(/<(.+?)>/);
              const replyTo = fromMatch ? fromMatch[1] : msg.from;
              onCompose({
                mode: 'reply',
                to: replyTo,
                cc: '',
                bcc: '',
                subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
                body: '',
                originalMessageId: msg.id,
                threadId: msg.threadId,
                quotedHtml: `<p><strong>On ${formatFullDate(msg.date)}, ${msg.from} wrote:</strong></p>${msg.body || msg.snippet}`,
              });
            }}
          >
            <Reply className="h-4 w-4 mr-1.5" />
            Reply
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const fromMatch = msg.from.match(/<(.+?)>/);
              const replyTo = fromMatch ? fromMatch[1] : msg.from;
              // For Reply All, include original To and CC minus the current user
              const allCc = [msg.to, msg.cc].filter(Boolean).join(', ');
              onCompose({
                mode: 'replyAll',
                to: replyTo,
                cc: allCc,
                bcc: '',
                subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
                body: '',
                originalMessageId: msg.id,
                threadId: msg.threadId,
                quotedHtml: `<p><strong>On ${formatFullDate(msg.date)}, ${msg.from} wrote:</strong></p>${msg.body || msg.snippet}`,
              });
            }}
          >
            <ReplyAll className="h-4 w-4 mr-1.5" />
            Reply All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onCompose({
                mode: 'forward',
                to: '',
                cc: '',
                bcc: '',
                subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
                body: '',
                originalMessageId: msg.id,
                quotedHtml: `<p><strong>From:</strong> ${msg.from}<br/><strong>Date:</strong> ${formatFullDate(msg.date)}<br/><strong>Subject:</strong> ${msg.subject}<br/><strong>To:</strong> ${msg.to}${msg.cc ? `<br/><strong>Cc:</strong> ${msg.cc}` : ''}</p><br/>${msg.body || msg.snippet}`,
              });
            }}
          >
            <Forward className="h-4 w-4 mr-1.5" />
            Forward
          </Button>
        </div>
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState<ComposeState>(emptyCompose);
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

  const handleCompose = (composeState?: ComposeState) => {
    setCompose(composeState || emptyCompose);
    setComposeOpen(true);
  };

  const handleSent = () => {
    // Refresh inbox after sending
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/gmail/unread-counts'] });
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
              <Button
                onClick={() => handleCompose()}
                className="bg-[#EF4923] hover:bg-[#EF4923]/90 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Compose
              </Button>
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
                onCompose={handleCompose}
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

      {/* Compose Email Sheet */}
      <ComposeEmailSheet
        open={composeOpen}
        onOpenChange={setComposeOpen}
        compose={compose}
        setCompose={setCompose}
        agentId={selectedAgentId}
        onSent={handleSent}
      />
    </Layout>
  );
}
