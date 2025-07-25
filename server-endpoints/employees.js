const fs = require('fs').promises;
const path = require('path');

// Employee management endpoints module
function setupEmployeeRoutes(app) {

// Data storage paths
const dataDir = '/mnt/server_data/crm_data';
const employeesFile = path.join(dataDir, 'employees.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
   
    // Initialize employees file if it doesn't exist
    try {
      await fs.access(employeesFile);
    } catch {
      await fs.writeFile(employeesFile, JSON.stringify({ employees: [] }, null, 2));
    }
   
    // Initialize users file if it doesn't exist
    try {
      await fs.access(usersFile);
    } catch {
      await fs.writeFile(usersFile, JSON.stringify({ users: [] }, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring data directory:', error);
  }
}

// Helper functions
async function loadEmployees() {
  try {
    const data = await fs.readFile(employeesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading employees:', error);
    return { employees: [] };
  }
}

async function saveEmployees(data) {
  try {
    await fs.writeFile(employeesFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving employees:', error);
    throw error;
  }
}

async function loadUsers() {
  try {
    const data = await fs.readFile(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error);
    return { users: [] };
  }
}

async function saveUsers(data) {
  try {
    await fs.writeFile(usersFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

function generateEmployeeId(employees) {
  const prefix = 'EMP';
  const nextNumber = employees.length + 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

function getDepartmentPermissions(department, title) {
  const basePermissions = {
    accounting: false,
    projects: false,
    timeTracking: false,
    reports: false,
    admin: false,
    fileManagement: false,
  };

  switch (department.toLowerCase()) {
    case 'accounting':
      return { ...basePermissions, accounting: true, timeTracking: true, reports: true };
    case 'sales':
      return { ...basePermissions, projects: true, reports: true, fileManagement: true };
    case 'programming':
      return { ...basePermissions, projects: true, timeTracking: true, fileManagement: true };
    case 'technicians':
      return { ...basePermissions, projects: true, timeTracking: true, fileManagement: true };
    case 'upper management':
    case 'administration':
      return {
        ...basePermissions,
        accounting: true,
        projects: true,
        timeTracking: true,
        reports: true,
        admin: title === 'manager' || title === 'director' || title === 'vice_president' || title === 'president',
        fileManagement: true
      };
    default:
      return basePermissions;
  }
}

// Routes

// GET /api/employees - Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const data = await loadEmployees();
    res.json({
      success: true,
      employees: data.employees,
      total: data.employees.length
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      message: error.message
    });
  }
});

// GET /api/employees/:id - Get specific employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const data = await loadEmployees();
    const employee = data.employees.find(emp => emp.id === parseInt(req.params.id));
   
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
      error: 'Failed to fetch employee',
      message: error.message
    });
  }
});

// POST /api/employees - Create new employee
app.post('/api/employees', async (req, res) => {
  try {
    const data = await loadEmployees();
   
    const newEmployee = {
      id: data.employees.length > 0 ? Math.max(...data.employees.map(emp => emp.id)) + 1 : 1,
      employeeId: req.body.employeeId || generateEmployeeId(data.employees),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone || null,
      department: req.body.department,
      position: req.body.position,
      title: req.body.title || 'employee',
      salary: req.body.salary || null,
      hourlyRate: req.body.hourlyRate || null,
      hireDate: req.body.hireDate,
      birthDate: req.body.birthDate || null,
      address: req.body.address || null,
      emergencyContact: req.body.emergencyContact || null,
      bankInfo: req.body.bankInfo || null,
      taxInfo: req.body.taxInfo || null,
      benefits: req.body.benefits || null,
      performanceReviews: req.body.performanceReviews || [],
      disciplinaryActions: req.body.disciplinaryActions || [],
      documents: req.body.documents || [],
      permissions: req.body.permissions || getDepartmentPermissions(req.body.department, req.body.title),
      status: req.body.status || 'active',
      terminationDate: req.body.terminationDate || null,
      terminationReason: req.body.terminationReason || null,
      notes: req.body.notes || null,
      createdBy: req.body.createdBy || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
   
    // Validate required fields
    if (!newEmployee.firstName || !newEmployee.lastName || !newEmployee.email || !newEmployee.department) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, department'
      });
    }
   
    // Check for duplicate email
    const existingEmployee = data.employees.find(emp => emp.email === newEmployee.email);
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: 'Employee with this email already exists'
      });
    }
   
    data.employees.push(newEmployee);
    await saveEmployees(data);
   
    res.status(201).json({
      success: true,
      employee: newEmployee,
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create employee',
      message: error.message
    });
  }
});

