// Mobile-specific endpoints for push notifications and task management
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

function setupMobileEndpoints(app) {
  // Register FCM token for push notifications
  app.post('/api/mobile/register-token', async (req, res) => {
    try {
      const { userId, fcmToken, platform, appVersion } = req.body;
      
      console.log(`[MOBILE] Registering FCM token for user ${userId}`);
      
      // Store FCM token
      const tokenData = {
        userId,
        fcmToken,
        platform,
        appVersion,
        registeredAt: new Date().toISOString()
      };
      
      // Read existing tokens
      let tokens = [];
      try {
        const tokenFile = path.join(__dirname, 'fcm_tokens.json');
        const data = await fs.readFile(tokenFile, 'utf8');
        tokens = JSON.parse(data);
      } catch (error) {
        console.log('[MOBILE] Creating new FCM tokens file');
      }
      
      // Remove old token for this user if exists
      tokens = tokens.filter(t => t.userId !== userId);
      
      // Add new token
      tokens.push(tokenData);
      
      // Save tokens
      await fs.writeFile(
        path.join(__dirname, 'fcm_tokens.json'),
        JSON.stringify(tokens, null, 2)
      );
      
      res.json({ success: true, message: 'FCM token registered' });
    } catch (error) {
      console.error('[MOBILE] Error registering FCM token:', error);
      res.status(500).json({ error: 'Failed to register FCM token' });
    }
  });

  // Get pending notifications for a user
  app.get('/api/mobile/notifications/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      console.log(`[MOBILE] Fetching notifications for user ${userId}`);
      
      // Read pending notifications
      let notifications = [];
      try {
        const notifFile = path.join(__dirname, 'pending_notifications.json');
        const data = await fs.readFile(notifFile, 'utf8');
        const allNotifications = JSON.parse(data);
        
        // Filter notifications for this user
        notifications = allNotifications.filter(n => 
          n.employeeId === userId && !n.delivered
        );
        
        // Mark as delivered
        const updatedNotifications = allNotifications.map(n => 
          (n.employeeId === userId && !n.delivered) 
            ? { ...n, delivered: true, deliveredAt: new Date().toISOString() }
            : n
        );
        
        await fs.writeFile(notifFile, JSON.stringify(updatedNotifications, null, 2));
        
      } catch (error) {
        console.log('[MOBILE] No pending notifications file found');
      }
      
      res.json({ notifications });
    } catch (error) {
      console.error('[MOBILE] Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Send push notification to specific user
  app.post('/api/mobile/send-notification', async (req, res) => {
    try {
      const { 
        employeeId, 
        title, 
        message, 
        type, 
        priority = 'normal',
        taskId,
        projectName,
        dueDate 
      } = req.body;
      
      console.log(`[MOBILE] Sending notification to user ${employeeId}: ${title}`);
      
      // Create notification object
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        title,
        message,
        type,
        priority,
        taskId,
        projectName,
        dueDate,
        createdAt: new Date().toISOString(),
        delivered: false
      };
      
      // Store in pending notifications
      let pendingNotifications = [];
      try {
        const notifFile = path.join(__dirname, 'pending_notifications.json');
        const data = await fs.readFile(notifFile, 'utf8');
        pendingNotifications = JSON.parse(data);
      } catch (error) {
        console.log('[MOBILE] Creating new pending notifications file');
      }
      
      pendingNotifications.push(notification);
      
      await fs.writeFile(
        path.join(__dirname, 'pending_notifications.json'),
        JSON.stringify(pendingNotifications, null, 2)
      );
      
      // Also try to send via WebSocket if connected
      try {
        // This would integrate with your existing WebSocket system
        // For now, we'll just log it
        console.log(`[MOBILE] WebSocket notification sent: ${type} to ${employeeId}`);
      } catch (wsError) {
        console.log('[MOBILE] WebSocket not available, notification queued');
      }
      
      res.json({ success: true, notificationId: notification.id });
    } catch (error) {
      console.error('[MOBILE] Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // Get app version for auto-update checks
  app.get('/api/mobile/version', (req, res) => {
    res.json({ 
      version: '1.0.3', // Increment this when you want to trigger updates
      minVersion: '1.0.0',
      updateRequired: false,
      downloadUrl: '/api/download/release-apk'
    });
  });

  // Force update endpoint
  app.get('/api/mobile/force-update', (req, res) => {
    res.json({ 
      forceUpdate: true,
      version: '1.0.3',
      message: 'This update includes critical bug fixes and new features.',
      downloadUrl: '/api/download/release-apk'
    });
  });

  // Get task assignments for mobile user
  app.get('/api/mobile/tasks/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      console.log(`[MOBILE] Fetching tasks for user ${userId}`);
      
      // Read task assignments
      let taskAssignments = [];
      try {
        const tasksFile = path.join(__dirname, 'task_assignments.json');
        const data = await fs.readFile(tasksFile, 'utf8');
        const allTasks = JSON.parse(data);
        
        // Filter tasks for this user
        taskAssignments = allTasks.filter(task => 
          task.employeeId === userId && task.status !== 'completed'
        );
        
      } catch (error) {
        console.log('[MOBILE] No task assignments file found');
      }
      
      res.json({ tasks: taskAssignments });
    } catch (error) {
      console.error('[MOBILE] Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Update task status from mobile
  app.patch('/api/mobile/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { status, actualHours, notes } = req.body;
      
      console.log(`[MOBILE] Updating task ${taskId} status to ${status}`);
      
      // Read and update task assignments
      const tasksFile = path.join(__dirname, 'task_assignments.json');
      let taskAssignments = [];
      
      try {
        const data = await fs.readFile(tasksFile, 'utf8');
        taskAssignments = JSON.parse(data);
      } catch (error) {
        return res.status(404).json({ error: 'Task assignments not found' });
      }
      
      // Find and update the task
      const taskIndex = taskAssignments.findIndex(task => task.id === parseInt(taskId));
      
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Update task
      taskAssignments[taskIndex] = {
        ...taskAssignments[taskIndex],
        status,
        actualHours: actualHours || taskAssignments[taskIndex].actualHours,
        notes: notes || taskAssignments[taskIndex].notes,
        updatedAt: new Date().toISOString(),
        completedAt: status === 'completed' ? new Date().toISOString() : null
      };
      
      // Save updated tasks
      await fs.writeFile(tasksFile, JSON.stringify(taskAssignments, null, 2));
      
      // Send notification to managers about task completion
      if (status === 'completed') {
        const completedTask = taskAssignments[taskIndex];
        
        // Create manager notification
        const managerNotification = {
          id: `task_complete_${Date.now()}`,
          employeeId: 'managers', // Special ID for all managers
          title: '✅ Task Completed',
          message: `${completedTask.title} has been completed`,
          type: 'TASK_COMPLETED',
          priority: 'normal',
          taskId: parseInt(taskId),
          projectName: completedTask.projectName,
          createdAt: new Date().toISOString(),
          delivered: false
        };
        
        // Store manager notification
        let pendingNotifications = [];
        try {
          const notifFile = path.join(__dirname, 'pending_notifications.json');
          const data = await fs.readFile(notifFile, 'utf8');
          pendingNotifications = JSON.parse(data);
        } catch (error) {
          // File doesn't exist, that's ok
        }
        
        pendingNotifications.push(managerNotification);
        
        await fs.writeFile(
          path.join(__dirname, 'pending_notifications.json'),
          JSON.stringify(pendingNotifications, null, 2)
        );
      }
      
      res.json({ success: true, task: taskAssignments[taskIndex] });
    } catch (error) {
      console.error('[MOBILE] Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  console.log('[MOBILE] Mobile endpoints initialized');
}

export { setupMobileEndpoints };