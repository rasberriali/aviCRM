import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Timer, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface TimeEntry {
  id: string;
  taskId?: string;
  taskName?: string;
  projectId?: string;
  projectName?: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isActive: boolean;
}

interface TimeTrackerProps {
  taskId?: string;
  projectId?: string;
  workspaceId?: string;
}

export function TimeTracker({ taskId, projectId, workspaceId }: TimeTrackerProps) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [description, setDescription] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch time entries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['/api/time-entries', { taskId, projectId, workspaceId }],
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch task/project info for estimated time
  const { data: taskInfo } = useQuery({
    queryKey: taskId ? ['/api/workspace-tasks', taskId] : undefined,
    enabled: !!taskId,
  });

  const { data: projectInfo } = useQuery({
    queryKey: projectId ? ['/api/workspace-projects', projectId] : undefined,
    enabled: !!projectId && !taskId,
  });

  useEffect(() => {
    if (taskInfo?.estimatedHours) {
      setEstimatedTime(taskInfo.estimatedHours * 3600); // Convert to seconds
    } else if (projectInfo?.estimatedHours) {
      setEstimatedTime(projectInfo.estimatedHours * 3600);
    }
  }, [taskInfo, projectInfo]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeEntry) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeEntry.startTime.getTime()) / 1000);
        setCurrentTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: Partial<TimeEntry>) => {
      return apiRequest('POST', '/api/time-entries', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating time entry",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: async (data: { id: string; entry: Partial<TimeEntry> }) => {
      return apiRequest('PUT', `/api/time-entries/${data.id}`, data.entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating time entry",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const startTimer = () => {
    if (activeEntry) return;

    const newEntry: Partial<TimeEntry> = {
      taskId,
      projectId,
      description: description || 'Working on task',
      startTime: new Date(),
      isActive: true,
      duration: 0
    };

    createTimeEntryMutation.mutate(newEntry);
    
    setActiveEntry({
      id: 'temp-' + Date.now(),
      ...newEntry,
      startTime: new Date(),
      duration: 0,
      isActive: true
    } as TimeEntry);

    setCurrentTime(0);
    
    toast({
      title: "Timer started",
      description: "Time tracking has begun"
    });
  };

  const pauseTimer = () => {
    if (!activeEntry) return;

    const now = new Date();
    const duration = Math.floor((now.getTime() - activeEntry.startTime.getTime()) / 1000);
    
    updateTimeEntryMutation.mutate({
      id: activeEntry.id,
      entry: {
        endTime: now,
        duration,
        isActive: false
      }
    });

    setActiveEntry(null);
    setCurrentTime(0);
    
    toast({
      title: "Timer paused",
      description: `Tracked ${formatDuration(duration)}`
    });
  };

  const stopTimer = () => {
    if (!activeEntry) return;

    const now = new Date();
    const duration = Math.floor((now.getTime() - activeEntry.startTime.getTime()) / 1000);
    
    updateTimeEntryMutation.mutate({
      id: activeEntry.id,
      entry: {
        endTime: now,
        duration,
        isActive: false
      }
    });

    setActiveEntry(null);
    setCurrentTime(0);
    setDescription('');
    
    toast({
      title: "Timer stopped",
      description: `Session completed: ${formatDuration(duration)}`
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const hours = seconds / 3600;
    if (hours >= 1) {
      return `${hours.toFixed(1)}h`;
    }
    const minutes = seconds / 60;
    return `${minutes.toFixed(0)}m`;
  };

  // Calculate total time for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysEntries = timeEntries.filter((entry: TimeEntry) => {
    const entryDate = new Date(entry.startTime);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });
  const todayTotal = todaysEntries.reduce((sum: number, entry: TimeEntry) => sum + entry.duration, 0);
  const currentSession = activeEntry ? currentTime : 0;
  const totalToday = todayTotal + currentSession;

  // Calculate progress against estimate
  const allTimeTotal = timeEntries.reduce((sum: number, entry: TimeEntry) => sum + entry.duration, 0) + currentSession;
  const progressPercentage = estimatedTime > 0 ? (allTimeTotal / estimatedTime) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Time Tracker
        </CardTitle>
        <CardDescription>
          Track time spent on tasks and projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Timer */}
          <div className="text-center">
            <div className="text-4xl font-mono font-bold mb-4">
              {formatDuration(currentTime)}
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              {!activeEntry ? (
                <Button onClick={startTimer} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Timer
                </Button>
              ) : (
                <>
                  <Button onClick={pauseTimer} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                  <Button onClick={stopTimer} variant="outline" className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>

            {activeEntry && (
              <Badge variant="secondary" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                Recording
              </Badge>
            )}
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">What are you working on?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you're working on..."
              disabled={!!activeEntry}
              rows={2}
            />
          </div>

          {/* Progress Against Estimate */}
          {estimatedTime > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Progress vs Estimate</Label>
                <span className="text-sm text-gray-500">
                  {formatTime(allTimeTotal)} / {formatTime(estimatedTime)}
                </span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="w-full" />
              <div className="text-xs text-gray-500 text-center">
                {progressPercentage > 100 
                  ? `${((progressPercentage - 100)).toFixed(0)}% over estimate`
                  : `${(100 - progressPercentage).toFixed(0)}% remaining`
                }
              </div>
            </div>
          )}

          {/* Today's Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{formatTime(totalToday)}</div>
              <div className="text-sm text-gray-500">Today</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{formatTime(allTimeTotal)}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>

          {/* Recent Entries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recent Sessions</Label>
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
            
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {timeEntries.slice(0, 5).map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{entry.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.startTime).toLocaleDateString()} at{' '}
                        {new Date(entry.startTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatDuration(entry.duration)}</div>
                      {entry.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {timeEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No time entries yet. Start your first session!
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}