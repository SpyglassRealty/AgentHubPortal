import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow, format } from 'date-fns';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  lastManualSync?: Date | string | null;
  lastAutoSync?: Date | string | null;
  isLoading?: boolean;
  label?: string;
  showTimestamps?: boolean;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  lastManualSync,
  lastAutoSync,
  isLoading = false,
  label = 'Refresh',
  showTimestamps = true,
  className = ''
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isDark } = useTheme();

  const handleRefresh = async () => {
    if (isRefreshing || isLoading) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const loading = isRefreshing || isLoading;

  const formatSyncTime = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    return {
      relative: formatDistanceToNow(dateObj, { addSuffix: true }),
      absolute: format(dateObj, 'MMM d, yyyy h:mm a')
    };
  };

  const manualSyncFormatted = formatSyncTime(lastManualSync);
  const autoSyncFormatted = formatSyncTime(lastAutoSync);

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm
          transition-all duration-200 ease-in-out
          min-h-[44px] min-w-[44px]
          active:scale-95
          ${isDark 
            ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
          }
          ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={`${label} - Click to fetch latest data`}
        data-testid="button-refresh"
      >
        <RefreshCw 
          className={`w-4 h-4 transition-transform ${loading ? 'animate-spin' : ''}`} 
        />
        <span className="hidden sm:inline">
          {loading ? 'Refreshing...' : label}
        </span>
      </button>

      {showTimestamps && (
        <div className={`text-xs space-y-0.5 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {manualSyncFormatted && (
            <p title={manualSyncFormatted.absolute}>
              Last sync: {manualSyncFormatted.relative}
            </p>
          )}
          {autoSyncFormatted && !manualSyncFormatted && (
            <p title={autoSyncFormatted.absolute}>
              Auto: {autoSyncFormatted.relative}
            </p>
          )}
          {!manualSyncFormatted && !autoSyncFormatted && (
            <p>Never synced</p>
          )}
        </div>
      )}
    </div>
  );
}
