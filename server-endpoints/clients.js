const fs = require('fs').promises;
const path = require('path');

// Employee management endpoints module
function setupEmployeeRoutes(app) {
  const dataDir = '/mnt/server_data/employee_data';
  const employeesFile = path.join(dataDir, 'employees.json');

  // Ensure data directory exists
  async function ensureDataDirectory() {
    try {
      await fs.mkdir(dataDir, { recursive: true });
     
      // Initialize employees file if it doesn't exist
      try {
        await fs.access(employeesFile);
      } catch {
        await fs.writeFile(employeesFile, JSON.stringify([], null, 2));
        console.log('Created employees.json file');
      }
    } catch (error) {
      console.error('Error ensuring employee data directory:', error);
    }
  }

  // Helper functions
  async function loadEmployees() {
    try {
      const data = await fs.readFile(employeesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }

  async function saveEmployees(employees) {
    try {
      await fs.writeFile(employeesFile, JSON.stringify(employees, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving employees:', error);
      return false;
    }
  }

  // Initialize data directory
  ensureDataDirectory();

  // GET /api/employees - Get all employees
  app.get('/api/employees', async (req, res) => {
    try {
      const employees = await loadEmployees();
      res.json({
        success: true,
        employees,
        total: employees.length
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employees'
      });
    }
  });

  // GET /api/employees/:id - Get specific employee
  app.get('/api/employees/:id', async (req, res) => {
    try {
      const employees = await loadEmployees();
      const employee = employees.find(emp => emp.id === parseInt(req.params.id));
     
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }
     
      res.json({
        success: true,
        employee
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch employee'
      });
    }
  });

  // POST /api/employees - Create new employee
  app.post('/api/employees', async (req, res) => {
    try {
      res.status(403).json({
        success: false,
        error: 'Employee creation not supported',
        message: 'Employee records are managed through the authentication system and cannot be created through this interface. Contact system administrator for user management.'
      });
    } catch (error) {
      console.error('Error processing employee creation request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process employee creation request'
      });
    }
  });

  // PUT /api/employees/:id - Update employee
  app.put('/api/employees/:id', async (req, res) => {
    try {
      res.status(403).json({
        success: false,
        error: 'Employee editing not supported',
        message: 'Employee records are managed through the authentication system and cannot be edited through this interface. Contact system administrator for user management.'
      });
    } catch (error) {
      console.error('Error processing employee update request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process employee update request'
      });
    }
  });

  // DELETE /api/employees/:id - Delete employee
  app.delete('/api/employees/:id', async (req, res) => {
    try {
      res.status(403).json({
        success: false,
        error: 'Employee deletion not supported',
        message: 'Employee records are managed through the authentication system and cannot be deleted through this interface. Contact system administrator for user management.'
      });
    } catch (error) {
      console.error('Error processing employee deletion request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process employee deletion request'
      });
    }
  });

  console.log('Employee routes setup completed');
}

module.exports = setupEmployeeRoutes;


