import { Router } from "express";
import multer from "multer";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { uploads } from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

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

// Use memory storage for processing
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Configuration for spyglass-idx upload endpoint
const SPYGLASS_IDX_URL = process.env.SPYGLASS_IDX_URL || 'https://spyglass-idx.vercel.app';
const UPLOAD_ENDPOINT = `${SPYGLASS_IDX_URL}/api/upload`;

/**
 * Upload image to Vercel Blob via spyglass-idx
 */
async function uploadToVercelBlob(file: Express.Multer.File): Promise<{ url: string; size: number }> {
  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  formData.append('file', blob, file.originalname);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-upload-secret': process.env.REVALIDATE_SECRET || '',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to Vercel Blob: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Download and upload external URL to Vercel Blob
 */
async function uploadUrlToVercelBlob(url: string): Promise<{ url: string; size: number }> {
  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-upload-secret': process.env.REVALIDATE_SECRET || '',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload URL to Vercel Blob: ${response.status} ${error}`);
  }

  return await response.json();
}

// Image upload endpoint - uploads to Vercel Blob
router.post('/uploads', isAuthenticated, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided' 
      });
    }

    console.log(`[Upload] Processing image: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`);

    // Upload to Vercel Blob via spyglass-idx
    const blobResult = await uploadToVercelBlob(req.file);
    
    // Generate a short unique ID for tracking
    const imageId = nanoid(10);
    
    // Store metadata in database (no base64 data, just the Blob URL)
    await db.insert(uploads).values({
      id: imageId,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      data: blobResult.url, // Store Blob URL instead of base64
      uploadedBy: req.user?.id || null,
    });
    
    console.log(`[Upload] Image uploaded to Vercel Blob: ${req.file.originalname} → ${blobResult.url}`);
    
    res.json({
      success: true,
      url: blobResult.url, // Return Vercel Blob URL directly
      filename: req.file.originalname,
      originalName: req.file.originalname,
      size: blobResult.size,
      mimeType: req.file.mimetype,
      imageId: imageId, // Include for backwards compatibility
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

    console.log(`[Upload] Processing external URL: ${url}`);

    // Upload to Vercel Blob via spyglass-idx
    const blobResult = await uploadUrlToVercelBlob(url);
    
    // Generate a short unique ID for tracking
    const imageId = nanoid(10);
    
    // Extract filename from URL
    const urlPath = new URL(url).pathname;
    const filename = decodeURIComponent(urlPath.split('/').pop() || 'image.jpg');
    
    // Store metadata in database (no base64 data, just the Blob URL)
    await db.insert(uploads).values({
      id: imageId,
      filename: filename,
      mimeType: 'image/jpeg', // Default, could be refined
      data: blobResult.url, // Store Blob URL instead of base64
      uploadedBy: req.user?.id || null,
    });

    console.log(`[Upload] External URL uploaded to Vercel Blob: ${url} → ${blobResult.url}`);

    res.json({
      success: true,
      url: blobResult.url, // Return Vercel Blob URL directly
      filename: filename,
      size: blobResult.size,
      mimeType: 'image/jpeg',
      imageId: imageId, // Include for backwards compatibility
    });
  } catch (error) {
    console.error('[Upload] Error downloading/uploading from URL:', error);
    res.status(500).json({
      error: 'Failed to process URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Legacy route - redirect to Vercel Blob URLs
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
    
    // If data is a URL (new system), redirect to Vercel Blob
    if (imageData.data.startsWith('http')) {
      return res.redirect(301, imageData.data);
    }
    
    // Legacy: serve base64 data directly (for backwards compatibility)
    res.setHeader('Content-Type', imageData.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
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