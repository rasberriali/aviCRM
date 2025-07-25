import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, BellOff, Settings, Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';

interface NotificationSettings {
  enabled: boolean;
  intervals: number[]; // in minutes
  urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
  persistUntilComplete: boolean;
  escalateAfterHours: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showOnLockScreen: boolean;
}

interface TaskNotification {
  id: number;
  taskId: number;
  userId: string;
  type: 'assignment' | 'reminder' | 'escalation' | 'completion';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  read: boolean;
  dismissed: boolean;
  nextReminderAt: string;
  createdAt: string;
  task?: {
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  };
}

interface NotificationPreferences {
  taskAssignments: boolean;
  taskReminders: boolean;
  taskEscalations: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  defaultIntervals: number[];
  maxNotificationsPerHour: number;
}

export function MobileNotificationManager() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [newInterval, setNewInterval] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check notification permissions on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Fetch notification preferences
  const { data: preferences = getDefaultPreferences(), isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/notification-preferences', user?.id],
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
    retry: false,
    onError: (error) => {
      console.error('Notification preferences fetch error:', error);
    }
  });

  // Fetch active notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications', user?.id],
    enabled: false, // Disable until external server has this endpoint
    staleTime: 60000, // 1 minute for notifications
    refetchInterval: false,
    retry: false,
    onError: (error) => {
      console.error('Notifications fetch error:', error);
    }
  });

  // Fetch user's tasks for notification setup
  const { data: userTasks = [] } = useQuery({
    queryKey: ['/api/my-tasks'],
    enabled: false, // Disable until external server has this endpoint
    staleTime: 300000,
    retry: false
  });

  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (updatedPreferences: Partial<NotificationPreferences>) => 
      apiRequest('PATCH', `/api/notification-preferences/${user?.id}`, updatedPreferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({ title: 'Notification preferences updated' });
    },
    onError: (error) => {
      toast({ title: 'Error updating preferences', description: error.message, variant: 'destructive' });
    }
  });

  // Update task notification settings mutation
  const updateTaskNotificationsMutation = useMutation({
    mutationFn: ({ taskId, settings }: { taskId: number; settings: NotificationSettings }) => 
      apiRequest('PATCH', `/api/tasks/${taskId}/notifications`, { notificationSettings: settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({ title: 'Task notification settings updated' });
    }
  });

  // Mark notification as read mutation
  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}`, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Dismiss notification mutation
  const dismissNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}`, { dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Test notification mutation
  const testNotificationMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', '/api/notifications/test', { userId: user?.id }),
    onSuccess: () => {
      toast({ title: 'Test notification sent' });
    }
  });

  function getDefaultPreferences(): NotificationPreferences {
    return {
      taskAssignments: true,
      taskReminders: true,
      taskEscalations: true,
      emailNotifications: true,
      pushNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      defaultIntervals: [5, 15, 30, 60], // 5min, 15min, 30min, 1hr
      maxNotificationsPerHour: 6
    };
  }

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({ title: 'Notifications enabled', description: 'You will now receive task notifications' });
      }
    }
  };

  // Show browser notification
  const showBrowserNotification = (title: string, options: NotificationOptions = {}) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options
      });
    }
  };

  // Create aggressive notification settings for a task
  const createAggressiveNotifications = (taskId: number) => {
    const aggressiveSettings: NotificationSettings = {
      enabled: true,
      intervals: [1, 5, 15, 30, 60, 120], // Every 1min, 5min, 15min, 30min, 1hr, 2hr
      urgencyLevel: 'critical',
      persistUntilComplete: true,
      escalateAfterHours: 2,
      soundEnabled: true,
      vibrationEnabled: true,
      showOnLockScreen: true
    };

    updateTaskNotificationsMutation.mutate({ taskId, settings: aggressiveSettings });
  };

  const unreadCount = notifications.filter((n: TaskNotification) => !n.read).length;
  const overdueNotifications = notifications.filter((n: TaskNotification) => 
    n.type === 'reminder' && n.task?.dueDate && new Date(n.task.dueDate) < new Date()
  );

  return (
    <div className="space-y-4">
      {/* Header with notification count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {notificationPermission !== 'granted' && (
            <Button
              variant="default"
              size="sm"
              onClick={requestNotificationPermission}
            >
              Enable
            </Button>
          )}
        </div>
      </div>

      {/* Notification permission status */}
      {notificationPermission === 'denied' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <BellOff className="h-4 w-4" />
              <span className="text-sm">Notifications are blocked. Enable them in your browser settings.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue tasks alert */}
      {overdueNotifications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {overdueNotifications.length} overdue task{overdueNotifications.length > 1 ? 's' : ''} need attention
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions for tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Task Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {userTasks.filter((task: any) => task.status !== 'done').slice(0, 3).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex-1">
                <div className="font-medium text-sm truncate">{task.title}</div>
                <div className="text-xs text-gray-500">
                  {task.notificationSettings?.enabled ? 'Notifications ON' : 'Notifications OFF'}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => createAggressiveNotifications(task.id)}
                  className="h-7 px-2 text-xs"
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Aggressive
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTask(task);
                    setShowSettings(true);
                  }}
                  className="h-7 w-7 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active notifications */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm">Active Notifications</h3>
        {notificationsLoading ? (
          <div className="text-center py-4 text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-4">
              <div className="text-center py-4 text-gray-500">
                No active notifications
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification: TaskNotification) => (
            <Card key={notification.id} className={`${!notification.read ? 'border-blue-200 bg-blue-50' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={
                        notification.priority === 'critical' ? 'destructive' :
                        notification.priority === 'high' ? 'default' :
                        'secondary'
                      } className="text-xs">
                        {notification.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {notification.type}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm mb-1">{notification.title}</div>
                    <div className="text-xs text-gray-600 mb-2">{notification.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationReadMutation.mutate(notification.id)}
                        className="h-7 px-2 text-xs"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotificationMutation.mutate(notification.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Global preferences */}
            <div className="space-y-3">
              <h4 className="font-medium">Global Preferences</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => {
                    updatePreferencesMutation.mutate({ pushNotifications: checked });
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="task-assignments">Task Assignments</Label>
                <Switch
                  id="task-assignments"
                  checked={preferences.taskAssignments}
                  onCheckedChange={(checked) => {
                    updatePreferencesMutation.mutate({ taskAssignments: checked });
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="task-reminders">Task Reminders</Label>
                <Switch
                  id="task-reminders"
                  checked={preferences.taskReminders}
                  onCheckedChange={(checked) => {
                    updatePreferencesMutation.mutate({ taskReminders: checked });
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="task-escalations">Task Escalations</Label>
                <Switch
                  id="task-escalations"
                  checked={preferences.taskEscalations}
                  onCheckedChange={(checked) => {
                    updatePreferencesMutation.mutate({ taskEscalations: checked });
                  }}
                />
              </div>
            </div>

            {/* Default intervals */}
            <div className="space-y-3">
              <h4 className="font-medium">Default Reminder Intervals</h4>
              <div className="flex flex-wrap gap-2">
                {[1, 5, 15, 30, 60, 120, 240, 480].map((interval) => (
                  <Badge
                    key={interval}
                    variant={preferences.defaultIntervals?.includes(interval) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const currentIntervals = preferences.defaultIntervals || [];
                      const newIntervals = currentIntervals.includes(interval)
                        ? currentIntervals.filter(i => i !== interval)
                        : [...currentIntervals, interval];
                      updatePreferencesMutation.mutate({ defaultIntervals: newIntervals });
                    }}
                  >
                    {interval < 60 ? `${interval}m` : `${interval / 60}h`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quiet hours */}
            <div className="space-y-3">
              <h4 className="font-medium">Quiet Hours</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                <Switch
                  id="quiet-hours"
                  checked={preferences.quietHours?.enabled}
                  onCheckedChange={(checked) => {
                    updatePreferencesMutation.mutate({ 
                      quietHours: { ...preferences.quietHours, enabled: checked }
                    });
                  }}
                />
              </div>
              
              {preferences.quietHours?.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => {
                        updatePreferencesMutation.mutate({ 
                          quietHours: { ...preferences.quietHours, start: e.target.value }
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => {
                        updatePreferencesMutation.mutate({ 
                          quietHours: { ...preferences.quietHours, end: e.target.value }
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test notification */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => testNotificationMutation.mutate()}
              >
                <Bell className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}