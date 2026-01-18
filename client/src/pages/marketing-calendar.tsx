import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Sparkles, RefreshCw, Copy, Check, Instagram, Facebook, Linkedin, Twitter } from "lucide-react";

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

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

export default function MarketingCalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonth]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

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
  });

  const handleGenerate = () => {
    generateIdeas.mutate(selectedMonth);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[hsl(28,94%,54%)]/10 text-[hsl(28,94%,54%)]">
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
              <Sparkles className="h-5 w-5 text-[hsl(28,94%,54%)]" />
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
                className="bg-[hsl(28,94%,54%)] hover:bg-[hsl(28,94%,48%)]"
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
              <Card key={weekIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[hsl(28,94%,54%)] border-[hsl(28,94%,54%)]/30">
                      Week {week.week}
                    </Badge>
                    {week.theme}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {week.posts.map((post, postIndex) => {
                    const copyId = `${weekIndex}-${postIndex}`;
                    return (
                      <div key={postIndex} className="p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getPlatformColor(post.platform)}>
                                {getPlatformIcon(post.platform)}
                                <span className="ml-1">{post.platform}</span>
                              </Badge>
                              <Badge variant="secondary">{post.type}</Badge>
                              <span className="text-xs text-muted-foreground">Best time: {post.bestTime}</span>
                            </div>
                            <p className="text-sm">{post.caption}</p>
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-[hsl(28,94%,54%)]">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${post.caption}\n\n${post.hashtags.map(t => `#${t}`).join(' ')}`, copyId)}
                            data-testid={`button-copy-${copyId}`}
                          >
                            {copiedIndex === copyId ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!generateIdeas.data && !generateIdeas.isPending && (
          <Card className="flex items-center justify-center h-64">
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
