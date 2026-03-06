'use client';

import { PropertyWithVisits } from '@/types';
import { CalendarDaysIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface QuickInfoPanelProps {
  property: PropertyWithVisits;
}

export default function QuickInfoPanel({ property }: QuickInfoPanelProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
      return dateString;
    }
  };

  const getVisitStatusColor = () => {
    if (!property.days_until_visit) return 'text-gray-400';
    if (property.days_until_visit <= 0) return 'text-red-400';
    if (property.days_until_visit <= 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getVisitStatusText = () => {
    if (!property.next_visit_due) return 'Not scheduled';
    if (!property.days_until_visit) return 'Not calculated';
    if (property.days_until_visit <= 0) return 'Overdue';
    if (property.days_until_visit === 1) return 'Due tomorrow';
    return `Due in ${property.days_until_visit} days`;
  };

  return (
    <div className="quick-info-panel">
      <h3 className="text-lg font-semibold text-white mb-6">Quick Info</h3>
      
      <div className="space-y-4">
        {/* Status */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Status</span>
          <span className={`status-badge ${
            property.status === 'active' ? 'status-active' :
            property.status === 'pending' ? 'status-pending' :
            property.status === 'pre-marketing' ? 'bg-yellow-900 text-yellow-300' :
            property.status === 'sold' ? 'bg-green-900 text-green-300' :
            property.status === 'removed' ? 'bg-red-900 text-red-300' :
            'status-active'
          }`}>
            {property.status === 'pre-marketing' ? 'Pre-Marketing' : property.status}
          </span>
        </div>

        {/* Client */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Client</span>
          <span className="text-white text-sm font-medium">{property.client_name}</span>
        </div>

        {/* MLS # */}
        {property.mls_number && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">MLS #</span>
            <span className="text-white text-sm font-medium">{property.mls_number}</span>
          </div>
        )}

        {/* VA Financing */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">VA Financing</span>
          <span className={`status-badge ${
            property.qualify_va_financing ? 'bg-green-900 text-green-300' : 'bg-gray-900 text-gray-400'
          }`}>
            {property.qualify_va_financing ? '✅ Qualifies' : '❌ Does not qualify'}
          </span>
        </div>

        {/* NEW: Last Property Visit */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-sm flex items-center">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              Last Property Visit
            </span>
            <div className="text-right">
              <div className="text-white text-sm font-medium">
                {formatDate(property.last_visit_date)}
              </div>
              {property.last_visit_date && (
                <div className={`text-xs ${getVisitStatusColor()}`}>
                  {getVisitStatusText()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NEW: Visit Schedule */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            Visit Schedule
          </span>
          <span className={`status-badge ${
            property.visit_schedule === 'weekly' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
          }`}>
            {property.visit_schedule}
          </span>
        </div>

        {/* Next Visit Due (calculated field) */}
        {property.next_visit_due && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Next Visit Due</span>
            <span className={`text-sm font-medium ${getVisitStatusColor()}`}>
              {formatDate(property.next_visit_due)}
            </span>
          </div>
        )}

        <div className="border-t border-gray-700 pt-4 space-y-4">
          {/* Last Open House */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Last Open House</span>
            <span className="text-white text-sm">{formatDate(property.last_open_house)}</span>
          </div>

          {/* Last Broker Caravan */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Last Broker Caravan</span>
            <span className="text-white text-sm">{formatDate(property.last_broker_caravan)}</span>
          </div>

          {/* Added */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Added</span>
            <span className="text-white text-sm">{formatDate(property.date_added)}</span>
          </div>
        </div>

        {/* Documents */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center mb-2">
            <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span className="text-gray-400 text-sm">Documents</span>
          </div>
          <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
        </div>
      </div>
    </div>
  );
}