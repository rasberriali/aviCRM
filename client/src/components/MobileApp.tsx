import { useState, useEffect } from 'react';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Menu, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  Clock, 
  User, 
  Building,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Archive,
  Settings,
  LogOut,
  Home,
  FolderOpen,
  CheckCircle,
  Circle,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckSquare,
  ListTodo,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { MobileNotificationManager } from './MobileNotificationManager';
import { MobileTasks } from './MobileTasks';
import { MobileWorkspaceView } from './MobileWorkspaceView';
import { MobileAdministration } from './MobileAdministration';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface MobileWorkspace {
  id: number;
  name: string;
  description: string;
  color: string;
  categories: MobileCategory[];
}

interface MobileCategory {
  id: number;
  name: string;
  projects: MobileProject[];
}

interface MobileProject {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: string;
  customerName: string;
  tasks: MobileTask[];
}

interface MobileTask {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
}

export function MobileApp() {
  const { user, logout } = useHttpAuth();
  const [currentView, setCurrentView] = useState<'workspaces' | 'projects' | 'tasks' | 'clients' | 'profile' | 'notifications' | 'todo' | 'administration'>('workspaces');
  const [selectedWorkspace, setSelectedWorkspace] = useState<MobileWorkspace | null>(null);
  const [selectedProject, setSelectedProject] = useState<MobileProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch clients with caching
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!user,
    staleTime: 300000, // 5 minutes
    retry: 1,
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch clients: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    },

  });

  // Fetch workspaces with optimized settings
  const { data: workspaces = [], isLoading: workspacesLoading, error: workspacesError } = useQuery({
    queryKey: ['/api/workspaces'],
    enabled: !!user,
    retry: 2,
    staleTime: 60000, // 1 minute
    refetchOnMount: true,
    queryFn: async () => {
      const response = await fetch('/api/workspaces', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch workspaces: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    },

  });

  // Fetch user tasks with reduced frequency
  const { data: userTasks = [] } = useQuery({
    queryKey: ['/api/task_assignments', user?.id],
    enabled: !!user?.id,
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`/api/task_assignments?userId=${user?.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 404) return []; // Return empty array if endpoint doesn't exist
        const errorText = await response.text();
        throw new Error(`Failed to fetch tasks: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    },

  });

  // Fetch notifications with minimal polling
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications', user?.id],
    enabled: false, // Disable until external server has this endpoint
    staleTime: 300000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`/api/notifications/${user?.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 404) return []; // Return empty array if endpoint doesn't exist
        const errorText = await response.text();
        throw new Error(`Failed to fetch notifications: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    },

  });
  const queryClient = useQueryClient();

  // Debug logs
  useEffect(() => {
    console.log('[MOBILE APP] Workspaces data:', workspaces);
    console.log('[MOBILE APP] Workspaces loading:', workspacesLoading);
    console.log('[MOBILE APP] Workspaces error:', workspacesError);
    console.log('[MOBILE APP] Clients data:', clients);
    console.log('[MOBILE APP] Clients loading:', clientsLoading);
    console.log('[MOBILE APP] Clients error:', clientsError);
    console.log('[MOBILE APP] User tasks:', userTasks);
    console.log('[MOBILE APP] Notifications:', notifications);
  }, [workspaces, workspacesLoading, workspacesError, clients, clientsLoading, clientsError, userTasks, notifications]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-lg">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Building className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
              {currentView === 'workspaces' && 'AVI Dashboard'}
              {currentView === 'projects' && selectedWorkspace?.name}
              {currentView === 'tasks' && selectedProject?.name}
              {currentView === 'clients' && 'Clients'}
              {currentView === 'profile' && 'Profile'}
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
          >
            <Filter className="h-5 w-5 text-slate-600" />
          </Button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="px-4 pb-4 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search workspaces, projects, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm"
            />
          </div>
        </div>
      )}
    </div>
  );

  const MobileNavigation = () => (
    <div className={`fixed inset-0 z-40 transition-all duration-300 ${showMenu ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
      <div className="relative w-80 max-w-[80vw] h-full bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/60">
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-slate-500 font-medium">{user?.username || user?.firstName}</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-full pb-20">
          <div className="p-4 space-y-3">
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                Main
              </h3>
              <div className="space-y-1">

                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 ${
                    currentView === 'workspaces' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentView('workspaces');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-1 rounded-lg ${
                    currentView === 'workspaces' 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Workspaces</span>
                </Button>
            </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                Tasks
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 ${
                    currentView === 'todo' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentView('todo');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-1 rounded-lg ${
                    currentView === 'todo' 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <span className="font-medium">My Tasks</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 relative ${
                    currentView === 'notifications' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentView('notifications');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-1 rounded-lg ${
                    currentView === 'notifications' 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Notifications</span>
                  {Array.isArray(notifications) && notifications.filter((n: any) => !n.read).length > 0 && (
                    <Badge className="ml-auto h-5 w-5 p-0 text-xs animate-pulse bg-red-500">
                      {notifications.filter((n: any) => !n.read).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            
            {user?.permissions?.admin && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                  Admin
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 ${
                      currentView === 'administration' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                    }`}
                    onClick={() => {
                      setCurrentView('administration');
                      setShowMenu(false);
                    }}
                  >
                    <div className={`p-1 rounded-lg ${
                      currentView === 'administration' 
                        ? 'bg-white/20' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Settings className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Administration</span>
                  </Button>
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
                Other
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 ${
                    currentView === 'clients' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentView('clients');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-1 rounded-lg ${
                    currentView === 'clients' 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Building className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Clients</span>
                </Button>
                
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 ${
                    currentView === 'profile' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    setCurrentView('profile');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-1 rounded-lg ${
                    currentView === 'profile' 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Settings</span>
                </Button>
                
                <div className="mt-4 pt-4 border-t border-slate-200/60">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 h-12 px-3 rounded-xl transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={async () => {
                      try {
                        console.log('[MOBILE APP] Logging out...');
                        await logout();
                        setShowMenu(false);
                        // Force redirect to login page
                        window.location.href = '/';
                      } catch (error) {
                        console.error('[MOBILE APP] Logout error:', error);
                        // Still redirect even if logout fails
                        window.location.href = '/';
                      }
                    }}
                  >
                    <div className="p-1 rounded-lg bg-red-50 text-red-500">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const HomeView = () => {
    const pendingTasks = userTasks.filter((task: any) => task.status !== 'done' && task.status !== 'completed');
    const todayTasks = userTasks.filter((task: any) => {
      if (!task.dueDate) return false;
      const today = new Date();
      const taskDate = new Date(task.dueDate);
      return taskDate.toDateString() === today.toDateString();
    });
    const overdueTasks = userTasks.filter((task: any) => {
      if (!task.dueDate || task.status === 'done' || task.status === 'completed') return false;
      return new Date(task.dueDate) < new Date();
    });
    const unreadNotifications = notifications.filter((notif: any) => !notif.read);

    return (
      <div className="p-4 space-y-6">
        {/* Modern Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/60 shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FolderOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{Array.isArray(workspaces) ? workspaces.length : 0}</p>
                <p className="text-xs font-medium text-blue-600">Workspaces</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200/60 shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{Array.isArray(clients) ? clients.length : 0}</p>
                <p className="text-xs font-medium text-green-600">Clients</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/60 shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{Array.isArray(userTasks) ? userTasks.filter((task: any) => task.status !== 'done' && task.status !== 'completed').length : 0}</p>
                <p className="text-xs font-medium text-purple-600">Tasks</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Modern Today's To-Do */}
        <Card className="p-5 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <ListTodo className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Today's To-Do</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => setCurrentView('todo')}
            >
              View All
            </Button>
          </div>
          {Array.isArray(todayTasks) && todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto mb-4 flex items-center justify-center">
                <CheckSquare className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No tasks due today</p>
              <p className="text-sm text-slate-400 mt-1">Great! You're all caught up</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(todayTasks) && todayTasks.slice(0, 3).map((task: any) => (
                <div key={task.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-white to-slate-50 rounded-xl border border-slate-200/60 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full shadow-sm ${
                      task.priority === 'urgent' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      task.priority === 'high' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                      task.priority === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{task.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {task.workspace?.name} {task.project?.name && `• ${task.project.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={task.status === 'in_progress' ? 'default' : 'secondary'}
                      className="text-xs font-medium"
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {Array.isArray(todayTasks) && todayTasks.length > 3 && (
                <div className="text-center pt-3">
                  <div className="text-sm text-slate-500 bg-slate-50 rounded-lg py-2 px-4 border border-slate-200/60">
                    +{todayTasks.length - 3} more tasks today
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Modern Quick Actions */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
          <h3 className="text-lg font-bold text-slate-800 mb-5">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="ghost"
              className="h-16 flex flex-col items-center justify-center space-y-2 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 hover:from-blue-100 hover:to-purple-100 transition-all duration-200 hover:scale-105 hover:shadow-md"
              onClick={() => setCurrentView('todo')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                <ListTodo className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-700">My Tasks</span>
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex flex-col items-center justify-center space-y-2 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 hover:scale-105 hover:shadow-md relative"
              onClick={() => setCurrentView('notifications')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-700">Notifications</span>
              {Array.isArray(unreadNotifications) && unreadNotifications.length > 0 && (
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-xs font-bold text-white">{unreadNotifications.length}</span>
                </div>
              )}
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex flex-col items-center justify-center space-y-2 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 hover:scale-105 hover:shadow-md"
              onClick={() => setCurrentView('workspaces')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm">
                <FolderOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-700">Workspaces</span>
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex flex-col items-center justify-center space-y-2 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 hover:from-orange-100 hover:to-red-100 transition-all duration-200 hover:scale-105 hover:shadow-md"
              onClick={() => setCurrentView('clients')}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm">
                <Building className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-slate-700">Clients</span>
            </Button>
          </div>
        </Card>

        {/* Modern Notifications & Alerts */}
        {((Array.isArray(overdueTasks) && overdueTasks.length > 0) || (Array.isArray(unreadNotifications) && unreadNotifications.length > 0)) && (
          <Card className="p-5 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200/60 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-orange-800">Attention Required</h3>
            </div>
            <div className="space-y-3">
              {Array.isArray(overdueTasks) && overdueTasks.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-orange-200/40">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-orange-800">{overdueTasks.length} overdue tasks</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                </div>
              )}
              {Array.isArray(unreadNotifications) && unreadNotifications.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-orange-200/40">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bell className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-orange-800">{unreadNotifications.length} unread notifications</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-orange-600" />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const WorkspacesView = () => (
    <div className="p-4 space-y-4 min-h-screen overflow-y-auto">
      {Array.isArray(workspaces) && workspaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto mb-4 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No workspaces found</p>
          <p className="text-sm text-slate-400 mt-2">Create your first workspace to get started</p>
        </div>
      ) : (
        Array.isArray(workspaces) && workspaces.map((workspace: any) => (
          <Card key={workspace.id} className="p-0 bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] overflow-hidden">
            <div 
              className="p-5 cursor-pointer"
              onClick={() => {
                console.log('[MOBILE APP] Selecting workspace:', workspace);
                setSelectedWorkspace(workspace);
                setCurrentView('workspaces');
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div 
                      className="w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, ${workspace.color || '#9521c0'}, ${workspace.color ? workspace.color + 'CC' : '#9521c0CC'})` 
                      }}
                    >
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-base">{workspace.name}</h4>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{workspace.description}</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const ProjectsView = () => {
    // Fetch workspace categories and projects
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
      queryKey: ['/api/workspace-categories', selectedWorkspace?.id],
      enabled: !!selectedWorkspace?.id,
      retry: 3
    });

    const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
      queryKey: ['/api/workspace-projects', selectedWorkspace?.id],
      enabled: !!selectedWorkspace?.id,
      retry: 3
    });

    console.log('[MOBILE APP] Projects view data:', { categories, projects, selectedWorkspace });

    if (isLoadingCategories || isLoadingProjects) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 min-h-screen overflow-y-auto">
        {categories.length === 0 && projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No projects found</p>
            <p className="text-xs text-muted-foreground mt-2">Create your first project to get started</p>
          </div>
        ) : (
          <>
            {/* Categorized Projects */}
            {categories.map((category: any) => {
              const categoryProjects = projects.filter((p: any) => p.categoryId === category.id);
              if (categoryProjects.length === 0) return null;
              
              return (
                <div key={category.id} className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">{category.name}</h3>
                  {categoryProjects.map((project: any) => (
                    <Card key={project.id} className="p-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          console.log('[MOBILE APP] Selecting project:', project);
                          setSelectedProject(project);
                          setCurrentView('tasks');
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{project.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(project.status)} text-white`}
                            >
                              {project.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(project.priority)} text-white`}
                            >
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{project.customerName}</p>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {project.tasks?.length || 0} tasks
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })}
            
            {/* Uncategorized Projects */}
            {(() => {
              const uncategorizedProjects = projects.filter((p: any) => !p.categoryId);
              if (uncategorizedProjects.length === 0) return null;
              
              return (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary">Uncategorized</h3>
                  {uncategorizedProjects.map((project: any) => (
                    <Card key={project.id} className="p-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          console.log('[MOBILE APP] Selecting project:', project);
                          setSelectedProject(project);
                          setCurrentView('tasks');
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{project.name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(project.status)} text-white`}
                            >
                              {project.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(project.priority)} text-white`}
                            >
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{project.customerName}</p>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {project.tasks?.length || 0} tasks
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  const TasksView = () => {
    // Fetch tasks for the selected project
    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
      queryKey: ['/api/workspace-tasks', selectedProject?.id],
      enabled: !!selectedProject?.id,
      retry: 3
    });

    console.log('[MOBILE APP] Tasks view data:', { tasks, selectedProject });

    if (isLoadingTasks) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4 min-h-screen overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-2">Create your first task to get started</p>
          </div>
        ) : (
          tasks.map((task: any) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {task.status === 'completed' || task.status === 'done' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{task.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`${getPriorityColor(task.priority)} text-white`}
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    );
  };

  const ClientsView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Filter clients based on search term
    const filteredClients = clients.filter((client: any) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleClientClick = (client: any) => {
      setSelectedClient(client);
      setShowEditModal(true);
    };

    const handleCreateClient = () => {
      setShowCreateModal(true);
    };

    if (clientsLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (clientsError) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">Error loading clients</p>
          <p className="text-xs text-muted-foreground mt-2">{clientsError.message}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen overflow-y-auto">
        {/* Search and Add Header */}
        <div className="p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleCreateClient}
              size="sm"
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Clients List */}
        <div className="flex-1 overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No clients found matching your search' : 'No clients found'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {searchTerm ? 'Try a different search term' : 'Add your first client to get started'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredClients.map((client: any) => (
                <Card 
                  key={client.id} 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleClientClick(client)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{client.name}</h4>
                        {client.company && client.company !== client.name && (
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        {client.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                          </div>
                        )}
                        
                        {client.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Contact
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Client Modal */}
        <CreateClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }}
        />

        {/* Edit Client Modal */}
        <EditClientModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedClient(null);
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          }}
        />
      </div>
    );
  };

  // Create Client Modal Component
  const CreateClientModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
    const [formData, setFormData] = useState({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialContacts, setInitialContacts] = useState<Array<{
      name: string;
      title: string;
      email: string;
      phone: string;
      notes: string;
    }>>([]);
    const { toast } = useToast();

    const handleSubmit = async () => {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Client name is required",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to create client');
        }

        const newClient = await response.json();

        // Add initial contacts if any
        if (initialContacts.length > 0) {
          for (const contact of initialContacts) {
            if (contact.name.trim()) {
              try {
                await fetch(`/api/clients/${newClient.id}/contacts`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(contact),
                  credentials: 'include'
                });
              } catch (error) {
                console.error('Failed to add contact:', error);
              }
            }
          }
        }

        toast({
          title: "Success",
          description: "Client created successfully"
        });

        onSuccess();
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          notes: ''
        });
        setInitialContacts([]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create client",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const addInitialContact = () => {
      setInitialContacts([...initialContacts, {
        name: '',
        title: '',
        email: '',
        phone: '',
        notes: ''
      }]);
    };

    const updateInitialContact = (index: number, field: string, value: string) => {
      const updated = [...initialContacts];
      updated[index] = { ...updated[index], [field]: value };
      setInitialContacts(updated);
    };

    const removeInitialContact = (index: number) => {
      setInitialContacts(initialContacts.filter((_, i) => i !== index));
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95%] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client name"
              />
            </div>
            
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                placeholder="12345"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this client..."
                rows={3}
              />
            </div>

            {/* Initial Contacts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Initial Contacts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInitialContact}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>
              
              {initialContacts.map((contact, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Contact {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInitialContact(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateInitialContact(index, 'name', e.target.value)}
                          placeholder="Contact name"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={contact.title}
                          onChange={(e) => updateInitialContact(index, 'title', e.target.value)}
                          placeholder="Job title"
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input
                          value={contact.email}
                          onChange={(e) => updateInitialContact(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Phone</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => updateInitialContact(index, 'phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Client
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Edit Client Modal Component
  const EditClientModal = ({ isOpen, onClose, client, onSuccess }: { isOpen: boolean; onClose: () => void; client: any; onSuccess: () => void }) => {
    const [formData, setFormData] = useState({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [clientContacts, setClientContacts] = useState<any[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [newContact, setNewContact] = useState({
      name: '',
      title: '',
      email: '',
      phone: '',
      notes: ''
    });
    const { toast } = useToast();

    // Update form data when client changes
    useEffect(() => {
      if (client) {
        setFormData({
          name: client.name || '',
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || '',
          notes: client.notes || ''
        });
        
        // Load contacts for this client
        loadClientContacts(client.id);
      }
    }, [client]);

    const loadClientContacts = async (clientId: string) => {
      setIsLoadingContacts(true);
      try {
        const response = await fetch(`/api/clients/${clientId}/contacts`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const contacts = await response.json();
          setClientContacts(contacts);
        } else {
          setClientContacts([]);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        setClientContacts([]);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    const handleAddContact = async () => {
      if (!newContact.name.trim()) {
        toast({
          title: "Error",
          description: "Contact name is required",
          variant: "destructive"
        });
        return;
      }

      try {
        const response = await fetch(`/api/clients/${client.id}/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newContact),
          credentials: 'include'
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Contact added successfully"
          });
          
          setNewContact({
            name: '',
            title: '',
            email: '',
            phone: '',
            notes: ''
          });
          setShowAddContact(false);
          loadClientContacts(client.id);
        } else {
          throw new Error('Failed to add contact');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add contact",
          variant: "destructive"
        });
      }
    };

    const handleDeleteContact = async (contactId: number) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;

      try {
        const response = await fetch(`/api/clients/${client.id}/contacts/${contactId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Contact deleted successfully"
          });
          loadClientContacts(client.id);
        } else {
          throw new Error('Failed to delete contact');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive"
        });
      }
    };

    const handleSubmit = async () => {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Client name is required",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to update client');
        }

        toast({
          title: "Success",
          description: "Client updated successfully"
        });

        onSuccess();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update client",
          variant: "destructive"
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!client) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95%] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          
          {/* Tabs for Details and Contacts */}
          <div className="space-y-4">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'contacts'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Contacts ({clientContacts.length})
              </button>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Client name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-zip">ZIP Code</Label>
                  <Input
                    id="edit-zip"
                    value={formData.zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this client..."
                    rows={3}
                  />
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Client
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Contacts</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowAddContact(true)}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Contact
                  </Button>
                </div>

                {/* Add Contact Form */}
                {showAddContact && (
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="contact-name">Name *</Label>
                        <Input
                          id="contact-name"
                          value={newContact.name}
                          onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Contact name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contact-title">Title</Label>
                        <Input
                          id="contact-title"
                          value={newContact.title}
                          onChange={(e) => setNewContact(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Job title"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contact@example.com"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contact-phone">Phone</Label>
                        <Input
                          id="contact-phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={() => setShowAddContact(false)} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleAddContact} className="flex-1">
                          Add Contact
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Contacts List */}
                <div className="space-y-2">
                  {isLoadingContacts ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading contacts...</p>
                    </div>
                  ) : clientContacts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No contacts added yet</p>
                    </div>
                  ) : (
                    clientContacts.map((contact, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{contact.name}</h4>
                            {contact.title && (
                              <p className="text-xs text-muted-foreground">{contact.title}</p>
                            )}
                            {contact.email && (
                              <p className="text-xs text-muted-foreground">{contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-xs text-muted-foreground">{contact.phone}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const ProfileView = () => (
    <div className="p-4 space-y-6 min-h-screen overflow-y-auto">
      <Card className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Department</span>
            <span className="text-sm font-medium">{user?.department}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Permissions</h4>
        <div className="space-y-2">
          {Object.entries(user?.permissions || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <Badge variant={value ? "default" : "secondary"}>
                {value ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-3">App Settings</h4>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/api/download/release-apk';
              link.download = 'app-release_1752087418151.apk';
              link.click();
            }}
          >
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📱</span>
              <div className="text-left">
                <div className="font-medium">Download APK</div>
                <div className="text-xs text-muted-foreground">Signed Release (1.7MB)</div>
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('/install-pwa.html', '_blank')}
          >
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔧</span>
              <div className="text-left">
                <div className="font-medium">Install PWA</div>
                <div className="text-xs text-muted-foreground">Progressive Web App</div>
              </div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-x-hidden">
      <MobileHeader />
      <MobileNavigation />
      
      <main className="pb-20 overflow-y-auto">
        <div className="h-full overflow-y-auto">
          {currentView === 'workspaces' && !selectedWorkspace && <WorkspacesView />}
          {currentView === 'workspaces' && selectedWorkspace && (
            <MobileWorkspaceView 
              workspace={selectedWorkspace} 
              onBack={() => {
                setSelectedWorkspace(null);
                setCurrentView('workspaces');
              }}
              user={user}
            />
          )}
          {currentView === 'projects' && <ProjectsView />}
          {currentView === 'todo' && <div className="p-4 h-full overflow-y-auto"><MobileTasks /></div>}
          {currentView === 'notifications' && <div className="p-4 h-full overflow-y-auto"><MobileNotificationManager /></div>}
          {currentView === 'administration' && <div className="p-4 h-full overflow-y-auto"><MobileAdministration /></div>}
          {currentView === 'clients' && <ClientsView />}
          {currentView === 'profile' && <ProfileView />}
        </div>
      </main>

      {/* Modern Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/25 hover:shadow-3xl hover:shadow-blue-500/30 transform hover:scale-105 transition-all duration-200 border-0"
          onClick={() => {
            // Handle FAB actions based on current view
            if (currentView === 'workspaces') {
              // Create workspace
            } else if (currentView === 'projects') {
              // Create project
            } else if (currentView === 'tasks') {
              // Create task
            } else if (currentView === 'clients') {
              // Create client
            }
          }}
        >
          <Plus className="h-7 w-7 text-white" />
        </Button>
      </div>
    </div>
  );
}