import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Clock, CheckCircle, AlertCircle, Calendar, User, FileText, Play, Pause, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'assigned' | 'in_progress' | 'completed' | 'on_hold';
  projectId: number;
  projectName: string;
  employeeId: string;
  estimatedHours: number;
  actualHours: number;
  dueDate: string;
  assignedAt: string;
  assignedBy: string;
  notes?: string;
  notificationInterval?: string;
}

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
    case 'completed': return 'text-green-600';
    case 'in_progress': return 'text-blue-600';
    case 'on_hold': return 'text-yellow-600';
    case 'assigned': return 'text-gray-600';
    default: return 'text-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'in_progress': return Play;
    case 'on_hold': return Pause;
    case 'assigned': return Clock;
    default: return AlertCircle;
  }
};

export function TaskDashboard({ userId }: { userId: string }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateData, setUpdateData] = useState({
    status: '',
    actualHours: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['/api/user', userId, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/user/${userId}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds for new tasks
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/user/${userId}/tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user', userId, 'tasks'] });
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully',
      });
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTaskUpdate = (task: Task) => {
    setSelectedTask(task);
    setUpdateData({
      status: task.status,
      actualHours: task.actualHours?.toString() || '',
      notes: task.notes || ''
    });
  };

  const submitTaskUpdate = () => {
    if (!selectedTask) return;

    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      data: {
        status: updateData.status,
        actualHours: parseFloat(updateData.actualHours) || 0,
        notes: updateData.notes
      }
    });
  };

  // Show notification for new tasks
  useEffect(() => {
    if (tasks.length > 0) {
      const newTasks = tasks.filter(task => 
        task.status === 'assigned' && 
        new Date(task.assignedAt).getTime() > Date.now() - 60000 // Last minute
      );
      
      if (newTasks.length > 0) {
        toast({
          title: 'New Task Assigned',
          description: `You have ${newTasks.length} new task(s) assigned to you`,
        });
      }
    }
  }, [tasks, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading your tasks...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Unable to load tasks. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeTasks = tasks.filter(task => task.status !== 'completed');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            My Tasks ({activeTasks.length} active)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active tasks assigned
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map((task) => {
                const StatusIcon = getStatusIcon(task.status);
                return (
                  <Card key={task.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${getStatusColor(task.status)}`} />
                            <h3 className="font-semibold">{task.title}</h3>
                            <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {task.projectName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimatedHours}h estimated
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              From: {task.assignedBy}
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTaskUpdate(task)}
                            >
                              Update
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Update Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                  value={updateData.status}
                                  onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="assigned">Assigned</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Actual Hours</label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={updateData.actualHours}
                                  onChange={(e) => setUpdateData(prev => ({ ...prev, actualHours: e.target.value }))}
                                  placeholder="Enter actual hours"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                  value={updateData.notes}
                                  onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Add any notes or updates..."
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={submitTaskUpdate}
                                  disabled={updateTaskMutation.isPending}
                                  className="flex-1"
                                >
                                  {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Completed Tasks ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{task.title}</span>
                    <Badge variant="outline">{task.projectName}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {task.actualHours}h completed
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}