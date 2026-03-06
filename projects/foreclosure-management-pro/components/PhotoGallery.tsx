'use client';

import React, { useState, useEffect } from 'react';
import { PropertyPhoto } from '@/types';
import { format } from 'date-fns';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PhotoGalleryProps {
  propertyId: number;
  refreshTrigger?: number;
}

interface GroupedPhotos {
  [week: string]: PropertyPhoto[];
}

export default function PhotoGallery({ propertyId, refreshTrigger = 0 }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PropertyPhoto | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [propertyId, refreshTrigger]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${propertyId}/photos`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      } else {
        console.error('Failed to fetch photos');
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupPhotosByWeek = (photos: PropertyPhoto[]): GroupedPhotos => {
    const grouped: GroupedPhotos = {};
    
    photos.forEach(photo => {
      const weekKey = photo.week_of;
      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(photo);
    });

    return grouped;
  };

  const formatWeekLabel = (weekStart: string): string => {
    const date = new Date(weekStart);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    
    return `Week of ${format(date, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  const getPhotoUrl = (photo: PropertyPhoto): string => {
    return `/api/photos/properties/${photo.property_id}/${photo.filename}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spyglass-orange mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">📷 Property Photos</h3>
        <div className="text-center py-8 text-gray-400">
          <p>No photos uploaded yet.</p>
          <p className="text-sm mt-2">Upload photos to track property condition over time.</p>
        </div>
      </div>
    );
  }

  const groupedPhotos = groupPhotosByWeek(photos);
  const weeks = Object.keys(groupedPhotos).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">📷 Property Photos</h3>
          <span className="text-sm text-gray-400">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} • {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-8">
          {weeks.map(week => (
            <div key={week} className="border-b border-gray-700 pb-6 last:border-b-0">
              <h4 className="text-md font-medium text-white mb-4">
                {formatWeekLabel(week)} ({groupedPhotos[week].length} photo{groupedPhotos[week].length !== 1 ? 's' : ''})
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {groupedPhotos[week].map(photo => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-spyglass-orange transition-all"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    
                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-end p-2">
                      <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="font-medium">{photo.original_name}</p>
                        <p>{format(new Date(photo.upload_date), 'MMM d, h:mm a')}</p>
                        <p>{formatFileSize(photo.file_size)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            
            <img
              src={getPhotoUrl(selectedPhoto)}
              alt={selectedPhoto.original_name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
              <h4 className="font-medium">{selectedPhoto.original_name}</h4>
              <p className="text-sm text-gray-300">
                Uploaded {format(new Date(selectedPhoto.upload_date), 'MMMM d, yyyy \'at\' h:mm a')} 
                {selectedPhoto.uploaded_by && ` by ${selectedPhoto.uploaded_by}`}
              </p>
              <p className="text-sm text-gray-300">
                Week of {formatWeekLabel(selectedPhoto.week_of)} • {formatFileSize(selectedPhoto.file_size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}