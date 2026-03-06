'use client';

import { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PropertyDocument } from '@/types';
import { format } from 'date-fns';

interface DocumentListProps {
  propertyId: number;
  refreshTrigger?: number;
}

export default function DocumentList({ propertyId, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [propertyId, refreshTrigger]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${propertyId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to fetch documents:', response.status);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('text')) return '📃';
    return '📋';
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'contract': 'Contract',
      'inspection': 'Inspection Report',
      'disclosure': 'Disclosure',
      'title': 'Title Document',
      'repair': 'Repair Estimate',
      'insurance': 'Insurance Document',
      'other': 'Other',
    };
    return types[type] || 'Document';
  };

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      // Use the photos API route which handles file serving for both photos and documents
      const response = await fetch(`/api/photos/documents/${doc.filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = doc.original_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (doc: PropertyDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.original_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/properties/${propertyId}/documents?documentId=${doc.id}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        // Remove from local state
        setDocuments(docs => docs.filter(d => d.id !== doc.id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spyglass-orange mx-auto mb-4"></div>
          <p className="text-gray-400">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          Documents ({documents.length})
        </h3>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-4">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between p-4 bg-spyglass-charcoal-light rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center flex-1">
                <div className="text-2xl mr-3">
                  {getDocumentIcon(document.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {document.original_name}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    {document.document_type && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                        {getDocumentTypeLabel(document.document_type)}
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">
                      {formatFileSize(document.file_size)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {formatDate(document.upload_date)}
                    </span>
                    {document.uploaded_by && (
                      <span className="text-gray-400 text-sm">
                        by {document.uploaded_by}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleDownload(document)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                  title="Download document"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(document)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                  title="Delete document"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No documents uploaded yet.</p>
        </div>
      )}
    </div>
  );
}