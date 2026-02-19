'use client'

import { useState } from 'react'
import { Home, TrendingUp, BarChart3, MapPin } from 'lucide-react'

interface HomeValueData {
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

export function HomeValueWidget() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HomeValueData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    address: '',
    city: 'Austin',
    state: 'TX',
    zip: '',
    beds: '',
    baths: '',
    sqft: '',
    yearBuilt: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const payload = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        beds: formData.beds ? parseInt(formData.beds) : undefined,
        baths: formData.baths ? parseInt(formData.baths) : undefined,
        sqft: formData.sqft ? parseInt(formData.sqft) : undefined,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
      }

      const response = await fetch('/api/home-value', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to calculate home value')
      }

      const data: HomeValueData = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getForecastIcon = (direction?: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
      default: return '📊'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center mb-6">
        <Home className="h-6 w-6 text-blue-600 mr-3" />
        <h3 className="text-xl font-semibold text-gray-900">
          Real-Time Home Value Estimator
        </h3>
        <div className="ml-auto text-sm text-green-600 font-medium">
          🔗 Live MLS + Pulse Data
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Address *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
                {['78701', '78702', '78703', '78704'].includes(formData.zip) && (
                  <span className="ml-1 text-xs text-green-600">✨ Enhanced Data</span>
                )}
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="78701"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Property Details Row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Beds</label>
              <input
                type="number"
                value={formData.beds}
                onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                placeholder="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Baths</label>
              <input
                type="number"
                step="0.5"
                value={formData.baths}
                onChange={(e) => setFormData({ ...formData, baths: e.target.value })}
                placeholder="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sq Ft</label>
              <input
                type="number"
                value={formData.sqft}
                onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                placeholder="1800"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Built</label>
              <input
                type="number"
                value={formData.yearBuilt}
                onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                placeholder="2010"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.address}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Property...
              </div>
            ) : (
              'Get Instant Home Value'
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          {/* Main Value Display */}
          <div className="text-center bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-700 mb-2">Estimated Home Value</h4>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {formatCurrency(result.estimatedValue)}
            </div>
            <div className="text-sm text-gray-600">
              Range: {formatCurrency(result.valueRange.low)} - {formatCurrency(result.valueRange.high)}
            </div>
            <div className="flex items-center justify-center mt-3 space-x-4 text-sm">
              <div className="flex items-center text-green-600">
                <BarChart3 className="h-4 w-4 mr-1" />
                {result.confidence}% Confidence
              </div>
              <div className="flex items-center text-blue-600">
                <MapPin className="h-4 w-4 mr-1" />
                {result.comparableCount} Comparables
              </div>
              <div className="text-purple-600 font-medium">
                {result.dataSource}
              </div>
            </div>
          </div>

          {/* Market Metrics */}
          {result.marketMetrics && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Market Data</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Median Price</div>
                  <div className="font-semibold">{formatCurrency(result.marketMetrics.medianPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Avg Days on Market</div>
                  <div className="font-semibold">{result.marketMetrics.averageDaysOnMarket} days</div>
                </div>
                <div>
                  <div className="text-gray-600">Price per Sq Ft</div>
                  <div className="font-semibold">${result.marketMetrics.pricePerSqft}</div>
                </div>
                {result.marketMetrics.forecast && (
                  <div>
                    <div className="text-gray-600">Market Trend</div>
                    <div className="font-semibold">
                      {getForecastIcon(result.marketMetrics.forecast.direction)} 
                      {result.marketMetrics.forecast.value}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => setResult(null)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              Check Another Property
            </button>
            <button
              onClick={() => {
                const report = `Home Value Report\n\nProperty: ${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}\nEstimated Value: ${formatCurrency(result.estimatedValue)}\nValue Range: ${formatCurrency(result.valueRange.low)} - ${formatCurrency(result.valueRange.high)}\nConfidence: ${result.confidence}%\nComparables: ${result.comparableCount}\nData Source: ${result.dataSource}`
                navigator.clipboard.writeText(report)
                alert('Report copied to clipboard!')
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              📋 Copy Report
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        ⚡ Powered by real MLS data • Enhanced Austin metrics for zip codes 78701-78704
      </div>
    </div>
  )
}