import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Plus, ChevronDown, ChevronRight, MoreVertical, Edit, Trash2, 
  CheckCircle, Clock, AlertTriangle, User, Calendar, Target,
  FolderOpen, ListTodo, Settings, ArrowLeft
} from 'lucide-react';

interface MobileWorkspaceViewProps {
  workspace: any;
  onBack: () => void;
  user: any;
}

export function MobileWorkspaceView({ workspace, onBack, user }: MobileWorkspaceViewProps) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    customerName: '',
    status: 'active',
    priority: 'medium'
  });
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    dueDate: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          variant: "default",
        });
      } else {
        toast({
          title: "Clock Out Successful", 
          description: `Stopped tracking time for ${project.name}. Duration: ${result.duration}`,
          variant: "default",
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

  // Fetch workspace data with better error handling
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: [`/api/workspaces/${workspace?.id}/categories`],
    enabled: !!workspace?.id,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/projects`],
    enabled: !!workspace.id,
  });

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/tasks`],
    enabled: !!workspace.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/http-clients'],
    enabled: !!workspace?.id,
    retry: 1,
    queryFn: async () => {
      try {
        const response = await fetch('/api/clients', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.log('[MOBILE WORKSPACE] No clients found, returning empty array');
          return [];
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('[MOBILE WORKSPACE] Client fetch error:', error);
        return [];
      }
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', `/api/workspaces/${workspace.id}/categories`, {
        name,
        position: categories.length
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/categories`] });
      setShowCreateCategory(false);
      setNewCategoryName('');
      toast({ title: 'Category created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating category', description: error.message, variant: 'destructive' });
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await apiRequest('POST', `/api/workspaces/${workspace.id}/projects`, {
        categoryId: selectedCategory?.id || null,
        ...projectData,
        position: projects.length
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
      setShowCreateProject(false);
      setNewProjectData({
        name: '',
        description: '',
        customerName: '',
        status: 'active',
        priority: 'medium'
      });
      toast({ title: 'Project created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest('POST', `/api/workspaces/${workspace.id}/tasks`, {
        ...taskData,
        workspaceId: workspace.id,
        categoryId: selectedCategory?.id || null,
        projectId: selectedProject?.id || null,
        assignedTo: taskData.assignedTo || user.id,
        createdBy: user.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/tasks`] });
      setShowCreateTask(false);
      setNewTaskData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedTo: '',
        dueDate: ''
      });
      toast({ title: 'Task created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: any }) => {
      const response = await apiRequest('PUT', `/api/workspace-tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspace.id, 'tasks'] });
      toast({ title: 'Task updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest('DELETE', `/api/workspace-tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspace.id, 'tasks'] });
      toast({ title: 'Task deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: number; updates: any }) => {
      const response = await apiRequest('PUT', `/api/workspaces/${workspace.id}/projects/${projectId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
      toast({ title: 'Project updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating project', description: error.message, variant: 'destructive' });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest('DELETE', `/api/workspaces/${workspace.id}/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
      toast({ title: 'Project deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest('DELETE', `/api/workspaces/${workspace.id}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/categories`] });
      toast({ title: 'Category deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
    }
  });

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': case 'in_progress': return 'bg-blue-500';
      case 'completed': case 'done': return 'bg-green-500';
      case 'on_hold': return 'bg-yellow-500';
      case 'todo': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getTasksForCategory = (categoryId: number) => {
    return tasks.filter((task: any) => task.categoryId === categoryId);
  };

  const getTasksForProject = (projectId: number) => {
    return tasks.filter((task: any) => task.projectId === projectId);
  };

  const getUncategorizedProjects = () => {
    return projects.filter((project: any) => !project.categoryId);
  };

  const getUncategorizedTasks = () => {
    return tasks.filter((task: any) => !task.categoryId && !task.projectId);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div 
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: workspace.color || '#9521c0' }}
          />
          <div>
            <h1 className="text-lg font-semibold">{workspace.name}</h1>
            <p className="text-sm text-muted-foreground">{workspace.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateCategory(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createCategoryMutation.mutate(newCategoryName)}
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateTask(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Task
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Categories */}
          {categories.map((category: any) => {
            const categoryProjects = projects.filter((p: any) => p.categoryId === category.id);
            const categoryTasks = getTasksForCategory(category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Card key={category.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {categoryProjects.length} projects • {categoryTasks.length} tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category);
                        setShowCreateProject(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this category?')) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {/* Projects in Category */}
                    {categoryProjects.map((project: any) => {
                      const projectTasks = getTasksForProject(project.id);
                      const isProjectExpanded = expandedProjects.has(project.id);

                      return (
                        <div key={project.id} className="border-b last:border-b-0">
                          <div
                            className="flex items-center justify-between p-4 pl-12 cursor-pointer hover:bg-muted/30"
                            onClick={() => toggleProject(project.id)}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              {isProjectExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Target className="h-4 w-4 text-blue-500" />
                              <div className="flex-1">
                                <h4 className="font-medium">{project.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {project.customerName} • {projectTasks.length} tasks
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Clock In/Out Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="bg-green-50 hover:bg-green-100 text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTimeTracking(project);
                                }}
                                title="Clock In/Out"
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowCreateTask(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newStatus = project.status === 'active' ? 'completed' : 'active';
                                  updateProjectMutation.mutate({
                                    projectId: project.id,
                                    updates: { status: newStatus }
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this project?')) {
                                    deleteProjectMutation.mutate(project.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getStatusColor(project.status)} text-white`}>
                                {project.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setSelectedCategory(category);
                                  setShowCreateTask(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {isProjectExpanded && (
                            <div className="pl-16 pb-4">
                              {projectTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">No tasks yet</p>
                              ) : (
                                <div className="space-y-2">
                                  {projectTasks.map((task: any) => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                                        <div>
                                          <h5 className="font-medium text-sm">{task.title}</h5>
                                          <p className="text-xs text-muted-foreground">
                                            {task.assignedTo && `Assigned to ${task.assignedTo}`}
                                            {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-white`}>
                                          {task.priority}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const newStatus = task.status === 'done' ? 'todo' : 'done';
                                            updateTaskMutation.mutate({
                                              taskId: task.id,
                                              updates: { status: newStatus }
                                            });
                                          }}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteTaskMutation.mutate(task.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Direct tasks in category */}
                    {categoryTasks.filter((task: any) => !task.projectId).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-4 pl-12 bg-muted/20">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                          <div>
                            <h5 className="font-medium text-sm">{task.title}</h5>
                            <p className="text-xs text-muted-foreground">
                              {task.assignedTo && `Assigned to ${task.assignedTo}`}
                              {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-white`}>
                            {task.priority}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newStatus = task.status === 'done' ? 'todo' : 'done';
                              updateTaskMutation.mutate({
                                taskId: task.id,
                                updates: { status: newStatus }
                              });
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Uncategorized Projects */}
          {getUncategorizedProjects().length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium mb-4">Uncategorized Projects</h3>
                <div className="space-y-2">
                  {getUncategorizedProjects().map((project: any) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Target className="h-4 w-4 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-sm text-muted-foreground">{project.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getStatusColor(project.status)} text-white`}>
                          {project.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProject(project);
                            setSelectedCategory(null);
                            setShowCreateTask(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Uncategorized Tasks */}
          {getUncategorizedTasks().length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium mb-4">Uncategorized Tasks</h3>
                <div className="space-y-2">
                  {getUncategorizedTasks().map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                        <div>
                          <h5 className="font-medium text-sm">{task.title}</h5>
                          <p className="text-xs text-muted-foreground">
                            {task.assignedTo && `Assigned to ${task.assignedTo}`}
                            {task.dueDate && ` • Due ${new Date(task.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-white`}>
                          {task.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newStatus = task.status === 'done' ? 'todo' : 'done';
                            updateTaskMutation.mutate({
                              taskId: task.id,
                              updates: { status: newStatus }
                            });
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Create Project Modal */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectData.name}
                onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={newProjectData.description}
                onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})}
                placeholder="Enter project description"
              />
            </div>
            <div>
              <Label htmlFor="customer-name">Customer</Label>
              <Select
                value={newProjectData.customerName}
                onValueChange={(value) => setNewProjectData({...newProjectData, customerName: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(clients) && clients.map((client: any) => (
                    <SelectItem key={client.customerId || client.id} value={client.name || client.company || 'Unknown'}>
                      {client.name || client.company || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={newProjectData.status}
                  onValueChange={(value) => setNewProjectData({...newProjectData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project-priority">Priority</Label>
                <Select
                  value={newProjectData.priority}
                  onValueChange={(value) => setNewProjectData({...newProjectData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createProjectMutation.mutate(newProjectData)}
                disabled={!newProjectData.name.trim() || createProjectMutation.isPending}
              >
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={newTaskData.title}
                onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({...newTaskData, description: e.target.value})}
                placeholder="Enter task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select
                  value={newTaskData.status}
                  onValueChange={(value) => setNewTaskData({...newTaskData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={newTaskData.priority}
                  onValueChange={(value) => setNewTaskData({...newTaskData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="task-assigned">Assigned To</Label>
              <Input
                id="task-assigned"
                value={newTaskData.assignedTo}
                onChange={(e) => setNewTaskData({...newTaskData, assignedTo: e.target.value})}
                placeholder="Enter assignee (optional)"
              />
            </div>
            <div>
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={newTaskData.dueDate}
                onChange={(e) => setNewTaskData({...newTaskData, dueDate: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTaskMutation.mutate(newTaskData)}
                disabled={!newTaskData.title.trim() || createTaskMutation.isPending}
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}