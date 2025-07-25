import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Plus, User, Edit, Trash2, Eye, EyeOff, Mail, Phone, Calendar, DollarSign, Shield, Building2, Search, Filter, Key, MoreHorizontal } from 'lucide-react';
import { useHttpAuth } from '@/hooks/useHttpAuth';

interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  title: string;
  salary?: number;
  hourlyRate?: number;
  hireDate: string;
  birthDate?: string;
  address?: any;
  emergencyContact?: any;
  permissions: any;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Login credentials
  username?: string;
  hasLoginAccess?: boolean;
}

const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  title: z.string().min(1, 'Title is required'),
  salary: z.number().optional(),
  hourlyRate: z.number().optional(),
  hireDate: z.string().min(1, 'Hire date is required'),
  birthDate: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  status: z.string().default('active'),
  // Login credentials
  createLoginAccess: z.boolean().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
  // Permissions
  permissions: z.object({
    accounting: z.boolean().default(false),
    projects: z.boolean().default(false),
    timeTracking: z.boolean().default(false),
    reports: z.boolean().default(false),
    admin: z.boolean().default(false),
    fileManagement: z.boolean().default(false),
  }).optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// Permissions Section Component
function PermissionsSection({ form }: { form: any }) {
  const [permissions, setPermissions] = useState({
    accounting: false,
    projects: false,
    timeTracking: false,
    reports: false,
    admin: false,
    fileManagement: false,
  });

  const handlePermissionChange = (permission: string, value: boolean) => {
    const newPermissions = { ...permissions, [permission]: value };
    setPermissions(newPermissions);
    form.setValue('permissions', newPermissions);
  };

  const permissionItems = [
    {
      key: 'accounting',
      label: 'Accounting',
      description: 'Access to invoicing, billing, and financial reports'
    },
    {
      key: 'projects',
      label: 'Projects',
      description: 'Create and manage projects and tasks'
    },
    {
      key: 'timeTracking',
      label: 'Time Tracking',
      description: 'Clock in/out and track work hours'
    },
    {
      key: 'reports',
      label: 'Reports',
      description: 'View and generate business reports'
    },
    {
      key: 'admin',
      label: 'Administration',
      description: 'Manage users, settings, and system configuration'
    },
    {
      key: 'fileManagement',
      label: 'File Management',
      description: 'Upload, download, and manage project files'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {permissionItems.map((item) => (
        <div
          key={item.key}
          className="flex flex-row items-center space-x-3 space-y-0 rounded-md border border-slate-200 dark:border-slate-700 p-4"
        >
          <input
            type="checkbox"
            checked={permissions[item.key as keyof typeof permissions]}
            onChange={(e) => handlePermissionChange(item.key, e.target.checked)}
            className="h-4 w-4"
          />
          <div className="space-y-1 leading-none">
            <label className="text-sm font-medium">
              {item.label}
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const departments = [
  'Accounting',
  'Sales', 
  'Programming',
  'Technicians',
  'Upper Management',
  'Administration',
  'Customer Service',
  'Operations'
];

const titles = [
  'employee',
  'senior',
  'lead',
  'manager',
  'director',
  'vice_president',
  'president'
];

const statusOptions = [
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'on_leave', label: 'On Leave', color: '#f59e0b' },
  { value: 'terminated', label: 'Terminated', color: '#ef4444' },
];

export default function EmployeesPage() {
  const { user } = useHttpAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordChangeEmployee, setPasswordChangeEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      title: 'employee',
      status: 'active',
      createLoginAccess: false,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
    },
  });

  // Fetch employees from local server
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees?t=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch employees:', response.status);
        toast({
          title: "Error",
          description: "Failed to fetch employees from server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to connect to employee server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    
    // Fix for admin permissions - ensure current user has correct permissions from server
    const storedUser = localStorage.getItem('http_auth_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.id === '3' && userData.username === 'Edevries' && !userData.permissions?.admin) {
          // Update Ethan's permissions to match server data
          userData.permissions = {
            ...userData.permissions,
            admin: true,
            accounting: true,
            reports: true,
            fileManagement: true,
            projects: true,
            timeTracking: true
          };
          localStorage.setItem('http_auth_user', JSON.stringify(userData));
          console.log('Updated Ethan\'s permissions to include admin access');
        }
      } catch (error) {
        console.error('Error updating user permissions:', error);
      }
    }
  }, []);

  // Generate employee ID
  const generateEmployeeId = () => {
    const prefix = 'EMP';
    const nextNumber = employees.length + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  // Get department-based permissions
  const getDepartmentPermissions = (department: string, title: string) => {
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
        return { ...basePermissions, accounting: true, projects: true, timeTracking: true, reports: true, admin: title === 'manager' || title === 'director', fileManagement: true };
      default:
        return basePermissions;
    }
  };

  // Submit employee form
  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const employeeData = {
        ...data,
        employeeId: editingEmployee?.employeeId || generateEmployeeId(),
        permissions: getDepartmentPermissions(data.department, data.title),
        createdBy: user?.id || 'system',
      };

      // Create/update employee on local server
      const url = editingEmployee 
        ? `/api/employees/${editingEmployee.id}`
        : '/api/employees';
      
      const method = editingEmployee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // If creating login access, create user credentials
        if (data.createLoginAccess && data.username && data.password) {
          try {
            await fetch('/api/auth/create-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                username: data.username,
                password: data.password,
                employeeId: result.employee?.id || employeeData.employeeId,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                department: data.department,
                permissions: employeeData.permissions,
              })
            });
          } catch (loginError) {
            console.error('Error creating login credentials:', loginError);
            toast({
              title: "Warning",
              description: "Employee created but login credentials failed to create",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: editingEmployee ? "Employee updated successfully" : "Employee created successfully",
        });

        await fetchEmployees();
        setIsEmployeeDialogOpen(false);
        setEditingEmployee(null);
        form.reset();
      } else {
        // Try to get the specific error message from the server
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || 'Failed to save employee';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        title: editingEmployee ? "Cannot Edit Employee" : "Cannot Create Employee",
        description: error instanceof Error ? error.message : "Failed to save employee",
        variant: "destructive",
      });
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee deleted successfully",
        });
        await fetchEmployees();
      } else {
        // Try to get the specific error message from the server
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || 'Failed to delete employee';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Cannot Delete Employee",
        description: error instanceof Error ? error.message : "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  // Edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department,
      position: employee.position,
      title: employee.title,
      salary: employee.salary,
      hourlyRate: employee.hourlyRate,
      hireDate: employee.hireDate?.split('T')[0] || '',
      birthDate: employee.birthDate?.split('T')[0] || '',
      status: employee.status,
      address: employee.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
      emergencyContact: employee.emergencyContact || {
        name: '',
        phone: '',
        relationship: '',
      },
      createLoginAccess: false,
      username: '',
      password: '',
    });
    setIsEmployeeDialogOpen(true);
  };

  // Toggle password visibility
  const togglePasswordVisibility = (employeeId: number | string) => {
    setShowPasswords(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  // Handle password change
  const handleChangePassword = (employee: Employee) => {
    setPasswordChangeEmployee(employee);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
  };

  // Submit password change
  const handlePasswordSubmit = async () => {
    if (!passwordChangeEmployee || !newPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/employees/${passwordChangeEmployee.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        setIsPasswordDialogOpen(false);
        setPasswordChangeEmployee(null);
        setNewPassword('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Format salary/hourly rate
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Employee Management</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                View employee profiles and system access information
              </p>
            </div>
            <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingEmployee(null);
                    form.reset();
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee 
                  ? 'Update employee information and permissions'
                  : 'Create a new employee profile with optional login access'
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Basic Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Employment Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Employment Details</h3>
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Software Developer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {titles.filter(Boolean).map((title) => (
                                <SelectItem key={title} value={title}>
                                  {title.replace('_', ' ').toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Compensation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Salary (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) * 100 : undefined)}
                            value={field.value ? field.value / 100 : ''}
                            placeholder="50000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? (parseFloat(e.target.value) * 100).toString() : '')}
                            value={field.value ? (field.value / 100).toString() : ''}
                            placeholder="25.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Login Access */}
                {!editingEmployee && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-medium">Login Access</h3>
                    
                    <FormField
                      control={form.control}
                      name="createLoginAccess"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Create login credentials for this employee
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {form.watch('createLoginAccess') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Permissions Section */}
                    {form.watch('createLoginAccess') && (
                      <div className="space-y-4 pl-7">
                        <h4 className="text-md font-medium text-slate-900 dark:text-white">System Permissions</h4>
                        <PermissionsSection form={form} />
                      </div>
                    )}
                  </div>
                )}

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEmployeeDialogOpen(false);
                      setEditingEmployee(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Security Information Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Employee Management Security
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed">
                Employee records are managed through the centralized authentication system for security. 
                While you can try the edit and delete functions, they are read-only to protect data integrity. 
                All employee information comes from the secure authentication server and cannot be modified through this interface.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px] border-slate-300 dark:border-slate-600 rounded-xl">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] border-slate-300 dark:border-slate-600 rounded-xl">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-blue-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {employee.firstName} {employee.lastName}
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                      {employee.position} • {employee.employeeId}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  style={{ 
                    backgroundColor: getStatusColor(employee.status),
                    border: `1px solid ${getStatusColor(employee.status)}40`
                  }}
                  className="text-white shadow-sm px-3 py-1 rounded-xl"
                >
                  {employee.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 truncate">{employee.email}</span>
              </div>
              
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{employee.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">{employee.department}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">Hired: {formatDate(employee.hireDate)}</span>
              </div>

              {(employee.salary || employee.hourlyRate) && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    {employee.salary ? formatCurrency(employee.salary) + '/year' : ''}
                    {employee.salary && employee.hourlyRate ? ' • ' : ''}
                    {employee.hourlyRate ? formatCurrency(employee.hourlyRate) + '/hour' : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300">
                  {Object.entries(employee.permissions || {})
                    .filter(([_, value]) => value)
                    .map(([key, _]) => key)
                    .join(', ') || 'No permissions'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 py-2"
                    >
                      <MoreHorizontal className="h-4 w-4 mr-1" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleEditEmployee(employee)}
                      className="text-blue-600 dark:text-blue-400 cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Employee
                    </DropdownMenuItem>
                    {user?.permissions?.admin && (
                      <DropdownMenuItem
                        onClick={() => handleChangePassword(employee)}
                        className="text-amber-600 dark:text-amber-400 cursor-pointer"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDeleteEmployee(employee)}
                      className="text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {employee.hasLoginAccess && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-xl">
                    <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">System Access</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first employee.'}
          </p>
        </div>
      )}
      </div>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Change password for {passwordChangeEmployee?.firstName} {passwordChangeEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordChangeEmployee(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordSubmit}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={!newPassword || newPassword.length < 6}
              >
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}