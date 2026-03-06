'use client';

import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PhotoUploadProps {
  propertyId: number;
  onUploadComplete?: () => void;
}

export default function PhotoUpload({ propertyId, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    // Filter for image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select only image files.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('photos', file);
      });
      formData.append('uploadedBy', 'Current User'); // Replace with actual user info

      const response = await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully uploaded ${result.photos.length} photos`);
        onUploadComplete?.();
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">📷 Upload Photos</h3>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-spyglass-orange bg-spyglass-orange bg-opacity-10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        <p className="text-gray-300 mb-2">
          {dragActive
            ? 'Drop photos here...'
            : 'Drag and drop photos here, or click to select files'
          }
        </p>
        
        <p className="text-sm text-gray-500 mb-4">
          Supports JPEG, PNG, GIF, WebP formats
        </p>

        <button
          type="button"
          onClick={openFileDialog}
          disabled={uploading}
          className="btn-secondary inline-flex items-center"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="h-5 w-5 mr-2" />
              Select Photos
            </>
          )}
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>• Photos are organized by upload week for easy tracking</p>
        <p>• Multiple formats supported (JPEG, PNG, GIF, WebP)</p>
        <p>• Weekly photo updates help track property condition over time</p>
      </div>
    </div>
  );
}