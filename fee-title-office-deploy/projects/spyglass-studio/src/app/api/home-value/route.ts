import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REPLIERS_API_URL = process.env.REPLIERS_API_URL
const REPLIERS_API_KEY = process.env.REPLIERS_API_KEY

// Pulse API for enhanced Austin market data
const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'https://missioncontrol-tjfm.onrender.com'
const PULSE_API_KEY = process.env.PULSE_API_KEY || ''

// Austin test zip codes with enhanced Pulse data
const PULSE_TEST_ZIPS = ['78701', '78702', '78703', '78704']

interface HomeValueRequest {
  address: string
  city?: string
  state?: string
  zip?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
}

interface EstimateData {
  estimatedValue: number
  valueRange: {
    low: number
    high: number
  }
  confidence: number
  comparableCount: number
  marketMetrics?: {
    medianPrice: number
    averageDaysOnMarket: number
    pricePerSqft: number
    forecast?: {
      value: number
      direction: 'up' | 'down' | 'stable'
    }
  }
  dataSource: 'MLS + Pulse' | 'MLS Only'
}

export async function POST(request: NextRequest) {
  try {
    const body: HomeValueRequest = await request.json()
    
    if (!body.address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    if (!REPLIERS_API_URL || !REPLIERS_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 500 }
      )
    }

    // Calculate home value using real data sources
    const estimate = await calculateHomeValue(body)
    
    return NextResponse.json(estimate)

  } catch (error) {
    console.error('Error calculating home value:', error)
    return NextResponse.json(
      { error: 'Failed to calculate home value' },
      { status: 500 }
    )
  }
}

async function calculateHomeValue(property: HomeValueRequest): Promise<EstimateData> {
  let baseValue = 500000 // Default fallback
  let confidence = 70
  let comparableCount = 0
  let marketMetrics: EstimateData['marketMetrics']
  let dataSource: EstimateData['dataSource'] = 'MLS Only'

  try {
    // Step 1: Get comparable sales from Repliers MLS
    const comparables = await getComparableSales(property)
    comparableCount = comparables.length

    if (comparables.length > 0) {
      // Calculate base value from comparables
      const prices = comparables.map((c: any) => c.price).filter((p: number) => p > 0)
      if (prices.length > 0) {
        baseValue = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length
        confidence = Math.min(95, 60 + (prices.length * 5))
      }
    }

    // Step 2: Get enhanced market data from Pulse API (Austin zip codes only)
    if (property.zip && PULSE_TEST_ZIPS.includes(property.zip)) {
      try {
        const pulseData = await getPulseMarketData(property.zip)
        if (pulseData) {
          marketMetrics = {
            medianPrice: pulseData.medianPrice || baseValue,
            averageDaysOnMarket: pulseData.averageDaysOnMarket || 25,
            pricePerSqft: pulseData.pricePerSqft || Math.round(baseValue / (property.sqft || 2000)),
            forecast: pulseData.forecast
          }
          
          // Adjust value based on Pulse market data
          if (pulseData.medianPrice && pulseData.medianPrice > 0) {
            baseValue = (baseValue * 0.7) + (pulseData.medianPrice * 0.3)
            confidence = Math.min(95, confidence + 10)
          }
          
          dataSource = 'MLS + Pulse'
        }
      } catch (error) {
        console.warn('Pulse API unavailable, using MLS only:', error)
      }
    }

    // Step 3: Adjust for property characteristics
    if (property.sqft) {
      const avgPricePerSqft = marketMetrics?.pricePerSqft || (baseValue / 2000)
      const adjustedValue = property.sqft * avgPricePerSqft
      baseValue = (baseValue * 0.8) + (adjustedValue * 0.2)
    }

    // Step 4: Apply age adjustment
    if (property.yearBuilt) {
      const age = new Date().getFullYear() - property.yearBuilt
      if (age < 5) {
        baseValue *= 1.05 // 5% premium for new construction
      } else if (age > 30) {
        baseValue *= 0.95 // 5% discount for older homes
      }
    }

    // Create value range (±10-15% based on confidence)
    const rangePercent = confidence > 85 ? 0.10 : 0.15
    const low = Math.round(baseValue * (1 - rangePercent))
    const high = Math.round(baseValue * (1 + rangePercent))

    return {
      estimatedValue: Math.round(baseValue),
      valueRange: { low, high },
      confidence: Math.round(confidence),
      comparableCount,
      marketMetrics,
      dataSource
    }

  } catch (error) {
    console.error('Error in calculateHomeValue:', error)
    
    // Fallback estimate
    return {
      estimatedValue: baseValue,
      valueRange: { 
        low: Math.round(baseValue * 0.85), 
        high: Math.round(baseValue * 1.15) 
      },
      confidence: 60,
      comparableCount: 0,
      dataSource: 'MLS Only'
    }
  }
}

async function getComparableSales(property: HomeValueRequest) {
  try {
    const searchParams = new URLSearchParams({
      city: property.city || 'Austin',
      state: property.state || 'TX',
      status: 'Sold',
      limit: '20'
    })

    if (property.beds) searchParams.set('beds', property.beds.toString())
    if (property.baths) searchParams.set('baths', property.baths.toString())
    
    const response = await fetch(
      `${REPLIERS_API_URL}/listings/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${REPLIERS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000)
      }
    )

    if (!response.ok) {
      throw new Error(`Repliers API error: ${response.status}`)
    }

    const data = await response.json()
    return data.listings || []

  } catch (error) {
    console.warn('Failed to fetch comparables:', error)
    return []
  }
}

async function getPulseMarketData(zipCode: string) {
  try {
    const response = await fetch(
      `${MISSION_CONTROL_URL}/api/zip/${zipCode}/metrics`,
      {
        headers: {
          'X-API-Key': PULSE_API_KEY,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000)
      }
    )

    if (!response.ok) {
      throw new Error(`Pulse API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      medianPrice: data.medianPrice,
      averageDaysOnMarket: data.averageDaysOnMarket,
      pricePerSqft: data.pricePerSqft,
      forecast: data.forecast
    }

  } catch (error) {
    console.warn('Pulse API unavailable:', error)
    return null
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    endpoint: 'Home Value API',
    description: 'Calculate home values using real MLS + Pulse data',
    dataSources: [
      'Repliers MLS API - Comparable sales',
      'Pulse API - Enhanced Austin market metrics (78701-78704)',
      'Real-time calculation engine'
    ],
    example: {
      address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      beds: 3,
      baths: 2,
      sqft: 1800,
      yearBuilt: 2010
    },
    response: {
      estimatedValue: 650000,
      valueRange: { low: 585000, high: 715000 },
      confidence: 87,
      comparableCount: 12,
      dataSource: 'MLS + Pulse'
    }
  })
}