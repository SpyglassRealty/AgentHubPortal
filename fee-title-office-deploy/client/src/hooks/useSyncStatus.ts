import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  lastManualRefresh: string | null;
  lastAutoRefresh: string | null;
  isLoading: boolean;
}

type SyncSection = 'leads' | 'reports' | 'calendar' | 'training' | 'market-pulse' | 'performance';

export function useSyncStatus(section: SyncSection) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastManualRefresh: null,
    lastAutoRefresh: null,
    isLoading: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSyncStatus();
  }, [section]);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`/api/sync/status/${section}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(prev => ({
          ...prev,
          lastManualRefresh: data.lastManualRefresh,
          lastAutoRefresh: data.lastAutoRefresh
        }));
      }
    } catch (error) {
      console.error(`[useSyncStatus] Error fetching ${section} status:`, error);
    }
  };

  const refresh = useCallback(async (onSuccess?: () => Promise<void>) => {
    setSyncStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch(`/api/sync/refresh/${section}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(prev => ({
          ...prev,
          lastManualRefresh: data.syncedAt,
          isLoading: false
        }));
        
        if (onSuccess) {
          await onSuccess();
        }
        
        const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
        toast({
          title: 'Refreshed',
          description: `${sectionLabel} data updated successfully`,
        });
        
        return true;
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      console.error(`[useSyncStatus] Error refreshing ${section}:`, error);
      toast({
        title: 'Error',
        description: `Failed to refresh ${section} data`,
        variant: 'destructive'
      });
      setSyncStatus(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [section, toast]);

  const setManualRefresh = useCallback((date: Date | string) => {
    setSyncStatus(prev => ({
      ...prev,
      lastManualRefresh: typeof date === 'string' ? date : date.toISOString()
    }));
  }, []);

  return {
    ...syncStatus,
    refresh,
    setManualRefresh,
    refetchStatus: fetchSyncStatus
  };
}
