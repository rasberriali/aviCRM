import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, ChevronDown, ChevronRight, ArrowLeft, Clock, 
  CheckCircle, AlertTriangle, User, Calendar, Target,
  FolderOpen, ListTodo, Settings, Loader2, Save
} from 'lucide-react';

interface MobileWorkspaceViewProps {
  workspace: any;
  onBack: () => void;
  user: any;
}

export function MobileWorkspaceViewModern({ workspace, onBack, user }: MobileWorkspaceViewProps) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workspace categories with proper server communication
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/categories`],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspace.id}/categories`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Fetch workspace projects
  const { data: projects = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/projects`],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspace.id}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', `/api/workspaces/${workspace.id}/categories`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/categories`] });
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
      const response = await apiRequest('POST', `/api/workspaces/${workspace.id}/projects`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
      setShowCreateProject(false);
      toast({ title: 'Project created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
    }
  });

  // Time tracking functionality
  const handleTimeTracking = async (project: any) => {
    try {
      const response = await fetch('/api/time-entries/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          userId: user?.id,
          userName: user?.firstName + ' ' + user?.lastName,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle time tracking');
      }

      const result = await response.json();
      
      if (result.action === 'started') {
        toast({
          title: "Clock In Successful",
          description: `Started tracking time for ${project.name}`,
        });
      } else {
        toast({
          title: "Clock Out Successful", 
          description: `Stopped tracking time for ${project.name}. Duration: ${result.duration}`,
        });
      }
      
    } catch (error) {
      console.error('[TIME TRACKING] Error:', error);
      toast({
        title: "Time Tracking Error",
        description: "Failed to toggle time tracking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryProjects = (categoryId: number) => {
    return projects.filter((project: any) => project.categoryId === categoryId);
  };

  const getUncategorizedProjects = () => {
    return projects.filter((project: any) => !project.categoryId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Ultra-modern header */}
      <div className="sticky top-0 z-50 bg-white/70 backdrop-blur-3xl border-b border-white/30 shadow-2xl">
        <div className="flex items-center justify-between p-8">
          <div className="flex items-center space-x-5">
            <Button
              variant="ghost"
              onClick={onBack}
              className="p-4 rounded-[2rem] bg-white/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 border border-white/40"
            >
              <ArrowLeft className="h-6 w-6 text-slate-800" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl ring-2 ring-white/30">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {workspace.name}
                </h1>
                <p className="text-base font-semibold text-slate-600">{workspace.description}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateCategory(true)}
            className="p-4 rounded-[1.5rem] bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <main className="p-8 space-y-8">
        {categoriesLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-violet-500" />
            <p className="text-xl font-semibold text-slate-600 mt-6">Loading workspace data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Categories with projects */}
            {categories.map((category: any) => {
              const categoryProjects = getCategoryProjects(category.id);
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <Card key={category.id} className="bg-white/60 backdrop-blur-2xl shadow-2xl border border-white/30 rounded-[2rem]">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          onClick={() => toggleCategory(category.id)}
                          className="p-2 rounded-xl hover:bg-white/50"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          )}
                        </Button>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">{category.name}</h3>
                          <p className="text-slate-600 font-medium">{categoryProjects.length} projects</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowCreateProject(true)}
                        className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Project
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {categoryProjects.map((project: any) => (
                          <Card key={project.id} className="bg-white/40 backdrop-blur-sm border border-white/20 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1" onClick={() => {
                                  setSelectedProject(project);
                                  setShowProjectDetail(true);
                                }}>
                                  <h4 className="text-lg font-bold text-slate-800">{project.name}</h4>
                                  <p className="text-slate-600 text-sm font-medium">{project.description}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="rounded-full">
                                      {project.status}
                                    </Badge>
                                    <Badge variant={project.priority === 'high' ? 'destructive' : 'outline'} className="rounded-full">
                                      {project.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTimeTracking(project);
                                  }}
                                  className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* Uncategorized projects */}
            {getUncategorizedProjects().length > 0 && (
              <Card className="bg-white/60 backdrop-blur-2xl shadow-2xl border border-white/30 rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="text-2xl font-black text-slate-800">Uncategorized Projects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getUncategorizedProjects().map((project: any) => (
                    <Card key={project.id} className="bg-white/40 backdrop-blur-sm border border-white/20 rounded-2xl hover:shadow-xl transition-all duration-300 cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1" onClick={() => {
                            setSelectedProject(project);
                            setShowProjectDetail(true);
                          }}>
                            <h4 className="text-lg font-bold text-slate-800">{project.name}</h4>
                            <p className="text-slate-600 text-sm font-medium">{project.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="rounded-full">
                                {project.status}
                              </Badge>
                              <Badge variant={project.priority === 'high' ? 'destructive' : 'outline'} className="rounded-full">
                                {project.priority}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimeTracking(project);
                            }}
                            className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {categories.length === 0 && projects.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                  <FolderOpen className="w-12 h-12 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-600 mb-2">No categories or projects yet</h3>
                <p className="text-slate-500 font-medium">Create your first category to organize your projects</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Category Modal */}
      <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-white/30 rounded-[2rem] shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Create New Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createCategoryMutation.mutate({
              name: formData.get('name') as string,
            });
          }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 font-bold">Category Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Enter category name" 
                required 
                className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateCategory(false)}
                className="flex-1 rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCategoryMutation.isPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {createCategoryMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Create Category</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Project Modal */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-white/30 rounded-[2rem] shadow-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createProjectMutation.mutate({
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              customerName: formData.get('customerName') as string,
              status: formData.get('status') as string,
              priority: formData.get('priority') as string,
              categoryId: formData.get('categoryId') || null
            });
          }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-bold">Project Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Enter project name" 
                  required 
                  className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-slate-700 font-bold">Customer</Label>
                <Input 
                  id="customerName" 
                  name="customerName" 
                  placeholder="Customer name" 
                  className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-bold">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Describe your project" 
                className="rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-700 font-bold">Status</Label>
                <select 
                  id="status" 
                  name="status" 
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
                >
                  <option value="active">Active</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-slate-700 font-bold">Priority</Label>
                <select 
                  id="priority" 
                  name="priority" 
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId" className="text-slate-700 font-bold">Category</Label>
                <select 
                  id="categoryId" 
                  name="categoryId" 
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateProject(false)}
                className="flex-1 rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProjectMutation.isPending}
                className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                {createProjectMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Create Project</>
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
              {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Project Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600 font-semibold">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProject.status === 'active' ? 'bg-green-500' :
                        selectedProject.status === 'in_progress' ? 'bg-blue-500' :
                        selectedProject.status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-slate-700 font-medium capitalize">{selectedProject.status}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-600 font-semibold">Priority</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProject.priority === 'high' ? 'bg-red-500' :
                        selectedProject.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="text-slate-700 font-medium capitalize">{selectedProject.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-slate-600 font-semibold">Description</Label>
                  <p className="text-slate-700 mt-1">{selectedProject.description}</p>
                </div>
                {selectedProject.customerName && (
                  <div className="mt-4">
                    <Label className="text-slate-600 font-semibold">Customer</Label>
                    <p className="text-slate-700 mt-1">{selectedProject.customerName}</p>
                  </div>
                )}
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
                    onClick={async () => {
                      try {
                        await fetch('/api/change-orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            projectId: selectedProject.id,
                            projectName: selectedProject.name,
                            requestedBy: user?.firstName + ' ' + user?.lastName,
                            workspaceId: workspace.id,
                            timestamp: new Date().toISOString()
                          })
                        });
                        toast({ title: 'Change order request sent', description: 'Project manager will be notified' });
                        setShowProjectDetail(false);
                      } catch (error) {
                        toast({ title: 'Error sending change order', description: 'Please try again', variant: 'destructive' });
                      }
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Send Change Order
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
                    onClick={() => handleTimeTracking(selectedProject)}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Toggle Time Tracking
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