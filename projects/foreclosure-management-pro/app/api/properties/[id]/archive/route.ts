import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/properties';

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

    const body = await request.json();
    const archivedBy = body.archivedBy || 'Unknown User';

    const success = PropertyService.archiveProperty(propertyId, archivedBy);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to archive property or property already archived' }, { status: 400 });
    }

    const updatedProperty = PropertyService.getPropertyWithVisits(propertyId);
    return NextResponse.json({ 
      message: 'Property archived successfully',
      property: updatedProperty 
    });
  } catch (error) {
    console.error('Error archiving property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}