import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Edit3, 
  Save, 
  X, 
  Settings,
  Crown,
  AlertCircle
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
  permissions: {
    accounting: boolean;
    projects: boolean;
    timeTracking: boolean;
    reports: boolean;
    admin: boolean;
    fileManagement: boolean;
  };
  active: boolean;
}

const permissionSchema = z.object({
  accounting: z.boolean(),
  projects: z.boolean(),
  timeTracking: z.boolean(),
  reports: z.boolean(),
  admin: z.boolean(),
  fileManagement: z.boolean()
});

type PermissionForm = z.infer<typeof permissionSchema>;

export default function UserManagementPage() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees
  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['/api/employees'],
    retry: false
  });

  // Extract employees array with proper type safety
  const employees = Array.isArray((employeeData as any)?.employees) 
    ? (employeeData as any).employees 
    : Array.isArray(employeeData) 
      ? employeeData 
      : [];

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: PermissionForm }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/permissions`, 'PATCH', JSON.stringify({ permissions }));
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setEditingUser(null);
      toast({
        title: 'Permissions Updated',
        description: `User permissions have been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permissions',
        variant: 'destructive',
      });
    }
  });

  // Quick admin access for specific users
  const grantAdminAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const adminPermissions = {
        accounting: true,
        projects: true,
        timeTracking: true,
        reports: true,
        admin: true,
        fileManagement: true
      };
      const response = await apiRequest(`/api/admin/users/${userId}/permissions`, 'PATCH', JSON.stringify({ permissions: adminPermissions }));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Admin Access Granted',
        description: 'Full admin privileges have been granted to the user.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant admin access',
        variant: 'destructive',
      });
    }
  });

  // Permission form
  const permissionForm = useForm<PermissionForm>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      accounting: false,
      projects: false,
      timeTracking: false,
      reports: false,
      admin: false,
      fileManagement: false
    }
  });

  const filteredEmployees = employees.filter((employee: Employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || 
           employee.email.toLowerCase().includes(searchLower) ||
           employee.department.toLowerCase().includes(searchLower);
  });

  const handleEditPermissions = (employee: Employee) => {
    setEditingUser(employee.id);
    permissionForm.reset(employee.permissions);
  };

  const handleSavePermissions = (permissions: PermissionForm) => {
    if (editingUser) {
      updatePermissionsMutation.mutate({ userId: editingUser, permissions });
    }
  };

  const handleQuickAdminAccess = (userId: string) => {
    grantAdminAccessMutation.mutate(userId);
  };

  const getPermissionBadges = (permissions: any) => {
    const activePermissions = Object.entries(permissions)
      .filter(([_, value]) => value)
      .map(([key, _]) => key);
    
    return activePermissions.map((permission) => (
      <Badge key={permission} variant="secondary" className="text-xs">
        {permission}
      </Badge>
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user permissions and access levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            Note: Changes require external server update
          </span>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            Quick Admin Access
          </CardTitle>
          <CardDescription>
            Grant full admin privileges to Ethan, Jeremy, and Chad with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {['3', '4', '9'].map((userId) => {
              const employee = employees.find((emp: Employee) => emp.id === userId);
              if (!employee) return null;
              
              const hasAdminAccess = employee.permissions.admin;
              
              return (
                <Button
                  key={userId}
                  onClick={() => handleQuickAdminAccess(userId)}
                  disabled={hasAdminAccess || grantAdminAccessMutation.isPending}
                  variant={hasAdminAccess ? "secondary" : "default"}
                  size="sm"
                >
                  {hasAdminAccess ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {employee.firstName} - Admin ✓
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Grant Admin to {employee.firstName}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No employees found
          </div>
        ) : (
          filteredEmployees.map((employee: Employee) => (
            <Card key={employee.id} className={employee.permissions.admin ? "border-green-200 bg-green-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      {employee.permissions.admin && (
                        <Badge className="bg-green-500 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Badge variant="outline">{employee.department}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {employee.email} • {employee.role}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getPermissionBadges(employee.permissions)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(employee)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit Permissions
                    </Button>
                  </div>
                </div>

                {editingUser === employee.id && (
                  <div className="mt-4 pt-4 border-t">
                    <Form {...permissionForm}>
                      <form onSubmit={permissionForm.handleSubmit(handleSavePermissions)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={permissionForm.control}
                            name="accounting"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Accounting Access
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={permissionForm.control}
                            name="projects"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Projects Access
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={permissionForm.control}
                            name="timeTracking"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Time Tracking
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={permissionForm.control}
                            name="reports"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Reports Access
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={permissionForm.control}
                            name="admin"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  <Crown className="h-4 w-4 inline mr-1" />
                                  Admin Access
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={permissionForm.control}
                            name="fileManagement"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  File Management
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={updatePermissionsMutation.isPending}>
                            <Save className="h-4 w-4 mr-1" />
                            {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingUser(null)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}