import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';
import { PropertyDocument } from '@/types';
import fs from 'fs';
import path from 'path';

// Allowed document MIME types
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain', // .txt
  'text/csv', // .csv
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    const documents = db.property_documents?.filter((doc: PropertyDocument) => 
      doc.property_id === propertyId
    ) || [];

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
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
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds limit (10MB)' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV' 
      }, { status: 400 });
    }

    // Create uploads/documents directory if it doesn't exist
    // NOTE: Using /tmp on Vercel for temporary storage. For production, use Vercel Blob or external storage service.
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
    const uploadsDir = path.join(baseDir, 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const filename = `${propertyId}_${timestamp}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filepath, buffer);

    // Save document info to database
    const db = readDatabase();
    if (!db.property_documents) {
      db.property_documents = [];
    }

    // Get next document ID
    const maxDocId = Math.max(0, ...db.property_documents.map((d: PropertyDocument) => d.id));
    const now = new Date().toISOString();

    const newDocument: PropertyDocument = {
      id: maxDocId + 1,
      property_id: propertyId,
      filename: filename,
      original_name: file.name,
      upload_date: now.split('T')[0], // Just the date part
      uploaded_by: 'System', // Could be enhanced to track actual user
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      created_at: now,
    };

    db.property_documents.push(newDocument);
    writeDatabase(db);

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = parseInt(id);
    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');
    
    if (isNaN(propertyId) || !documentId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const docId = parseInt(documentId);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const db = readDatabase();
    const documentIndex = db.property_documents?.findIndex((doc: PropertyDocument) => 
      doc.id === docId && doc.property_id === propertyId
    );

    if (documentIndex === -1 || documentIndex === undefined) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Remove file from disk
    const document = db.property_documents[documentIndex];
    const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
    const filepath = path.join(baseDir, 'uploads', 'documents', document.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Remove from database
    db.property_documents.splice(documentIndex, 1);
    writeDatabase(db);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}