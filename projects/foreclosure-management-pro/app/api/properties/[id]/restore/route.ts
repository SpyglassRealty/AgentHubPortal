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

    const success = PropertyService.restoreProperty(propertyId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to restore property or property not archived' }, { status: 400 });
    }

    const updatedProperty = PropertyService.getPropertyWithVisits(propertyId);
    return NextResponse.json({ 
      message: 'Property restored successfully',
      property: updatedProperty 
    });
  } catch (error) {
    console.error('Error restoring property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}