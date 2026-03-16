import { useState } from 'react'
import { User } from '../types'

interface NewDealProps {
  user: User
  onNavigate: (page: 'dashboard' | 'new-deal') => void
  onLogout: () => void
}

export default function NewDeal({ user, onNavigate, onLogout }: NewDealProps) {
  const [formData, setFormData] = useState({
    dealType: 'listing' as 'listing' | 'buyer_rep' | 'lease',
    propertyAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    mlsNumber: '',
    listPrice: '',
    salePrice: '',
    leasePrice: '',
    closingDate: '',
    contractDate: '',
    earnestMoney: '',
    optionFee: '',
    titleCompany: '',
    lenderName: '',
    buyerName: '',
    sellerName: '',
    tenantName: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Prepare data for submission
    const submitData: any = {
      dealType: formData.dealType,
      propertyAddress: formData.propertyAddress,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
    }

    // Add optional fields if they have values
    if (formData.mlsNumber) submitData.mlsNumber = formData.mlsNumber
    if (formData.listPrice) submitData.listPrice = parseFloat(formData.listPrice)
    if (formData.salePrice) submitData.salePrice = parseFloat(formData.salePrice)
    if (formData.leasePrice) submitData.leasePrice = parseFloat(formData.leasePrice)
    if (formData.closingDate) submitData.closingDate = formData.closingDate
    if (formData.contractDate) submitData.contractDate = formData.contractDate
    if (formData.earnestMoney) submitData.earnestMoney = parseFloat(formData.earnestMoney)
    if (formData.optionFee) submitData.optionFee = parseFloat(formData.optionFee)
    if (formData.titleCompany) submitData.titleCompany = formData.titleCompany
    if (formData.lenderName) submitData.lenderName = formData.lenderName
    if (formData.buyerName) submitData.buyerName = formData.buyerName
    if (formData.sellerName) submitData.sellerName = formData.sellerName
    if (formData.tenantName) submitData.tenantName = formData.tenantName
    if (formData.notes) submitData.notes = formData.notes

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Deal ${data.deal.dealNumber} created successfully!`)
        setTimeout(() => {
          onNavigate('dashboard')
        }, 2000)
      } else {
        setError(data.message || 'Failed to create deal')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-teal-600 hover:text-teal-500 mr-4"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Create New Deal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Deal Type */}
              <div>
                <label htmlFor="dealType" className="block text-sm font-medium text-gray-700">
                  Deal Type *
                </label>
                <select
                  id="dealType"
                  name="dealType"
                  required
                  value={formData.dealType}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                >
                  <option value="listing">Listing</option>
                  <option value="buyer_rep">Buyer Representation</option>
                  <option value="lease">Lease</option>
                </select>
              </div>

              {/* Property Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Property Information</h3>
                
                <div>
                  <label htmlFor="propertyAddress" className="block text-sm font-medium text-gray-700">
                    Property Address *
                  </label>
                  <input
                    type="text"
                    id="propertyAddress"
                    name="propertyAddress"
                    required
                    value={formData.propertyAddress}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      placeholder="Austin"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State *
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                      <option value="TX">Texas</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      required
                      value={formData.zip}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                      placeholder="78701"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mlsNumber" className="block text-sm font-medium text-gray-700">
                    MLS Number
                  </label>
                  <input
                    type="text"
                    id="mlsNumber"
                    name="mlsNumber"
                    value={formData.mlsNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder="1234567"
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {formData.dealType !== 'lease' && (
                    <>
                      <div>
                        <label htmlFor="listPrice" className="block text-sm font-medium text-gray-700">
                          List Price
                        </label>
                        <input
                          type="number"
                          id="listPrice"
                          name="listPrice"
                          value={formData.listPrice}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                          placeholder="500000"
                        />
                      </div>

                      <div>
                        <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">
                          Sale Price
                        </label>
                        <input
                          type="number"
                          id="salePrice"
                          name="salePrice"
                          value={formData.salePrice}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                          placeholder="495000"
                        />
                      </div>
                    </>
                  )}

                  {formData.dealType === 'lease' && (
                    <div>
                      <label htmlFor="leasePrice" className="block text-sm font-medium text-gray-700">
                        Monthly Lease Price
                      </label>
                      <input
                        type="number"
                        id="leasePrice"
                        name="leasePrice"
                        value={formData.leasePrice}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="2500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Parties */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Parties</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {formData.dealType !== 'listing' && (
                    <div>
                      <label htmlFor="buyerName" className="block text-sm font-medium text-gray-700">
                        Buyer Name
                      </label>
                      <input
                        type="text"
                        id="buyerName"
                        name="buyerName"
                        value={formData.buyerName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  )}

                  {formData.dealType !== 'buyer_rep' && (
                    <div>
                      <label htmlFor="sellerName" className="block text-sm font-medium text-gray-700">
                        {formData.dealType === 'lease' ? 'Landlord Name' : 'Seller Name'}
                      </label>
                      <input
                        type="text"
                        id="sellerName"
                        name="sellerName"
                        value={formData.sellerName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="Jane Smith"
                      />
                    </div>
                  )}

                  {formData.dealType === 'lease' && (
                    <div>
                      <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700">
                        Tenant Name
                      </label>
                      <input
                        type="text"
                        id="tenantName"
                        name="tenantName"
                        value={formData.tenantName}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        placeholder="Bob Johnson"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  placeholder="Additional notes about this deal..."
                />
              </div>

              {/* Alerts */}
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-700">{success}</div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}