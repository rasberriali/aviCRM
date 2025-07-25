// Local-first data store with smart caching for performance
import { queryClient } from './queryClient';

interface LocalData {
  workspaces: any[];
  clients: any[];
  projects: any[];
  tasks: any[];
  employees: any[];
  taskAssignments: any[];
  lastSync: string;
  syncInterval: number; // minutes
}

const DEFAULT_DATA: LocalData = {
  workspaces: [],
  clients: [],
  projects: [],
  tasks: [],
  employees: [],
  taskAssignments: [],
  lastSync: '',
  syncInterval: 5 // sync every 5 minutes
};

class LocalStore {
  private storageKey = 'crm_local_data';
  private data: LocalData;
  private listeners: Array<(data: LocalData) => void> = [];

  constructor() {
    this.data = this.loadFromStorage();
    this.startBackgroundSync();
  }

  private loadFromStorage(): LocalData {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_DATA, ...parsed };
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
    return { ...DEFAULT_DATA };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving local data:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.data));
  }

  // Subscribe to data changes
  subscribe(listener: (data: LocalData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get data with instant local response
  getWorkspaces(): any[] {
    return this.data.workspaces;
  }

  getClients(): any[] {
    return this.data.clients;
  }

  getProjects(): any[] {
    return this.data.projects;
  }

  getTasks(): any[] {
    return this.data.tasks;
  }

  getEmployees(): any[] {
    return this.data.employees;
  }

  getTaskAssignments(): any[] {
    return this.data.taskAssignments;
  }

  // Update local data immediately for UI responsiveness
  updateWorkspaces(workspaces: any[]): void {
    this.data.workspaces = workspaces;
    this.saveToStorage();
    
    // Update React Query cache
    queryClient.setQueryData(['/api/workspaces'], workspaces);
  }

  updateClients(clients: any[]): void {
    this.data.clients = clients;
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/clients'], clients);
  }

  updateProjects(projects: any[]): void {
    this.data.projects = projects;
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/projects'], projects);
  }

  updateTasks(tasks: any[]): void {
    this.data.tasks = tasks;
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/tasks'], tasks);
  }

  updateEmployees(employees: any[]): void {
    this.data.employees = employees;
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/employees'], employees);
  }

  updateTaskAssignments(taskAssignments: any[]): void {
    this.data.taskAssignments = taskAssignments;
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/task_assignments'], taskAssignments);
  }

  // Add/update single items for immediate UI feedback
  addWorkspace(workspace: any): void {
    this.data.workspaces.push(workspace);
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/workspaces'], this.data.workspaces);
  }

  updateWorkspace(id: number, updates: any): void {
    const index = this.data.workspaces.findIndex(w => w.id === id);
    if (index !== -1) {
      this.data.workspaces[index] = { ...this.data.workspaces[index], ...updates };
      this.saveToStorage();
      
      queryClient.setQueryData(['/api/workspaces'], this.data.workspaces);
    }
  }

  deleteWorkspace(id: number): void {
    this.data.workspaces = this.data.workspaces.filter(w => w.id !== id);
    this.saveToStorage();
    
    queryClient.setQueryData(['/api/workspaces'], this.data.workspaces);
  }

  // Background sync with server
  private startBackgroundSync(): void {
    // Initial sync
    this.syncWithServer();
    
    // Periodic sync
    setInterval(() => {
      this.syncWithServer();
    }, this.data.syncInterval * 60 * 1000);
  }

  private async syncWithServer(): Promise<void> {
    try {
      console.log('[LOCAL_STORE] Starting background sync...');
      
      // Sync workspaces
      const workspacesResponse = await fetch('/api/workspaces');
      if (workspacesResponse.ok) {
        const workspaces = await workspacesResponse.json();
        if (JSON.stringify(workspaces) !== JSON.stringify(this.data.workspaces)) {
          this.updateWorkspaces(workspaces);
          console.log('[LOCAL_STORE] Workspaces updated from server');
        }
      }

      // Sync clients
      const clientsResponse = await fetch('/api/clients');
      if (clientsResponse.ok) {
        const clients = await clientsResponse.json();
        if (JSON.stringify(clients) !== JSON.stringify(this.data.clients)) {
          this.updateClients(clients);
          console.log('[LOCAL_STORE] Clients updated from server');
        }
      }

      // Sync employees
      const employeesResponse = await fetch('/api/employees');
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        if (employeesData.success && employeesData.employees) {
          if (JSON.stringify(employeesData.employees) !== JSON.stringify(this.data.employees)) {
            this.updateEmployees(employeesData.employees);
            console.log('[LOCAL_STORE] Employees updated from server');
          }
        }
      }

      this.data.lastSync = new Date().toISOString();
      this.saveToStorage();
      
    } catch (error) {
      console.error('[LOCAL_STORE] Sync error:', error);
    }
  }

  // Force sync now
  async forceSyncNow(): Promise<void> {
    await this.syncWithServer();
  }

  // Get sync status
  getSyncStatus(): { lastSync: string; isStale: boolean } {
    const lastSync = this.data.lastSync;
    const isStale = !lastSync || (Date.now() - new Date(lastSync).getTime()) > (this.data.syncInterval * 60 * 1000);
    
    return { lastSync, isStale };
  }

  // Initialize with fallback data for immediate UI
  initializeWithFallbackData(): void {
    if (this.data.workspaces.length === 0) {
      this.data.workspaces = [
        {
          id: 1,
          name: "Development Team",
          description: "Software development projects and tasks",
          color: "#3B82F6",
          createdBy: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Marketing",
          description: "Marketing campaigns and content management",
          color: "#10B981",
          createdBy: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Client Work",
          description: "Client projects and deliverables",
          color: "#F59E0B",
          createdBy: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }

    if (this.data.clients.length === 0) {
      this.data.clients = [
        {
          id: 1,
          name: "Audio Video Integrations",
          company: "AVI",
          email: "info@avicentral.com",
          phone: "(555) 123-4567",
          address: "123 Main St, City, State 12345",
          status: "active",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Sample Client",
          company: "Sample Corp",
          email: "contact@sample.com",
          phone: "(555) 987-6543",
          address: "456 Oak Ave, City, State 67890",
          status: "active",
          createdAt: new Date().toISOString()
        }
      ];
    }

    this.saveToStorage();
  }
}

export const localStore = new LocalStore();

// Initialize with fallback data
localStore.initializeWithFallbackData();