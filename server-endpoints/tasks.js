const fs = require('fs');

function setupTaskRoutes(app) {
  // Tasks endpoints (for project task management)
  app.get('/api/tasks/:projectId', (req, res) => {
    try {
      const projectId = req.params.projectId;
      console.log(`[TASKS] GET /api/tasks/${projectId}`);
      
      const tasksPath = '/mnt/server_data/tasks.json';
      let tasks = [];
      
      if (fs.existsSync(tasksPath)) {
        const tasksData = fs.readFileSync(tasksPath, 'utf8');
        const allTasks = JSON.parse(tasksData);
        tasks = allTasks.filter(task => task.projectId === projectId);
        console.log(`[TASKS] Found ${tasks.length} tasks for project ${projectId}`);
      } else {
        console.log('[TASKS] No tasks file found');
      }
      
      res.json(tasks);
    } catch (error) {
      console.error('[TASKS] Error loading tasks:', error);
      res.status(500).json({ error: 'Failed to load tasks' });
    }
  });

  // Create new task
  app.post('/api/tasks', (req, res) => {
    try {
      console.log('[TASKS] POST /api/tasks');
      
      const tasksPath = '/mnt/server_data/tasks.json';
      let tasks = [];
      
      if (fs.existsSync(tasksPath)) {
        const tasksData = fs.readFileSync(tasksPath, 'utf8');
        tasks = JSON.parse(tasksData);
      }
      
      const newTask = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      tasks.push(newTask);
      fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
      
      console.log(`[TASKS] Created task: ${newTask.title}`);
      res.status(201).json(newTask);
    } catch (error) {
      console.error('[TASKS] Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update task
  app.patch('/api/tasks/:id', (req, res) => {
    try {
      const taskId = req.params.id;
      console.log(`[TASKS] PATCH /api/tasks/${taskId}`);
      
      const tasksPath = '/mnt/server_data/tasks.json';
      let tasks = [];
      
      if (fs.existsSync(tasksPath)) {
        const tasksData = fs.readFileSync(tasksPath, 'utf8');
        tasks = JSON.parse(tasksData);
      }
      
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
      
      console.log(`[TASKS] Updated task: ${tasks[taskIndex].title}`);
      res.json(tasks[taskIndex]);
    } catch (error) {
      console.error('[TASKS] Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete task
  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const taskId = req.params.id;
      console.log(`[TASKS] DELETE /api/tasks/${taskId}`);
      
      const tasksPath = '/mnt/server_data/tasks.json';
      let tasks = [];
      
      if (fs.existsSync(tasksPath)) {
        const tasksData = fs.readFileSync(tasksPath, 'utf8');
        tasks = JSON.parse(tasksData);
      }
      
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const deletedTask = tasks.splice(taskIndex, 1)[0];
      fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
      
      console.log(`[TASKS] Deleted task: ${deletedTask.title}`);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('[TASKS] Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });
}

module.exports = setupTaskRoutes;