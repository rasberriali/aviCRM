import React, { useState } from 'react';
import { Activity, Clock, User, FolderOpen, CheckSquare, Edit, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'project_created' | 'project_updated' | 
        'comment_added' | 'file_uploaded' | 'user_assigned' | 'status_changed';
  userId: string;
  userName: string;
  targetType: 'task' | 'project' | 'workspace' | 'file';
  targetId: string;
  targetName: string;
  description: string;
  details?: any;
  timestamp: Date;
  workspaceId?: string;
  projectId?: string;
}

interface ActivityFeedProps {
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  limit?: number;
  showFilters?: boolean;
}

export function ActivityFeed({ 
  workspaceId, 
  projectId, 
  taskId, 
  limit = 20,
  showFilters = true 
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('week');

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (workspaceId) queryParams.append('workspaceId', workspaceId);
  if (projectId) queryParams.append('projectId', projectId);
  if (taskId) queryParams.append('taskId', taskId);
  if (filter !== 'all') queryParams.append('type', filter);
  if (timeRange !== 'all') queryParams.append('timeRange', timeRange);
  queryParams.append('limit', limit.toString());

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activities', queryParams.toString()],
    refetchInterval: 60000, // Refresh every minute
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created':
      case 'task_updated':
      case 'task_completed':
        return <CheckSquare className="h-4 w-4" />;
      case 'project_created':
      case 'project_updated':
        return <FolderOpen className="h-4 w-4" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'file_uploaded':
        return <Plus className="h-4 w-4" />;
      case 'user_assigned':
        return <User className="h-4 w-4" />;
      case 'status_changed':
        return <Edit className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task_created':
      case 'project_created':
        return 'text-green-600';
      case 'task_completed':
        return 'text-blue-600';
      case 'task_updated':
      case 'project_updated':
      case 'status_changed':
        return 'text-orange-600';
      case 'comment_added':
        return 'text-purple-600';
      case 'file_uploaded':
        return 'text-indigo-600';
      case 'user_assigned':
        return 'text-pink-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatActivityType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const groups: { [key: string]: ActivityItem[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString();
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });
    
    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>
          Recent changes and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          {showFilters && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Type:</label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="task_created">Tasks Created</SelectItem>
                    <SelectItem value="task_updated">Tasks Updated</SelectItem>
                    <SelectItem value="task_completed">Tasks Completed</SelectItem>
                    <SelectItem value="project_created">Projects Created</SelectItem>
                    <SelectItem value="comment_added">Comments</SelectItem>
                    <SelectItem value="file_uploaded">File Uploads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Time:</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Activity List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {Object.entries(groupedActivities).length > 0 ? (
                Object.entries(groupedActivities).map(([date, dateActivities]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-gray-700">{date}</h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    
                    <div className="space-y-3">
                      {dateActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(activity.userName)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`${getActivityColor(activity.type)}`}>
                                {getActivityIcon(activity.type)}
                              </div>
                              <span className="font-medium text-sm">{activity.userName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {formatActivityType(activity.type)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-1">
                              {activity.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {activity.targetName}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(new Date(activity.timestamp))}
                              </span>
                            </div>

                            {/* Additional details if available */}
                            {activity.details && (
                              <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                {typeof activity.details === 'string' 
                                  ? activity.details 
                                  : JSON.stringify(activity.details)
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No activity found</p>
                  <p className="text-sm mt-1">Recent changes will appear here</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for creating activity entries
export function useActivityLogger() {
  const logActivity = async (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    try {
      // This would typically be called automatically by the backend
      // when actions are performed, but can also be triggered manually
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activity,
          timestamp: new Date()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to log activity');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  };

  return { logActivity };
}