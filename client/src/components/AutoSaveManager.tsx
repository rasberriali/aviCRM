import React, { useState, useEffect, useCallback } from 'react';
import { Save, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  error?: string;
}

interface AutoSaveManagerProps {
  data: any;
  endpoint: string;
  method?: 'POST' | 'PUT';
  autoSaveInterval?: number; // in milliseconds
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: any) => void;
  enabled?: boolean;
}

export function AutoSaveManager({
  data,
  endpoint,
  method = 'PUT',
  autoSaveInterval = 30000, // 30 seconds
  onSaveSuccess,
  onSaveError,
  enabled = true
}: AutoSaveManagerProps) {
  const [saveState, setSaveState] = useState<AutoSaveState>({ status: 'idle' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastDataSnapshot, setLastDataSnapshot] = useState<string>('');
  const { toast } = useToast();

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (saveData: any) => {
      return apiRequest(method, endpoint, saveData);
    },
    onMutate: () => {
      setSaveState({ status: 'saving' });
    },
    onSuccess: (result) => {
      setSaveState({ 
        status: 'saved', 
        lastSaved: new Date() 
      });
      setHasUnsavedChanges(false);
      onSaveSuccess?.(result);
    },
    onError: (error: any) => {
      setSaveState({ 
        status: 'error', 
        error: error.message 
      });
      onSaveError?.(error);
      toast({
        title: "Auto-save failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Check for data changes
  useEffect(() => {
    const currentDataSnapshot = JSON.stringify(data);
    
    if (lastDataSnapshot && currentDataSnapshot !== lastDataSnapshot) {
      setHasUnsavedChanges(true);
      setSaveState(prev => ({ ...prev, status: 'idle' }));
    }
    
    setLastDataSnapshot(currentDataSnapshot);
  }, [data, lastDataSnapshot]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || autoSaveMutation.isPending) {
      return;
    }

    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(data);
    }, autoSaveInterval);

    return () => clearTimeout(timeoutId);
  }, [data, hasUnsavedChanges, autoSaveInterval, enabled, autoSaveMutation]);

  // Manual save function
  const manualSave = useCallback(() => {
    if (!autoSaveMutation.isPending) {
      autoSaveMutation.mutate(data);
    }
  }, [data, autoSaveMutation]);

  // Save on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcut for manual save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        manualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [manualSave]);

  const getStatusIcon = () => {
    switch (saveState.status) {
      case 'saving':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Save className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (saveState.status) {
      case 'saving':
        return 'bg-blue-100 text-blue-800';
      case 'saved':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return hasUnsavedChanges 
          ? 'bg-yellow-100 text-yellow-800' 
          : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (saveState.status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return saveState.lastSaved 
          ? `Saved ${formatRelativeTime(saveState.lastSaved)}`
          : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-xs ${getStatusColor()}`}>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {getStatusText()}
        </div>
      </Badge>
      
      {hasUnsavedChanges && (
        <Button
          variant="outline"
          size="sm"
          onClick={manualSave}
          disabled={autoSaveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-1" />
          Save Now
        </Button>
      )}
    </div>
  );
}

// Hook for using auto-save in components
export function useAutoSave({
  data,
  endpoint,
  method = 'PUT',
  autoSaveInterval = 30000,
  enabled = true
}: Omit<AutoSaveManagerProps, 'onSaveSuccess' | 'onSaveError'>) {
  const [saveState, setSaveState] = useState<AutoSaveState>({ status: 'idle' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastDataSnapshot, setLastDataSnapshot] = useState<string>('');

  const autoSaveMutation = useMutation({
    mutationFn: async (saveData: any) => {
      return apiRequest(method, endpoint, saveData);
    },
    onMutate: () => {
      setSaveState({ status: 'saving' });
    },
    onSuccess: () => {
      setSaveState({ 
        status: 'saved', 
        lastSaved: new Date() 
      });
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      setSaveState({ 
        status: 'error', 
        error: error.message 
      });
    }
  });

  useEffect(() => {
    const currentDataSnapshot = JSON.stringify(data);
    
    if (lastDataSnapshot && currentDataSnapshot !== lastDataSnapshot) {
      setHasUnsavedChanges(true);
      setSaveState(prev => ({ ...prev, status: 'idle' }));
    }
    
    setLastDataSnapshot(currentDataSnapshot);
  }, [data, lastDataSnapshot]);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || autoSaveMutation.isPending) {
      return;
    }

    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(data);
    }, autoSaveInterval);

    return () => clearTimeout(timeoutId);
  }, [data, hasUnsavedChanges, autoSaveInterval, enabled, autoSaveMutation]);

  const manualSave = useCallback(() => {
    if (!autoSaveMutation.isPending) {
      autoSaveMutation.mutate(data);
    }
  }, [data, autoSaveMutation]);

  return {
    saveState,
    hasUnsavedChanges,
    manualSave,
    isSaving: autoSaveMutation.isPending
  };
}