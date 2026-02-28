import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// Ensure uploads directory exists (for backward compat)
const uploadsDir = path.join(process.cwd(), "dist", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[Upload] Created uploads directory: ${uploadsDir}`);
}

// File filter for images only
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Use memory storage so we can convert to base64 (Render has ephemeral disk)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Image upload endpoint - returns base64 data URL for persistent DB storage
router.post('/uploads', isAuthenticated, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided' 
      });
    }

    // Convert to base64 data URL so it persists in the database
    // (Render's ephemeral disk loses files on redeploy)
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    
    console.log(`[Upload] Image converted to base64: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`);
    
    res.json({
      success: true,
      url: dataUrl,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('[Upload] Error uploading image:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Image upload from external URL endpoint
router.post('/uploads/from-url', isAuthenticated, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[Upload] Downloading image from URL: ${url}`);
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return res.status(400).json({ error: `Failed to fetch image: ${imgRes.status} ${imgRes.statusText}` });
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: `URL did not return an image (got ${contentType})` });
    }

    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`[Upload] Image from URL converted to base64 (${Math.round(buffer.length / 1024)}KB)`);

    res.json({
      success: true,
      url: dataUrl,
      filename: `downloaded-${Date.now()}`,
      size: buffer.length,
      mimeType: contentType,
    });
  } catch (error) {
    console.error('[Upload] Error downloading image from URL:', error);
    res.status(500).json({
      error: 'Failed to download image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Handle multer errors
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'Image must be smaller than 10MB' 
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Invalid field name',
        message: 'Expected field name "image"' 
      });
    }
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed' 
    });
  }
  
  console.error('[Upload] Multer error:', error);
  res.status(500).json({ 
    error: 'Upload failed',
    message: error.message 
  });
});

export default router;
