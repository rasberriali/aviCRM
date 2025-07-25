import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Send, 
  Clock, 
  Archive, 
  User, 
  Bell,
  CheckCircle,
  AlertTriangle,
  FileText,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { SoundWaveLoader } from './SoundWaveLoader';

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
  notificationSettings: {
    enabled: boolean;
    intervals: number[];
    urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
  };
  project?: any;
  employee?: any;
}

export function MobileAdministration() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // All hooks must be called before any conditional returns
  const [activeView, setActiveView] = useState<'assign' | 'tracking' | 'archive'>('assign');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    estimatedHours: 1,
    dueDate: '',
    notificationSettings: {
      enabled: true,
      intervals: [5, 15, 30],
      urgencyLevel: 'normal' as const
    }
  });

  const [noteForm, setNoteForm] = useState({
    title: '',
    message: '',
    priority: 'normal' as const,
    notificationSettings: {
      enabled: true,
      intervals: [5, 15, 30],
      urgencyLevel: 'normal' as const
    }
  });

  // Check admin permissions before conditional rendering
  const isAdmin = user?.permissions?.admin || user?.role === 'admin' || user?.department === 'Management';

  // Fetch data - all hooks must be called regardless of conditions
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
    enabled: !!user && isAdmin,
    staleTime: 300000,
    retry: false
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/admin/projects'],
    enabled: !!user && isAdmin,
    staleTime: 300000,
    retry: false
  });

  const { data: taskAssignments = [] } = useQuery({
    queryKey: ['/api/admin/task-assignments'],
    enabled: !!user && isAdmin,
    staleTime: 60000,
    retry: false
  });

  const { data: archivedProjects = [] } = useQuery({
    queryKey: ['/api/admin/archived-projects'],
    enabled: !!user && isAdmin,
    staleTime: 300000,
    retry: false
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/task-assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/task-assignments'] });
      setShowTaskDialog(false);
      resetTaskForm();
      toast({ title: 'Task assigned successfully' });
    }
  });

  const sendNoteMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/notes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/task-assignments'] });
      setShowNoteDialog(false);
      resetNoteForm();
      toast({ title: 'Note sent successfully' });
    }
  });

  const archiveProjectMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest('PATCH', `/api/admin/projects/${projectId}/archive`, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/archived-projects'] });
      toast({ title: 'Project archived' });
    }
  });

  const restoreProjectMutation = useMutation({
    mutationFn: (projectId: number) => apiRequest('PATCH', `/api/admin/projects/${projectId}/restore`, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/archived-projects'] });
      toast({ title: 'Project restored' });
    }
  });

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      estimatedHours: 1,
      dueDate: '',
      notificationSettings: {
        enabled: true,
        intervals: [5, 15, 30],
        urgencyLevel: 'normal'
      }
    });
    setSelectedProject(null);
    setSelectedEmployee(null);
  };

  const resetNoteForm = () => {
    setNoteForm({
      title: '',
      message: '',
      priority: 'normal',
      notificationSettings: {
        enabled: true,
        intervals: [5, 15, 30],
        urgencyLevel: 'normal'
      }
    });
    setSelectedEmployee(null);
  };

  const handleTaskSubmit = () => {
    if (!selectedProject || !selectedEmployee) {
      toast({ title: 'Select project and employee', variant: 'destructive' });
      return;
    }

    const taskData = {
      projectId: selectedProject.id,
      employeeId: selectedEmployee.id,
      ...taskForm,
      assignedBy: user?.id
    };

    createTaskMutation.mutate(taskData);
  };

  const handleNoteSubmit = () => {
    if (!selectedEmployee) {
      toast({ title: 'Select an employee', variant: 'destructive' });
      return;
    }

    const noteData = {
      employeeId: selectedEmployee.id,
      ...noteForm,
      sentBy: user?.id
    };

    sendNoteMutation.mutate(noteData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Square className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const aggressiveNotificationSettings = {
    enabled: true,
    intervals: [1, 5, 15, 30, 60],
    urgencyLevel: 'critical' as const
  };

  // Now check admin permissions after all hooks are called
  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-sm text-muted-foreground">Administrator privileges required</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Administration</h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowTaskDialog(true)}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Task
          </Button>
          <Button
            onClick={() => setShowNoteDialog(true)}
            variant="outline"
            size="sm"
          >
            <Send className="h-4 w-4 mr-1" />
            Note
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <Button
          variant={activeView === 'assign' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('assign')}
        >
          Assign
        </Button>
        <Button
          variant={activeView === 'tracking' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('tracking')}
        >
          Tracking
        </Button>
        <Button
          variant={activeView === 'archive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('archive')}
        >
          Archive
        </Button>
      </div>

      {/* Task Assignment View */}
      {activeView === 'assign' && (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="p-4">
                    <SoundWaveLoader size="md" color="#9521c0" text="Loading task assignments..." />
                  </div>
                ) : taskAssignments.filter((task: TaskAssignment) => task.status !== 'completed').map((task: TaskAssignment) => (
                  <Card key={task.id} className="p-3">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          <Badge variant={
                            task.priority === 'urgent' ? 'destructive' :
                            task.priority === 'high' ? 'default' :
                            task.priority === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                        
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.employee?.firstName} {task.employee?.lastName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.actualHours}h/{task.estimatedHours}h</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.status.replace('_', ' ')}
                          </Badge>
                          
                          {task.notificationSettings.enabled && (
                            <Bell className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {!isLoading && taskAssignments.filter((task: TaskAssignment) => task.status !== 'completed').length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No active tasks assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Employee Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {employees.filter((emp: any) => emp.active).slice(0, 5).map((employee: any) => {
                  const activeTasks = taskAssignments.filter((task: TaskAssignment) => 
                    task.employeeId === employee.id && task.status !== 'completed'
                  );
                  
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{employee.firstName} {employee.lastName}</div>
                        <div className="text-xs text-muted-foreground">{employee.department}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{activeTasks.length} tasks</div>
                        <div className="text-xs text-muted-foreground">
                          {activeTasks.reduce((sum: number, task: TaskAssignment) => sum + task.actualHours, 0)}h
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}

      {/* Time Tracking View */}
      {activeView === 'tracking' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Time tracking data will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archive View */}
      {activeView === 'archive' && (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {archivedProjects.map((project: any) => (
              <Card key={project.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{project.name}</h4>
                    <p className="text-xs text-muted-foreground">{project.description}</p>
                    <p className="text-xs text-blue-600">{project.customerName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restoreProjectMutation.mutate(project.id)}
                    className="h-8 w-8 p-0"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
                <Badge variant="secondary" className="mt-2">Archived</Badge>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Task Assignment Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Project</Label>
              <Select
                value={selectedProject?.id.toString() || ''}
                onValueChange={(value) => {
                  const project = projects.find((p: any) => p.id === parseInt(value));
                  setSelectedProject(project || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter((p: any) => !p.archived).map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Employee</Label>
              <Select
                value={selectedEmployee?.id || ''}
                onValueChange={(value) => {
                  const employee = employees.find((e: any) => e.id === value);
                  setSelectedEmployee(employee || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter((e: any) => e.active).map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Title</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: any) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) })}
                  min="0.5"
                  step="0.5"
                />
              </div>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Notifications</Label>
                <Switch
                  checked={taskForm.notificationSettings.enabled}
                  onCheckedChange={(checked) => setTaskForm({ 
                    ...taskForm, 
                    notificationSettings: { ...taskForm.notificationSettings, enabled: checked }
                  })}
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Reminder Intervals</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[1, 5, 15, 30, 60, 120].map((interval) => (
                      <Badge
                        key={interval}
                        variant={taskForm.notificationSettings.intervals.includes(interval) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          const newIntervals = taskForm.notificationSettings.intervals.includes(interval)
                            ? taskForm.notificationSettings.intervals.filter(i => i !== interval)
                            : [...taskForm.notificationSettings.intervals, interval];
                          setTaskForm({ 
                            ...taskForm, 
                            notificationSettings: { ...taskForm.notificationSettings, intervals: newIntervals }
                          });
                        }}
                      >
                        {interval < 60 ? `${interval}m` : `${interval / 60}h`}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Urgency</Label>
                  <Select
                    value={taskForm.notificationSettings.urgencyLevel}
                    onValueChange={(value: any) => setTaskForm({ 
                      ...taskForm, 
                      notificationSettings: { ...taskForm.notificationSettings, urgencyLevel: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTaskForm({ 
                    ...taskForm, 
                    notificationSettings: aggressiveNotificationSettings
                  })}
                  className="w-full"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Use Aggressive Settings
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTaskSubmit}>
                Assign Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Note</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select
                value={selectedEmployee?.id || ''}
                onValueChange={(value) => {
                  const employee = employees.find((e: any) => e.id === value);
                  setSelectedEmployee(employee || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter((e: any) => e.active).map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Title</Label>
              <Input
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                placeholder="Note title"
              />
            </div>
            
            <div>
              <Label>Message</Label>
              <Textarea
                value={noteForm.message}
                onChange={(e) => setNoteForm({ ...noteForm, message: e.target.value })}
                placeholder="Your message"
                rows={4}
              />
            </div>
            
            <div>
              <Label>Priority</Label>
              <Select
                value={noteForm.priority}
                onValueChange={(value: any) => setNoteForm({ ...noteForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Notifications</Label>
                <Switch
                  checked={noteForm.notificationSettings.enabled}
                  onCheckedChange={(checked) => setNoteForm({ 
                    ...noteForm, 
                    notificationSettings: { ...noteForm.notificationSettings, enabled: checked }
                  })}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoteForm({ 
                  ...noteForm, 
                  notificationSettings: aggressiveNotificationSettings
                })}
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                Use Aggressive Settings
              </Button>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleNoteSubmit}>
                Send Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}