import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { Clock, Play, Pause, Square, Timer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ProjectTimeTrackerProps {
  projectId: string;
  projectName: string;
  workspaceId: string;
}

interface TimeEntry {
  id: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  userId: string;
  description: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export function ProjectTimeTracker({ projectId, projectName, workspaceId }: ProjectTimeTrackerProps) {
  const [showClockInDialog, setShowClockInDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active time entry for this project
  const { data: activeEntry, isLoading } = useQuery({
    queryKey: [`/api/time-entries/project/${projectId}/active`],
    enabled: !!projectId && !!user?.id,
    refetchInterval: 1000, // Update every second for live timer
  });

  // Update timer display
  useEffect(() => {
    if (activeEntry && activeEntry.status === 'active') {
      const startTime = new Date(activeEntry.startTime).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setCurrentTime(Math.floor((now - startTime) / 1000));
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [activeEntry]);

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (data: { description: string }) => {
      const response = await apiRequest('POST', '/api/time-entries/clock-in', {
        projectId,
        projectName,
        workspaceId,
        description: data.description,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Clocked in successfully",
        description: `Started tracking time for ${projectName}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/project/${projectId}/active`] });
      setShowClockInDialog(false);
      setDescription('');
    },
    onError: (error) => {
      toast({
        title: "Clock in failed",
        description: "Failed to start time tracking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/time-entries/clock-out', {
        entryId: activeEntry.id,
        endTime: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Clocked out successfully",
        description: `Stopped tracking time for ${projectName}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/project/${projectId}/active`] });
      setCurrentTime(0);
    },
    onError: (error) => {
      toast({
        title: "Clock out failed",
        description: "Failed to stop time tracking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Pause/Resume mutation
  const pauseResumeMutation = useMutation({
    mutationFn: async (action: 'pause' | 'resume') => {
      const response = await apiRequest('POST', `/api/time-entries/${action}`, {
        entryId: activeEntry.id,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      const action = variables === 'pause' ? 'paused' : 'resumed';
      toast({
        title: `Timer ${action}`,
        description: `Time tracking ${action} for ${projectName}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/project/${projectId}/active`] });
    },
  });

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClockIn = () => {
    if (description.trim()) {
      clockInMutation.mutate({ description });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {activeEntry && activeEntry.status === 'active' ? (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500 text-white">
            <Timer className="h-3 w-3 mr-1" />
            {formatTime(currentTime)}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseResumeMutation.mutate('pause')}
            disabled={pauseResumeMutation.isPending}
          >
            <Pause className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      ) : activeEntry && activeEntry.status === 'paused' ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Paused
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseResumeMutation.mutate('resume')}
            disabled={pauseResumeMutation.isPending}
          >
            <Play className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => setShowClockInDialog(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Play className="h-3 w-3 mr-1" />
          Clock In
        </Button>
      )}

      <Dialog open={showClockInDialog} onOpenChange={setShowClockInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock In to {projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">What will you be working on?</Label>
              <Textarea
                id="description"
                placeholder="Describe your work on this project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClockInDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClockIn}
              disabled={!description.trim() || clockInMutation.isPending}
            >
              {clockInMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Clocking In...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}