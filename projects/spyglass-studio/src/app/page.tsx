'use client'

import { useState } from 'react'
import { Camera, Palette, Mail, FileImage, Zap } from 'lucide-react'

export default function StudioHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Palette className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Spyglass Studio</h1>
                <p className="text-sm text-gray-500">Marketing Platform</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Beta • v0.1.0
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Professional Marketing Tools
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create stunning marketing materials with MLS-integrated templates. 
            No design experience required. TREC compliant by default.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
            <p className="text-green-800 font-medium">
              🎯 <strong>Eliminates $500K+/year</strong> in Rechat licensing costs
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* MLS Integration */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Zap className="h-8 w-8 text-yellow-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">MLS Auto-Fill</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Enter an MLS number and instantly populate templates with property photos, details, and pricing.
            </p>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              <strong>Status:</strong> <span className="text-yellow-600">Ready</span> • Connected to Repliers API
            </div>
          </div>

          {/* Template Gallery */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <FileImage className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Template Gallery</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Professional templates for listings, social media, email campaigns, and print materials.
            </p>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              <strong>Templates:</strong> Just Listed, Just Sold, Open House, Market Reports
            </div>
          </div>

          {/* Multi-Format Export */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Camera className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Multi-Format Export</h3>
            </div>
            <p className="text-gray-600 mb-4">
              One design → Instagram, Facebook, LinkedIn, and high-res print. Automatic resizing.
            </p>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              <strong>Formats:</strong> Social (1080x1080), Stories (1080x1920), Print (300 DPI)
            </div>
          </div>

          {/* Email Builder */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Mail className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Email Campaigns</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Drag-and-drop email builder with FUB integration for contact management and analytics.
            </p>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
              <strong>Status:</strong> <span className="text-gray-500">Phase 2</span> • Coming Soon
            </div>
          </div>

          {/* Brand Compliance */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-red-600 rounded mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TX</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">TREC Compliant</h3>
            </div>
            <p className="text-gray-600 mb-4">
              All templates automatically include required TREC disclosures and Spyglass branding.
            </p>
            <div className="bg-green-50 p-3 rounded text-sm text-green-700">
              <strong>Compliance:</strong> TREC §535.155 • Automatic enforcement
            </div>
          </div>

          {/* Cost Savings */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-green-600 rounded mr-3 flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">$0/Seat Cost</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Replace expensive tools like Rechat ($200-300/seat/mo) with powerful in-house platform.
            </p>
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
              <strong>Savings:</strong> $500K-900K/year • Major recruiting advantage
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Ready to Create?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border-2 border-dashed border-blue-300 rounded-lg text-center hover:border-blue-500 transition-colors cursor-pointer">
              <FileImage className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Create Listing Flyer</h4>
              <p className="text-gray-600">Enter MLS number to generate professional listing materials</p>
            </div>
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-400">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-400 mb-2">Email Campaign</h4>
              <p className="text-gray-400">Coming in Phase 2</p>
            </div>
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">🚧 Development Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-yellow-800">Phase 1 (Current)</div>
              <div className="text-yellow-700">Canvas editor + MLS integration</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Phase 2</div>
              <div className="text-gray-500">Email builder + FUB sync</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Phase 3</div>
              <div className="text-gray-500">Print + social automation</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Phase 4</div>
              <div className="text-gray-500">Direct publishing + AI features</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}