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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  BellOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Settings, 
  Plus,
  Trash2
} from 'lucide-react';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { useToast } from '@/hooks/use-toast';

interface MobileNotification {
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

interface NotificationSettings {
  enabled: boolean;
  intervals: number[];
  urgencyLevel: 'low' | 'normal' | 'high' | 'critical';
  persistUntilComplete: boolean;
  escalateAfterHours: number;
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
}

export function MobileNotifications() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [newInterval, setNewInterval] = useState('');

  // Fetch notifications with reduced polling
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications', user?.id],
    enabled: false, // Disable until external server has this endpoint
    refetchInterval: false, // Disable automatic polling
    staleTime: 300000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
    onError: (error) => {
      console.error('Notifications fetch error:', error);
    }
  });

  // Fetch notification preferences
  const { data: preferences, isLoading: loadingPrefs } = useQuery({
    queryKey: ['/api/notification-preferences', user?.id],
    enabled: !!user?.id,
    staleTime: 300000, // Consider preferences fresh for 5 minutes
    retry: 1,
    onError: (error) => {
      console.error('Notification preferences fetch error:', error);
    }
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}`, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Dismiss notification
  const dismissMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}`, { dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Update notification preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (newPrefs: Partial<NotificationPreferences>) => 
      apiRequest('PATCH', `/api/notification-preferences/${user?.id}`, newPrefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
      toast({ title: 'Notification preferences updated' });
    },
  });

  // Update task notification settings
  const updateTaskNotificationsMutation = useMutation({
    mutationFn: ({ taskId, settings }: { taskId: number; settings: NotificationSettings }) => 
      apiRequest('PATCH', `/api/tasks/${taskId}/notification-settings`, { notificationSettings: settings }),
    onSuccess: () => {
      toast({ title: 'Task notification settings updated' });
    },
  });

  const unreadCount = notifications.filter((n: MobileNotification) => !n.read).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <Plus className="h-4 w-4" />;
      case 'reminder': return <Clock className="h-4 w-4" />;
      case 'escalation': return <AlertTriangle className="h-4 w-4" />;
      case 'completion': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isWithinQuietHours = (preferences: NotificationPreferences) => {
    if (!preferences?.quietHours?.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Notification Settings</DialogTitle>
            </DialogHeader>
            
            {loadingPrefs ? (
              <div className="text-center py-4">Loading preferences...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-assignments">Task Assignments</Label>
                  <Switch
                    id="task-assignments"
                    checked={preferences?.taskAssignments ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ taskAssignments: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-reminders">Task Reminders</Label>
                  <Switch
                    id="task-reminders"
                    checked={preferences?.taskReminders ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ taskReminders: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-escalations">Task Escalations</Label>
                  <Switch
                    id="task-escalations"
                    checked={preferences?.taskEscalations ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ taskEscalations: checked })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <Switch
                    id="push-notifications"
                    checked={preferences?.pushNotifications ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ pushNotifications: checked })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Quiet Hours</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={preferences?.quietHours?.enabled ?? false}
                      onCheckedChange={(checked) => 
                        updatePreferencesMutation.mutate({ 
                          quietHours: { 
                            ...preferences?.quietHours, 
                            enabled: checked 
                          } 
                        })
                      }
                    />
                    <span className="text-sm text-gray-600">Enable quiet hours</span>
                  </div>
                  
                  {preferences?.quietHours?.enabled && (
                    <div className="flex space-x-2">
                      <Input
                        type="time"
                        value={preferences?.quietHours?.start || '22:00'}
                        onChange={(e) => 
                          updatePreferencesMutation.mutate({ 
                            quietHours: { 
                              ...preferences?.quietHours, 
                              start: e.target.value 
                            } 
                          })
                        }
                        className="flex-1"
                      />
                      <Input
                        type="time"
                        value={preferences?.quietHours?.end || '08:00'}
                        onChange={(e) => 
                          updatePreferencesMutation.mutate({ 
                            quietHours: { 
                              ...preferences?.quietHours, 
                              end: e.target.value 
                            } 
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Quiet Hours Indicator */}
      {isWithinQuietHours(preferences) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-yellow-700">
              <BellOff className="h-4 w-4" />
              <span className="text-sm">Quiet hours active</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No notifications</div>
          ) : (
            notifications.map((notification: MobileNotification) => (
              <Card 
                key={notification.id} 
                className={`transition-all ${
                  notification.read ? 'opacity-75' : 'border-l-4 border-l-blue-500'
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`p-1 rounded-full ${getPriorityColor(notification.priority)}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {notification.type}
                        </Badge>
                        <Badge 
                          variant={notification.priority === 'critical' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      
                      <h4 className="font-medium mb-1">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      
                      {notification.task && (
                        <div className="text-xs text-gray-500 mb-2">
                          Task: {notification.task.title}
                          {notification.task.dueDate && (
                            <span> • Due: {formatTime(notification.task.dueDate)}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(notification.createdAt)}</span>
                        {notification.nextReminderAt && (
                          <span>• Next reminder: {formatTime(notification.nextReminderAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissMutation.mutate(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}