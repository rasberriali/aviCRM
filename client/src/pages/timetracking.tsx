import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Calendar,
  Timer,
  Coffee,
  Settings,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TimeEntry, Project, BreakEntry } from '@shared/schema';

const clockInSchema = z.object({
  projectId: z.string().optional(),
  description: z.string().optional()
});

interface ClockInFormData {
  projectId?: string;
  description?: string;
}

export default function TimeTracking() {
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [currentBreak, setCurrentBreak] = useState<BreakEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const clockInForm = useForm<ClockInFormData>({
    resolver: zodResolver(clockInSchema),
    defaultValues: {
      projectId: '',
      description: ''
    }
  });

  // Fetch projects for clock in selection
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch current user's time entries
  const { data: timeEntries } = useQuery({
    queryKey: [`/api/time-entries/user/${user?.id}`],
    enabled: !!user?.id,
  });

  // Check for active timer on load
  useEffect(() => {
    if (timeEntries && Array.isArray(timeEntries)) {
      const active = timeEntries.find((entry: TimeEntry) => 
        entry.status === 'active' || entry.status === 'paused'
      );
      if (active) {
        setActiveTimer(active);
      }
    }
  }, [timeEntries]);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer && activeTimer.status === 'active') {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(activeTimer.startTime).getTime();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Break timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentBreak && !currentBreak.endTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(currentBreak.startTime).getTime();
        const elapsed = Math.floor((now - start) / 1000);
        setBreakTime(elapsed);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentBreak]);

  // Clock In mutation
  const clockInMutation = useMutation({
    mutationFn: async (data: ClockInFormData): Promise<TimeEntry> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const response = await fetch('/api/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: data.projectId && data.projectId !== '' ? parseInt(data.projectId) : null,
          description: data.description || 'Daily work',
          userId: user.id
        })
      });
      if (!response.ok) {
        throw new Error('Failed to clock in');
      }
      return response.json();
    },
    onSuccess: (data: TimeEntry) => {
      setActiveTimer(data);
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/user/${user?.id}`] });
      clockInForm.reset();
    }
  });

  // Take Break mutation
  const takeBreakMutation = useMutation({
    mutationFn: async (breakType: string = 'break'): Promise<BreakEntry> => {
      if (!activeTimer || !activeTimer.id) {
        throw new Error('No active timer found');
      }
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const response = await fetch(`/api/time-entries/${activeTimer.id}/break/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          breakType,
          description: `${breakType} break`
        })
      });
      if (!response.ok) {
        throw new Error('Failed to start break');
      }
      return response.json();
    },
    onSuccess: (data: BreakEntry) => {
      setCurrentBreak(data);
      if (activeTimer) {
        setActiveTimer({ ...activeTimer, status: 'paused' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/user/${user?.id}`] });
    }
  });

  // End Break mutation
  const endBreakMutation = useMutation({
    mutationFn: async (): Promise<BreakEntry> => {
      if (!currentBreak) throw new Error('No active break');
      const response = await fetch(`/api/break-entries/${currentBreak.id}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      setCurrentBreak(null);
      setBreakTime(0);
      if (activeTimer) {
        setActiveTimer({ ...activeTimer, status: 'active' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/user/${user?.id}`] });
    }
  });

  // Clock Out mutation
  const clockOutMutation = useMutation({
    mutationFn: async (): Promise<TimeEntry> => {
      if (!activeTimer || !activeTimer.id) {
        throw new Error('No active timer found');
      }
      const response = await fetch(`/api/clock-out/${activeTimer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to clock out');
      }
      return response.json();
    },
    onSuccess: () => {
      setActiveTimer(null);
      setElapsedTime(0);
      setCurrentBreak(null);
      setBreakTime(0);
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/user/${user?.id}`] });
    }
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClockIn = (data: ClockInFormData) => {
    clockInMutation.mutate(data);
  };

  // Calculate time summaries
  const todayEntries = Array.isArray(timeEntries) ? timeEntries.filter((entry: TimeEntry) => {
    const today = new Date();
    const entryDate = new Date(entry.date);
    return entryDate.toDateString() === today.toDateString();
  }) : [];

  const todayHours = todayEntries.reduce((total: number, entry: TimeEntry) => {
    if (entry.hours) {
      return total + (entry.hours / 60); // Convert minutes to hours
    }
    return total;
  }, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEntries = Array.isArray(timeEntries) ? timeEntries.filter((entry: TimeEntry) => {
    return new Date(entry.startTime) >= weekStart;
  }) : [];

  const weekHours = weekEntries.reduce((total: number, entry: TimeEntry) => {
    if (entry.hours) {
      return total + (entry.hours / 60); // Convert minutes to hours
    }
    return total;
  }, 0);

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground">
            Manage your work hours with clock in, break, and clock out features
          </p>
        </div>
      </div>

      {/* Active Timer Status */}
      {activeTimer ? (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              {activeTimer.status === 'active' ? 'Currently Working' : 'On Break'}
            </CardTitle>
            <CardDescription>
              Project: {activeTimer.projectId ? 
                (Array.isArray(projects) ? projects.find((p: Project) => p.id === activeTimer.projectId)?.name || 'Unknown' : 'Loading...') 
                : 'General Work'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-mono font-bold text-blue-600">
              {formatTime(elapsedTime)}
            </div>
            
            {currentBreak && (
              <div className="flex items-center gap-2 text-orange-600">
                <Coffee className="h-4 w-4" />
                <span className="font-mono">Break: {formatTime(breakTime)}</span>
              </div>
            )}

            <div className="flex gap-2">
              {activeTimer.status === 'active' ? (
                <>
                  <Button
                    onClick={() => takeBreakMutation.mutate('break')}
                    disabled={takeBreakMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Take Break
                  </Button>
                  <Button
                    onClick={() => takeBreakMutation.mutate('lunch')}
                    disabled={takeBreakMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Lunch Break
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => endBreakMutation.mutate()}
                  disabled={endBreakMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  End Break
                </Button>
              )}
              
              <Button
                onClick={() => clockOutMutation.mutate()}
                disabled={clockOutMutation.isPending}
                variant="destructive"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Clock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Clock In Form */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Clock In
            </CardTitle>
            <CardDescription>Start your work day</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...clockInForm}>
              <form onSubmit={clockInForm.handleSubmit(handleClockIn)} className="space-y-4">
                <FormField
                  control={clockInForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(projects) && projects.map((project: Project) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={clockInForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="What will you be working on today?"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={clockInMutation.isPending}
                  className="w-full"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Time Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {todayEntries.length} session{todayEntries.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {weekEntries.length} session{weekEntries.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your latest work sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.isArray(timeEntries) && timeEntries.slice(0, 10).map((entry: TimeEntry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      entry.status === 'active' ? 'default' :
                      entry.status === 'paused' ? 'secondary' : 'outline'
                    }>
                      {entry.status}
                    </Badge>
                    <span className="font-medium">
                      {entry.projectId ? 
                        (Array.isArray(projects) ? 
                          projects.find((p: Project) => p.id === entry.projectId)?.name || 'Unknown Project'
                          : 'Loading...'
                        ) : 'General Work'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.startTime), 'MMM d, yyyy h:mm a')}
                    {entry.endTime && ` - ${format(new Date(entry.endTime), 'h:mm a')}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    {entry.hours ? `${(entry.hours / 60).toFixed(1)}h` : 'In Progress'}
                  </div>
                  {entry.breakTime && entry.breakTime > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Break: {(entry.breakTime / 60).toFixed(1)}h
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!Array.isArray(timeEntries) || timeEntries.length === 0) && (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time entries yet. Clock in to start tracking your time!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}