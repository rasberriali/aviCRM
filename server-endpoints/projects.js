const fs = require('fs');
const path = require('path');

function setupProjectRoutes(app) {
  // Get all projects
  app.get('/api/projects', (req, res) => {
    try {
      console.log('[PROJECTS] GET /api/projects');
      
      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
        console.log(`[PROJECTS] Loaded ${projects.length} projects`);
      } else {
        console.log('[PROJECTS] No projects file found, returning empty array');
      }
      
      res.json(projects);
    } catch (error) {
      console.error('[PROJECTS] Error loading projects:', error);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // Get project categories
  app.get('/api/project-categories', (req, res) => {
    try {
      console.log('[PROJECTS] GET /api/project-categories');
      
      const categoriesPath = '/mnt/server_data/project-categories.json';
      let categories = [];
      
      if (fs.existsSync(categoriesPath)) {
        const categoriesData = fs.readFileSync(categoriesPath, 'utf8');
        categories = JSON.parse(categoriesData);
        console.log(`[PROJECTS] Loaded ${categories.length} categories`);
      } else {
        // Create default categories if file doesn't exist
        categories = [
          { id: 'residential', name: 'Residential', description: 'Home audio/video installations' },
          { id: 'commercial', name: 'Commercial', description: 'Business and office installations' },
          { id: 'hospitality', name: 'Hospitality', description: 'Hotels and restaurants' },
          { id: 'education', name: 'Education', description: 'Schools and universities' },
          { id: 'healthcare', name: 'Healthcare', description: 'Medical facilities' },
          { id: 'government', name: 'Government', description: 'Government buildings' },
          { id: 'retail', name: 'Retail', description: 'Stores and shopping centers' },
          { id: 'worship', name: 'Worship', description: 'Churches and religious facilities' }
        ];
        
        // Save default categories
        fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
        console.log('[PROJECTS] Created default categories');
      }
      
      res.json(categories);
    } catch (error) {
      console.error('[PROJECTS] Error loading categories:', error);
      res.status(500).json({ error: 'Failed to load project categories' });
    }
  });

  // Helper function to create project folder structure
  function createProjectFolders(projectId) {
    const projectDataPath = `/mnt/server_data/project_data`;
    const projectPath = path.join(projectDataPath, projectId);
    
    // Create main project_data directory if it doesn't exist
    if (!fs.existsSync(projectDataPath)) {
      fs.mkdirSync(projectDataPath, { recursive: true });
      console.log(`[PROJECTS] Created project_data directory`);
    }
    
    // Create project-specific directory
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
      console.log(`[PROJECTS] Created project directory: ${projectPath}`);
    }
    
    // Create subdirectories for organization
    const subdirs = ['tasks', 'notes', 'files', 'documents'];
    subdirs.forEach(subdir => {
      const subdirPath = path.join(projectPath, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
        console.log(`[PROJECTS] Created subdirectory: ${subdirPath}`);
      }
    });
    
    // Create initial project metadata file
    const metadataPath = path.join(projectPath, 'project_metadata.json');
    const metadata = {
      projectId: projectId,
      createdAt: new Date().toISOString(),
      folderStructure: {
        tasks: 'Task-related files and data',
        notes: 'Project notes and documentation',
        files: 'Uploaded project files',
        documents: 'Project documents and reports'
      }
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return projectPath;
  }

  // Create new project
  app.post('/api/projects', (req, res) => {
    try {
      console.log('[PROJECTS] POST /api/projects');
      
      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
      }
      
      const newProject = {
        id: req.body.id || Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create project folder structure (both standard and client-specific)
      try {
        const projectFolderPath = createProjectFolders(newProject.id, newProject.clientName);
        newProject.folderPath = projectFolderPath;
        console.log(`[PROJECTS] Created folder structure for project: ${newProject.id}`);
      } catch (folderError) {
        console.error('[PROJECTS] Error creating project folders:', folderError);
        // Continue with project creation even if folder creation fails
      }
      
      projects.push(newProject);
      fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
      
      console.log(`[PROJECTS] Created project: ${newProject.name} with ID: ${newProject.id}`);
      res.status(201).json(newProject);
    } catch (error) {
      console.error('[PROJECTS] Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Update project
  app.patch('/api/projects/:id', (req, res) => {
    try {
      const projectId = req.params.id;
      console.log(`[PROJECTS] PATCH /api/projects/${projectId}`);
      
      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
      }
      
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
      
      console.log(`[PROJECTS] Updated project: ${projects[projectIndex].name}`);
      res.json(projects[projectIndex]);
    } catch (error) {
      console.error('[PROJECTS] Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', (req, res) => {
    try {
      const projectId = req.params.id;
      console.log(`[PROJECTS] DELETE /api/projects/${projectId}`);
      
      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
      }
      
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const deletedProject = projects.splice(projectIndex, 1)[0];
      fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
      
      console.log(`[PROJECTS] Deleted project: ${deletedProject.name}`);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('[PROJECTS] Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Update project (PUT method for compatibility)
  app.put('/api/projects/:id', (req, res) => {
    try {
      const projectId = req.params.id;
      console.log(`[PROJECTS] PUT /api/projects/${projectId}`);
      
      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
      }
      
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
      
      console.log(`[PROJECTS] Updated project: ${projects[projectIndex].name}`);
      res.json(projects[projectIndex]);
    } catch (error) {
      console.error('[PROJECTS] Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Category deletion endpoint - handles deleting template project and all projects in category
  app.delete('/api/categories/:categoryName', (req, res) => {
    try {
      const categoryName = req.params.categoryName;
      console.log(`[CATEGORY DELETE] Deleting category: ${categoryName}`);

      const projectsPath = '/mnt/server_data/projects.json';
      let projects = [];
      
      if (fs.existsSync(projectsPath)) {
        const projectsData = fs.readFileSync(projectsPath, 'utf8');
        projects = JSON.parse(projectsData);
      }
      
      // Find all projects in this category (including template)
      const projectsToDelete = projects.filter(project => 
        project.category === categoryName
      );

      console.log(`[CATEGORY DELETE] Found ${projectsToDelete.length} projects to delete in category ${categoryName}`);

      // Remove all projects in this category
      const remainingProjects = projects.filter(project => 
        project.category !== categoryName
      );

      fs.writeFileSync(projectsPath, JSON.stringify(remainingProjects, null, 2));

      console.log(`[CATEGORY DELETE] Successfully deleted ${projectsToDelete.length} projects from category ${categoryName}`);

      // Broadcast category deletion notification via WebSocket
      if (global.broadcast) {
        global.broadcast({
          type: 'CATEGORY_DELETED',
          data: {
            categoryName,
            deletedProjects: projectsToDelete.length,
            deletedBy: 'Server User'
          }
        });
      }

      res.json({ 
        success: true, 
        message: `Category "${categoryName}" deleted successfully`,
        deletedProjects: projectsToDelete.length
      });

    } catch (error) {
      console.error('[CATEGORY DELETE] Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // Project invoices endpoint
  app.get('/api/invoices', (req, res) => {
    try {
      const { projectId, clientName } = req.query;
      console.log(`[INVOICES] GET /api/invoices for project: ${projectId}, client: ${clientName}`);
      
      const invoicesPath = '/mnt/server_data/invoices.json';
      let invoices = [];
      
      if (fs.existsSync(invoicesPath)) {
        const invoicesData = fs.readFileSync(invoicesPath, 'utf8');
        invoices = JSON.parse(invoicesData);
        
        // Filter invoices by project and client
        if (projectId) {
          invoices = invoices.filter(invoice => invoice.projectId === projectId);
        }
        if (clientName) {
          invoices = invoices.filter(invoice => invoice.clientName === clientName);
        }
        
        console.log(`[INVOICES] Found ${invoices.length} invoices`);
      } else {
        console.log('[INVOICES] No invoices file found, returning empty array');
      }
      
      res.json(invoices);
    } catch (error) {
      console.error('[INVOICES] Error loading invoices:', error);
      res.status(500).json({ error: 'Failed to load invoices' });
    }
  });

  // Change order request endpoint
  app.post('/api/change-orders', (req, res) => {
    try {
      console.log('[CHANGE ORDERS] POST /api/change-orders');
      
      const changeOrdersPath = '/mnt/server_data/change-orders.json';
      let changeOrders = [];
      
      if (fs.existsSync(changeOrdersPath)) {
        const changeOrdersData = fs.readFileSync(changeOrdersPath, 'utf8');
        changeOrders = JSON.parse(changeOrdersData);
      }
      
      const newChangeOrder = {
        id: `CO_${Date.now()}`,
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      changeOrders.push(newChangeOrder);
      fs.writeFileSync(changeOrdersPath, JSON.stringify(changeOrders, null, 2));
      
      console.log(`[CHANGE ORDERS] Created change order: ${newChangeOrder.id} for project ${newChangeOrder.projectName}`);
      res.json({ success: true, message: 'Change order submitted to accounting' });
    } catch (error) {
      console.error('[CHANGE ORDERS] Error creating change order:', error);
      res.status(500).json({ error: 'Failed to submit change order' });
    }
  });
}

module.exports = setupProjectRoutes;