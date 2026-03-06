'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PropertyService } from '@/lib/properties';
import QuickInfoPanel from '@/components/QuickInfoPanel';
import PhotoUpload from '@/components/PhotoUpload';
import PhotoGallery from '@/components/PhotoGallery';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentList from '@/components/DocumentList';
import { 
  ArrowLeftIcon, 
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { PropertyWithVisits } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: Props) {
  const [property, setProperty] = useState<PropertyWithVisits | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const [documentRefresh, setDocumentRefresh] = useState(0);
  const [propertyId, setPropertyId] = useState<number>(0);

  useEffect(() => {
    const initializeData = async () => {
      const { id } = await params;
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        notFound();
        return;
      }
      setPropertyId(numericId);
      fetchProperty(numericId);
    };
    initializeData();
  }, []);

  const fetchProperty = async (id?: number) => {
    const currentId = id || propertyId;
    if (currentId === 0) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${currentId}`);
      if (response.ok) {
        const data = await response.json();
        setProperty(data);
      } else if (response.status === 404) {
        notFound();
      } else {
        console.error('Failed to fetch property:', response.status);
      }
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUploadComplete = () => {
    setPhotoRefresh(prev => prev + 1);
  };

  const handleDocumentUploadComplete = () => {
    setDocumentRefresh(prev => prev + 1);
  };

  const handleArchive = async () => {
    if (!property) return;
    
    try {
      const response = await fetch(`/api/properties/${property.id}/archive`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Redirect back to properties list
        window.location.href = '/properties';
      } else {
        console.error('Failed to archive property');
        alert('Failed to archive property. Please try again.');
      }
    } catch (error) {
      console.error('Error archiving property:', error);
      alert('Failed to archive property. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spyglass-orange mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Property Not Found</h1>
          <p className="text-gray-400 mb-6">The property you're looking for doesn't exist or has been removed.</p>
          <Link href="/properties" className="btn-primary">
            ← Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const formatDateTime = (date: string, time?: string) => {
    try {
      if (time) {
        const dateTime = new Date(`${date}T${time}`);
        return format(dateTime, 'yyyy-MM-dd \'at\' HH:mm');
      }
      return format(new Date(date), 'yyyy-MM-dd');
    } catch {
      return date;
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-gray-500" />
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/properties" className="mr-4 text-gray-400 hover:text-white">
          <ArrowLeftIcon className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{property.address}</h1>
          <p className="text-gray-400">
            <span className="inline-flex items-center">
              📍 {property.city}, {property.state} {property.zip_code}
            </span>
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href={`/properties/${property.id}/edit`} className="btn-primary flex items-center">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Property
          </Link>
          <button
            onClick={handleArchive}
            className="btn-secondary flex items-center text-gray-300 hover:text-white"
          >
            <ArchiveBoxIcon className="h-4 w-4 mr-2" />
            Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property Information */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-6">Property Information</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center">
                {getStatusIcon(property.occupied)}
                <span className={`ml-2 text-sm ${property.occupied ? 'text-white' : 'text-gray-400'}`}>
                  Occupied
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.winterized)}
                <span className={`ml-2 text-sm ${property.winterized ? 'text-white' : 'text-gray-400'}`}>
                  Winterized
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.listed_on_mls)}
                <span className={`ml-2 text-sm ${property.listed_on_mls ? 'text-white' : 'text-gray-400'}`}>
                  Listed on MLS
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.sign_in_yard)}
                <span className={`ml-2 text-sm ${property.sign_in_yard ? 'text-white' : 'text-gray-400'}`}>
                  Sign in Yard
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.supra_box_on_door)}
                <span className={`ml-2 text-sm ${property.supra_box_on_door ? 'text-white' : 'text-gray-400'}`}>
                  Supra Box on Door
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.combo_lock_box)}
                <span className={`ml-2 text-sm ${property.combo_lock_box ? 'text-white' : 'text-gray-400'}`}>
                  Combo Lock Box
                  {property.combo_lock_box && property.combo_lock_box_code && (
                    <span className="ml-2 text-spyglass-orange font-mono text-xs">({property.combo_lock_box_code})</span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center">
                {getStatusIcon(property.professional_photos)}
                <span className={`ml-2 text-sm ${property.professional_photos ? 'text-white' : 'text-gray-400'}`}>
                  Professional Photos
                </span>
              </div>
            </div>
          </div>

          {/* Property Management */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Property Management</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Management Company</p>
                <p className="text-white font-medium">Austin Property Mgmt</p>
                <a href="http://www.austinpm.com" className="text-spyglass-orange hover:text-spyglass-orange-light">
                  www.austinpm.com
                </a>
              </div>
              
              {property.asset_management_platform && (
                <div>
                  <p className="text-gray-400 text-sm">Asset Management Platform</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-900 text-blue-300">
                    {property.asset_management_platform}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Marketing Sites */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Marketing Sites</h3>
            <div className="flex space-x-4">
              <span className="status-badge bg-spyglass-orange text-white">MLS</span>
              <span className="status-badge bg-red-600 text-white">Zillow</span>
              <span className="status-badge bg-blue-600 text-white">HAR.com</span>
            </div>
          </div>

          {/* Notes */}
          {property.notes && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Notes / Outstanding Repairs</h3>
              <p className="text-gray-300">{property.notes}</p>
            </div>
          )}

          {/* Visit History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Visit History
            </h3>
            
            {property.visits.length > 0 ? (
              <div className="space-y-4">
                {property.visits.map((visit) => (
                  <div key={visit.id} className="bg-spyglass-dark rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-white font-semibold">
                          {formatDateTime(visit.visit_date, visit.visit_time)}
                        </h4>
                        <p className="text-gray-400 text-sm">{visit.visit_type}</p>
                      </div>
                      {visit.occupancy_status && (
                        <span className={`status-badge ${
                          visit.occupancy_status.toLowerCase() === 'vacant' ? 'bg-green-900 text-green-300' :
                          visit.occupancy_status.toLowerCase() === 'occupied' ? 'bg-red-900 text-red-300' :
                          'bg-gray-900 text-gray-300'
                        }`}>
                          {visit.occupancy_status}
                        </span>
                      )}
                    </div>
                    
                    {visit.condition_notes && (
                      <div className="mb-3">
                        <span className="text-gray-400 text-sm font-medium">Condition: </span>
                        <span className="text-white text-sm">{visit.condition_notes}</span>
                      </div>
                    )}
                    
                    {visit.issues && (
                      <div className="mb-3">
                        <span className="text-gray-400 text-sm font-medium">Issues: </span>
                        <span className="text-red-300 text-sm">{visit.issues}</span>
                      </div>
                    )}
                    
                    {visit.action_required && (
                      <div className="mb-3">
                        <span className="text-gray-400 text-sm font-medium">Action: </span>
                        <span className="text-spyglass-orange text-sm">{visit.action_required}</span>
                      </div>
                    )}
                    
                    {visit.next_visit_date && (
                      <div>
                        <span className="text-gray-400 text-sm font-medium">Next visit: </span>
                        <span className="text-white text-sm">{formatDateTime(visit.next_visit_date)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CalendarDaysIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No visit history recorded yet.</p>
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <PhotoUpload 
            propertyId={property.id} 
            onUploadComplete={handlePhotoUploadComplete}
          />

          {/* Photo Gallery */}
          <PhotoGallery 
            propertyId={property.id} 
            refreshTrigger={photoRefresh}
          />

          {/* Document Upload */}
          <DocumentUpload 
            propertyId={property.id} 
            onUploadComplete={handleDocumentUploadComplete}
          />

          {/* Document List */}
          <DocumentList 
            propertyId={property.id} 
            refreshTrigger={documentRefresh}
          />
        </div>

        {/* Quick Info Sidebar */}
        <div className="lg:col-span-1">
          <QuickInfoPanel property={property} />
        </div>
      </div>
    </div>
  );
}