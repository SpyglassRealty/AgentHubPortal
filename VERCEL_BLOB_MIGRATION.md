# Vercel Blob Migration for Mission Control Uploads

## What Changed

**Problem:** Mission Control core-card widgets were generating image URLs like:
`https://spyglass-idx.vercel.app/api/uploads/images/rHL8BNTj-J/complimentary_buyer_guide.png`

But spyglass-idx had no route to serve these files, causing blank images.

**Solution:** Updated Mission Control upload system to use Vercel Blob storage via spyglass-idx.

## Changes Made

### 1. New Upload Route (`uploadRoutes-vercel-blob.ts`)
- **Forwards uploads** to spyglass-idx `/api/upload` endpoint
- **Stores Vercel Blob URLs** in database (instead of base64 data)  
- **Returns Blob URLs directly** to frontend
- **Backwards compatible** - still serves old base64 images via redirect

### 2. Updated Main Routes (`routes.ts`)
- **Switched to new upload system**: `uploadRoutes-vercel-blob` 
- **Old system available** as `uploadRoutes` (commented out)

## Environment Variables

Add to Mission Control deployment:
```env
SPYGLASS_IDX_URL=https://spyglass-idx.vercel.app
```

## Deployment Process

1. **Deploy Mission Control** with new upload system
2. **Test core-card widget** image uploads  
3. **Verify images** are served from Vercel Blob URLs

## How It Works Now

1. **Upload Request** → Mission Control `/api/admin/uploads`
2. **Forward to spyglass-idx** → `/api/upload` (multipart or JSON)
3. **Vercel Blob Storage** → Returns `https://xyz.blob.vercel-storage.com/...`
4. **Store Blob URL** in Mission Control database
5. **Return to Frontend** → Direct Blob URL (no proxying)

## Benefits

- ✅ **Images actually work** (no more 404s)
- ✅ **Better performance** (served from Vercel CDN)
- ✅ **Consistent storage** (all images use same system)
- ✅ **Backwards compatible** (old images still work)

## Testing

Core-card widget uploads should now:
- ✅ Upload successfully
- ✅ Display images correctly  
- ✅ Return Vercel Blob URLs
- ✅ Work across deployments (no ephemeral storage issues)