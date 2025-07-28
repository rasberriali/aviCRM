import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Clock, 
  AlertTriangle, 
  Archive, 
  CheckCircle, 
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  FileText,
  ArrowLeft,
  Search,
  Filter,
  UserCheck,
  Target,
  Timer,
  Trash2,
  RotateCcw
} from 'lucide-react';

const taskAssignmentSchema = z.object({
  projectId: z.number().min(1, 'Please select a project'),
  employeeId: z.string().min(1, 'Please select an employee'),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().min(1, 'Task description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedHours: z.number().min(0.5, 'Estimated hours must be at least 0.5'),
  dueDate: z.string().min(1, 'Due date is required'),
  notificationSettings: z.object({
    enabled: z.boolean(),
    intervals: z.array(z.number()),
    urgencyLevel: z.enum(['low', 'normal', 'high', 'critical']),
    persistUntilComplete: z.boolean(),
    escalateAfterHours: z.number().min(1)
  })
});

type TaskAssignmentForm = z.infer<typeof taskAssignmentSchema>;

export default function AdministrationPageSimple() {
  const { toast } = useToast();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('assignments');

  // Fetch employees
  const { data: employeeData, isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['/api/employees'],
    retry: false
  });

  // Fetch workspaces and projects  
  const { data: workspaces = [] } = useQuery({
    queryKey: ['/api/workspaces'],
    retry: false
  });

  // Get safe workspaces array
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  // Fetch all projects directly (simplified approach)
  const { data: allProjects = [] } = useQuery({
    queryKey: ['/api/projects'],
    retry: false
  });

  // Get safe projects array
  const safeProjects = Array.isArray(allProjects) ? allProjects : [];

  // Fetch task assignments
  const { data: taskAssignments = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/admin/task-assignments'],
    retry: false
  });

  // Get employees array with null safety
  const employees = Array.isArray((employeeData as any)?.employees) ? (employeeData as any).employees.map((emp: any) => ({
    ...emp,
    id: emp.employeeId || emp.id
  })) : [];

  // Add null safety for all data arrays
  const safeTaskAssignments = Array.isArray(taskAssignments) ? taskAssignments : [];

  // Loading states
  const projectsLoading = false; // Simplified since we're not doing complex queries

  // Show loading state if data is still loading
  const isLoading = employeesLoading || projectsLoading || tasksLoading;

  // Task assignment form
  const taskForm = useForm<TaskAssignmentForm>({
    resolver: zodResolver(taskAssignmentSchema),
    defaultValues: {
      projectId: 0,
      employeeId: '',
      title: '',
      description: '',
      priority: 'medium',
      estimatedHours: 1,
      dueDate: '',
      notificationSettings: {
        enabled: true,
        intervals: [60, 300, 900],
        urgencyLevel: 'normal',
        persistUntilComplete: false,
        escalateAfterHours: 4
      }
    }
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async (data: TaskAssignmentForm) => {
      const response = await apiRequest('/api/admin/task-assignments', 'POST', JSON.stringify({
        ...data,
        assignedBy: 'Administrator'
      }));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/task-assignments'] });
      setShowTaskModal(false);
      taskForm.reset();
      toast({
        title: 'Task Assigned',
        description: 'Task has been successfully assigned to the employee.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign task',
        variant: 'destructive',
      });
    }
  });

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading administration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administration</h1>
          <p className="text-muted-foreground mt-2">
            Manage task assignments, projects, and employee workload
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Task to Employee</DialogTitle>
                <DialogDescription>
                  Create a new task assignment for an employee with notification settings.
                </DialogDescription>
              </DialogHeader>
              <Form {...taskForm}>
                <form onSubmit={taskForm.handleSubmit((data) => assignTaskMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={taskForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employeesLoading ? (
                                <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                              ) : employees.length === 0 ? (
                                <SelectItem value="no-employees" disabled>No employees found</SelectItem>
                              ) : (
                                employees.map((employee: any) => (
                                  <SelectItem key={employee.id} value={employee.id.toString()}>
                                    {employee.firstName} {employee.lastName} - {employee.department}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={taskForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectsLoading ? (
                                <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                              ) : safeProjects.length === 0 ? (
                                <SelectItem value="no-projects" disabled>No active projects found</SelectItem>
                              ) : (
                                safeProjects.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name || project.title} - {project.customerName || 'No Customer'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={taskForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={taskForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter task description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={taskForm.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0.5" 
                              step="0.5" 
                              placeholder="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={taskForm.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowTaskModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={assignTaskMutation.isPending}>
                      {assignTaskMutation.isPending ? 'Assigning...' : 'Assign Task'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">Task Assignments</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="grid gap-4">
            {tasksLoading ? (
              <div className="text-center py-8">Loading task assignments...</div>
            ) : safeTaskAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No task assignments found. Create a new task assignment to get started.
              </div>
            ) : (
              safeTaskAssignments.map((task: any) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <Badge variant="outline">{task.priority}</Badge>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Employee ID: {task.employeeId}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {task.estimatedHours}h estimated
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.notificationSettings?.enabled && (
                          <Badge variant="outline">
                            <Bell className="h-3 w-3 mr-1" />
                            Notifications
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-4">
          <div className="grid gap-4">
            {safeWorkspaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No workspaces found. Create a workspace in the Projects tab first.
              </div>
            ) : (
              safeWorkspaces.map((workspace: any) => (
                <Card key={workspace.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{workspace.name}</h3>
                        <p className="text-sm text-muted-foreground">{workspace.description}</p>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: workspace.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            Created: {new Date(workspace.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}