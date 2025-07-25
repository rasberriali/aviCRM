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
import { useEmployees, useTaskAssignments } from '@/hooks/useLocalData';
import { SyncStatus } from '@/components/SyncStatus';
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

interface TaskAssignment {
  id: number;
  projectId: number;
  employeeId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'assigned' | 'in_progress' | 'completed';
  estimatedHours: number;
  actualHours: number;
  dueDate: string;
  assignedAt: string;
  notificationSettings: {
    enabled: boolean;
    intervals: number[];
    urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
    persistUntilComplete: boolean;
    escalateAfterHours: number;
  };
  project?: any;
  employee?: any;
}

interface Project {
  id: number;
  name: string;
  customerName: string;
  status: string;
  priority: string;
  description?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
  active: boolean;
}

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

const noteSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  title: z.string().min(1, 'Note title is required'),
  message: z.string().min(1, 'Note message is required'),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  notificationSettings: z.object({
    enabled: z.boolean(),
    intervals: z.array(z.number()),
    urgencyLevel: z.enum(['low', 'normal', 'high', 'critical'])
  })
});

type TaskAssignmentForm = z.infer<typeof taskAssignmentSchema>;
type NoteForm = z.infer<typeof noteSchema>;

export default function AdministrationPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('assignments');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Fetch data
  const { data: workspaces = [] } = useQuery({
    queryKey: ['/api/workspaces'],
    retry: false
  });

  // Fetch categories for each workspace to get live project data
  const workspaceCategoryQueries = (workspaces || []).map((workspace: any) =>
    useQuery({
      queryKey: ['/api/workspaces', workspace.id, 'categories'],
      queryFn: async () => {
        const response = await apiRequest(`/api/workspaces/${workspace.id}/categories`, 'GET');
        return response.json();
      },
      enabled: !!workspace.id,
      retry: false
    })
  );

  // Get all categories from all workspaces
  const allCategories = workspaceCategoryQueries
    .map(query => query.data || [])
    .flat()
    .filter(category => category);

  // Fetch projects for each category
  const categoryProjectQueries = allCategories.map((category: any) =>
    useQuery({
      queryKey: ['/api/workspaces', category.workspaceId, 'categories', category.id, 'projects'],
      queryFn: async () => {
        const response = await apiRequest(`/api/workspaces/${category.workspaceId}/categories/${category.id}/projects`, 'GET');
        return response.json();
      },
      enabled: !!category.id && !!category.workspaceId,
      retry: false
    })
  );

  // Fetch uncategorized projects for each workspace
  const uncategorizedProjectQueries = (workspaces || []).map((workspace: any) =>
    useQuery({
      queryKey: ['/api/workspaces', workspace.id, 'projects'],
      queryFn: async () => {
        const response = await apiRequest(`/api/workspaces/${workspace.id}/projects`, 'GET');
        return response.json();
      },
      enabled: !!workspace.id,
      retry: false
    })
  );

  // Combine all LIVE projects from workspaces
  const allLiveProjects = [
    // Projects from categories
    ...categoryProjectQueries.flatMap(query => query.data || []),
    // Uncategorized projects
    ...uncategorizedProjectQueries.flatMap(query => query.data || [])
  ].filter(project => project && project.id && project.status !== 'archived');

  // If no live projects exist, show a helpful message but don't add sample data
  const finalProjects = allLiveProjects;

  // Loading states
  const projectsLoading = (workspaceCategoryQueries || []).some(query => query.isLoading) || 
                         (categoryProjectQueries || []).some(query => query.isLoading) ||
                         (uncategorizedProjectQueries || []).some(query => query.isLoading);

  const { data: archivedProjects = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['/api/admin/archived-projects'],
    retry: false
  });

  const { data: taskAssignments = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/admin/task-assignments'],
    retry: false
  });

  const { data: employeeData, isLoading: employeesLoading, error: employeesError } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await apiRequest('/api/employees', 'GET');
      return response.json();
    },
    retry: 3,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fresh data
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fix employee data structure - use employeeId as the id
  const employees = Array.isArray(employeeData?.employees) ? employeeData.employees.map((emp: any) => ({
    ...emp,
    id: emp.employeeId || emp.id // Use employeeId as the primary id
  })) : [];

  // Debug logging
  if (employeesError) {
    console.error('Employee loading error:', employeesError);
  }
  
  if (employeeData) {
    console.log('Employee data loaded:', employeeData);
    console.log('Formatted employees:', employees);
  }

  // Debug project loading
  console.log('Live projects loaded:', {
    workspacesCount: workspaces.length,
    categoriesCount: allCategories.length,
    categoryProjectsCount: categoryProjectQueries.length,
    uncategorizedProjectsCount: uncategorizedProjectQueries.length,
    totalLiveProjects: finalProjects.length,
    projects: finalProjects
  });

  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ['/api/admin/time-entries'],
    retry: false
  });

  // Mutations
  const assignTaskMutation = useMutation({
    mutationFn: async (data: TaskAssignmentForm) => {
      // Add project name to the data before sending
      const selectedProject = (finalProjects || []).find((p: any) => p.id === data.projectId);
      const taskData = {
        ...data,
        projectName: selectedProject?.name || 'Unknown Project',
        assignedBy: 'Administrator'
      };
      const response = await apiRequest('POST', '/api/admin/task-assignments', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/task-assignments'] });
      setShowTaskModal(false);
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

  const sendNoteMutation = useMutation({
    mutationFn: async (data: NoteForm) => {
      const response = await apiRequest('POST', '/api/admin/notes', data);
      return response.json();
    },
    onSuccess: () => {
      setShowNoteModal(false);
      toast({
        title: 'Note Sent',
        description: 'Note has been successfully sent to the employee.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send note',
        variant: 'destructive',
      });
    }
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest('PATCH', `/api/admin/projects/${projectId}/archive`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/archived-projects'] });
      toast({
        title: 'Project Archived',
        description: 'Project has been moved to the archive.',
      });
    }
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest('PATCH', `/api/admin/projects/${projectId}/restore`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/archived-projects'] });
      toast({
        title: 'Project Restored',
        description: 'Project has been restored from the archive.',
      });
    }
  });

  // Task assignment form
  const taskForm = useForm<TaskAssignmentForm>({
    resolver: zodResolver(taskAssignmentSchema),
    defaultValues: {
      priority: 'medium',
      estimatedHours: 1,
      notificationSettings: {
        enabled: true,
        intervals: [15, 30, 60],
        urgencyLevel: 'normal',
        persistUntilComplete: true,
        escalateAfterHours: 24
      }
    }
  });

  // Note form
  const noteForm = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      priority: 'normal',
      notificationSettings: {
        enabled: true,
        intervals: [5, 15, 30],
        urgencyLevel: 'normal'
      }
    }
  });

  // Filter and search functions
  const filteredTasks = Array.isArray(taskAssignments) ? taskAssignments.filter((task: TaskAssignment) => {
    const matchesSearch = task?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task?.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task?.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task?.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task?.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task?.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) : [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'assigned': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration Center</h1>
          <p className="text-muted-foreground">
            Manage project tasks, employee assignments, and team coordination
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Note to Employee</DialogTitle>
                <DialogDescription>
                  Send a notification or message to an employee with custom notification settings.
                </DialogDescription>
              </DialogHeader>
              <Form {...noteForm}>
                <form onSubmit={noteForm.handleSubmit((data) => sendNoteMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={noteForm.control}
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
                            {employees.length > 0 ? (
                              employees.map((employee: Employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName} - {employee.department}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled>
                                Loading employees...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={noteForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter note title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={noteForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter your message" rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={noteForm.control}
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
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowNoteModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sendNoteMutation.isPending}>
                      {sendNoteMutation.isPending ? 'Sending...' : 'Send Note'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Task to Employee</DialogTitle>
                <DialogDescription>
                  Create a new task assignment for a project and assign it to an employee with notification settings.
                </DialogDescription>
              </DialogHeader>
              <Form {...taskForm}>
                <form onSubmit={taskForm.handleSubmit((data) => assignTaskMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={taskForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {finalProjects.length > 0 ? (
                                finalProjects.map((project: Project) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name} {project.customerName ? `- ${project.customerName}` : ''}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-projects" disabled>
                                  No projects available. Create a project in the Projects tab first.
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                                <SelectItem value="no-employees" disabled>No employees found - Check console for errors</SelectItem>
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
                  </div>

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
                          <Textarea placeholder="Enter task description" rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
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
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.5" 
                              min="0.5"
                              placeholder="1.0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Notification Settings</Label>
                    <div className="p-4 border rounded-lg space-y-4">
                      <FormField
                        control={taskForm.control}
                        name="notificationSettings.urgencyLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notification Urgency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Higher urgency levels will send more frequent reminders
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={taskForm.control}
                        name="notificationSettings.escalateAfterHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Escalate After (hours)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="24"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                              />
                            </FormControl>
                            <FormDescription>
                              Escalate notification urgency if task remains incomplete after this many hours
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assignments">Task Assignments</TabsTrigger>
          <TabsTrigger value="projects">Active Projects</TabsTrigger>
          <TabsTrigger value="archive">Project Archive</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, projects, or employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {tasksLoading ? (
              <div className="text-center py-8">Loading task assignments...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No task assignments found
              </div>
            ) : (
              filteredTasks.map((task: TaskAssignment) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                            {task.priority}
                          </Badge>
                          <Badge className={`${getStatusColor(task.status)} text-white`}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {task.employee?.firstName} {task.employee?.lastName}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {task.project?.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {task.actualHours}h / {task.estimatedHours}h
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.notificationSettings.enabled && (
                          <Badge variant="outline">
                            <Bell className="h-3 w-3 mr-1" />
                            Notifications
                          </Badge>
                        )}
                        <Button variant="outline" size="sm">
                          <Timer className="h-4 w-4 mr-1" />
                          Clock Time
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4">
            {workspaces.length === 0 ? (
              <div className="text-center py-8">Loading projects...</div>
            ) : (finalProjects || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active projects found
              </div>
            ) : (
              (finalProjects || []).map((project: Project) => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{project.name}</h3>
                          <Badge variant="outline">{project.status}</Badge>
                          <Badge className={`${getPriorityColor(project.priority)} text-white`}>
                            {project.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Customer: {project.customerName}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => archiveProjectMutation.mutate(project.id)}
                        disabled={archiveProjectMutation.isPending}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          <div className="grid gap-4">
            {archivedLoading ? (
              <div className="text-center py-8">Loading archived projects...</div>
            ) : (archivedProjects || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No archived projects found
              </div>
            ) : (
              (archivedProjects || []).map((project: Project) => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-muted-foreground">{project.name}</h3>
                          <Badge variant="secondary">Archived</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Customer: {project.customerName}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => restoreProjectMutation.mutate(project.id)}
                        disabled={restoreProjectMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(taskAssignments || []).filter((task: TaskAssignment) => task.status !== 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tasks currently in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(taskAssignments || []).reduce((sum: number, task: TaskAssignment) => sum + task.actualHours, 0)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Total hours logged this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(projects || []).length}</div>
                <p className="text-xs text-muted-foreground">
                  Projects currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(employees || []).filter((emp: Employee) => emp.active).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active team members
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Workload Overview</CardTitle>
              <CardDescription>
                Current task assignments and workload distribution across team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(employees || []).filter((emp: Employee) => emp.active).map((employee: Employee) => {
                  const activeTasks = (taskAssignments || []).filter((task: TaskAssignment) => 
                    task.employeeId === employee.id && task.status !== 'completed'
                  );
                  const totalHours = activeTasks.reduce((sum: number, task: TaskAssignment) => 
                    sum + task.estimatedHours, 0
                  );
                  
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{employee.firstName} {employee.lastName}</h4>
                          <p className="text-sm text-muted-foreground">{employee.department} - {employee.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">
                          {activeTasks.length} active tasks
                        </Badge>
                        <Badge variant="outline">
                          {totalHours}h estimated
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}