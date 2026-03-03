/**
 * Multicam Podcast Editor — Admin Page
 * 
 * Wizard-flow editor for AI-powered multicam podcast editing.
 * Steps: 1) Import Files → 2) Process → 3) Review & Edit → 4) Export
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Film,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Video,
  Mic,
  Monitor,
  Camera,
  ChevronLeft,
  RefreshCw,
  Send,
  Check,
  X,
  Clock,
  Zap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface MulticamJob {
  id: string;
  name: string;
  status: 'pending' | 'importing' | 'processing' | 'ready' | 'exporting' | 'complete' | 'error';
  files: MulticamFile[];
  timeline: TimelineSegment[];
  transcript?: TranscriptEntry[];
  processingProgress?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface MulticamFile {
  id: string;
  filename: string;
  role: 'main' | 'camera' | 'audio' | 'screenshare';
  label?: string;
  duration?: number;
  path: string;
}

interface TimelineSegment {
  startTime: number;
  endTime: number;
  cameraIndex: number;
  cameraLabel?: string;
  transitionType?: 'cut' | 'crossfade';
  speaker?: string;
}

interface TranscriptEntry {
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
}

// ── Helpers ──────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-gray-500", icon: <Clock className="h-3 w-3" /> },
  importing: { label: "Importing", color: "bg-yellow-500", icon: <Upload className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-yellow-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  ready: { label: "Ready", color: "bg-green-500", icon: <Check className="h-3 w-3" /> },
  exporting: { label: "Exporting", color: "bg-orange-500", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  complete: { label: "Complete", color: "bg-green-600", icon: <Check className="h-3 w-3" /> },
  error: { label: "Error", color: "bg-red-500", icon: <X className="h-3 w-3" /> },
};

const CAMERA_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500",
  "bg-pink-500", "bg-cyan-500", "bg-yellow-500", "bg-red-500",
];

const ROLE_ICONS: Record<string, React.ReactNode> = {
  main: <Video className="h-4 w-4" />,
  camera: <Camera className="h-4 w-4" />,
  audio: <Mic className="h-4 w-4" />,
  screenshare: <Monitor className="h-4 w-4" />,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const EXAMPLE_PROMPTS = [
  "Switch to camera 2 at 3:45",
  "Use camera 1 from 0:30 to 1:00",
  "Keep on the speaker longer",
  "Add crossfade transitions",
];

// ── Step Components ──────────────────────────────────────

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            i === currentStep
              ? "bg-[#EF4923] text-white"
              : i < currentStep
              ? "bg-[#EF4923]/20 text-[#EF4923]"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          }`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-current">
              {i < currentStep ? "✓" : i + 1}
            </span>
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${i < currentStep ? "bg-[#EF4923]" : "bg-gray-300 dark:bg-gray-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Import Step ──────────────────────────────────────────

function ImportStep({ jobId, onComplete }: { jobId: string; onComplete: () => void }) {
  const [gdriveLinks, setGdriveLinks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("role", i === 0 && uploadedFiles.length === 0 ? "main" : "camera");
        formData.append("label", i === 0 && uploadedFiles.length === 0 ? "Main" : `Camera ${uploadedFiles.length + i + 1}`);

        const res = await fetch(`/api/admin/multicam/jobs/${jobId}/files`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }
        setUploadedFiles(prev => [...prev, file.name]);
      }
      toast({ title: "Files uploaded successfully" });
      onComplete();
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleGDriveImport = async () => {
    const links = gdriveLinks.split("\n").map(l => l.trim()).filter(Boolean);
    if (links.length === 0) {
      toast({ title: "No links", description: "Please paste at least one Google Drive link", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await fetch(`/api/admin/multicam/jobs/${jobId}/import-gdrive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ links }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Import failed");
      }
      toast({ title: "Files imported", description: `${links.length} file(s) added from Google Drive` });
      onComplete();
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-gray-800">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Upload className="h-5 w-5 text-[#EF4923]" />
          Import Media
        </CardTitle>
        <CardDescription>
          Add your podcast video files — one per camera angle. The first file is treated as the main/combined video.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="mb-4">
            <TabsTrigger value="upload">Local Upload</TabsTrigger>
            <TabsTrigger value="gdrive">Google Drive</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-[#EF4923] bg-[#EF4923]/5"
                  : "border-gray-700 hover:border-gray-600"
              }`}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
            >
              <div className="space-y-3">
                <Film className="h-12 w-12 mx-auto text-gray-500" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop video files here, or click to browse
                </p>
                <Input
                  type="file"
                  accept="video/*,audio/*"
                  multiple
                  className="max-w-xs mx-auto"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#EF4923]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading files...
                  </div>
                )}
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Uploaded files:</p>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((name, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {i === 0 ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                      {i === 0 ? "Main: " : `Cam ${i + 1}: `}{name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="gdrive">
            <div className="space-y-4">
              <Textarea
                placeholder={"Paste Google Drive links (one per line)\n\nhttps://drive.google.com/file/d/xxx/view\nhttps://drive.google.com/file/d/yyy/view"}
                value={gdriveLinks}
                onChange={(e) => setGdriveLinks(e.target.value)}
                rows={6}
                disabled={importing}
              />
              <Button onClick={handleGDriveImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" /> Import from Google Drive</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Processing Step ──────────────────────────────────────

function ProcessingStep({ job, onRefresh }: { job: MulticamJob; onRefresh: () => void }) {
  const [starting, setStarting] = useState(false);
  const { toast } = useToast();

  const handleProcess = async (mode: string = "full") => {
    setStarting(true);
    try {
      const res = await fetch(`/api/admin/multicam/jobs/${job.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start processing");
      }
      toast({ title: "Processing started", description: `Mode: ${mode}` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Processing error", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const isProcessing = job.status === "processing" || job.status === "importing";

  return (
    <Card className="border-gray-800">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#EF4923]" />
          Process
        </CardTitle>
        <CardDescription>
          Analyze audio, sync cameras, and generate the multicam edit timeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film className="h-4 w-4" />
          <span><strong>{job.files.length}</strong> file(s) imported</span>
        </div>

        {isProcessing && (
          <div className="space-y-3">
            <Progress value={(job.processingProgress || 0) * 100} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing... This may take a few minutes.
            </div>
          </div>
        )}

        {job.status === "error" && job.error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg p-3">
            ❌ {job.error}
          </div>
        )}

        {!isProcessing && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleProcess("full")}
              disabled={starting || job.files.length === 0}
              className="bg-[#EF4923] hover:bg-[#d9401f]"
            >
              {starting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Analyze & Generate Timeline</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleProcess("analyze")}
              disabled={starting || job.files.length === 0}
            >
              Analyze Only
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Timeline Visualization ───────────────────────────────

function TimelineView({ segments, files, currentTime, onSeek }: {
  segments: TimelineSegment[];
  files: MulticamFile[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0;
    return Math.max(...segments.map(s => s.endTime));
  }, [segments]);

  const timeMarkers = useMemo(() => {
    const markers = [];
    const interval = totalDuration > 600 ? 60 : totalDuration > 120 ? 30 : 10;
    for (let t = 0; t <= totalDuration; t += interval) markers.push(t);
    return markers;
  }, [totalDuration]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * totalDuration);
  }, [onSeek, totalDuration]);

  if (segments.length === 0) {
    return (
      <Card className="border-gray-800">
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No timeline data yet. Process your files to generate the edit timeline.
          </div>
        </CardContent>
      </Card>
    );
  }

  const cameraIndices = [...new Set(segments.map(s => s.cameraIndex))].sort();

  return (
    <Card className="border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Timeline</CardTitle>
          <div className="flex gap-2">
            {files.filter(f => f.role !== 'audio').map((f, i) => (
              <Badge key={i} className={`${CAMERA_COLORS[i % CAMERA_COLORS.length]} text-white text-xs`}>
                {f.label || `Camera ${i + 1}`}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {segments.length} segments • {formatTime(totalDuration)} total
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Time ruler */}
          <div className="relative h-6 text-[10px] text-muted-foreground">
            {timeMarkers.map(t => (
              <div key={t} className="absolute top-0" style={{ left: `${(t / totalDuration) * 100}%` }}>
                <div className="h-2 border-l border-gray-600" />
                <span className="ml-0.5">{formatTime(t)}</span>
              </div>
            ))}
          </div>

          {/* Combined timeline bar */}
          <div
            className="relative h-12 bg-gray-800 rounded-md overflow-hidden cursor-pointer"
            onClick={handleClick}
          >
            {segments.map((seg, i) => {
              const left = (seg.startTime / totalDuration) * 100;
              const width = ((seg.endTime - seg.startTime) / totalDuration) * 100;
              return (
                <div
                  key={i}
                  className={`absolute top-0 h-full ${CAMERA_COLORS[seg.cameraIndex % CAMERA_COLORS.length]} opacity-80 hover:opacity-100 transition-opacity border-r border-white/20`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${seg.cameraLabel || seg.speaker || `Camera ${seg.cameraIndex + 1}`}: ${formatTime(seg.startTime)} → ${formatTime(seg.endTime)}`}
                >
                  {width > 3 && (
                    <span className="text-[9px] text-white px-1 truncate block leading-[48px]">
                      {seg.cameraLabel || seg.speaker || `Cam ${seg.cameraIndex + 1}`}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Playhead */}
            {currentTime > 0 && totalDuration > 0 && (
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
              </div>
            )}
          </div>

          {/* Per-camera tracks */}
          <div className="space-y-1 mt-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Per-camera breakdown:</p>
            {cameraIndices.map(camIdx => {
              const cameraSegs = segments.filter(s => s.cameraIndex === camIdx);
              const file = files.find(f => f.role !== 'audio') || files[camIdx];
              const label = file?.label || `Camera ${camIdx + 1}`;
              return (
                <div key={camIdx} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 text-right truncate">{label}</span>
                  <div className="flex-1 relative h-4 bg-gray-800 rounded-sm">
                    {cameraSegs.map((seg, i) => {
                      const left = (seg.startTime / totalDuration) * 100;
                      const width = ((seg.endTime - seg.startTime) / totalDuration) * 100;
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 h-full ${CAMERA_COLORS[camIdx % CAMERA_COLORS.length]} rounded-sm`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Segment list */}
        <ScrollArea className="mt-4 max-h-48">
          <div className="space-y-1">
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer hover:bg-gray-800 ${
                  currentTime >= seg.startTime && currentTime < seg.endTime
                    ? "bg-gray-800 ring-1 ring-[#EF4923]"
                    : ""
                }`}
                onClick={() => onSeek(seg.startTime)}
              >
                <div className={`w-2 h-2 rounded-full ${CAMERA_COLORS[seg.cameraIndex % CAMERA_COLORS.length]}`} />
                <span className="font-mono text-muted-foreground w-24">
                  {formatTime(seg.startTime)} → {formatTime(seg.endTime)}
                </span>
                <span>{seg.cameraLabel || seg.speaker || `Camera ${seg.cameraIndex + 1}`}</span>
                {seg.transitionType === "crossfade" && (
                  <Badge variant="outline" className="text-[9px] h-4">fade</Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Video Preview ────────────────────────────────────────

function VideoPreviewPanel({ files, timeline, currentTime, onTimeUpdate }: {
  files: MulticamFile[];
  timeline: TimelineSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}) {
  const [activeCamera, setActiveCamera] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find which camera should be active at the current time
  useEffect(() => {
    const seg = timeline.find(s => currentTime >= s.startTime && currentTime < s.endTime);
    if (seg) setActiveCamera(seg.cameraIndex);
  }, [currentTime, timeline]);

  const videoFiles = files.filter(f => f.role !== 'audio');

  if (videoFiles.length === 0) {
    return (
      <Card className="border-gray-800">
        <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-gray-500">
            <Film className="h-12 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeFile = videoFiles[activeCamera] || videoFiles[0];

  return (
    <Card className="border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preview</CardTitle>
          <span className="text-sm text-muted-foreground font-mono">{formatTime(currentTime)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={activeFile ? `/api/admin/multicam/files/${encodeURIComponent(activeFile.filename)}` : ""}
            preload="metadata"
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
              {activeFile?.label || `Camera ${activeCamera + 1}`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 5); }}
          >
            <SkipBack className="h-3 w-3 mr-1" /> -5s
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) videoRef.current.pause();
                else videoRef.current.play();
              }
            }}
          >
            {isPlaying ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Play</>}
          </Button>

          <Button
            size="sm" variant="outline"
            onClick={() => { if (videoRef.current) videoRef.current.currentTime = currentTime + 5; }}
          >
            +5s <SkipForward className="h-3 w-3 ml-1" />
          </Button>

          <div className="flex-1" />

          <div className="flex gap-1">
            {videoFiles.map((file, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={idx === activeCamera ? "default" : "outline"}
                className={`text-xs h-7 px-2 ${idx === activeCamera ? "bg-[#EF4923] hover:bg-[#d9401f]" : ""}`}
                onClick={() => setActiveCamera(idx)}
              >
                {file.label || `Cam ${idx + 1}`}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── AI Prompt Box ────────────────────────────────────────

function PromptPanel({ jobId, onTimelineUpdated }: { jobId: string; onTimelineUpdated: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{ prompt: string; response: string }[]>([]);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/admin/multicam/jobs/${jobId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${data.error || "Failed"}`);
      } else {
        setMessage(`✅ ${data.message || "Applied"}`);
        setHistory(prev => [{ prompt: prompt.trim(), response: data.message || "Applied" }, ...prev]);
        setPrompt("");
        onTimelineUpdated();
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[#EF4923]" />
          AI Edit Instructions
        </CardTitle>
        <CardDescription>Describe changes to the timeline in natural language.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            placeholder="e.g., switch to camera 2 at 3:45"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            rows={2}
            className="resize-none"
            disabled={loading}
          />
          <Button onClick={handleSubmit} disabled={loading} className="self-end bg-[#EF4923] hover:bg-[#d9401f]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <Badge key={i} variant="outline" className="cursor-pointer text-xs hover:bg-gray-800" onClick={() => setPrompt(ex)}>
              {ex}
            </Badge>
          ))}
        </div>

        {message && <p className="text-sm">{message}</p>}

        {history.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-gray-800">
            <p className="text-xs text-muted-foreground font-medium">History:</p>
            {history.slice(0, 5).map((h, i) => (
              <div key={i} className="text-xs space-y-0.5">
                <p className="text-muted-foreground">→ {h.prompt}</p>
                <p>{h.response}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Export Panel ──────────────────────────────────────────

function ExportPanel({ job, onRefresh }: { job: MulticamJob; onRefresh: () => void }) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/multicam/jobs/${job.id}/export`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }
      toast({ title: "Export started" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Export error", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const isExporting = job.status === "exporting";
  const isComplete = job.status === "complete";

  return (
    <Card className="border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4 text-[#EF4923]" />
          Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isExporting && (
          <div className="space-y-2">
            <Progress value={(job.processingProgress || 0) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Rendering...
            </p>
          </div>
        )}

        {isComplete && (
          <div className="text-sm text-green-400 flex items-center gap-1">
            <Check className="h-4 w-4" /> Export complete!
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exporting || isExporting || job.timeline.length === 0}
          className="w-full bg-[#EF4923] hover:bg-[#d9401f]"
        >
          {isExporting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendering...</>
          ) : isComplete ? (
            <><RefreshCw className="h-4 w-4 mr-2" /> Re-export</>
          ) : (
            <><Download className="h-4 w-4 mr-2" /> Export Video</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Job Editor (detail view) ─────────────────────────────

function JobEditor({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const [currentTime, setCurrentTime] = useState(0);
  const queryClient = useQueryClient();

  const { data: job, isLoading, refetch } = useQuery<MulticamJob>({
    queryKey: [`/api/admin/multicam/jobs/${jobId}`],
    queryFn: async () => {
      const res = await fetch(`/api/admin/multicam/jobs/${jobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load job");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as MulticamJob | undefined;
      if (data && ["importing", "processing", "exporting"].includes(data.status)) return 3000;
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#EF4923]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Job not found</p>
        <Button onClick={onBack} variant="outline"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
      </div>
    );
  }

  // Determine wizard step
  const hasFiles = job.files.length > 0;
  const hasTimeline = job.timeline.length > 0;
  const isProcessing = ["importing", "processing"].includes(job.status);
  const isExporting = job.status === "exporting";

  let currentStep = 0;
  if (hasFiles && !hasTimeline && !isProcessing) currentStep = 1;
  else if (isProcessing) currentStep = 1;
  else if (hasTimeline && !isExporting && job.status !== "complete") currentStep = 2;
  else if (isExporting || job.status === "complete") currentStep = 3;

  const handleRefresh = () => { refetch(); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="font-display text-xl font-bold">{job.name || `Project ${job.id.slice(0, 8)}`}</h2>
          <Badge className={`${STATUS_CONFIG[job.status]?.color || "bg-gray-500"} text-white text-xs flex items-center gap-1`}>
            {STATUS_CONFIG[job.status]?.icon}
            {STATUS_CONFIG[job.status]?.label || job.status}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      <StepIndicator currentStep={currentStep} steps={["Import Files", "Process", "Review & Edit", "Export"]} />

      {/* Step 0: Import */}
      {currentStep === 0 && !hasFiles && (
        <div className="max-w-2xl mx-auto">
          <ImportStep jobId={job.id} onComplete={handleRefresh} />
        </div>
      )}

      {/* Step 1: Process (has files, no timeline) */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto">
          <ProcessingStep job={job} onRefresh={handleRefresh} />
        </div>
      )}

      {/* Step 2: Review & Edit */}
      {currentStep === 2 && hasTimeline && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <VideoPreviewPanel
              files={job.files}
              timeline={job.timeline}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
            />
            <TimelineView
              segments={job.timeline}
              files={job.files}
              currentTime={currentTime}
              onSeek={setCurrentTime}
            />
          </div>
          <div className="space-y-4">
            <PromptPanel jobId={job.id} onTimelineUpdated={handleRefresh} />
            <ExportPanel job={job} onRefresh={handleRefresh} />
          </div>
        </div>
      )}

      {/* Step 3: Export */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <VideoPreviewPanel
              files={job.files}
              timeline={job.timeline}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
            />
            <TimelineView
              segments={job.timeline}
              files={job.files}
              currentTime={currentTime}
              onSeek={setCurrentTime}
            />
          </div>
          <div className="space-y-4">
            <ExportPanel job={job} onRefresh={handleRefresh} />
            <PromptPanel jobId={job.id} onTimelineUpdated={handleRefresh} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function MulticamEditorPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<MulticamJob[]>({
    queryKey: ["/api/admin/multicam/jobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/multicam/jobs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      return data.jobs || data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/admin/multicam/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/multicam/jobs"] });
      setCreateDialogOpen(false);
      setNewJobName("");
      setSelectedJobId(data.id);
      toast({ title: "Project created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/admin/multicam/jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete job");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/multicam/jobs"] });
      toast({ title: "Project deleted" });
    },
  });

  if (selectedJobId) {
    return <JobEditor jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-[#EF4923]" />
            Multicam Podcast Editor
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered multicam editing for podcast videos</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#EF4923] hover:bg-[#d9401f]">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Multicam Project</DialogTitle>
              <DialogDescription>Create a new podcast editing project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Project name (e.g., Episode 42 - Guest Interview)"
                value={newJobName}
                onChange={e => setNewJobName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createMutation.mutate(newJobName || "Untitled Project"); }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-[#EF4923] hover:bg-[#d9401f]"
                  onClick={() => createMutation.mutate(newJobName || "Untitled Project")}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#EF4923]" />
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <Card className="border-gray-800">
          <CardContent className="py-12 text-center">
            <Film className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-4">Create a new project to get started with multicam editing.</p>
            <Button
              className="bg-[#EF4923] hover:bg-[#d9401f]"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Card
              key={job.id}
              className="border-gray-800 cursor-pointer hover:border-[#EF4923]/50 transition-colors"
              onClick={() => setSelectedJobId(job.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${STATUS_CONFIG[job.status]?.color || "bg-gray-500"} text-white text-xs flex items-center gap-1`}>
                      {STATUS_CONFIG[job.status]?.icon}
                      {STATUS_CONFIG[job.status]?.label || job.status}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{job.name || `Project ${job.id.slice(0, 8)}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.files.length} files • {job.timeline.length} segments • {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedJobId(job.id); }}>
                      Open
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this project?")) deleteMutation.mutate(job.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
