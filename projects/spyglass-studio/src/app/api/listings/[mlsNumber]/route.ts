import { NextRequest, NextResponse } from 'next/server'

const REPLIERS_API_URL = process.env.REPLIERS_API_URL
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: { mlsNumber: string } }
) {
  try {
    const { mlsNumber } = params

    if (!mlsNumber) {
      return NextResponse.json(
        { error: 'MLS number is required' },
        { status: 400 }
      )
    }

    if (!REPLIERS_API_URL || !REPLIERS_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      )
    }

    // Fetch listing data from Repliers API
    const response = await fetch(
      `${REPLIERS_API_URL}/listings/${mlsNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${REPLIERS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        )
      }
      throw new Error(`API request failed: ${response.status}`)
    }

    const listing = await response.json()

    // Transform data for Studio use
    const studioListing = {
      mlsNumber: listing.mlsNumber || mlsNumber,
      address: listing.address || '',
      city: listing.city || '',
      state: listing.state || 'TX',
      zipCode: listing.zipCode || '',
      price: listing.price || listing.listPrice || 0,
      bedrooms: listing.bedrooms || 0,
      bathrooms: listing.bathrooms || 0,
      squareFeet: listing.squareFeet || listing.livingArea || 0,
      lotSize: listing.lotSize || '',
      yearBuilt: listing.yearBuilt || '',
      description: listing.description || listing.publicRemarks || '',
      photos: listing.photos || [],
      primaryPhoto: listing.primaryPhoto || listing.photos?.[0]?.url || '',
      listingAgent: listing.listingAgent || '',
      listingOffice: listing.listingOffice || '',
      listDate: listing.listDate || '',
      status: listing.status || 'Active',
      propertyType: listing.propertyType || 'Residential',
    }

    return NextResponse.json(studioListing)

  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing data' },
      { status: 500 }
    )
  }
}