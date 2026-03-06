import { NextResponse } from 'next/server';
import { PropertyService } from '@/lib/properties';

export async function GET() {
  try {
    const archivedProperties = PropertyService.getArchivedProperties();
    return NextResponse.json(archivedProperties);
  } catch (error) {
    console.error('Error fetching archived properties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}