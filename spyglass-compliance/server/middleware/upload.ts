/**
 * File Upload Middleware
 * Multer configuration for document uploads
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

// Create upload directories if they don't exist
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Initialize upload directories
ensureDirectoryExists(UPLOAD_DIR);
ensureDirectoryExists(path.join(UPLOAD_DIR, 'documents'));
ensureDirectoryExists(path.join(UPLOAD_DIR, 'temp'));

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize by deal ID if provided
    const dealId = req.params.dealId || req.body.dealId;
    const uploadPath = dealId 
      ? path.join(UPLOAD_DIR, 'documents', dealId)
      : path.join(UPLOAD_DIR, 'temp');
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueId = uuidv4().split('-')[0]; // First 8 chars of UUID
    const timestamp = Date.now();
    
    const filename = `${timestamp}_${uniqueId}_${sanitizedName}${ext}`;
    cb(null, filename);
  }
});

// File filter for allowed types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    
    // Archives (for multiple document submission)
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif',
    '.zip'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per upload
  }
});

/**
 * Single file upload middleware
 */
export const uploadSingle = upload.single('document');

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = upload.array('documents', 10);

/**
 * Handle multer errors
 */
export function handleUploadError(error: any, req: any, res: any, next: any) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files allowed per upload'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file',
        message: 'Unexpected file field name'
      });
    }
    
    return res.status(400).json({
      error: 'Upload error',
      message: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      error: 'Upload failed',
      message: error.message
    });
  }
  
  next();
}

/**
 * Get file information
 */
export function getFileInfo(filePath: string) {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine file category
    let category = 'other';
    if (['.pdf', '.doc', '.docx'].includes(ext)) category = 'document';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'].includes(ext)) category = 'image';
    else if (['.xls', '.xlsx'].includes(ext)) category = 'spreadsheet';
    else if (ext === '.txt') category = 'text';
    else if (ext === '.zip') category = 'archive';
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: ext,
      category,
      isReadable: stats.isFile()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Delete file safely
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Move file from temp to permanent location
 */
export function moveFile(sourcePath: string, targetPath: string): boolean {
  try {
    const targetDir = path.dirname(targetPath);
    ensureDirectoryExists(targetDir);
    
    fs.renameSync(sourcePath, targetPath);
    return true;
  } catch (error) {
    console.error('Failed to move file:', error);
    return false;
  }
}

/**
 * Clean up old temp files
 */
export function cleanupTempFiles() {
  const tempDir = path.join(UPLOAD_DIR, 'temp');
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  try {
    if (!fs.existsSync(tempDir)) return;
    
    const files = fs.readdirSync(tempDir);
    let cleanedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (Date.now() - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old temp files`);
    }
  } catch (error) {
    console.error('Temp file cleanup failed:', error);
  }
}

/**
 * Initialize cleanup interval for temp files
 */
setInterval(cleanupTempFiles, 60 * 60 * 1000); // Run every hour