import { NextRequest, NextResponse } from 'next/server'

const REPLIERS_API_URL = process.env.REPLIERS_API_URL
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const city = searchParams.get('city')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const beds = searchParams.get('beds')
    const baths = searchParams.get('baths')
    const status = searchParams.get('status') || 'Active'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!REPLIERS_API_URL || !REPLIERS_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      )
    }

    // Build search parameters
    const searchQuery = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      status,
    })

    if (query) searchQuery.set('q', query)
    if (city) searchQuery.set('city', city)
    if (minPrice) searchQuery.set('minPrice', minPrice)
    if (maxPrice) searchQuery.set('maxPrice', maxPrice)
    if (beds) searchQuery.set('beds', beds)
    if (baths) searchQuery.set('baths', baths)

    // Fetch listings from Repliers API
    const response = await fetch(
      `${REPLIERS_API_URL}/listings/search?${searchQuery}`,
      {
        headers: {
          'Authorization': `Bearer ${REPLIERS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()

    // Transform listings for Studio use
    const studioListings = data.listings?.map((listing: any) => ({
      mlsNumber: listing.mlsNumber,
      address: listing.address || '',
      city: listing.city || '',
      state: listing.state || 'TX',
      zipCode: listing.zipCode || '',
      price: listing.price || listing.listPrice || 0,
      bedrooms: listing.bedrooms || 0,
      bathrooms: listing.bathrooms || 0,
      squareFeet: listing.squareFeet || listing.livingArea || 0,
      primaryPhoto: listing.primaryPhoto || listing.photos?.[0]?.url || '',
      status: listing.status || 'Active',
      listDate: listing.listDate || '',
      listingAgent: listing.listingAgent || '',
    })) || []

    return NextResponse.json({
      listings: studioListings,
      total: data.total || studioListings.length,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Error searching listings:', error)
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    )
  }
}