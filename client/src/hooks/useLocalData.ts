// Custom hook for local-first data with React Query integration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localStore } from '../lib/localStore';
import { useState, useEffect } from 'react';

// Hook for workspaces with instant local response
export function useWorkspaces() {
  const queryClient = useQueryClient();
  
  // Always return local data immediately
  const { data: workspaces = [], isLoading = false, error } = useQuery({
    queryKey: ['/api/workspaces'],
    queryFn: async () => {
      // Return local data immediately
      const localData = localStore.getWorkspaces() || [];
      
      // Background sync without blocking UI
      fetch('/api/workspaces')
        .then(res => res.json())
        .then(serverData => {
          if (JSON.stringify(serverData) !== JSON.stringify(localData)) {
            localStore.updateWorkspaces(serverData || []);
            queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
          }
        })
        .catch(err => console.log('Background sync failed:', err));
      
      return localData;
    },
    staleTime: 0, // Always considered fresh since we handle sync manually
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });

  const createWorkspace = useMutation({
    mutationFn: async (workspace: any) => {
      // Optimistically update local data
      const newWorkspace = { ...workspace, id: Date.now() };
      localStore.addWorkspace(newWorkspace);
      
      // Sync to server in background
      try {
        const response = await fetch('/api/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workspace)
        });
        
        if (response.ok) {
          const serverWorkspace = await response.json();
          localStore.updateWorkspace(newWorkspace.id, serverWorkspace);
        }
      } catch (error) {
        console.error('Server sync failed:', error);
      }
      
      return newWorkspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  const updateWorkspace = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      // Optimistically update local data
      localStore.updateWorkspace(id, updates);
      
      // Sync to server in background
      try {
        await fetch(`/api/workspaces/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (error) {
        console.error('Server sync failed:', error);
      }
      
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  const deleteWorkspace = useMutation({
    mutationFn: async (id: number) => {
      // Optimistically update local data
      localStore.deleteWorkspace(id);
      
      // Sync to server in background
      try {
        await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Server sync failed:', error);
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  return { workspaces: workspaces || [], isLoading, createWorkspace, updateWorkspace, deleteWorkspace };
}

// Hook for clients with instant local response
export function useClients() {
  const queryClient = useQueryClient();
  
  const { data: clients = localStore.getClients(), isLoading, error } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const localData = localStore.getClients();
      
      // Background sync
      fetch('/api/clients')
        .then(res => res.json())
        .then(serverData => {
          if (JSON.stringify(serverData) !== JSON.stringify(localData)) {
            localStore.updateClients(serverData);
          }
        })
        .catch(err => console.log('Background sync failed:', err));
      
      return localData;
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
  });

  return {
    clients,
    isLoading: false,
    error
  };
}

// Hook for employees with instant local response
export function useEmployees() {
  const queryClient = useQueryClient();
  
  const { data: employees = localStore.getEmployees(), isLoading, error } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const localData = localStore.getEmployees();
      
      // Background sync
      fetch('/api/employees')
        .then(res => res.json())
        .then(serverData => {
          if (serverData.success && serverData.employees) {
            if (JSON.stringify(serverData.employees) !== JSON.stringify(localData)) {
              localStore.updateEmployees(serverData.employees);
            }
          }
        })
        .catch(err => console.log('Background sync failed:', err));
      
      return localData;
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
  });

  return {
    employees,
    isLoading: false,
    error
  };
}

// Hook for task assignments with instant local response
export function useTaskAssignments(userId?: string) {
  const queryClient = useQueryClient();
  
  const { data: taskAssignments = localStore.getTaskAssignments(), isLoading, error } = useQuery({
    queryKey: ['/api/task_assignments', userId],
    queryFn: async () => {
      const localData = localStore.getTaskAssignments();
      
      // Background sync
      const url = userId ? `/api/task_assignments?userId=${userId}` : '/api/task_assignments';
      fetch(url)
        .then(res => res.json())
        .then(serverData => {
          if (JSON.stringify(serverData) !== JSON.stringify(localData)) {
            localStore.updateTaskAssignments(serverData);
          }
        })
        .catch(err => console.log('Background sync failed:', err));
      
      return userId ? localData.filter(t => t.userId === userId) : localData;
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
  });

  return {
    taskAssignments,
    isLoading: false,
    error
  };
}

// Hook for sync status
export function useSyncStatus() {
  const [lastSync, setLastSync] = useState(localStorage.getItem('lastSync') || '');
  const [isStale, setIsStale] = useState(false);
  
  useEffect(() => {
    const checkStaleness = () => {
      const lastSyncTime = localStorage.getItem('lastSync');
      if (!lastSyncTime) {
        setIsStale(true);
        return;
      }
      
      const now = new Date();
      const syncTime = new Date(lastSyncTime);
      const diffMinutes = (now.getTime() - syncTime.getTime()) / (1000 * 60);
      setIsStale(diffMinutes > 5); // Consider stale after 5 minutes
    };
    
    checkStaleness();
    const interval = setInterval(checkStaleness, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastSync]);
  
  const forceSyncNow = async () => {
    try {
      // Force refresh all data
      await Promise.all([
        fetch('/api/workspaces').then(res => res.json()).then(data => localStore.updateWorkspaces(data)),
        fetch('/api/clients').then(res => res.json()).then(data => localStore.updateClients(data)),
        fetch('/api/employees').then(res => res.json()).then(data => localStore.updateEmployees(data.employees))
      ]);
      
      const now = new Date().toISOString();
      localStorage.setItem('lastSync', now);
      setLastSync(now);
      setIsStale(false);
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };
  
  return { lastSync, isStale, forceSyncNow };
}

