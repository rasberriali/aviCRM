const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const https = require('https');

function setupInstallerRoutes(app) {
  // Endpoint to receive and install server updates
  app.post('/api/install-endpoints', async (req, res) => {
    try {
      console.log('[INSTALLER] Received endpoint installation request');
      
      const { files, timestamp } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const backupDir = `/mnt/server_data/backups/${timestamp || Date.now()}`;
      const currentDir = process.cwd(); // Use current working directory
      
      // Create backup directory
      await fs.ensureDir(backupDir);
      console.log(`[INSTALLER] Created backup directory: ${backupDir}`);
      
      // Backup existing files
      const filesToBackup = ['server.js', 'files.js', 'projects.js', 'auth.js', 'users.js', 'tasks.js', 'websocket.js', 'employees.js'];
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(currentDir, file);
        const backupPath = path.join(backupDir, file);
        
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, backupPath);
          console.log(`[INSTALLER] Backed up: ${file}`);
        }
      }
      
      // Install new files
      let installedFiles = [];
      
      // Ensure the current directory exists
      await fs.ensureDir(currentDir);
      
      for (const file of files) {
        const { filename, content } = file;
        const targetPath = path.join(currentDir, filename);
        
        // Write new file content
        await fs.writeFile(targetPath, content, 'utf8');
        await fs.chmod(targetPath, 0o644);
        
        installedFiles.push(filename);
        console.log(`[INSTALLER] Installed: ${filename} to ${targetPath}`);
      }
      
      console.log(`[INSTALLER] Installation complete. Installed ${installedFiles.length} files`);
      
      res.json({
        success: true,
        message: 'Endpoints installed successfully',
        installedFiles,
        backupLocation: backupDir,
        timestamp: new Date().toISOString()
      });
      
      // Note: Server restart would need to be handled externally
      console.log('[INSTALLER] Server restart may be required for changes to take effect');
      
    } catch (error) {
      console.error('[INSTALLER] Installation error:', error);
      res.status(500).json({ 
        error: 'Installation failed',
        details: error.message 
      });
    }
  });
  
  // Endpoint to check server status and version
  app.get('/api/server-info', (req, res) => {
    const serverInfo = {
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      directories: {
        serverData: '/mnt/server_data',
        projectData: '/mnt/server_data/project_data',
        currentDir: '/opt/fileserver/node-server'
      }
    };
    
    res.json(serverInfo);
  });
  
  // Endpoint to list available backups
  app.get('/api/backups', async (req, res) => {
    try {
      const backupsDir = '/mnt/server_data/backups';
      
      if (!(await fs.pathExists(backupsDir))) {
        return res.json({ backups: [] });
      }
      
      const backupFolders = await fs.readdir(backupsDir);
      const backups = [];
      
      for (const folder of backupFolders) {
        const folderPath = path.join(backupsDir, folder);
        const stats = await fs.stat(folderPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(folderPath);
          backups.push({
            timestamp: folder,
            created: stats.ctime.toISOString(),
            files: files.length,
            path: folderPath
          });
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      res.json({ backups });
    } catch (error) {
      console.error('[INSTALLER] Error listing backups:', error);
      res.status(500).json({ error: 'Failed to list backups' });
    }
  });
  
  // Endpoint to restore from backup
  app.post('/api/restore-backup', async (req, res) => {
    try {
      const { timestamp } = req.body;
      
      if (!timestamp) {
        return res.status(400).json({ error: 'Backup timestamp required' });
      }
      
      const backupDir = `/mnt/server_data/backups/${timestamp}`;
      const currentDir = '/opt/fileserver/node-server';
      
      if (!(await fs.pathExists(backupDir))) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      
      console.log(`[INSTALLER] Restoring from backup: ${timestamp}`);
      
      const backupFiles = await fs.readdir(backupDir);
      let restoredFiles = [];
      
      for (const file of backupFiles) {
        const sourcePath = path.join(backupDir, file);
        const targetPath = path.join(currentDir, file);
        
        await fs.copy(sourcePath, targetPath);
        await fs.chmod(targetPath, 0o644);
        
        restoredFiles.push(file);
        console.log(`[INSTALLER] Restored: ${file}`);
      }
      
      res.json({
        success: true,
        message: 'Backup restored successfully',
        restoredFiles,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[INSTALLER] Restore error:', error);
      res.status(500).json({ 
        error: 'Restore failed',
        details: error.message 
      });
    }
  });
}

module.exports = setupInstallerRoutes;