import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { uploads } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// Image upload endpoint - returns a short URL
router.post('/uploads', isAuthenticated, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided' 
      });
    }

    // Generate a short unique ID for the image
    const imageId = nanoid(10);
    
    // Convert to base64 for storage
    const base64 = req.file.buffer.toString('base64');
    
    // Generate a clean filename from the original
    const ext = path.extname(req.file.originalname);
    const baseName = path.basename(req.file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    const cleanFilename = `${baseName}${ext}`;
    
    // Store in database
    await db.insert(uploads).values({
      id: imageId,
      filename: cleanFilename,
      mimeType: req.file.mimetype,
      data: base64,
      uploadedBy: req.user?.id || null,
    });
    
    // Return a proper URL instead of base64
    const imageUrl = `/api/uploads/images/${imageId}/${cleanFilename}`;
    
    console.log(`[Upload] Image uploaded: ${req.file.originalname} → ${imageUrl} (${Math.round(req.file.size / 1024)}KB)`);
    
    res.json({
      success: true,
      url: imageUrl,
      filename: cleanFilename,
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
router.post('/uploads/from-url', isAuthenticated, async (req: any, res) => {
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

    // Generate a short unique ID for the image
    const imageId = nanoid(10);
    
    // Convert to base64 for storage
    const base64 = buffer.toString('base64');
    
    // Try to extract filename from URL or generate one
    const urlPath = new URL(url).pathname;
    const urlFilename = path.basename(urlPath) || `image-${Date.now()}`;
    const ext = path.extname(urlFilename) || '.jpg';
    const baseName = path.basename(urlFilename, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    // Store in database
    await db.insert(uploads).values({
      id: imageId,
      filename: `${baseName}${ext}`,
      mimeType: contentType,
      data: base64,
      uploadedBy: req.user?.id || null,
    });
    
    // Return a proper URL instead of base64
    const imageUrl = `/api/uploads/images/${imageId}/${baseName}${ext}`;

    console.log(`[Upload] Image from URL uploaded: ${url} → ${imageUrl} (${Math.round(buffer.length / 1024)}KB)`);

    res.json({
      success: true,
      url: imageUrl,
      filename: `${baseName}${ext}`,
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

// Serve uploaded images
router.get('/images/:imageId/:filename?', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // Fetch from database
    const [imageData] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, imageId))
      .limit(1);
    
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Set proper content type
    res.setHeader('Content-Type', imageData.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Convert base64 back to binary and send
    const buffer = Buffer.from(imageData.data, 'base64');
    res.send(buffer);
  } catch (error) {
    console.error('[Upload] Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
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