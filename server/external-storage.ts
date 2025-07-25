// External server storage - ALL data goes to 165.23.126.88:8888
export class ExternalStorage {
  private readonly SERVER_URL = 'http://165.23.126.88:8888';
  private readonly AUTH = {
    username: 'aviuser',
    password: 'aviserver'
  };

  // All storage operations proxy to external server
  async makeRequest(method: string, path: string, data?: any) {
    const url = `${this.SERVER_URL}${path}`;
    const options: any = {
      method,
      headers: {
        'Authorization': 'Basic ' + Buffer.from('aviuser:aviserver').toString('base64'),
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`External server error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  // User operations - proxy to external server
  async getUser(id: string) {
    return this.makeRequest('GET', `/api/users/${id}`);
  }

  async upsertUser(user: any) {
    return this.makeRequest('POST', '/api/users', user);
  }

  async updateUserPermissions(userId: string, permissions: string[]) {
    return this.makeRequest('PUT', `/api/users/${userId}/permissions`, { permissions });
  }

  // All other operations proxy to external server
  async getProjects(userId: string) {
    return this.makeRequest('GET', `/api/projects?userId=${userId}`);
  }

  async getProject(id: number) {
    return this.makeRequest('GET', `/api/projects/${id}`);
  }

  async createProject(project: any) {
    return this.makeRequest('POST', '/api/projects', project);
  }

  async updateProject(id: number, project: any) {
    return this.makeRequest('PUT', `/api/projects/${id}`, project);
  }

  async deleteProject(id: number, userId: string) {
    return this.makeRequest('DELETE', `/api/projects/${id}?userId=${userId}`);
  }

  // All other methods proxy to external server
  async getClients(userId: string) {
    return this.makeRequest('GET', `/api/clients?userId=${userId}`);
  }

  async getClient(id: number) {
    return this.makeRequest('GET', `/api/clients/${id}`);
  }

  async createClient(client: any) {
    return this.makeRequest('POST', '/api/clients', client);
  }

  async updateClient(id: number, client: any) {
    return this.makeRequest('PUT', `/api/clients/${id}`, client);
  }

  async deleteClient(id: number, userId: string) {
    return this.makeRequest('DELETE', `/api/clients/${id}?userId=${userId}`);
  }

  // Time entries
  async getTimeEntries(userId: string) {
    return this.makeRequest('GET', `/api/time-entries?userId=${userId}`);
  }

  async createTimeEntry(entry: any) {
    return this.makeRequest('POST', '/api/time-entries', entry);
  }

  async updateTimeEntry(id: number, entry: any) {
    return this.makeRequest('PUT', `/api/time-entries/${id}`, entry);
  }

  async deleteTimeEntry(id: number) {
    return this.makeRequest('DELETE', `/api/time-entries/${id}`);
  }

  // Invoices
  async getInvoices(userId: string) {
    return this.makeRequest('GET', `/api/invoices?userId=${userId}`);
  }

  async getInvoice(id: number) {
    return this.makeRequest('GET', `/api/invoices/${id}`);
  }

  async createInvoice(invoice: any) {
    return this.makeRequest('POST', '/api/invoices', invoice);
  }

  async updateInvoice(id: number, invoice: any) {
    return this.makeRequest('PUT', `/api/invoices/${id}`, invoice);
  }

  async deleteInvoice(id: number, userId: string) {
    return this.makeRequest('DELETE', `/api/invoices/${id}?userId=${userId}`);
  }

  // Tasks
  async getTasks(projectId?: number) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.makeRequest('GET', `/api/tasks${query}`);
  }

  async createTask(task: any) {
    return this.makeRequest('POST', '/api/tasks', task);
  }

  async updateTask(id: number, task: any) {
    return this.makeRequest('PUT', `/api/tasks/${id}`, task);
  }

  async deleteTask(id: number) {
    return this.makeRequest('DELETE', `/api/tasks/${id}`);
  }

  // Workspace operations
  async getWorkspaces() {
    return this.makeRequest('GET', '/api/workspaces');
  }

  async createWorkspace(workspace: any) {
    return this.makeRequest('POST', '/api/workspaces', workspace);
  }

  async updateWorkspace(id: number, workspace: any) {
    return this.makeRequest('PUT', `/api/workspaces/${id}`, workspace);
  }

  async deleteWorkspace(id: number) {
    return this.makeRequest('DELETE', `/api/workspaces/${id}`);
  }

  // All other operations - everything goes to external server
  async getWorkspaceCategories(workspaceId: number) {
    return this.makeRequest('GET', `/api/workspaces/${workspaceId}/categories`);
  }

  async createWorkspaceCategory(category: any) {
    return this.makeRequest('POST', '/api/workspace-categories', category);
  }

  async updateWorkspaceCategory(id: number, category: any) {
    return this.makeRequest('PUT', `/api/workspace-categories/${id}`, category);
  }

  async deleteWorkspaceCategory(id: number) {
    return this.makeRequest('DELETE', `/api/workspace-categories/${id}`);
  }

  async getWorkspaceProjects(workspaceId: number) {
    return this.makeRequest('GET', `/api/workspaces/${workspaceId}/projects`);
  }

  async createWorkspaceProject(project: any) {
    return this.makeRequest('POST', '/api/workspace-projects', project);
  }

  async updateWorkspaceProject(id: number, project: any) {
    return this.makeRequest('PUT', `/api/workspace-projects/${id}`, project);
  }

  async deleteWorkspaceProject(id: number) {
    return this.makeRequest('DELETE', `/api/workspace-projects/${id}`);
  }

  async getWorkspaceTasks(workspaceId: number) {
    return this.makeRequest('GET', `/api/workspaces/${workspaceId}/tasks`);
  }

  async createWorkspaceTask(task: any) {
    return this.makeRequest('POST', '/api/workspace-tasks', task);
  }

  async updateWorkspaceTask(id: number, task: any) {
    return this.makeRequest('PUT', `/api/workspace-tasks/${id}`, task);
  }

  async deleteWorkspaceTask(id: number) {
    return this.makeRequest('DELETE', `/api/workspace-tasks/${id}`);
  }
}

export const storage = new ExternalStorage();