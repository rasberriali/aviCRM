import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Filter, 
  Calendar,
  User,
  Settings,
  Bell,
  BellOff,
  Trash2,
  Edit,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { useToast } from '@/hooks/use-toast';

interface MobileTask {
  id: number;
  workspaceId: number;
  projectId?: number;
  categoryId?: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours: number;
  dueDate?: string;
  completedAt?: string;
  notificationSettings?: {
    enabled: boolean;
    intervals: number[];
    urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
    persistUntilComplete: boolean;
    escalateAfterHours: number;
  };
  lastNotificationSent?: string;
  createdAt: string;
  updatedAt: string;
  workspace?: { name: string };
  project?: { name: string };
  assignee?: { firstName: string; lastName: string };
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  estimatedHours?: number;
  dueDate?: string;
  notificationSettings: {
    enabled: boolean;
    intervals: number[];
    urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
    persistUntilComplete: boolean;
    escalateAfterHours: number;
  };
}

export function MobileTasks() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'assigned' | 'created' | 'overdue'>('assigned');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'review' | 'done'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<MobileTask | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MobileTask | null>(null);

  // Fetch user's tasks with optimized settings
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/my-tasks'],
    enabled: false, // Disable until external server has this endpoint
    refetchInterval: false,
    staleTime: 120000, // 2 minutes
    retry: 1,
    onError: (error) => console.error('Tasks fetch error:', error)
  });

  // Fetch workspaces for task creation
  const { data: workspaces = [] } = useQuery({
    queryKey: ['/api/workspaces'],
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
    retry: 1,
    onError: (error) => console.error('Workspaces fetch error:', error)
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user?.id,
    staleTime: 600000, // 10 minutes
    retry: 1,
    onError: (error) => console.error('Users fetch error:', error)
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData: TaskFormData & { workspaceId: number }) => 
      apiRequest('POST', `/api/workspaces/${taskData.workspaceId}/tasks`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      setShowCreateDialog(false);
      toast({ title: 'Task created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<MobileTask> & { id: number }) => 
      apiRequest('PATCH', `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      setEditingTask(null);
      toast({ title: 'Task updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
    },
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest('PATCH', `/api/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      toast({ title: 'Task status updated' });
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: ({ id, settings }: { id: number; settings: any }) => 
      apiRequest('PATCH', `/api/tasks/${id}/notification-settings`, { notificationSettings: settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      setShowNotificationSettings(false);
      toast({ title: 'Notification settings updated' });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      toast({ title: 'Task deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
    },
  });

  // Filter tasks
  const filteredTasks = tasks.filter((task: MobileTask) => {
    let matchesFilter = true;
    
    switch (filter) {
      case 'assigned':
        matchesFilter = task.assignedTo === user?.id;
        break;
      case 'created':
        matchesFilter = task.createdBy === user?.id;
        break;
      case 'overdue':
        matchesFilter = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
        break;
      default:
        matchesFilter = true;
    }
    
    if (statusFilter !== 'all') {
      matchesFilter = matchesFilter && task.status === statusFilter;
    }
    
    return matchesFilter;
  });

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
      case 'todo': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-purple-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Square className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'review': return <Pause className="h-4 w-4" />;
      case 'done': return <CheckCircle className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const defaultNotificationSettings = {
    enabled: true,
    intervals: [15, 30, 60],
    urgencyLevel: 'normal' as const,
    persistUntilComplete: true,
    escalateAfterHours: 24
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="assigned">Assigned to Me</SelectItem>
            <SelectItem value="created">Created by Me</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Count */}
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <span>{filteredTasks.length} tasks</span>
        <span>•</span>
        <span>{filteredTasks.filter(t => t.status === 'todo').length} to do</span>
        <span>•</span>
        <span>{filteredTasks.filter(t => t.status === 'in_progress').length} in progress</span>
        <span>•</span>
        <span>{filteredTasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== 'done').length} overdue</span>
      </div>

      {/* Tasks List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tasks found</div>
          ) : (
            filteredTasks.map((task: MobileTask) => (
              <Card key={task.id} className={`${task.dueDate && isOverdue(task.dueDate) && task.status !== 'done' ? 'border-red-200 bg-red-50' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`p-1 rounded-full ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      </div>
                      
                      <h4 className="font-medium mb-1 pr-2 truncate">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 pr-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                        {task.workspace && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs truncate max-w-24">
                            {task.workspace.name}
                          </span>
                        )}
                        {task.project && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs truncate max-w-24">
                            {task.project.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 flex-wrap">
                        {task.assignee && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-20">{task.assignee.firstName} {task.assignee.lastName}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className={`flex items-center space-x-1 ${isOverdue(task.dueDate) && task.status !== 'done' ? 'text-red-500' : ''}`}>
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">{formatDateTime(task.dueDate)}</span>
                          </div>
                        )}
                        {task.notificationSettings?.enabled && (
                          <Bell className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowNotificationSettings(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this task?')) {
                            deleteTaskMutation.mutate(task.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Quick Status Actions */}
                  <div className="flex space-x-2 flex-wrap">
                    {task.status === 'todo' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'in_progress' })}
                        className="text-xs px-2 py-1 h-7"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'review' })}
                        className="text-xs px-2 py-1 h-7"
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Review
                      </Button>
                    )}
                    {task.status === 'review' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'done' })}
                        className="text-xs px-2 py-1 h-7"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                // Add form handling here
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                rows={3}
                // Add form handling here
              />
            </div>
            
            <div>
              <Label htmlFor="workspace">Workspace</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace: any) => (
                    <SelectItem key={workspace.id} value={workspace.id.toString()}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
              <Label htmlFor="assignee">Assign to</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                // Add form handling here
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button>Create Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Settings Dialog */}
      <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications-enabled">Enable Notifications</Label>
                <Switch
                  id="notifications-enabled"
                  checked={selectedTask.notificationSettings?.enabled ?? true}
                  onCheckedChange={(checked) => {
                    const newSettings = {
                      ...selectedTask.notificationSettings,
                      enabled: checked
                    };
                    updateNotificationsMutation.mutate({
                      id: selectedTask.id,
                      settings: newSettings
                    });
                  }}
                />
              </div>
              
              <div>
                <Label>Reminder Intervals (minutes)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[5, 15, 30, 60, 120, 240].map((interval) => (
                    <Badge
                      key={interval}
                      variant={selectedTask.notificationSettings?.intervals?.includes(interval) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const currentIntervals = selectedTask.notificationSettings?.intervals || [];
                        const newIntervals = currentIntervals.includes(interval)
                          ? currentIntervals.filter(i => i !== interval)
                          : [...currentIntervals, interval];
                        
                        const newSettings = {
                          ...selectedTask.notificationSettings,
                          intervals: newIntervals
                        };
                        updateNotificationsMutation.mutate({
                          id: selectedTask.id,
                          settings: newSettings
                        });
                      }}
                    >
                      {interval}m
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select 
                  value={selectedTask.notificationSettings?.urgencyLevel || 'normal'}
                  onValueChange={(value) => {
                    const newSettings = {
                      ...selectedTask.notificationSettings,
                      urgencyLevel: value
                    };
                    updateNotificationsMutation.mutate({
                      id: selectedTask.id,
                      settings: newSettings
                    });
                  }}
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
              
              <div className="flex items-center justify-between">
                <Label htmlFor="persist">Persist Until Complete</Label>
                <Switch
                  id="persist"
                  checked={selectedTask.notificationSettings?.persistUntilComplete ?? true}
                  onCheckedChange={(checked) => {
                    const newSettings = {
                      ...selectedTask.notificationSettings,
                      persistUntilComplete: checked
                    };
                    updateNotificationsMutation.mutate({
                      id: selectedTask.id,
                      settings: newSettings
                    });
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="escalate">Escalate After (hours)</Label>
                <Input
                  id="escalate"
                  type="number"
                  value={selectedTask.notificationSettings?.escalateAfterHours || 24}
                  onChange={(e) => {
                    const newSettings = {
                      ...selectedTask.notificationSettings,
                      escalateAfterHours: parseInt(e.target.value)
                    };
                    updateNotificationsMutation.mutate({
                      id: selectedTask.id,
                      settings: newSettings
                    });
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}