import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge,
} from "@/components/ui/badge";
import { CheckSquare, Plus, Edit3, Trash2, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  estimatedHours?: number;
  actualHours: number;
  dueDate?: string;
  projectId: number | string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface Project {
  id: number | string;
  name: string;
  description?: string;
  clientName?: string;
  status: string;
  category: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface TaskManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800'
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function TaskManagementModal({ isOpen, onClose, project }: TaskManagementModalProps) {
  // Don't render if no project is selected
  if (!project) {
    return null;
  }
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as const,
    priority: 'medium' as const,
    assignedTo: '',
    estimatedHours: 0,
    dueDate: ''
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const queryClient = useQueryClient();

  // Fetch tasks for this project
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks', { projectId: project?.id }],
    enabled: isOpen && !!project?.id
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: isOpen
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      if (!project?.id) throw new Error('No project selected');
      return apiRequest('/api/tasks', 'POST', {
        ...taskData,
        projectId: project.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedTo: '',
        estimatedHours: 0,
        dueDate: ''
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number, updates: any }) => {
      return apiRequest(`/api/tasks/${taskId}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingTask(null);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest(`/api/tasks/${taskId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    }
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;
    
    createTaskMutation.mutate({
      ...newTask,
      estimatedHours: newTask.estimatedHours || 0,
      dueDate: newTask.dueDate || null
    });
  };

  const handleUpdateTask = (task: Task, updates: Partial<Task>) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      updates
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getUserName = (userId: string) => {
    const user = (users as User[]).find((u: User) => u.id === userId);
    if (!user) return userId;
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.email || userId;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 p-6 border-b bg-white">
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Task Management - {project?.name || 'Unknown Project'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden min-h-0">
          {/* Form Section - Left Column */}
          <div className="flex flex-col min-h-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Task
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-title">Task Title</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <Label htmlFor="task-assigned">Assign To</Label>
                  <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask(prev => ({ ...prev, assignedTo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users as User[]).map((user: User) => (
                        <SelectItem key={user.id} value={user.id}>
                          {getUserName(user.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Task description (optional)"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="task-status">Status</Label>
                  <Select value={newTask.status} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}>
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
                  <Label htmlFor="task-hours">Est. Hours</Label>
                  <Input
                    id="task-hours"
                    type="number"
                    min="0"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="task-due">Due Date</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleCreateTask} 
                disabled={!newTask.title.trim() || createTaskMutation.isPending}
                className="w-full"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List Section - Right Column */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-lg font-semibold mb-3 shrink-0">Project Tasks ({(tasks as Task[]).length})</h3>
            <div className="flex-1 border rounded-lg bg-gray-50/50 flex flex-col overflow-hidden min-h-0">
              {tasksLoading ? (
                <div className="flex items-center justify-center h-32">Loading tasks...</div>
              ) : (tasks as Task[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <CheckSquare className="h-8 w-8 mb-2 opacity-30" />
                  <p>No tasks created yet</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(tasks as Task[]).map((task: Task) => (
                    <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-sm truncate">{task.title}</h4>
                              <div className="flex gap-1">
                                <Badge className={`${statusColors[task.status]} text-xs px-1 py-0`}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                                <Badge className={`${priorityColors[task.priority]} text-xs px-1 py-0`}>
                                  {task.priority}
                                </Badge>
                              </div>
                            </div>
                            
                            {task.description && (
                              <p className="text-xs text-gray-600 mb-1 line-clamp-2">{task.description}</p>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                              {task.assignedTo && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-20">{getUserName(task.assignedTo)}</span>
                                </div>
                              )}
                              {task.estimatedHours && task.estimatedHours > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedHours}h
                                </div>
                              )}
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.dueDate), 'MMM dd')}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Select
                              value={task.status}
                              onValueChange={(value: any) => handleUpdateTask(task, { status: value })}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTask(task)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}