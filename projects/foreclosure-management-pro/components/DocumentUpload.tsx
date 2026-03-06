'use client';

import { useState } from 'react';
import { DocumentTextIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface DocumentUploadProps {
  propertyId: number;
  onUploadComplete?: () => void;
}

export default function DocumentUpload({ propertyId, onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [documentType, setDocumentType] = useState('');

  const documentTypes = [
    { value: '', label: 'Select document type...' },
    { value: 'contract', label: 'Contract' },
    { value: 'inspection', label: 'Inspection Report' },
    { value: 'disclosure', label: 'Disclosure' },
    { value: 'title', label: 'Title Document' },
    { value: 'repair', label: 'Repair Estimate' },
    { value: 'insurance', label: 'Insurance Document' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      const response = await fetch(`/api/properties/${propertyId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newDocument = await response.json();
        console.log('Document uploaded:', newDocument);
        onUploadComplete?.();
        setDocumentType(''); // Reset document type
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Upload Document
        </h3>
      </div>

      {/* Document Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Document Type
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="form-select w-full"
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-spyglass-orange bg-spyglass-orange/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {uploading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spyglass-orange mx-auto mb-4"></div>
            <p className="text-gray-400">Uploading document...</p>
          </div>
        ) : (
          <div className="text-center">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">
              Drop a document here, or{' '}
              <label className="text-spyglass-orange hover:text-spyglass-orange-light cursor-pointer">
                click to browse
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  onChange={handleFileInput}
                />
              </label>
            </p>
            <p className="text-gray-400 text-sm">
              Supports: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV (max 10MB)
            </p>
          </div>
        )}
      </div>

      <p className="text-gray-400 text-xs mt-2">
        Documents are stored securely and can be downloaded or removed at any time.
      </p>
    </div>
  );
}