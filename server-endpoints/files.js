const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

const STORAGE_PATH = '/mnt/server_data';
const PROJECT_DATA_PATH = '/mnt/server_data/project_data';

// Configure multer for directory-aware uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log(`MULTER: Processing ${file.originalname}`);
      let targetDir = STORAGE_PATH;
      
      // Use path from query parameter if provided
      if (req.query.path) {
        targetDir = path.join(STORAGE_PATH, req.query.path);
        console.log(`USING QUERY PATH: ${targetDir}`);
        fs.ensureDirSync(targetDir);
        fs.chmodSync(targetDir, 0o755);
      }
      // Check if this is a zip file - if so, handle it differently
      else if (file.originalname.toLowerCase().endsWith('.zip')) {
        // For zip files, we'll extract and delete the original
        console.log(`ZIP FILE DETECTED: ${file.originalname} - will extract and delete original`);
      }
      // Extract directory path from filename
      else if (file.originalname.includes('/')) {
        const dirPath = path.dirname(file.originalname);
        targetDir = path.join(STORAGE_PATH, dirPath);
        console.log(`CREATING DIRECTORY: ${targetDir}`);
        fs.ensureDirSync(targetDir);
        fs.chmodSync(targetDir, 0o755);
      }
      
      console.log(`DESTINATION: ${targetDir}`);
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const filename = path.basename(file.originalname);
      console.log(`FILENAME: ${filename}`);
      cb(null, filename);
    }
  })
});

// Configure multer for zip uploads (use memory storage for yauzl)
const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

