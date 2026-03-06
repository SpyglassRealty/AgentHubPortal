import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';
import { PropertyPhoto } from '@/types';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Use /tmp on Vercel for file uploads
const getUploadsBase = () => process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

// Helper function to get the start of the week (Monday)
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = parseInt(id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const db = readDatabase();
    const photos = db.property_photos
      .filter(photo => photo.property_id === propertyId)
      .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = parseInt(id);
    
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    const uploadedBy = formData.get('uploadedBy') as string || 'Unknown';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate property exists
    const db = readDatabase();
    const property = db.properties.find(p => p.id === propertyId);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Create uploads directory if it doesn't exist
    // NOTE: Using /tmp on Vercel for temporary storage. For production, use Vercel Blob or external storage service.
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
    const uploadsDir = path.join(baseDir, 'uploads', 'properties', propertyId.toString());
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const uploadedPhotos: PropertyPhoto[] = [];
    const now = new Date();
    const weekStart = getWeekStart(now);

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(file.name);
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filepath = path.join(uploadsDir, filename);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Get next photo ID
      const maxPhotoId = Math.max(0, ...db.property_photos.map(p => p.id));
      
      // Create photo record
      const photo: PropertyPhoto = {
        id: maxPhotoId + 1,
        property_id: propertyId,
        filename: filename,
        original_name: file.name,
        upload_date: now.toISOString(),
        uploaded_by: uploadedBy,
        week_of: weekStart,
        file_size: file.size,
        mime_type: file.type,
        created_at: now.toISOString()
      };

      db.property_photos.push(photo);
      uploadedPhotos.push(photo);
    }

    writeDatabase(db);

    return NextResponse.json({ 
      message: `Successfully uploaded ${uploadedPhotos.length} photos`,
      photos: uploadedPhotos 
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}