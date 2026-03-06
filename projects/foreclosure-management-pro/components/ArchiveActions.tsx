'use client';

import React, { useState } from 'react';
import { ArchiveBoxIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ArchiveActionsProps {
  propertyId: number;
  propertyAddress: string;
  isArchived: boolean;
  onArchiveSuccess?: () => void;
  onRestoreSuccess?: () => void;
}

export default function ArchiveActions({ 
  propertyId, 
  propertyAddress, 
  isArchived, 
  onArchiveSuccess, 
  onRestoreSuccess 
}: ArchiveActionsProps) {
  const [processing, setProcessing] = useState(false);

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${propertyAddress}"? This will move it to the archive and remove it from active property listings.`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedBy: 'Current User' }) // Replace with actual user
      });

      if (response.ok) {
        onArchiveSuccess?.();
      } else {
        const error = await response.json();
        alert(`Failed to archive property: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error archiving property:', error);
      alert('Failed to archive property. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm(`Are you sure you want to restore "${propertyAddress}"? This will move it back to active property listings.`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        onRestoreSuccess?.();
      } else {
        const error = await response.json();
        alert(`Failed to restore property: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error restoring property:', error);
      alert('Failed to restore property. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (isArchived) {
    return (
      <button
        onClick={handleRestore}
        disabled={processing}
        className="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
            Restoring...
          </>
        ) : (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Restore
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleArchive}
      disabled={processing}
      className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      {processing ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
          Archiving...
        </>
      ) : (
        <>
          <ArchiveBoxIcon className="h-4 w-4 mr-1" />
          Archive
        </>
      )}
    </button>
  );
}