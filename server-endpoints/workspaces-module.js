const fs = require('fs').promises;
const path = require('path');

function setupWorkspaceRoutes(app) {
  const dataDir = '/mnt/server_data';
 
  // Ensure data directory exists
  async function ensureDataDirectory() {
    try {
      await fs.access(dataDir);
    } catch (error) {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  // Helper functions for data persistence
  async function loadWorkspaces() {
    try {
      const data = await fs.readFile(path.join(dataDir, 'workspaces.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function saveWorkspaces(workspaces) {
    await ensureDataDirectory();
    await fs.writeFile(path.join(dataDir, 'workspaces.json'), JSON.stringify(workspaces, null, 2));
  }

  async function loadWorkspaceCategories() {
    try {
      const data = await fs.readFile(path.join(dataDir, 'workspace-categories.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function saveWorkspaceCategories(categories) {
    await ensureDataDirectory();
    await fs.writeFile(path.join(dataDir, 'workspace-categories.json'), JSON.stringify(categories, null, 2));
  }

  async function loadWorkspaceProjects() {
    try {
      const data = await fs.readFile(path.join(dataDir, 'workspace-projects.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function saveWorkspaceProjects(projects) {
    await ensureDataDirectory();
    await fs.writeFile(path.join(dataDir, 'workspace-projects.json'), JSON.stringify(projects, null, 2));
  }

  async function loadWorkspaceTasks() {
    try {
      const data = await fs.readFile(path.join(dataDir, 'workspace-tasks.json'), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async function saveWorkspaceTasks(tasks) {
    await ensureDataDirectory();
    await fs.writeFile(path.join(dataDir, 'workspace-tasks.json'), JSON.stringify(tasks, null, 2));
  }

  // Workspace CRUD operations
  app.get('/api/workspaces', async (req, res) => {
    try {
      const workspaces = await loadWorkspaces();
      res.json(workspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  app.get('/api/workspaces/:id', async (req, res) => {
    try {
      const workspaces = await loadWorkspaces();
      const workspace = workspaces.find(w => w.id == req.params.id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      res.json(workspace);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });

  app.post('/api/workspaces', async (req, res) => {
    try {
      const workspaces = await loadWorkspaces();
      const newWorkspace = {
        id: Date.now(),
        name: req.body.name,
        description: req.body.description || '',
        color: req.body.color || '#3b82f6',
        createdBy: req.body.createdBy || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
     
      workspaces.push(newWorkspace);
      await saveWorkspaces(workspaces);
      res.status(201).json(newWorkspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  app.put('/api/workspaces/:id', async (req, res) => {
    try {
      const workspaces = await loadWorkspaces();
      const index = workspaces.findIndex(w => w.id == req.params.id);
     
      if (index === -1) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
     
      workspaces[index] = {
        ...workspaces[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
     
      await saveWorkspaces(workspaces);
      res.json(workspaces[index]);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  });

  app.delete('/api/workspaces/:id', async (req, res) => {
    try {
      const workspaces = await loadWorkspaces();
      const filteredWorkspaces = workspaces.filter(w => w.id != req.params.id);
     
      if (filteredWorkspaces.length === workspaces.length) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
     
      await saveWorkspaces(filteredWorkspaces);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });

  // Workspace Categories CRUD operations
  app.get('/api/workspaces/:workspaceId/categories', async (req, res) => {
    try {
      const categories = await loadWorkspaceCategories();
      const workspaceCategories = categories.filter(c => c.workspaceId == req.params.workspaceId);
      res.json(workspaceCategories);
    } catch (error) {
      console.error('Error fetching workspace categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/workspaces/:workspaceId/categories', async (req, res) => {
    try {
      const categories = await loadWorkspaceCategories();
      const newCategory = {
        id: Date.now(),
        workspaceId: parseInt(req.params.workspaceId),
        name: req.body.name,
        description: req.body.description || '',
        color: req.body.color || '#6b7280',
        position: req.body.position || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
     
      categories.push(newCategory);
      await saveWorkspaceCategories(categories);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating workspace category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // Workspace Projects CRUD operations
  app.get('/api/workspaces/:workspaceId/projects', async (req, res) => {
    try {
      const projects = await loadWorkspaceProjects();
      const workspaceProjects = projects.filter(p => p.workspaceId == req.params.workspaceId);
      res.json(workspaceProjects);
    } catch (error) {
      console.error('Error fetching workspace projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/workspaces/:workspaceId/projects', async (req, res) => {
    try {
      const projects = await loadWorkspaceProjects();
      const projectId = Date.now();
      const newProject = {
        id: projectId,
        workspaceId: parseInt(req.params.workspaceId),
        categoryId: req.body.categoryId || null,
        name: req.body.name,
        description: req.body.description || '',
        status: req.body.status || 'active',
        priority: req.body.priority || 'medium',
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        estimatedHours: req.body.estimatedHours || 0,
        actualHours: req.body.actualHours || 0,
        budget: req.body.budget || 0,
        spent: req.body.spent || 0,
        assignedUsers: req.body.assignedUsers || [],
        tags: req.body.tags || [],
        color: req.body.color || '#6b7280',
        position: req.body.position || 0,
        createdBy: req.body.createdBy || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
     
      // Create unique project directory for file uploads
      const projectDir = path.join(__dirname, '..', 'project-files', `project-${projectId}`);
      await fs.mkdir(projectDir, { recursive: true });
     
      // Create project info file
      const projectInfoContent = `# Project: ${newProject.name}\n\nProject ID: ${projectId}\nWorkspace ID: ${req.params.workspaceId}\nCreated: ${newProject.createdAt}\n\nDescription: ${newProject.description}\n\nThis directory contains all files uploaded for this project.`;
      await fs.writeFile(path.join(projectDir, 'project-info.md'), projectInfoContent);
     
      projects.push(newProject);
      await saveWorkspaceProjects(projects);
      res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating workspace project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Workspace Tasks CRUD operations
  app.get('/api/workspaces/:workspaceId/tasks', async (req, res) => {
    try {
      const tasks = await loadWorkspaceTasks();
      const workspaceTasks = tasks.filter(t => t.workspaceId == req.params.workspaceId);
      res.json(workspaceTasks);
    } catch (error) {
      console.error('Error fetching workspace tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/workspaces/:workspaceId/tasks', async (req, res) => {
    try {
      const tasks = await loadWorkspaceTasks();
      const newTask = {
        id: Date.now(),
        workspaceId: parseInt(req.params.workspaceId),
        categoryId: req.body.categoryId || null,
        projectId: req.body.projectId || null,
        title: req.body.title,
        description: req.body.description || '',
        status: req.body.status || 'pending',
        priority: req.body.priority || 'medium',
        assignedTo: req.body.assignedTo || null,
        estimatedHours: req.body.estimatedHours || 0,
        actualHours: req.body.actualHours || 0,
        dueDate: req.body.dueDate || null,
        completedAt: req.body.completedAt || null,
        archived: req.body.archived || false,
        position: req.body.position || 0,
        createdBy: req.body.createdBy || 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
     
      tasks.push(newTask);
      await saveWorkspaceTasks(tasks);
      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating workspace task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  console.log('Workspace routes initialized');
}

module.exports = setupWorkspaceRoutes;
