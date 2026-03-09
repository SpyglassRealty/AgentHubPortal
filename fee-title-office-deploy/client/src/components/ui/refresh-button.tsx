import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow, format } from 'date-fns';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  lastManualRefresh?: Date | string | null;
  lastAutoRefresh?: Date | string | null;
  isLoading?: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function RefreshButton({
  onRefresh,
  lastManualRefresh,
  lastAutoRefresh,
  isLoading = false,
  size = 'sm',
  showLabel = true,
  label = 'Refresh',
  className = ''
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  const formatTime = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    return format(dateObj, 'MMM d, yyyy h:mm a');
  };

  const formatRelativeTime = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const manualTime = formatTime(lastManualRefresh);
  const autoTime = formatTime(lastAutoRefresh);
  const lastSyncRelative = formatRelativeTime(lastManualRefresh || lastAutoRefresh);

  const sizeClasses = {
    sm: showLabel ? 'px-3 py-2' : 'p-2',
    md: showLabel ? 'px-4 py-2.5' : 'p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <div className={`relative inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        onClick={handleRefresh}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        disabled={loading}
        className={`
          ${sizeClasses[size]}
          flex items-center gap-2 rounded-lg font-medium text-sm
          transition-all duration-200 ease-in-out
          min-h-[44px] min-w-[44px]
          active:scale-95
          ${isDark 
            ? 'bg-[#2a2a2a] hover:bg-[#333333] text-white border border-[#333333]' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
          }
          ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Refresh data"
        data-testid="button-refresh"
      >
        <RefreshCw 
          className={`${iconSizes[size]} transition-transform ${loading ? 'animate-spin' : ''}`} 
        />
        {showLabel && (
          <span className="hidden sm:inline">
            {loading ? 'Refreshing...' : label}
          </span>
        )}
      </button>

      {showTooltip && (
        <div 
          className={`
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2 rounded-lg shadow-lg
            text-xs whitespace-nowrap
            ${isDark ? 'bg-[#2a2a2a] text-white border border-[#333333]' : 'bg-white text-gray-900 border border-gray-200 shadow-md'}
          `}
          role="tooltip"
        >
          <div 
            className={`
              absolute top-full left-1/2 -translate-x-1/2 -mt-px
              border-4 border-transparent
              ${isDark ? 'border-t-gray-700' : 'border-t-gray-200'}
            `}
          />
          
          <div className="space-y-1">
            {manualTime && (
              <div className="flex items-center gap-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Manual:</span>
                <span className="font-medium">{manualTime}</span>
              </div>
            )}
            {autoTime && (
              <div className="flex items-center gap-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Auto:</span>
                <span className="font-medium">{autoTime}</span>
              </div>
            )}
            {!manualTime && !autoTime && (
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Never synced</span>
            )}
          </div>
        </div>
      )}

      {lastSyncRelative && (
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {lastSyncRelative}
        </p>
      )}
    </div>
  );
}
