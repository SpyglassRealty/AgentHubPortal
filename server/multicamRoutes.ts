/**
 * Multicam Podcast Editor — API Routes
 * 
 * Express routes for managing multicam editing jobs.
 * Stores job data in a local JSON file for now.
 * Processing routes will eventually proxy to the FastAPI service on port 8100.
 */

import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import multer from "multer";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// ── Types ────────────────────────────────────────────────

interface MulticamFile {
  id: string;
  filename: string;
  role: "main" | "camera" | "audio" | "screenshare";
  label?: string;
  duration?: number;
  path: string;
}

interface TimelineSegment {
  startTime: number;
  endTime: number;
  cameraIndex: number;
  cameraLabel?: string;
  transitionType?: "cut" | "crossfade";
  speaker?: string;
}

interface TranscriptEntry {
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
}

interface MulticamJob {
  id: string;
  name: string;
  status: "pending" | "importing" | "processing" | "ready" | "exporting" | "complete" | "error";
  files: MulticamFile[];
  timeline: TimelineSegment[];
  transcript?: TranscriptEntry[];
  processingProgress?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Storage ──────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, "../data");
const JOBS_FILE = path.join(DATA_DIR, "multicam-jobs.json");
const UPLOADS_DIR = path.join(DATA_DIR, "multicam-uploads");

// Processing service URL (FastAPI on port 8100)
const PROCESSING_SERVICE_URL = process.env.MULTICAM_PROCESSING_URL || "https://multicam.realtyhack.com";

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function loadJobs(): MulticamJob[] {
  ensureDirs();
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const raw = fs.readFileSync(JOBS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Multicam] Failed to load jobs:", err);
  }
  return [];
}

