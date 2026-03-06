import { NextRequest, NextResponse } from 'next/server';
import { readDatabase, writeDatabase } from '@/lib/database';
import { PropertyService } from '@/lib/properties';
import { Property } from '@/types';

export async function GET() {
  try {
    const activeProperties = PropertyService.getActiveProperties();
    return NextResponse.json(activeProperties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const db = readDatabase();
    
    // Get next ID
    const maxId = Math.max(0, ...db.properties.map(p => p.id));
    const now = new Date().toISOString();
    
    const newProperty: Property = {
      id: maxId + 1,
      address: body.address,
      city: body.city,
      state: body.state,
      zip_code: body.zip_code,
      client_name: body.client_name,
      mls_number: body.mls_number || null,
      asset_management_platform: body.asset_management_platform || null,
      status: body.status || 'active',
      last_visit_date: body.last_visit_date || null,
      visit_schedule: body.visit_schedule || 'bi-weekly',
      last_open_house: body.last_open_house || null,
      last_broker_caravan: body.last_broker_caravan || null,
      date_added: now.split('T')[0], // Just the date part
      occupied: body.occupied || false,
      winterized: body.winterized || false,
      sign_in_yard: body.sign_in_yard || false,
      listed_on_mls: body.listed_on_mls || false,
      supra_box_on_door: body.supra_box_on_door || false,
      combo_lock_box: body.combo_lock_box || false,
      combo_lock_box_code: body.combo_lock_box_code || '',
      professional_photos: body.professional_photos || false,
      qualify_va_financing: body.qualify_va_financing || false,
      archived: false, // New properties are never archived by default
      archived_date: undefined,
      archived_by: undefined,
      notes: body.notes || '',
      created_at: now,
      updated_at: now
    };

    db.properties.push(newProperty);
    writeDatabase(db);

    return NextResponse.json(newProperty, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}