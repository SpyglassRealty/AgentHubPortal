import { NextResponse } from 'next/server';
import { readDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = readDatabase();
    
    // Only return properties that are:
    // 1. Listed on MLS (listed_on_mls = true)
    // 2. Have active status
    // 3. Not archived
    // 4. Remove sensitive internal fields
    const publicProperties = db.properties
      .filter(property => property.listed_on_mls && property.status === 'active' && !property.archived)
      .map(property => ({
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip_code,
        mls_number: property.mls_number,
        status: property.status,
        occupied: property.occupied,
        professional_photos: property.professional_photos,
        qualify_va_financing: property.qualify_va_financing,
        listed_on_mls: property.listed_on_mls,
        // Remove sensitive fields like client_name, asset_management_platform, etc.
      }))
      .sort((a, b) => {
        // Sort VA financing properties first
        if (a.qualify_va_financing && !b.qualify_va_financing) return -1;
        if (!a.qualify_va_financing && b.qualify_va_financing) return 1;
        return 0;
      });

    return NextResponse.json(publicProperties);
  } catch (error) {
    console.error('Error fetching public listings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}