function saveJobs(jobs: MulticamJob[]) {
  ensureDirs();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function findJob(jobId: string): MulticamJob | undefined {
  const jobs = loadJobs();
  return jobs.find(j => j.id === jobId);
}

function updateJob(jobId: string, updates: Partial<MulticamJob>): MulticamJob | null {
  const jobs = loadJobs();
  const idx = jobs.findIndex(j => j.id === jobId);
  if (idx === -1) return null;
  
  jobs[idx] = {
    ...jobs[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveJobs(jobs);
  return jobs[idx];
}

// ── Multer Upload Config ─────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = req.params.jobId;
    const jobDir = path.join(UPLOADS_DIR, jobId);
    if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });
    cb(null, jobDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
  fileFilter: (req, file, cb) => {
    const allowed = /^(video|audio)\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ── Helper: Proxy to processing service ──────────────────

async function proxyToProcessingService(
  method: string,
  path: string,
  body?: any
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const opts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${PROCESSING_SERVICE_URL}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 503, data: { error: `Processing service unavailable: ${err.message}` } };
  }
}

// ── Routes ───────────────────────────────────────────────

// Job Management

// POST /api/admin/multicam/jobs — Create a new editing job
router.post("/jobs", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { name } = req.body || {};
    const job: MulticamJob = {
      id: randomUUID(),
      name: name || "Untitled Project",
      status: "pending",
      files: [],
      timeline: [],
      processingProgress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const jobs = loadJobs();
    jobs.unshift(job);
    saveJobs(jobs);

    console.log(`[Multicam] Created job ${job.id}: ${job.name}`);
    res.json(job);
  } catch (err: any) {
    console.error("[Multicam] Error creating job:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/multicam/jobs — List all jobs
router.get("/jobs", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobs = loadJobs();
    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/multicam/jobs/:jobId — Get job details
router.get("/jobs/:jobId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/multicam/jobs/:jobId — Delete a job
router.delete("/jobs/:jobId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobs = loadJobs();
    const idx = jobs.findIndex(j => j.id === req.params.jobId);
    if (idx === -1) return res.status(404).json({ error: "Job not found" });

    const job = jobs[idx];
    jobs.splice(idx, 1);
    saveJobs(jobs);

    // Clean up uploaded files
    const jobDir = path.join(UPLOADS_DIR, job.id);
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }

    console.log(`[Multicam] Deleted job ${job.id}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File Upload

// POST /api/admin/multicam/jobs/:jobId/files — Upload video files (multipart)
router.post("/jobs/:jobId/files", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const role = (req.body.role || "camera") as MulticamFile["role"];
    const label = req.body.label || `Camera ${job.files.length + 1}`;

    const multicamFile: MulticamFile = {
      id: randomUUID(),
      filename: file.filename,
      role,
      label,
      path: file.path,
    };

    job.files.push(multicamFile);
    updateJob(job.id, { files: job.files, status: job.files.length > 0 ? "pending" : job.status });

    console.log(`[Multicam] Uploaded file ${file.originalname} to job ${job.id} as ${role} (${label})`);
    res.json({ file: multicamFile });
  } catch (err: any) {
    console.error("[Multicam] Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Processing

// POST /api/admin/multicam/jobs/:jobId/process — Start processing
router.post("/jobs/:jobId/process", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.files.length === 0) {
      return res.status(400).json({ error: "No files to process" });
    }

    const { mode = "full" } = req.body;

    // Update status to processing
    updateJob(job.id, { status: "processing", processingProgress: 0, error: undefined });

    // Try to proxy to the processing service
    const result = await proxyToProcessingService("POST", `/jobs/${job.id}/process?mode=${mode}`, {
      files: job.files,
    });

    if (!result.ok) {
      // Processing service not available — mark as processing anyway for UI feedback
      // In production, this would queue the job
      console.log(`[Multicam] Processing service not available, stubbing response for job ${job.id}`);
      
      // Simulate: generate a stub timeline after a short delay
      setTimeout(() => {
        const stubTimeline: TimelineSegment[] = [];
        const duration = 300; // 5 minutes default
        const numSegments = Math.max(2, job.files.filter(f => f.role !== "audio").length * 3);
        const segDuration = duration / numSegments;

        for (let i = 0; i < numSegments; i++) {
          const cameraCount = job.files.filter(f => f.role !== "audio").length || 1;
          stubTimeline.push({
            startTime: i * segDuration,
            endTime: (i + 1) * segDuration,
            cameraIndex: i % cameraCount,
            cameraLabel: job.files[i % cameraCount]?.label || `Camera ${(i % cameraCount) + 1}`,
            transitionType: "cut",
          });
        }

        updateJob(job.id, {
          status: "ready",
          timeline: stubTimeline,
          processingProgress: 1,
        });

        console.log(`[Multicam] Generated stub timeline for job ${job.id} (${stubTimeline.length} segments)`);
      }, 2000);
    }

    res.json({ success: true, message: `Processing started (mode: ${mode})` });
  } catch (err: any) {
    console.error("[Multicam] Process error:", err);
    updateJob(req.params.jobId, { status: "error", error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/multicam/jobs/:jobId/status — Poll processing status
router.get("/jobs/:jobId/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json({
      status: job.status,
      progress: job.processingProgress || 0,
      error: job.error,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Timeline

// GET /api/admin/multicam/jobs/:jobId/timeline — Get edit timeline
router.get("/jobs/:jobId/timeline", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ timeline: job.timeline });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/multicam/jobs/:jobId/timeline — Update timeline
router.put("/jobs/:jobId/timeline", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const { timeline } = req.body;
    if (!Array.isArray(timeline)) return res.status(400).json({ error: "timeline must be an array" });

    const updated = updateJob(job.id, { timeline });
    res.json({ timeline: updated?.timeline });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Prompt

// POST /api/admin/multicam/jobs/:jobId/prompt — Send natural language edit command
router.post("/jobs/:jobId/prompt", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // Try to proxy to processing service
    const result = await proxyToProcessingService("POST", `/jobs/${job.id}/prompt`, { prompt });

    if (result.ok) {
      // If processing service returned updated timeline, apply it
      if (result.data.timeline) {
        updateJob(job.id, { timeline: result.data.timeline });
      }
      return res.json({ message: result.data.message || "Applied", timeline: result.data.timeline });
    }

    // Stub: Parse simple commands locally
    const message = parseSimplePrompt(job, prompt);
    res.json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simple local prompt parser (stub for when processing service is unavailable)
function parseSimplePrompt(job: MulticamJob, prompt: string): string {
  const lower = prompt.toLowerCase();

  // Parse "switch to camera X at M:SS"
  const switchMatch = lower.match(/switch\s+to\s+camera\s+(\d+)\s+at\s+(\d+):(\d+)/);
  if (switchMatch) {
    const camIdx = parseInt(switchMatch[1]) - 1;
    const time = parseInt(switchMatch[2]) * 60 + parseInt(switchMatch[3]);

    // Find the segment at that time and split it
    const timeline = [...job.timeline];
    const segIdx = timeline.findIndex(s => time >= s.startTime && time < s.endTime);
    if (segIdx >= 0) {
      const seg = timeline[segIdx];
      const newSeg1 = { ...seg, endTime: time };
      const newSeg2 = { ...seg, startTime: time, cameraIndex: camIdx, cameraLabel: `Camera ${camIdx + 1}` };
      timeline.splice(segIdx, 1, newSeg1, newSeg2);
      updateJob(job.id, { timeline });
      return `Switched to camera ${camIdx + 1} at ${formatTimeSimple(time)}`;
    }
    return `Could not find a segment at ${formatTimeSimple(time)}`;
  }

  return `Prompt received: "${prompt}". Processing service needed for complex edits.`;
}

function formatTimeSimple(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Export

// POST /api/admin/multicam/jobs/:jobId/export — Trigger final render
router.post("/jobs/:jobId/export", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.timeline.length === 0) {
      return res.status(400).json({ error: "No timeline to export" });
    }

    updateJob(job.id, { status: "exporting", processingProgress: 0 });

    // Try to proxy to processing service
    const result = await proxyToProcessingService("POST", `/jobs/${job.id}/export`, {
      timeline: job.timeline,
      files: job.files,
    });

    if (!result.ok) {
      // Stub: simulate export completion
      setTimeout(() => {
        updateJob(job.id, { status: "complete", processingProgress: 1 });
        console.log(`[Multicam] Stub export complete for job ${job.id}`);
      }, 3000);
    }

    res.json({ success: true, message: "Export started" });
  } catch (err: any) {
    updateJob(req.params.jobId, { status: "error", error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/multicam/jobs/:jobId/export — Download rendered file
router.get("/jobs/:jobId/export", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const job = findJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.status !== "complete") {
      return res.status(400).json({ error: "Export not complete yet" });
    }

    // Check if output file exists in the job directory
    const jobDir = path.join(UPLOADS_DIR, job.id);
    const outputFile = path.join(jobDir, "output.mp4");

    if (fs.existsSync(outputFile)) {
      return res.download(outputFile, `${job.name || "multicam-export"}.mp4`);
    }

    res.status(404).json({ error: "Output file not found. Processing service may need to be running." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File streaming

// GET /api/admin/multicam/files/:filename — Stream video files for preview
router.get("/files/:filename", async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;

    // Search for the file in all job directories
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.status(404).json({ error: "No uploads directory" });
    }

    const jobDirs = fs.readdirSync(UPLOADS_DIR);
    let filePath: string | null = null;

    for (const dir of jobDirs) {
      const candidate = path.join(UPLOADS_DIR, dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: "File not found" });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Support range requests for video streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error("[Multicam] File streaming error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