function setupFileRoutes(app, auth) {
  // Project-specific file upload - uploads to client's project folder
  app.post('/api/project-files/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { projectId, clientName } = req.body;
      console.log(`[PROJECT FILE UPLOAD] Uploading ${req.file.originalname} for project: ${projectId}, client: ${clientName}`);
      
      // Find the client's profile folder
      let clientProfilePath = null;
      const customerProfilesPath = '/mnt/server_data/customer_profiles';
      
      // First try to find existing client profile by reading clients_list.json
      try {
        const clientsListPath = path.join(customerProfilesPath, 'clients_list.json');
        if (fs.existsSync(clientsListPath)) {
          const clientsData = JSON.parse(fs.readFileSync(clientsListPath, 'utf8'));
          
          // Find matching client by name
          const matchingClient = clientsData.find(client => {
            const fullName = client.fullName || '';
            const company = client.company || '';
            const searchName = clientName.toLowerCase();
            
            return fullName.toLowerCase().includes(searchName) || 
                   company.toLowerCase().includes(searchName) ||
                   searchName.includes(fullName.toLowerCase()) ||
                   searchName.includes(company.toLowerCase());
          });
          
          if (matchingClient) {
            clientProfilePath = path.join(customerProfilesPath, matchingClient.customerId);
            console.log(`[PROJECT FILE UPLOAD] Found client profile: ${clientProfilePath}`);
          }
        }
      } catch (error) {
        console.log('[PROJECT FILE UPLOAD] Could not read clients list:', error);
      }
      
      // If no client profile found, create one
      if (!clientProfilePath) {
        const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
        const clientId = `CLIENT_${Date.now()}_${sanitizedClientName}`;
        clientProfilePath = path.join(customerProfilesPath, clientId);
        console.log(`[PROJECT FILE UPLOAD] Creating new client profile: ${clientProfilePath}`);
      }
      
      // Create the project files directory structure
      const projectFilesPath = path.join(clientProfilePath, 'projects', projectId, 'files');
      fs.ensureDirSync(projectFilesPath);
      fs.chmodSync(projectFilesPath, 0o755);
      
      // Move the uploaded file to the client's project folder
      const targetFilePath = path.join(projectFilesPath, req.file.filename);
      fs.moveSync(req.file.path, targetFilePath);
      
      console.log(`[PROJECT FILE UPLOAD] File uploaded successfully to: ${targetFilePath}`);
      
      res.json({
        success: true,
        message: 'File uploaded successfully to client project folder',
        filename: req.file.originalname,
        path: targetFilePath.replace('/mnt/server_data/', ''),
        clientProfilePath: clientProfilePath.replace('/mnt/server_data/', ''),
        projectId: projectId
      });
    } catch (error) {
      console.error('[PROJECT FILE UPLOAD] Upload error:', error);
      res.status(500).json({ error: 'Project file upload failed' });
    }
  });

  // List project files for a specific project and client
  app.get('/api/project-files/:projectId', (req, res) => {
    try {
      const { projectId } = req.params;
      const { clientName } = req.query;
      
      console.log(`[PROJECT FILES] Listing files for project: ${projectId}, client: ${clientName}`);
      
      // Find the client's profile folder
      let clientProfilePath = null;
      const customerProfilesPath = '/mnt/server_data/customer_profiles';
      
      try {
        const clientsListPath = path.join(customerProfilesPath, 'clients_list.json');
        if (fs.existsSync(clientsListPath)) {
          const clientsData = JSON.parse(fs.readFileSync(clientsListPath, 'utf8'));
          
          const matchingClient = clientsData.find(client => {
            const fullName = client.fullName || '';
            const company = client.company || '';
            const searchName = clientName.toLowerCase();
            
            return fullName.toLowerCase().includes(searchName) || 
                   company.toLowerCase().includes(searchName) ||
                   searchName.includes(fullName.toLowerCase()) ||
                   searchName.includes(company.toLowerCase());
          });
          
          if (matchingClient) {
            clientProfilePath = path.join(customerProfilesPath, matchingClient.customerId, 'projects', projectId, 'files');
          }
        }
      } catch (error) {
        console.log('[PROJECT FILES] Could not find client profile:', error);
      }
      
      // If no client profile found, return empty
      if (!clientProfilePath || !fs.existsSync(clientProfilePath)) {
        console.log('[PROJECT FILES] No files found for this project/client combination');
        return res.json([]);
      }
      
      const items = fs.readdirSync(clientProfilePath).map(item => {
        const itemPath = path.join(clientProfilePath, item);
        const stats = fs.statSync(itemPath);
        return {
          name: item,
          path: path.join('customer_profiles', path.relative('/mnt/server_data/customer_profiles', itemPath)),
          isDirectory: stats.isDirectory(),
          size: stats.isDirectory() ? 0 : stats.size,
          modified: stats.mtime
        };
      });
      
      console.log(`[PROJECT FILES] Found ${items.length} files for project ${projectId}`);
      res.json(items);
    } catch (error) {
      console.error('[PROJECT FILES] List error:', error);
      res.status(500).json({ error: 'Failed to list project files' });
    }
  });

  // Regular file upload
  app.post('/api/files/upload', auth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      
      console.log(`FILE UPLOADED: ${req.file.originalname} to ${req.file.path}`);
      
      // Set proper permissions
      await fs.chmod(req.file.path, 0o644);
      
      // Check if this is a zip file - if so, extract it and delete the original
      if (req.file.originalname.toLowerCase().endsWith('.zip')) {
        console.log(`AUTO-EXTRACTING ZIP: ${req.file.originalname}`);
        
        try {
          const yauzl = require('yauzl');
          const zipBuffer = await fs.readFile(req.file.path);
          const extractDir = path.join(path.dirname(req.file.path), path.basename(req.file.originalname, '.zip'));
          
          // Ensure extract directory exists
          await fs.ensureDir(extractDir);
          
          yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, async (err, zipfile) => {
            if (err) {
              console.error('Auto-extract error:', err);
              // Return success for file upload even if extraction fails
              return res.json({
                success: true,
                filename: req.file.originalname,
                path: req.file.path,
                extracted: false,
                error: 'Extraction failed'
              });
            }
            
            let extractedFiles = [];
            let extractionComplete = false;
            
            zipfile.readEntry();
            zipfile.on('entry', async (entry) => {
              const entryPath = path.join(extractDir, entry.fileName);
              
              if (/\/$/.test(entry.fileName)) {
                // Directory entry
                await fs.ensureDir(entryPath);
                await fs.chmod(entryPath, 0o755);
                zipfile.readEntry();
              } else {
                // File entry
                await fs.ensureDir(path.dirname(entryPath));
                
                zipfile.openReadStream(entry, (err, readStream) => {
                  if (err) {
                    console.error('Error reading zip entry:', err);
                    zipfile.readEntry();
                    return;
                  }
                  
                  const writeStream = fs.createWriteStream(entryPath);
                  readStream.pipe(writeStream);
                  
                  writeStream.on('close', async () => {
                    await fs.chmod(entryPath, 0o644);
                    extractedFiles.push(entry.fileName);
                    zipfile.readEntry();
                  });
                });
              }
            });
            
            zipfile.on('end', async () => {
              if (!extractionComplete) {
                extractionComplete = true;
                console.log(`AUTO-EXTRACTED: ${extractedFiles.length} files to ${extractDir}`);
                
                // Delete the original zip file
                try {
                  await fs.unlink(req.file.path);
                  console.log(`DELETED ORIGINAL ZIP: ${req.file.path}`);
                } catch (deleteError) {
                  console.error('Error deleting original zip:', deleteError);
                }
              }
            });
          });
          
          // Send immediate response for zip files
          res.json({
            success: true,
            filename: req.file.originalname,
            path: req.file.path,
            extracted: true,
            extracting: true,
            message: 'Zip file uploaded and extraction started'
          });
          
        } catch (extractError) {
          console.error('Zip extraction setup error:', extractError);
          res.json({
            success: true,
            filename: req.file.originalname,
            path: req.file.path,
            extracted: false,
            error: 'Failed to setup extraction'
          });
        }
      } else {
        // Regular file upload response
        res.json({
          success: true,
          filename: req.file.originalname,
          path: req.file.path
        });
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Zip folder upload with extraction
  app.post('/api/files/upload-zip', auth, zipUpload.single('zipfile'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No zip file provided' });
      
      const extractPath = req.body.extractPath || '';
      const targetDir = path.join(STORAGE_PATH, extractPath);
      
      console.log(`ZIP UPLOAD: ${req.file.originalname} (${req.file.size} bytes) -> extracting to ${targetDir}`);
      
      // Ensure target directory exists
      await fs.ensureDir(targetDir);
      
      // Extract zip file using yauzl
      const yauzl = require('yauzl');
      
      yauzl.fromBuffer(req.file.buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('Zip extraction error:', err);
          return res.status(500).json({ error: 'Failed to read zip file' });
        }
        
        let extractedFiles = [];
        
        zipfile.readEntry();
        zipfile.on('entry', async (entry) => {
          const entryPath = path.join(targetDir, entry.fileName);
          
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            await fs.ensureDir(entryPath);
            await fs.chmod(entryPath, 0o755);
            zipfile.readEntry();
          } else {
            // File entry
            await fs.ensureDir(path.dirname(entryPath));
            
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                console.error('Error reading zip entry:', err);
                zipfile.readEntry();
                return;
              }
              
              const writeStream = fs.createWriteStream(entryPath);
              readStream.pipe(writeStream);
              
              writeStream.on('close', async () => {
                await fs.chmod(entryPath, 0o644);
                extractedFiles.push(entry.fileName);
                zipfile.readEntry();
              });
            });
          }
        });
        
        zipfile.on('end', async () => {
          console.log(`ZIP EXTRACTED: ${extractedFiles.length} files to ${targetDir}`);
          
          res.json({ 
            success: true, 
            extractedFiles: extractedFiles.length,
            extractPath: extractPath,
            files: extractedFiles,
            originalZipDeleted: true
          });
        });
      });
      
    } catch (error) {
      console.error('Zip upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // File listing (both GET and POST for compatibility)
  app.get('/api/files/list', async (req, res) => {
    try {
      const { path: requestedPath = '' } = req.query;
      const fullPath = path.join(STORAGE_PATH, requestedPath);
      
      console.log(`LIST REQUEST (GET): ${fullPath}`);
      
      // Security check - ensure we're within STORAGE_PATH
      if (!fullPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if directory exists
      if (!(await fs.pathExists(fullPath))) {
        return res.json([]);
      }
      
      const items = await fs.readdir(fullPath);
      const files = [];
      
      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stats = await fs.stat(itemPath);
        
        files.push({
          name: item,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          path: itemPath
        });
      }
      
      res.json(files);
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/files/list', async (req, res) => {
    try {
      const { path: requestedPath = '' } = req.body;
      const fullPath = path.join(STORAGE_PATH, requestedPath);
      
      console.log(`LIST REQUEST (POST): ${fullPath}`);
      
      // Security check - ensure we're within STORAGE_PATH
      if (!fullPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if directory exists
      if (!(await fs.pathExists(fullPath))) {
        return res.json({ files: [], directories: [] });
      }
      
      const items = await fs.readdir(fullPath);
      const files = [];
      const directories = [];
      
      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stats = await fs.stat(itemPath);
        const relativePath = path.relative(STORAGE_PATH, itemPath);
        
        if (stats.isDirectory()) {
          directories.push({
            name: item,
            type: 'directory',
            path: relativePath,
            size: 0,
            modified: stats.mtime.toISOString()
          });
        } else {
          files.push({
            name: item,
            type: 'file',
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
      
      res.json({ files, directories });
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // File download
  app.get('/api/files/download', auth, async (req, res) => {
    try {
      const { path: requestedPath } = req.query;
      if (!requestedPath) return res.status(400).json({ error: 'Path required' });
      
      const fullPath = path.join(STORAGE_PATH, requestedPath);
      
      // Security check
      if (!fullPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!(await fs.pathExists(fullPath))) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        return res.status(400).json({ error: 'Cannot download directory' });
      }
      
      res.download(fullPath);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // File deletion
  app.post('/api/files/delete', auth, async (req, res) => {
    try {
      const { path: requestedPath } = req.body;
      if (!requestedPath) return res.status(400).json({ error: 'Path required' });
      
      const fullPath = path.join(STORAGE_PATH, requestedPath);
      
      // Security check
      if (!fullPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!(await fs.pathExists(fullPath))) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      await fs.remove(fullPath);
      console.log(`DELETED: ${fullPath}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // File rename
  app.post('/api/files/rename', auth, async (req, res) => {
    try {
      const { oldPath, newName } = req.body;
      if (!oldPath || !newName) {
        return res.status(400).json({ error: 'Old path and new name required' });
      }
      
      const fullOldPath = path.join(STORAGE_PATH, oldPath);
      const fullNewPath = path.join(path.dirname(fullOldPath), newName);
      
      // Security checks
      if (!fullOldPath.startsWith(STORAGE_PATH) || !fullNewPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!(await fs.pathExists(fullOldPath))) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (await fs.pathExists(fullNewPath)) {
        return res.status(409).json({ error: 'File with new name already exists' });
      }
      
      await fs.move(fullOldPath, fullNewPath);
      console.log(`RENAMED: ${fullOldPath} -> ${fullNewPath}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Rename error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create folder
  app.post('/api/files/create-folder', auth, async (req, res) => {
    try {
      const { path: requestedPath, name } = req.body;
      if (!name) return res.status(400).json({ error: 'Folder name required' });
      
      const basePath = requestedPath ? path.join(STORAGE_PATH, requestedPath) : STORAGE_PATH;
      const fullPath = path.join(basePath, name);
      
      // Security check
      if (!fullPath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (await fs.pathExists(fullPath)) {
        return res.status(409).json({ error: 'Folder already exists' });
      }
      
      await fs.ensureDir(fullPath);
      await fs.chmod(fullPath, 0o755);
      console.log(`FOLDER CREATED: ${fullPath}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Project-specific file endpoints
  // Get project files
  app.get('/api/project-files/:projectId/:clientName', async (req, res) => {
    try {
      const { projectId, clientName } = req.params;
      console.log(`[PROJECT FILES] GET files for project ${projectId}, client ${clientName}`);
      
      const projectPath = path.join(STORAGE_PATH, clientName, projectId);
      
      // Ensure the project directory exists
      await fs.ensureDir(projectPath);
      
      if (!(await fs.pathExists(projectPath))) {
        return res.json({ files: [], directories: [] });
      }
      
      const items = await fs.readdir(projectPath);
      const files = [];
      const directories = [];
      
      for (const item of items) {
        const itemPath = path.join(projectPath, item);
        const stats = await fs.stat(itemPath);
        const relativePath = path.relative(STORAGE_PATH, itemPath);
        
        if (stats.isDirectory()) {
          directories.push({
            name: item,
            type: 'directory',
            path: relativePath,
            size: 0,
            modified: stats.mtime.toISOString()
          });
        } else {
          files.push({
            name: item,
            type: 'file',
            path: relativePath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
      
      console.log(`[PROJECT FILES] Found ${files.length} files, ${directories.length} directories for project ${projectId}`);
      res.json({ files, directories });
    } catch (error) {
      console.error('[PROJECT FILES] Error loading project files:', error);
      res.status(500).json({ error: 'Failed to load project files' });
    }
  });

  // Upload file to specific project
  app.post('/api/project-files/:projectId/:clientName/upload', upload.single('file'), async (req, res) => {
    try {
      const { projectId, clientName } = req.params;
      
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      
      console.log(`[PROJECT UPLOAD] Uploading ${req.file.originalname} to project ${projectId}, client ${clientName}`);
      
      const projectPath = path.join(STORAGE_PATH, clientName, projectId);
      await fs.ensureDir(projectPath);
      
      const targetPath = path.join(projectPath, req.file.originalname);
      
      // Move the uploaded file to the project directory
      await fs.move(req.file.path, targetPath);
      await fs.chmod(targetPath, 0o644);
      
      console.log(`[PROJECT UPLOAD] File uploaded: ${targetPath}`);
      
      res.json({
        success: true,
        filename: req.file.originalname,
        path: path.relative(STORAGE_PATH, targetPath)
      });
      
    } catch (error) {
      console.error('[PROJECT UPLOAD] Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete project file
  app.delete('/api/project-files/:projectId/:clientName/:filename', async (req, res) => {
    try {
      const { projectId, clientName, filename } = req.params;
      console.log(`[PROJECT DELETE] Deleting ${filename} from project ${projectId}, client ${clientName}`);
      
      const filePath = path.join(STORAGE_PATH, clientName, projectId, filename);
      
      // Security check
      if (!filePath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!(await fs.pathExists(filePath))) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      await fs.remove(filePath);
      console.log(`[PROJECT DELETE] Deleted: ${filePath}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[PROJECT DELETE] Delete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Download project file
  app.get('/api/project-files/:projectId/:clientName/:filename/download', async (req, res) => {
    try {
      const { projectId, clientName, filename } = req.params;
      console.log(`[PROJECT DOWNLOAD] Downloading ${filename} from project ${projectId}, client ${clientName}`);
      
      const filePath = path.join(STORAGE_PATH, clientName, projectId, filename);
      
      // Security check
      if (!filePath.startsWith(STORAGE_PATH)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!(await fs.pathExists(filePath))) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        return res.status(400).json({ error: 'Cannot download directory' });
      }
      
      res.download(filePath);
    } catch (error) {
      console.error('[PROJECT DOWNLOAD] Download error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = setupFileRoutes;