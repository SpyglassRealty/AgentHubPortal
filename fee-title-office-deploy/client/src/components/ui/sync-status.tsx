import React from 'react';
import { Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow, format } from 'date-fns';

interface SyncStatusProps {
  lastManualSync?: Date | string | null;
  lastAutoSync?: Date | string | null;
  nextAutoSync?: Date | string | null;
  syncInterval?: string;
  compact?: boolean;
}

export function SyncStatus({
  lastManualSync,
  lastAutoSync,
  nextAutoSync,
  syncInterval,
  compact = false
}: SyncStatusProps) {
  const { isDark } = useTheme();

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    return {
      relative: formatDistanceToNow(dateObj, { addSuffix: true }),
      absolute: format(dateObj, 'MMM d, yyyy h:mm a')
    };
  };

  const manual = formatTime(lastManualSync);
  const auto = formatTime(lastAutoSync);
  const next = formatTime(nextAutoSync);

  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const bgSubtle = isDark ? 'bg-[#2a2a2a]/50' : 'bg-gray-50';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  if (compact) {
    return (
      <div className={`flex items-center gap-3 text-xs ${textMuted}`}>
        {manual && (
          <span className="flex items-center gap-1" title={`Manual: ${manual.absolute}`}>
            <RefreshCw className="w-3 h-3" />
            {manual.relative}
          </span>
        )}
        {auto && (
          <span className="flex items-center gap-1" title={`Auto: ${auto.absolute}`}>
            <Clock className="w-3 h-3" />
            {auto.relative}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${borderColor} ${bgSubtle} p-3 text-sm`} data-testid="sync-status">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className={`w-4 h-4 ${isDark ? 'text-green-500' : 'text-green-600'}`} />
        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sync Status
        </span>
      </div>
      
      <div className={`space-y-1 ${textSecondary}`}>
        {manual && (
          <div className="flex justify-between">
            <span>Last Manual Refresh:</span>
            <span title={manual.absolute}>{manual.relative}</span>
          </div>
        )}
        {auto && (
          <div className="flex justify-between">
            <span>Last Auto Sync:</span>
            <span title={auto.absolute}>{auto.relative}</span>
          </div>
        )}
        {next && (
          <div className="flex justify-between">
            <span>Next Auto Sync:</span>
            <span title={next.absolute}>{next.relative}</span>
          </div>
        )}
        {syncInterval && (
          <div className="flex justify-between">
            <span>Sync Interval:</span>
            <span>{syncInterval}</span>
          </div>
        )}
        {!manual && !auto && (
          <p className={textMuted}>No sync data available</p>
        )}
      </div>
    </div>
  );
}
