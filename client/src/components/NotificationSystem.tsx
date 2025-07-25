import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertCircle, CheckCircle, Info, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: string;
  type: 'task_assigned' | 'task_due' | 'task_overdue' | 'project_update' | 'comment' | 'mention';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  userId: string;
  actionUrl?: string;
}

interface NotificationSettings {
  taskAssignments: boolean;
  dueDates: boolean;
  projectUpdates: boolean;
  comments: boolean;
  mentions: boolean;
  emailNotifications: boolean;
  desktopNotifications: boolean;
}

interface NotificationSystemProps {
  userId: string;
  onNavigate?: (url: string) => void;
}

export function NotificationSystem({ userId, onNavigate }: NotificationSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    taskAssignments: true,
    dueDates: true,
    projectUpdates: true,
    comments: true,
    mentions: true,
    emailNotifications: false,
    desktopNotifications: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications', userId],
    enabled: false, // Disable until external server has this endpoint
    refetchInterval: false, // Disable automatic polling
  });

  // Fetch notification settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/notification-settings', userId],
    onSuccess: (data) => {
      if (data) {
        setSettings(data);
      }
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('PUT', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PUT', `/api/notifications/mark-all-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      return apiRequest('PUT', `/api/notification-settings/${userId}`, newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Notification preferences have been saved"
      });
    }
  });

  // Request desktop notification permission
  useEffect(() => {
    if (settings.desktopNotifications && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [settings.desktopNotifications]);

  // Show desktop notifications for new notifications
  useEffect(() => {
    if (!settings.desktopNotifications || !('Notification' in window)) return;

    const unreadNotifications = notifications.filter((n: Notification) => !n.read);
    const latestNotification = unreadNotifications[0];

    if (latestNotification && Notification.permission === 'granted') {
      const notification = new Notification(latestNotification.title, {
        body: latestNotification.message,
        icon: '/favicon.ico',
        tag: latestNotification.id
      });

      notification.onclick = () => {
        if (latestNotification.actionUrl && onNavigate) {
          onNavigate(latestNotification.actionUrl);
        }
        markAsReadMutation.mutate(latestNotification.id);
      };
    }
  }, [notifications, settings.desktopNotifications, onNavigate, markAsReadMutation]);

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleSettingsUpdate = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'task_due':
      case 'task_overdue':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'project_update':
        return <Info className="h-4 w-4 text-green-500" />;
      case 'comment':
      case 'mention':
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {notifications.length > 0 ? (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{notification.title}</span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Notification Settings</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-assignments" className="text-sm">Task Assignments</Label>
                <Switch
                  id="task-assignments"
                  checked={settings.taskAssignments}
                  onCheckedChange={(checked) => handleSettingsUpdate('taskAssignments', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="due-dates" className="text-sm">Due Dates</Label>
                <Switch
                  id="due-dates"
                  checked={settings.dueDates}
                  onCheckedChange={(checked) => handleSettingsUpdate('dueDates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="project-updates" className="text-sm">Project Updates</Label>
                <Switch
                  id="project-updates"
                  checked={settings.projectUpdates}
                  onCheckedChange={(checked) => handleSettingsUpdate('projectUpdates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="desktop-notifications" className="text-sm">Desktop Notifications</Label>
                <Switch
                  id="desktop-notifications"
                  checked={settings.desktopNotifications}
                  onCheckedChange={(checked) => handleSettingsUpdate('desktopNotifications', checked)}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for creating notifications
export function useNotifications() {
  const queryClient = useQueryClient();

  const createNotification = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      return apiRequest('POST', '/api/notifications', {
        ...notification,
        createdAt: new Date(),
        read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  return {
    createNotification: createNotification.mutate,
    isCreating: createNotification.isPending
  };
}