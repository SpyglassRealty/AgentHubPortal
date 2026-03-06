import { NextResponse } from 'next/server';
import { PropertyService } from '@/lib/properties';

export async function GET() {
  try {
    const platforms = PropertyService.getDistinctAssetManagementPlatforms();
    return NextResponse.json(platforms);
  } catch (error) {
    console.error('Error fetching asset management platforms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}