import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Sparkles, RefreshCw, Copy, Check, Instagram, Facebook, Linkedin, Twitter, Bookmark, BookmarkCheck, Trash2, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";

interface SocialMediaIdea {
  week: number;
  theme: string;
  posts: {
    platform: string;
    type: string;
    caption: string;
    hashtags: string[];
    bestTime: string;
  }[];
}

interface CalendarResponse {
  month: string;
  year: number;
  ideas: SocialMediaIdea[];
}

interface SavedContentIdea {
  id: number;
  userId: string;
  month: string;
  year: number;
  week: number;
  theme: string | null;
  platform: string;
  contentType: string;
  bestTime: string | null;
  content: string;
  hashtags: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

export default function MarketingCalendarPage() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonth]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [deletedPosts, setDeletedPosts] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [savingPosts, setSavingPosts] = useState<Set<string>>(new Set());

  const { data: savedIdeasData } = useQuery({
    queryKey: ['/api/content-ideas/saved'],
    queryFn: async () => {
      const res = await fetch('/api/content-ideas/saved', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch saved ideas');
      return res.json() as Promise<{ ideas: SavedContentIdea[] }>;
    }
  });

  const generateIdeas = useMutation({
    mutationFn: async (month: string) => {
      const res = await fetch("/api/marketing/social-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month, year: currentYear }),
      });
      if (!res.ok) throw new Error("Failed to generate ideas");
      return res.json() as Promise<CalendarResponse>;
    },
    onSuccess: () => {
      setSavedPosts(new Set());
      setDeletedPosts(new Set());
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      month: string;
      year: number;
      week: number;
      theme: string;
      platform: string;
      contentType: string;
      bestTime: string;
      content: string;
      hashtags: string[];
      copyId: string;
    }) => {
      const res = await fetch('/api/content-ideas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      return { ...(await res.json()), copyId: data.copyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-ideas/saved'] });
      setSavedPosts(prev => new Set(Array.from(prev).concat(data.copyId)));
      setSavingPosts(prev => {
        const next = new Set(prev);
        next.delete(data.copyId);
        return next;
      });
      toast({ title: "Content idea saved!", description: "You can find it in your saved ideas below." });
    },
    onError: (_, variables) => {
      setSavingPosts(prev => {
        const next = new Set(prev);
        next.delete(variables.copyId);
        return next;
      });
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    }
  });

  const deleteSavedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/content-ideas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-ideas/saved'] });
      toast({ title: "Content idea deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", description: "Please try again.", variant: "destructive" });
    }
  });

  const handleGenerate = () => {
    generateIdeas.mutate(selectedMonth);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSave = (
    weekNum: number,
    theme: string,
    post: { platform: string; type: string; caption: string; hashtags: string[]; bestTime: string },
    copyId: string
  ) => {
    if (!generateIdeas.data || savedPosts.has(copyId) || savingPosts.has(copyId)) return;
    
    setSavingPosts(prev => new Set(Array.from(prev).concat(copyId)));
    
    saveMutation.mutate({
      month: generateIdeas.data.month,
      year: generateIdeas.data.year,
      week: weekNum,
      theme,
      platform: post.platform,
      contentType: post.type,
      bestTime: post.bestTime,
      content: post.caption,
      hashtags: post.hashtags,
      copyId
    });
  };

  const handleDelete = (copyId: string) => {
    setDeletedPosts(prev => new Set(Array.from(prev).concat(copyId)));
    setShowDeleteConfirm(null);
  };

  const handleDeleteSaved = async (id: number) => {
    await deleteSavedMutation.mutateAsync(id);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram": return <Instagram className="h-4 w-4" />;
      case "facebook": return <Facebook className="h-4 w-4" />;
      case "linkedin": return <Linkedin className="h-4 w-4" />;
      case "twitter": 
      case "x": return <Twitter className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram": return "bg-pink-100 text-pink-700 border-pink-200";
      case "facebook": return "bg-blue-100 text-blue-700 border-blue-200";
      case "linkedin": return "bg-sky-100 text-sky-700 border-sky-200";
      case "twitter":
      case "x": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const savedIdeas = savedIdeasData?.ideas || [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#EF4923]/10 text-[#EF4923]">
                <Calendar className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Marketing Calendar</h1>
            </div>
            <p className="text-muted-foreground">
              AI-powered social media content ideas for real estate agents
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#EF4923]" />
              Generate Content Ideas
            </CardTitle>
            <CardDescription>
              Get AI-generated social media post ideas tailored for real estate agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGenerate}
                disabled={generateIdeas.isPending}
                className="bg-[#EF4923] hover:bg-[#D4401F]"
                data-testid="button-generate"
              >
                {generateIdeas.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Ideas for {selectedMonth}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generateIdeas.isPending && (
          <div className="space-y-6">
            {[1, 2, 3, 4].map((week) => (
              <Card key={week}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((post) => (
                    <div key={post} className="p-4 rounded-lg border">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {generateIdeas.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-semibold">
                {generateIdeas.data.month} {generateIdeas.data.year} Content Plan
              </h2>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                {generateIdeas.data.ideas.length} Weeks
              </Badge>
            </div>

            {generateIdeas.data.ideas.map((week, weekIndex) => (
              <Card key={weekIndex} data-testid={`card-week-${week.week}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid={`title-week-${week.week}`}>
                    <Badge variant="outline" className="text-[#EF4923] border-[#EF4923]/30">
                      Week {week.week}
                    </Badge>
                    <span data-testid={`text-theme-week-${week.week}`}>{week.theme}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {week.posts.map((post, postIndex) => {
                    const copyId = `${weekIndex}-${postIndex}`;
                    const isSaved = savedPosts.has(copyId);
                    const isDeleted = deletedPosts.has(copyId);

                    if (isDeleted) return null;

                    return (
                      <div key={postIndex} className="p-4 rounded-lg border hover:bg-muted/30 transition-colors relative" data-testid={`post-${copyId}`}>
                        {showDeleteConfirm === copyId && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center backdrop-blur-sm z-10">
                            <div className={`${isDark ? 'bg-[#2a2a2a]' : 'bg-white'} rounded-lg p-4 mx-4 shadow-xl border ${isDark ? 'border-[#333333]' : 'border-gray-200'}`}>
                              <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                                Remove this content idea?
                              </p>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="min-h-[44px] min-w-[44px]"
                                  data-testid={`button-cancel-delete-${copyId}`}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(copyId)}
                                  className="min-h-[44px] min-w-[44px] bg-red-500 hover:bg-red-600"
                                  data-testid={`button-confirm-delete-${copyId}`}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getPlatformColor(post.platform)} data-testid={`badge-platform-${copyId}`}>
                                {getPlatformIcon(post.platform)}
                                <span className="ml-1">{post.platform}</span>
                              </Badge>
                              <Badge variant="secondary" data-testid={`badge-type-${copyId}`}>{post.type}</Badge>
                              <span className="text-xs text-muted-foreground" data-testid={`text-besttime-${copyId}`}>Best time: {post.bestTime}</span>
                            </div>
                            <p className="text-sm" data-testid={`text-caption-${copyId}`}>{post.caption}</p>
                            <div className="flex flex-wrap gap-1" data-testid={`hashtags-${copyId}`}>
                              {post.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-[#EF4923]">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSave(week.week, week.theme, post, copyId)}
                              disabled={isSaved || savingPosts.has(copyId)}
                              className={`min-h-[44px] min-w-[44px] ${isSaved ? 'text-green-500' : ''}`}
                              title={isSaved ? 'Saved' : 'Save this idea'}
                              data-testid={`button-save-${copyId}`}
                            >
                              {isSaved ? (
                                <BookmarkCheck className="h-4 w-4" />
                              ) : savingPosts.has(copyId) ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Bookmark className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${post.caption}\n\n${post.hashtags.map(t => `#${t}`).join(' ')}`, copyId)}
                              className="min-h-[44px] min-w-[44px]"
                              data-testid={`button-copy-${copyId}`}
                            >
                              {copiedIndex === copyId ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(copyId)}
                              className="min-h-[44px] min-w-[44px] hover:text-red-500"
                              title="Remove this idea"
                              data-testid={`button-delete-${copyId}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {savedIdeas.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-[#EF4923]" />
                Saved Content Ideas
              </h2>
              <Badge variant="secondary" className="bg-[#EF4923]/10 text-[#EF4923]">
                {savedIdeas.length} Saved
              </Badge>
            </div>

            <div className="grid gap-4">
              {savedIdeas.map((idea) => (
                <Card key={idea.id} data-testid={`saved-idea-${idea.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPlatformColor(idea.platform)} data-testid={`saved-badge-platform-${idea.id}`}>
                            {getPlatformIcon(idea.platform)}
                            <span className="ml-1">{idea.platform}</span>
                          </Badge>
                          <Badge variant="secondary" data-testid={`saved-badge-type-${idea.id}`}>{idea.contentType}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {idea.month} Week {idea.week}
                          </Badge>
                          {idea.bestTime && (
                            <span className="text-xs text-muted-foreground">Best time: {idea.bestTime}</span>
                          )}
                        </div>
                        {idea.theme && (
                          <p className="text-xs text-muted-foreground">Theme: {idea.theme}</p>
                        )}
                        <p className="text-sm" data-testid={`saved-content-${idea.id}`}>{idea.content}</p>
                        {idea.hashtags && (
                          <div className="flex flex-wrap gap-1">
                            {idea.hashtags.split(',').map((tag, i) => (
                              <span key={i} className="text-xs text-[#EF4923]">#{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `${idea.content}\n\n${idea.hashtags ? idea.hashtags.split(',').map(t => `#${t.trim()}`).join(' ') : ''}`,
                            `saved-${idea.id}`
                          )}
                          className="min-h-[44px] min-w-[44px]"
                          data-testid={`button-copy-saved-${idea.id}`}
                        >
                          {copiedIndex === `saved-${idea.id}` ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSaved(idea.id)}
                          disabled={deleteSavedMutation.isPending}
                          className="min-h-[44px] min-w-[44px] hover:text-red-500"
                          title="Delete saved idea"
                          data-testid={`button-delete-saved-${idea.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {generateIdeas.isError && (
          <Card className="flex items-center justify-center h-64 border-red-200 bg-red-50" data-testid="error-generate-ideas">
            <CardContent className="text-center text-red-600">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Failed to generate content ideas</p>
              <p className="text-sm">Please try again or contact support if the issue persists</p>
              <Button 
                onClick={handleGenerate} 
                variant="outline" 
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                data-testid="button-retry"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {!generateIdeas.data && !generateIdeas.isPending && !generateIdeas.isError && savedIdeas.length === 0 && (
          <Card className="flex items-center justify-center h-64" data-testid="empty-state-calendar">
            <CardContent className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No content ideas generated yet</p>
              <p className="text-sm">Select a month and click generate to get AI-powered social media ideas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
