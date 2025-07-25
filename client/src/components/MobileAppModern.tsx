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
import { MobileWorkspaceViewModern } from './MobileWorkspaceViewModern';
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

export function MobileAppModern() {
  const { user, logout } = useHttpAuth();
  const [currentView, setCurrentView] = useState<'workspaces' | 'projects' | 'tasks' | 'clients' | 'profile' | 'notifications' | 'todo' | 'administration'>('workspaces');
  const [selectedWorkspace, setSelectedWorkspace] = useState<MobileWorkspace | null>(null);
  const [selectedProject, setSelectedProject] = useState<MobileProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<MobileProject | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workspaces data
  const { data: workspaces = [], isLoading: workspacesLoading, error: workspacesError } = useQuery({
    queryKey: ['/api/workspaces'],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch('/api/workspaces', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch workspaces');
      return response.json();
    },
  });

  // Fetch workspace categories
  const { data: categories = [] } = useQuery({
    queryKey: [`/api/workspaces/${selectedWorkspace?.id}/categories`],
    enabled: !!selectedWorkspace?.id,
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${selectedWorkspace?.id}/categories`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Fetch workspace projects
  const { data: projects = [] } = useQuery({
    queryKey: [`/api/workspaces/${selectedWorkspace?.id}/projects`],
    enabled: !!selectedWorkspace?.id,
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${selectedWorkspace?.id}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Create workspace mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const response = await apiRequest('POST', '/api/workspaces', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      setShowCreateWorkspace(false);
      toast({ title: 'Workspace created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating workspace', description: error.message, variant: 'destructive' });
    }
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', `/api/workspaces/${selectedWorkspace?.id}/categories`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspace?.id}/categories`] });
      setShowCreateCategory(false);
      toast({ title: 'Category created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    }
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/workspaces/${selectedWorkspace?.id}/projects`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${selectedWorkspace?.id}/projects`] });
      setShowCreateProject(false);
      toast({ title: 'Project created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
    }
  });

  // Ultra-modern Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50">
      {/* Ultra-modern glassmorphism header */}
      <div className="bg-gradient-to-r from-white/70 via-white/60 to-white/70 backdrop-blur-3xl border-b border-white/30 shadow-2xl">
        <div className="flex items-center justify-between p-8">
          <div className="flex items-center space-x-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="p-5 rounded-[2rem] bg-white/50 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-110 border border-white/40 hover:bg-white/70 hover:border-white/60"
            >
              <Menu className="h-7 w-7 text-slate-800" />
            </Button>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl ring-4 ring-white/30 hover:ring-white/50 transition-all duration-500 hover:scale-105">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent leading-none tracking-tight">
                  {currentView === 'workspaces' && 'Dashboard'}
                  {currentView === 'projects' && selectedWorkspace?.name}
                  {currentView === 'tasks' && selectedProject?.name}
                  {currentView === 'clients' && 'Clients'}
                  {currentView === 'todo' && 'My Tasks'}
                  {currentView === 'notifications' && 'Notifications'}
                  {currentView === 'administration' && 'Administration'}
                  {currentView === 'profile' && 'Settings'}
                </h1>
                {user && (
                  <p className="text-base font-bold text-slate-700/90 mt-1">
                    Welcome back, {user.firstName}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="p-5 rounded-[2rem] bg-white/50 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-110 border border-white/40 hover:bg-white/70"
            >
              <Filter className="h-6 w-6 text-slate-700" />
            </Button>
            <div className="relative">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl ring-4 ring-white/30 hover:ring-white/50 transition-all duration-500 hover:scale-110">
                <span className="text-white text-2xl font-black">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-400 border-4 border-white rounded-full shadow-xl ring-2 ring-emerald-400/30"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Ultra-modern Navigation Menu
  const MobileNavigation = () => (
    <div className={`fixed inset-0 z-40 transition-all duration-500 ${showMenu ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-lg" onClick={() => setShowMenu(false)} />
      <div className="relative w-96 max-w-[85vw] h-full bg-gradient-to-b from-white/95 via-white/90 to-white/95 backdrop-blur-3xl shadow-3xl border-r border-white/30">
        <div className="p-8 border-b border-white/30 bg-gradient-to-r from-violet-50/80 to-purple-50/80">
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl ring-2 ring-white/30">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-400 border-4 border-white rounded-full shadow-lg"></div>
            </div>
            <div>
              <p className="font-black text-slate-800 text-xl">{user?.firstName} {user?.lastName}</p>
              <p className="text-base text-slate-600 font-bold">{user?.username || user?.firstName}</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-full pb-24">
          <div className="p-6 space-y-4">
            <div className="mb-8">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-6 px-4">
                Main
              </h3>
              <div className="space-y-2">

                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-5 h-16 px-5 rounded-[1.5rem] transition-all duration-500 font-bold text-base ${
                    currentView === 'workspaces' 
                      ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-2xl shadow-purple-500/30 ring-2 ring-white/20 scale-105' 
                      : 'text-slate-700 hover:bg-white/70 hover:text-slate-900 hover:shadow-xl hover:scale-105'
                  }`}
                  onClick={() => {
                    setCurrentView('workspaces');
                    setShowMenu(false);
                  }}
                >
                  <div className={`p-3 rounded-2xl ${
                    currentView === 'workspaces' 
                      ? 'bg-white/20 shadow-lg' 
                      : 'bg-slate-100 text-slate-600 shadow-md'
                  }`}>
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <span>Workspaces</span>
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/30">
              <Button
                variant="outline"
                className="w-full justify-start gap-4 h-14 px-5 rounded-[1.5rem] border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 font-bold"
                onClick={() => logout()}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 overflow-x-hidden">
      <MobileHeader />
      <MobileNavigation />
      
      <main className="pb-24 overflow-y-auto">
        <div className="h-full overflow-y-auto">
          {currentView === 'workspaces' && !selectedWorkspace && (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Your Workspaces
              </h2>
              <Button
                onClick={() => setShowCreateWorkspace(true)}
                className="p-4 rounded-[1.5rem] bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110"
              >
                <Plus className="w-6 h-6 mr-2" />
                New Workspace
              </Button>
            </div>
            
            {workspacesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-violet-500" />
                <p className="text-lg font-semibold text-slate-600 mt-4">Loading workspaces...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {workspaces.map((workspace: any) => (
                  <Card key={workspace.id} className="bg-white/60 backdrop-blur-2xl shadow-2xl border border-white/30 rounded-[2rem] hover:shadow-3xl transition-all duration-500 hover:scale-105 cursor-pointer"
                        onClick={() => setSelectedWorkspace(workspace)}>
                    <CardContent className="p-8">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                          <FolderOpen className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-slate-800">{workspace.name}</h3>
                          <p className="text-base text-slate-600 font-semibold">{workspace.description}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {workspaces.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-600 mb-2">No workspaces yet</h3>
                    <p className="text-slate-500 font-medium">Create your first workspace to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'workspaces' && selectedWorkspace && (
          <MobileWorkspaceViewModern 
            workspace={selectedWorkspace} 
            onBack={() => {
              setSelectedWorkspace(null);
              setCurrentView('workspaces');
            }}
            user={user}
          />
        )}
        </div>
      </main>

      {/* Create Workspace Modal */}
      <Dialog open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-white/30 rounded-[2rem] shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Create New Workspace
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createWorkspaceMutation.mutate({
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              color: formData.get('color') as string || '#6366f1'
            });
          }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 font-bold">Workspace Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Enter workspace name" 
                required 
                className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-bold">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Describe your workspace" 
                className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color" className="text-slate-700 font-bold">Color</Label>
              <select 
                id="color" 
                name="color" 
                className="w-full p-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
              >
                <option value="#6366f1">Indigo</option>
                <option value="#8b5cf6">Purple</option>
                <option value="#06b6d4">Cyan</option>
                <option value="#10b981">Emerald</option>
                <option value="#f59e0b">Amber</option>
                <option value="#ef4444">Red</option>
              </select>
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateWorkspace(false)}
                className="flex-1 rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createWorkspaceMutation.isPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {createWorkspaceMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Create Workspace</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Detail Modal */}
      <Dialog open={showProjectDetail} onOpenChange={setShowProjectDetail}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-white/30 rounded-[2rem] shadow-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              {selectedProjectDetail?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProjectDetail && (
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Project Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600 font-semibold">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProjectDetail.status === 'active' ? 'bg-green-500' :
                        selectedProjectDetail.status === 'in_progress' ? 'bg-blue-500' :
                        selectedProjectDetail.status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-slate-700 font-medium capitalize">{selectedProjectDetail.status}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-600 font-semibold">Priority</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProjectDetail.priority === 'high' ? 'bg-red-500' :
                        selectedProjectDetail.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="text-slate-700 font-medium capitalize">{selectedProjectDetail.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-slate-600 font-semibold">Description</Label>
                  <p className="text-slate-700 mt-1">{selectedProjectDetail.description}</p>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                    onClick={() => {
                      toast({ title: 'Change order request sent', description: 'Project manager will be notified' });
                      setShowProjectDetail(false);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Send Change Order
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      toast({ title: 'Edit functionality', description: 'Project editing coming soon' });
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Project
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  onClick={() => setShowProjectDetail(false)}
                  className="rounded-2xl border-2 border-slate-200 hover:bg-slate-50 px-8"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}