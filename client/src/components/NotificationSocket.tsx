import { useEffect, useRef } from 'react';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { useToast } from '@/hooks/use-toast';

interface NotificationData {
  type: string;
  data: any;
}

export function NotificationSocket() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WEBSOCKET] Connecting to ${wsUrl} for user ${user.id}`);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WEBSOCKET] Connected successfully');
        
        // Authenticate user for targeted notifications
        wsRef.current?.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const notification: NotificationData = JSON.parse(event.data);
          console.log('[WEBSOCKET] Received notification:', notification);
          
          switch (notification.type) {
            case 'connection_established':
              console.log('[WEBSOCKET] Connection established:', notification.message);
              break;
            case 'task_update':
              handleTaskUpdateNotification(notification);
              break;
            case 'unread_notifications':
              handleUnreadNotifications(notification);
              break;
            case 'task_assigned':
              handleTaskAssignedNotification(notification.data);
              break;
            case 'task_reminder':
              handleTaskReminderNotification(notification.data);
              break;
            case 'file_system_change':
              // Handle file system changes if needed
              break;
            default:
              console.log('[WEBSOCKET] Unknown notification type:', notification.type);
          }
        } catch (error) {
          console.error('[WEBSOCKET] Error parsing notification:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('[WEBSOCKET] Connection closed, attempting to reconnect...');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('[WEBSOCKET] Connection error:', error);
      };
    };

    const handleTaskUpdateNotification = (data: any) => {
      toast({
        title: "🎯 New Task Assigned",
        description: `${data.title} - ${data.projectName}`,
        duration: 8000,
      });
      
      // Trigger a refresh of the task dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    const handleUnreadNotifications = (data: any) => {
      if (data.count > 0) {
        toast({
          title: "📋 Unread Notifications",
          description: `You have ${data.count} unread task assignments`,
          duration: 10000,
        });
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  const handleTaskAssignedNotification = (data: any) => {
    console.log('[NOTIFICATION] Task assigned:', data);
    
    // Show toast notification
    toast({
      title: 'New Task Assigned',
      description: `You have been assigned "${data.taskTitle}" by ${data.assignedBy}`,
      duration: 10000,
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('New Task Assigned', {
        body: `"${data.taskTitle}" - Priority: ${data.priority}`,
        icon: '/favicon.ico'
      });
    }
  };

  const handleTaskReminderNotification = (data: any) => {
    console.log('[NOTIFICATION] Task reminder:', data);
    
    toast({
      title: 'Task Reminder',
      description: `Don't forget: "${data.taskTitle}" is due soon`,
      duration: 8000,
    });

    if (Notification.permission === 'granted') {
      new Notification('Task Reminder', {
        body: `"${data.taskTitle}" - Priority: ${data.priority}`,
        icon: '/favicon.ico'
      });
    }
  };

  return null; // This component doesn't render anything
}