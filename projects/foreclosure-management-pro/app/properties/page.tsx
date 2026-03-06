'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Property } from '@/types';
import { MagnifyingGlassIcon, PlusIcon, ArchiveBoxIcon, HomeIcon } from '@heroicons/react/24/outline';
import ArchiveActions from '@/components/ArchiveActions';

export default function PropertiesPage() {
  const [activeProperties, setActiveProperties] = useState<Property[]>([]);
  const [archivedProperties, setArchivedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchProperties();
  }, [refreshTrigger]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      
      // Fetch active properties
      const activeResponse = await fetch('/api/properties');
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setActiveProperties(activeData);
      }

      // Fetch archived properties
      const archivedResponse = await fetch('/api/properties/archived');
      if (archivedResponse.ok) {
        const archivedData = await archivedResponse.json();
        setArchivedProperties(archivedData);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRestoreSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const currentProperties = activeTab === 'active' ? activeProperties : archivedProperties;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spyglass-orange mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Properties</h1>
          <p className="text-gray-400 mt-1">
            {activeProperties.length} active • {archivedProperties.length} archived
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary flex items-center">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Property
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'active'
                  ? 'border-spyglass-orange text-spyglass-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Active Properties ({activeProperties.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'archived'
                  ? 'border-spyglass-orange text-spyglass-orange'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <ArchiveBoxIcon className="h-4 w-4 mr-2" />
              Archived Properties ({archivedProperties.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address, city, or MLS number..."
            className="form-input pl-10 w-full"
          />
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentProperties.map((property) => (
          <div key={property.id} className="property-card relative">
            {/* Archive indicator for archived properties */}
            {property.archived && (
              <div className="absolute top-3 right-3 z-10">
                <span className="status-badge bg-gray-700 text-gray-300">
                  <ArchiveBoxIcon className="h-3 w-3 mr-1 inline" />
                  Archived
                </span>
              </div>
            )}

            <Link href={`/properties/${property.id}`} className="block group">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-spyglass-orange transition-colors">
                    {property.address}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {property.city}, {property.state} {property.zip_code}
                  </p>
                </div>
                <span className={`status-badge ${
                  property.status === 'active' ? 'status-active' :
                  property.status === 'pending' ? 'status-pending' :
                  'status-active'
                }`}>
                  {property.status}
                </span>
              </div>

              {/* Client */}
              <p className="text-gray-300 text-sm mb-4">
                Client: {property.client_name}
              </p>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {property.mls_number && (
                  <span className="status-mls">MLS #{property.mls_number}</span>
                )}
                {property.qualify_va_financing && (
                  <span className="status-badge bg-green-900 text-green-300">VA Financing</span>
                )}
                {property.occupied && (
                  <span className="status-occupied">Occupied</span>
                )}
                {property.winterized && (
                  <span className="status-badge bg-blue-900 text-blue-300">Winterized</span>
                )}
                {property.sign_in_yard && (
                  <span className="status-badge bg-green-900 text-green-300">Sign in Yard</span>
                )}
              </div>
            </Link>

            {/* Archive Action */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              {property.archived && property.archived_date && (
                <span className="text-xs text-gray-500">
                  Archived {new Date(property.archived_date).toLocaleDateString()}
                  {property.archived_by && ` by ${property.archived_by}`}
                </span>
              )}
              {!property.archived && (
                <div></div>
              )}
              <ArchiveActions
                propertyId={property.id}
                propertyAddress={property.address}
                isArchived={property.archived}
                onArchiveSuccess={handleArchiveSuccess}
                onRestoreSuccess={handleRestoreSuccess}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {currentProperties.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {activeTab === 'active' ? (
              <HomeIcon className="mx-auto h-12 w-12 mb-4" />
            ) : (
              <ArchiveBoxIcon className="mx-auto h-12 w-12 mb-4" />
            )}
            <h3 className="text-lg font-medium">
              {activeTab === 'active' ? 'No active properties' : 'No archived properties'}
            </h3>
            <p className="mt-2">
              {activeTab === 'active' 
                ? 'Get started by adding your first property.'
                : 'Archived properties will appear here when you archive them.'
              }
            </p>
          </div>
          {activeTab === 'active' && (
            <Link href="/properties/new" className="btn-primary">
              Add Your First Property
            </Link>
          )}
        </div>
      )}
    </div>
  );
}