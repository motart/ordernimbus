import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ColumnDefinition } from '../components/ColumnSelector';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedFetch } from '../utils/authenticatedFetch';
import { getApiUrl } from '../config/environment';
import toast from 'react-hot-toast';

interface UseColumnVisibilityOptions {
  columns: ColumnDefinition[];
  storageKey: string;
  defaultVisible?: string[];
}

interface PreferencesResponse {
  preferences: {
    columnVisibility?: Record<string, string[]>;
    displaySettings?: Record<string, any>;
    notifications?: Record<string, any>;
    theme?: string;
  };
}

export const useColumnVisibility = ({
  columns,
  storageKey,
  defaultVisible
}: UseColumnVisibilityOptions) => {
  const { getAccessToken } = useAuth();
  // Memoize the authenticatedFetch function to prevent unnecessary re-renders
  const authenticatedFetch = useMemo(() => 
    createAuthenticatedFetch({ getAccessToken }), 
    [getAccessToken]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasInitialized = useRef(false);

  // Initialize visible columns from backend or defaults
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    // Start with defaults while we fetch from backend
    if (defaultVisible) {
      return defaultVisible;
    }
    return columns
      .filter(col => col.defaultVisible !== false || col.required)
      .map(col => col.key);
  });

  // Fetch preferences from backend on mount (only once)
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const fetchPreferences = async () => {
      try {
        const response = await authenticatedFetch('/api/preferences');
        
        if (response.ok) {
          const data: PreferencesResponse = await response.json();
          const savedColumns = data.preferences?.columnVisibility?.[storageKey];
          
          if (savedColumns && Array.isArray(savedColumns)) {
            // Validate that saved columns still exist in current column definitions
            const validColumns = savedColumns.filter(colKey => 
              columns.some(col => col.key === colKey)
            );
            
            // Add any new required columns that might have been added
            const requiredColumns = columns
              .filter(col => col.required)
              .map(col => col.key);
            
            const mergedColumns = Array.from(new Set([...validColumns, ...requiredColumns]));
            setVisibleColumns(mergedColumns);
          }
        }
      } catch (error) {
        console.error('Failed to fetch column preferences:', error);
        // Fall back to localStorage if available
        const stored = localStorage.getItem(`columns-${storageKey}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setVisibleColumns(parsed);
            }
          } catch {
            // Invalid stored data, keep defaults
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
    // Remove authenticatedFetch from dependencies to prevent re-fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save preferences to backend with debouncing
  const savePreferences = useCallback(async (newColumns: string[]) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Also save to localStorage immediately as a fallback
    localStorage.setItem(`columns-${storageKey}`, JSON.stringify(newColumns));

    // Debounce backend save to avoid too many API calls
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const response = await authenticatedFetch('/api/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            columnVisibility: {
              [storageKey]: newColumns
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save preferences');
        }
      } catch (error) {
        console.error('Failed to save column preferences:', error);
        toast.error('Failed to save column preferences', {
          duration: 3000,
          position: 'bottom-right'
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Wait 1 second before saving to backend
  }, [storageKey, authenticatedFetch]);

  // Update visible columns and save
  useEffect(() => {
    if (!isLoading) {
      savePreferences(visibleColumns);
    }
  }, [visibleColumns, isLoading, savePreferences]);

  // Toggle a single column
  const toggleColumn = useCallback((columnKey: string) => {
    const column = columns.find(c => c.key === columnKey);
    if (column?.required) {
      return; // Can't toggle required columns
    }

    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  }, [columns]);

  // Reset to default columns
  const resetColumns = useCallback(() => {
    const defaults = columns
      .filter(col => col.defaultVisible !== false || col.required)
      .map(col => col.key);
    setVisibleColumns(defaults);
  }, [columns]);

  // Filter data to only include visible columns
  const filterVisibleData = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    return data.map(item => {
      const filtered: any = {};
      visibleColumns.forEach(key => {
        if (key in item) {
          filtered[key] = item[key];
        }
      });
      return filtered;
    });
  }, [visibleColumns]);

  // Get visible column definitions
  const getVisibleColumnDefinitions = useCallback((): ColumnDefinition[] => {
    return columns.filter(col => visibleColumns.includes(col.key));
  }, [columns, visibleColumns]);

  return {
    visibleColumns,
    setVisibleColumns,
    toggleColumn,
    resetColumns,
    filterVisibleData,
    getVisibleColumnDefinitions,
    isLoading,
    isSaving
  };
};