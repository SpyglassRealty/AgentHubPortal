import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

// ── Storage Configuration ──────────────────────────────────────────────
// Store uploads in a persistent directory served by Express
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const UPLOAD_SUBFOLDERS = ["images", "agents", "blogs", "pages", "communities"] as const;

// Ensure upload directories exist
function ensureUploadDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  for (const sub of UPLOAD_SUBFOLDERS) {
    const dir = path.join(UPLOAD_DIR, sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
ensureUploadDirs();

// ── Multer Setup ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Default to "images" subfolder; route handler can specify category via query
    const category = (_req.query.category as string) || "images";
    const validCategory = UPLOAD_SUBFOLDERS.includes(category as any) ? category : "images";
    const dir = path.join(UPLOAD_DIR, validCategory);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-randomhex.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const hash = crypto.randomBytes(8).toString("hex");
    const timestamp = Date.now();
    cb(null, `${timestamp}-${hash}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`));
    }
  },
});

// ── Routes ─────────────────────────────────────────────────────────────

// POST /api/admin/upload - Upload single image
router.post("/admin/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const category = (req.query.category as string) || "images";
    const validCategory = UPLOAD_SUBFOLDERS.includes(category as any) ? category : "images";
    const url = `/uploads/${validCategory}/${req.file.filename}`;

    res.json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// POST /api/admin/upload/multiple - Upload multiple images
router.post("/admin/upload/multiple", upload.array("files", 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const category = (req.query.category as string) || "images";
    const validCategory = UPLOAD_SUBFOLDERS.includes(category as any) ? category : "images";

    const uploaded = files.map((file) => ({
      url: `/uploads/${validCategory}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }));

    res.json({ files: uploaded });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
});

// DELETE /api/admin/upload - Delete an uploaded file
router.delete("/admin/upload", (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    // Security: only allow deleting from uploads directory
    if (!url.startsWith("/uploads/")) {
      return res.status(400).json({ error: "Can only delete uploaded files" });
    }

    const filePath = path.join(process.cwd(), url);
    
    // Verify path doesn't escape uploads dir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("Delete upload error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// GET /api/admin/upload/list - List uploaded files (with optional category filter)
router.get("/admin/upload/list", (req, res) => {
  try {
    const category = (req.query.category as string) || "images";
    const validCategory = UPLOAD_SUBFOLDERS.includes(category as any) ? category : "images";
    const dir = path.join(UPLOAD_DIR, validCategory);

    if (!fs.existsSync(dir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(dir)
      .filter((f) => !f.startsWith("."))
      .map((filename) => {
        const filePath = path.join(dir, filename);
        const stat = fs.statSync(filePath);
        return {
          url: `/uploads/${validCategory}/${filename}`,
          filename,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ files });
  } catch (error) {
    console.error("List uploads error:", error);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

// ── Error Handler for Multer ──────────────────────────────────────────
export function handleMulterError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Too many files. Maximum is 10." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err?.message?.includes("Unsupported file type")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

export default router;