// PUT /api/employees/:id - Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const data = await loadEmployees();
    const employeeIndex = data.employees.findIndex(emp => emp.id === parseInt(req.params.id));
   
    if (employeeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
   
    const existingEmployee = data.employees[employeeIndex];
    const updatedEmployee = {
      ...existingEmployee,
      ...req.body,
      id: existingEmployee.id, // Preserve ID
      employeeId: existingEmployee.employeeId, // Preserve employee ID
      createdAt: existingEmployee.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };
   
    // Update permissions if department or title changed
    if (req.body.department || req.body.title) {
      updatedEmployee.permissions = getDepartmentPermissions(
        updatedEmployee.department,
        updatedEmployee.title
      );
    }
   
    data.employees[employeeIndex] = updatedEmployee;
    await saveEmployees(data);
   
    res.json({
      success: true,
      employee: updatedEmployee,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee',
      message: error.message
    });
  }
});

// DELETE /api/employees/:id - Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const data = await loadEmployees();
    const employeeIndex = data.employees.findIndex(emp => emp.id === parseInt(req.params.id));
   
    if (employeeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
   
    const deletedEmployee = data.employees[employeeIndex];
    data.employees.splice(employeeIndex, 1);
    await saveEmployees(data);
   
    res.json({
      success: true,
      message: 'Employee deleted successfully',
      employee: deletedEmployee
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee',
      message: error.message
    });
  }
});

// POST /api/auth/create-user - Create user login credentials
app.post('/api/auth/create-user', async (req, res) => {
  try {
    const userData = await loadUsers();
   
    const newUser = {
      id: userData.users.length > 0 ? Math.max(...userData.users.map(user => user.id)) + 1 : 1,
      username: req.body.username,
      password: req.body.password, // In production, this should be hashed
      employeeId: req.body.employeeId,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      department: req.body.department,
      permissions: req.body.permissions || {},
      active: true,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
   
    // Validate required fields
    if (!newUser.username || !newUser.password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }
   
    // Check for duplicate username
    const existingUser = userData.users.find(user => user.username === newUser.username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }
   
    userData.users.push(newUser);
    await saveUsers(userData);
   
    // Update employee record to indicate login access
    const employeeData = await loadEmployees();
    const employeeIndex = employeeData.employees.findIndex(emp =>
      emp.employeeId === newUser.employeeId || emp.id === newUser.employeeId
    );
   
    if (employeeIndex !== -1) {
      employeeData.employees[employeeIndex].hasLoginAccess = true;
      employeeData.employees[employeeIndex].username = newUser.username;
      await saveEmployees(employeeData);
    }
   
    // Don't return the password in the response
    const { password, ...userResponse } = newUser;
   
    res.status(201).json({
      success: true,
      user: userResponse,
      message: 'User credentials created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user credentials',
      message: error.message
    });
  }
});

// GET /api/auth/users - Get all users
app.get('/api/auth/users', async (req, res) => {
  try {
    const data = await loadUsers();
    // Remove passwords from response
    const users = data.users.map(({ password, ...user }) => user);
   
    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// POST /api/auth/login - Authenticate user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userData = await loadUsers();
   
    const user = userData.users.find(u => u.username === username && u.password === password && u.active);
   
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
   
    // Update last login
    user.lastLogin = new Date().toISOString();
    await saveUsers(userData);
   
    // Don't return the password
    const { password: _, ...userResponse } = user;
   
    res.json({
      success: true,
      user: userResponse,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Employee management server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/employees',
      'GET /api/employees/:id',
      'POST /api/employees',
      'PUT /api/employees/:id',
      'DELETE /api/employees/:id',
      'POST /api/auth/create-user',
      'GET /api/auth/users',
      'POST /api/auth/login',
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/employees',
      'GET /api/employees/:id',
      'POST /api/employees',
      'PUT /api/employees/:id',
      'DELETE /api/employees/:id',
      'POST /api/auth/create-user',
      'GET /api/auth/users',
      'POST /api/auth/login',
      'GET /api/health',
    ]
  });
});

// Initialize and start server
async function startServer() {
  await ensureDataDirectory();
 
  app.listen(port, '0.0.0.0', () => {
    console.log(`Employee management server running on port ${port}`);
    console.log(`Data directory: ${dataDir}`);
    console.log('Available endpoints:');
    console.log('  GET /api/employees - Get all employees');
    console.log('  GET /api/employees/:id - Get specific employee');
    console.log('  POST /api/employees - Create new employee');
    console.log('  PUT /api/employees/:id - Update employee');
    console.log('  DELETE /api/employees/:id - Delete employee');
    console.log('  POST /api/auth/create-user - Create user login');
    console.log('  GET /api/auth/users - Get all users');
    console.log('  POST /api/auth/login - Authenticate user');
    console.log('  GET /api/health - Health check');
  });
}

startServer().catch(console.error);
