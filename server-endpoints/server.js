const express = require('express');
const basicAuth = require('basic-auth');
const fs = require('fs');
const http = require('http');

// Import all endpoint modules
const setupAuthRoutes = require('./auth.js');
const setupFileRoutes = require('./files.js');
const setupProjectRoutes = require('./projects.js');
const setupUserRoutes = require('./users.js');
const setupTaskRoutes = require('./tasks.js');
const setupWebSocket = require('./websocket.js');
const setupInstallerRoutes = require('./installer.js');
const setupClientRoutes = require('./clients.js');
const setupEmployeeRoutes = require('./employees-module.js');
const setupSalesRoutes = require('./sales.js');
const setupWorkspaceRoutes = require('./workspaces-module.js');

const app = express();
const PORT = 8888;

console.log('=== MODULAR HTTP SERVER STARTING ===');

// Authentication middleware
const auth = (req, res, next) => {
  const credentials = basicAuth(req);
  if (!credentials || credentials.name !== 'aviuser' || credentials.pass !== 'aviserver') {
    res.set('WWW-Authenticate', 'Basic realm="File Server"');
    return res.status(401).send('Authentication required');
  }
  next();
};

app.use(express.json());

// Initialize server data directories
const serverDataPath = '/mnt/server_data';
const projectDataPath = '/mnt/server_data/project_data';

if (!fs.existsSync(serverDataPath)) {
  fs.mkdirSync(serverDataPath, { recursive: true });
  console.log('Created /mnt/server_data directory');
}

if (!fs.existsSync(projectDataPath)) {
  fs.mkdirSync(projectDataPath, { recursive: true });
  console.log('Created /mnt/server_data/project_data directory');
}

// Initialize data files if they don't exist
const initializeDataFiles = () => {
  const files = [
    { path: '/mnt/server_data/projects.json', content: [] },
    { path: '/mnt/server_data/tasks.json', content: [] },
    { path: '/mnt/server_data/project-categories.json', content: [
      { id: 'residential', name: 'Residential', description: 'Home audio/video installations' },
      { id: 'commercial', name: 'Commercial', description: 'Business and office installations' },
      { id: 'hospitality', name: 'Hospitality', description: 'Hotels and restaurants' },
      { id: 'education', name: 'Education', description: 'Schools and universities' },
      { id: 'healthcare', name: 'Healthcare', description: 'Medical facilities' },
      { id: 'government', name: 'Government', description: 'Government buildings' },
      { id: 'retail', name: 'Retail', description: 'Stores and shopping centers' },
      { id: 'worship', name: 'Worship', description: 'Churches and religious facilities' }
    ]}
  ];

  files.forEach(({ path, content }) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify(content, null, 2));
      console.log(`Created ${path}`);
    }
  });
};

initializeDataFiles();

// Create HTTP server first
const server = http.createServer(app);

// Setup WebSocket and get broadcast function
const { wss, broadcast } = setupWebSocket(server);

// Make broadcast function available globally for route modules
global.broadcast = broadcast;

// Setup all route modules (after broadcast is available)
setupAuthRoutes(app);
setupFileRoutes(app, auth);
setupProjectRoutes(app);
setupUserRoutes(app);
setupTaskRoutes(app);
setupInstallerRoutes(app);
setupClientRoutes(app);
setupEmployeeRoutes(app);
setupSalesRoutes(app);
setupWorkspaceRoutes(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'modular-http-server' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Modular HTTP server running on port ${PORT}`);
  console.log(`Storage path: /mnt/storage`);
  console.log(`Data path: /mnt/server_data`);
  console.log('WebSocket server enabled on /ws');
  console.log('Available endpoints:');
  console.log('  Authentication:');
  console.log('    - POST /api/auth/login');
  console.log('  Projects:');
  console.log('    - GET /api/projects');
  console.log('    - GET /api/project-categories');
  console.log('  Users & Employees:');
  console.log('    - GET /api/users');
  console.log('    - GET /api/employees');
  console.log('  Tasks:');
  console.log('    - GET /api/tasks/:projectId');
  console.log('  Workspaces:');
  console.log('    - GET /api/workspaces');
  console.log('    - POST /api/workspaces');
  console.log('  Files:');
  console.log('    - POST /api/files/upload');
  console.log('    - POST /api/files/list');
  console.log('  Clients:');
  console.log('    - GET /api/http-clients');
  console.log('    - POST /api/http-clients');
  console.log('    - PUT /api/http-clients/:customerId');
  console.log('    - DELETE /api/http-clients/:customerId');
  console.log('  Sales Management:');
  console.log('    - GET /api/sales/dashboard');
  console.log('    - GET /api/sales/invoices');
  console.log('    - POST /api/sales/invoices');
  console.log('    - PUT /api/sales/invoices/:id');
  console.log('    - DELETE /api/sales/invoices/:id');
  console.log('    - GET /api/sales/quotes');
  console.log('    - POST /api/sales/quotes');
  console.log('    - PUT /api/sales/quotes/:id');
  console.log('    - DELETE /api/sales/quotes/:id');
  console.log('    - GET /api/sales/orders');
  console.log('    - POST /api/sales/orders');
  console.log('    - PUT /api/sales/orders/:id');
  console.log('    - DELETE /api/sales/orders/:id');
  console.log('    - GET /api/sales/leads');
  console.log('    - POST /api/sales/leads');
  console.log('    - PUT /api/sales/leads/:id');
  console.log('    - DELETE /api/sales/leads/:id');
  console.log('    - GET /api/sales/customers');
  console.log('    - POST /api/sales/customers');
  console.log('    - PUT /api/sales/customers/:id');
  console.log('    - DELETE /api/sales/customers/:id');
  console.log('    - GET /api/sales/config');
  console.log('    - PUT /api/sales/config');
  console.log('    - POST /api/sales/metrics/update');
  console.log('    - POST /api/sales/quickbooks/connect');
  console.log('    - GET /api/sales/quickbooks/status');
  console.log('    - POST /api/sales/quickbooks/sync');
  console.log('  And all other file management endpoints...');
});

// Export broadcast function for other modules to use
global.broadcast = broadcast;
