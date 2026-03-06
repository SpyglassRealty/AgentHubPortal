import { NextRequest, NextResponse } from 'next/server';
import { PropertyService } from '@/lib/properties';

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

    const property = PropertyService.getPropertyWithVisits(propertyId);
    
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    
    // Validate required fields
    const requiredFields = ['address', 'city', 'state', 'zip_code', 'client_name'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate visit_schedule
    if (body.visit_schedule && !['weekly', 'bi-weekly'].includes(body.visit_schedule)) {
      return NextResponse.json({ error: 'Invalid visit_schedule. Must be weekly or bi-weekly' }, { status: 400 });
    }

    // Validate status
    if (body.status && !['active', 'pending', 'sold', 'removed', 'pre-marketing'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const success = PropertyService.updateProperty(propertyId, body);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
    }

    const updatedProperty = PropertyService.getPropertyById(propertyId);
    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}