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
      const employees = await loadEmployees();
      const newEmployee = req.body;
     
      // Generate new ID
      const maxId = employees.length > 0 ? Math.max(...employees.map(e => parseInt(e.id))) : 0;
      newEmployee.id = (maxId + 1).toString();
     
      employees.push(newEmployee);
      const saved = await saveEmployees(employees);
     
      if (saved) {
        res.json({
          success: true,
          employee: newEmployee
        });
      } else {
        throw new Error('Failed to save employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create employee'
      });
    }
  });

  // PUT /api/employees/:id - Update employee
  app.put('/api/employees/:id', async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employees = await loadEmployees();
     
      const employeeIndex = employees.findIndex(e => e.id === employeeId);
      if (employeeIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }
     
      // Update employee data
      employees[employeeIndex] = { ...employees[employeeIndex], ...req.body, id: employeeId };
      const saved = await saveEmployees(employees);
     
      if (saved) {
        res.json({
          success: true,
          employee: employees[employeeIndex]
        });
      } else {
        throw new Error('Failed to save employee');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update employee'
      });
    }
  });

  // DELETE /api/employees/:id - Delete employee
  app.delete('/api/employees/:id', async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employees = await loadEmployees();
     
      const employeeIndex = employees.findIndex(e => e.id === employeeId);
      if (employeeIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        });
      }
     
      // Remove employee from array
      const deletedEmployee = employees.splice(employeeIndex, 1)[0];
      const saved = await saveEmployees(employees);
     
      if (saved) {
        res.json({
          success: true,
          message: 'Employee deleted successfully',
          employee: deletedEmployee
        });
      } else {
        throw new Error('Failed to save employee changes');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete employee'
      });
    }
  });

  console.log('Employee routes setup completed');
}

module.exports = setupEmployeeRoutes;


