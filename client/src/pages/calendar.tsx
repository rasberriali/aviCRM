import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  id: number;
  name: string;
  clientName: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  assignedTo: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo: string;
  projectId?: number;
  projectName?: string;
}

interface TimeEntry {
  id: number;
  userId: string;
  projectId?: number;
  projectName?: string;
  description: string;
  startTime: string;
  endTime?: string;
  date: string;
  hours?: number;
  status: 'active' | 'paused' | 'completed';
}

type ViewMode = 'week' | 'month';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const user = useAuth()?.user;

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => fetch('/api/projects', { credentials: 'include' }).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: () => fetch('/api/tasks', { credentials: 'include' }).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Fetch time entries
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: [`/api/time-entries/user/${user?.id}`],
    queryFn: () => fetch(`/api/time-entries/user/${user?.id}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Helper functions for date calculations
  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getWeekStart = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(new Date(date));
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    if (viewMode === 'week') {
      const start = getWeekStart(new Date(currentDate));
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
      }
      return days;
    } else {
      const start = getMonthStart(currentDate);
      const end = getMonthEnd(currentDate);
      const firstDayOfWeek = start.getDay();
      const days = [];

      // Add previous month days to fill the week
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = new Date(start);
        day.setDate(start.getDate() - i - 1);
        days.push(day);
      }

      // Add current month days
      for (let day = 1; day <= end.getDate(); day++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
      }

      // Add next month days to complete the grid
      const remaining = 42 - days.length; // 6 weeks * 7 days
      for (let i = 1; i <= remaining; i++) {
        const day = new Date(end);
        day.setDate(end.getDate() + i);
        days.push(day);
      }

      return days;
    }
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const events: any[] = [];
    const dateStr = date.toISOString().split('T')[0];

    // Add project start/end dates
    (projects??[]).forEach((project: Project) => {
      try {
        let startDate = null;
        let endDate = null;
        
        if (project.startDate) {
          const startDateObj = new Date(project.startDate);
          if (!isNaN(startDateObj.getTime())) {
            startDate = startDateObj.toISOString().split('T')[0];
          }
        }
        
        if (project.endDate) {
          const endDateObj = new Date(project.endDate);
          if (!isNaN(endDateObj.getTime())) {
            endDate = endDateObj.toISOString().split('T')[0];
          }
        }
        
        if (selectedFilter === 'all' || selectedFilter === 'projects') {
          if (startDate === dateStr) {
            events.push({
              type: 'project_start',
              title: `${project.name} - Start`,
              project,
              time: 'All Day'
            });
          }
          if (endDate === dateStr) {
            events.push({
              type: 'project_end',
              title: `${project.name} - Due`,
              project,
              time: 'All Day'
            });
          }
        }
      } catch (error) {
        // Skip projects with invalid dates
      }
    });

    // Add task due dates
    if (selectedFilter === 'all' || selectedFilter === 'tasks') {
      tasks.forEach((task: Task) => {
        if (task.dueDate && task.dueDate.split('T')[0] === dateStr) {
          events.push({
            type: 'task_due',
            title: task.title,
            task,
            time: 'Due'
          });
        }
      });
    }

    // Add time entries
    if (selectedFilter === 'all' || selectedFilter === 'timetracking') {
      timeEntries.forEach((entry: TimeEntry) => {
        if (entry.date && entry.date.split('T')[0] === dateStr) {
          let startTime = 'Unknown time';
          try {
            if (entry.startTime) {
              const date = new Date(entry.startTime);
              if (!isNaN(date.getTime())) {
                startTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }
          } catch (error) {
            startTime = 'Invalid time';
          }
          events.push({
            type: 'time_entry',
            title: entry.description || 'Work Session',
            timeEntry: entry,
            time: startTime
          });
        }
      });
    }

    return events;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'project_start': return 'bg-green-100 text-green-800 border-green-200';
      case 'project_end': return 'bg-red-100 text-red-800 border-red-200';
      case 'task_due': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'time_entry': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-300">Project schedules and time tracking</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="timetracking">Time Tracking</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-xl font-semibold">
            {viewMode === 'week' 
              ? `Week of ${getWeekStart(new Date(currentDate)).toLocaleDateString()}`
              : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            }
          </h2>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, today);
              const events = getEventsForDay(day);
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-32 p-2 border border-gray-200 dark:border-gray-700
                    ${isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${viewMode === 'week' ? 'min-h-48' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'}
                    ${isToday ? 'text-blue-600 font-bold' : ''}
                  `}>
                    {day.getDate()}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {events.slice(0, viewMode === 'week' ? 8 : 3).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`
                          text-xs p-1 rounded border
                          ${getEventColor(event.type)}
                          ${viewMode === 'week' ? 'p-2' : ''}
                        `}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {viewMode === 'week' && (
                          <div className="text-xs opacity-75 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                        )}
                        {event.project && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(event.project.priority)}`}></div>
                            <span className="text-xs opacity-75">{event.project.clientName}</span>
                          </div>
                        )}
                        {event.task && (
                          <div className="flex items-center space-x-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(event.task.priority)}`}></div>
                            <span className="text-xs opacity-75">{event.task.projectName || 'General'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {events.length > (viewMode === 'week' ? 8 : 3) && (
                      <div className="text-xs text-gray-500 p-1">
                        +{events.length - (viewMode === 'week' ? 8 : 3)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Event Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-sm">Project Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-sm">Project Due</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm">Task Due</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm">Time Entry</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Priority Levels</h4>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Urgent</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm">High</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Low</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}