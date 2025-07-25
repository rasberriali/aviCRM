import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FileText, 
  CheckSquare, 
  Users, 
  Calendar,
  Clock,
  DollarSign,
  GripVertical,
  FolderOpen,
  Edit,
  Archive,
  Upload,
  Download,
  Eye,
  X,
  Trash2
} from "lucide-react";
import type { Workspace, WorkspaceCategory, WorkspaceProject, WorkspaceTask } from "@shared/schema";
import { ProjectDetailModal } from "./ProjectDetailModal";
import { ProjectTimeTracker } from "./ProjectTimeTracker";

interface WorkspaceViewProps {
  workspace: Workspace;
  onBack: () => void;
}

export function WorkspaceView({ workspace, onBack }: WorkspaceViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewingProject, setViewingProject] = useState<WorkspaceProject | null>(null);
  const [draggedProject, setDraggedProject] = useState<WorkspaceProject | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch workspace data
  const categoriesQuery = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/categories`],
    queryFn: async () => {
      const response = await apiRequest(`/api/workspaces/${workspace.id}/categories`, "GET");
      return response.json();
    },
  });

  const projectsQuery = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/projects`],
    queryFn: async () => {
      const response = await apiRequest(`/api/workspaces/${workspace.id}/projects`, "GET");
      return response.json();
    },
  });

  const tasksQuery = useQuery({
    queryKey: [`/api/workspaces/${workspace.id}/tasks`],
    queryFn: async () => {
      const response = await apiRequest(`/api/workspaces/${workspace.id}/tasks`, "GET");
      return response.json();
    },
  });

  const categories: WorkspaceCategory[] = categoriesQuery.data || [];
  const projects: WorkspaceProject[] = projectsQuery.data || [];
  const tasks: WorkspaceTask[] = tasksQuery.data || [];

  // Group projects by category
  const projectsByCategory = projects.reduce((acc, project) => {
    const categoryId = project.categoryId || 'uncategorized';
    if (!acc[categoryId]) acc[categoryId] = [];
    acc[categoryId].push(project);
    return acc;
  }, {} as Record<string | number, WorkspaceProject[]>);

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    const projectId = task.projectId || 'unassigned';
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string | number, WorkspaceTask[]>);

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

  const openCreateProject = (categoryId?: number) => {
    setSelectedCategoryId(categoryId || null);
    setIsCreateProjectModalOpen(true);
  };

  const openCreateTask = (projectId: number) => {
    setSelectedProjectId(projectId);
    setIsCreateTaskModalOpen(true);
  };

  // Project update mutation for drag and drop
  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, categoryId }: { projectId: string, categoryId: number | null }) => {
      const response = await apiRequest(`/api/workspaces/${workspace.id}/projects/${projectId}`, "PUT", {
        categoryId: categoryId
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
    },
    onError: (error) => {
      console.error('Error updating project:', error);
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest(`/api/workspaces/${workspace.id}/projects/${projectId}`, "DELETE");
      return response.status === 204 ? {} : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/tasks`] });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
    }
  });

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, project: WorkspaceProject) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCategory = (e: React.DragEvent, categoryId: number) => {
    e.preventDefault();
    if (draggedProject && draggedProject.categoryId !== categoryId) {
      updateProjectMutation.mutate({
        projectId: draggedProject.id,
        categoryId: categoryId
      });
    }
    setDraggedProject(null);
  };

  const handleDropOnUncategorized = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedProject && draggedProject.categoryId !== null) {
      updateProjectMutation.mutate({
        projectId: draggedProject.id,
        categoryId: null
      });
    }
    setDraggedProject(null);
  };

  if (categoriesQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspaces
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{workspace.name}</h1>
            <p className="text-slate-600">{workspace.description}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-lg border-l-4 relative overflow-hidden" 
           style={{ 
             background: `linear-gradient(135deg, ${workspace.color}10 0%, ${workspace.color}05 100%)`,
             borderLeftColor: workspace.color 
           }}>
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Workspaces
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full shadow-sm border-2 border-white"
              style={{ backgroundColor: workspace.color }}
            ></div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-slate-600">{workspace.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsCreateCategoryModalOpen(true)}
            variant="outline"
            className="border-slate-300 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </Button>
          <Button 
            onClick={() => openCreateProject()}
            className="bg-slate-800 hover:bg-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Workspace Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Folder className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-slate-600">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-slate-600">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckSquare className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-sm text-slate-600">Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-slate-600">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table-like Hierarchy View */}
      <div className="space-y-2">
        {categories.length === 0 && projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Folder className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No content yet</h3>
              <p className="text-slate-500 mb-6">
                Start by creating categories and projects to organize your work.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsCreateCategoryModalOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
                <Button onClick={() => openCreateProject()} className="bg-slate-800 hover:bg-slate-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Categories */}
            {categories.map((category) => {
              const categoryProjects = projectsByCategory[category.id] || [];
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <div key={category.id} className="border border-slate-200 rounded-lg">
                  {/* Category Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer relative overflow-hidden"
                    style={{ 
                      background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}08 100%)`,
                      borderLeft: `4px solid ${category.color}`
                    }}
                    onClick={() => toggleCategory(category.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnCategory(e, category.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm border-2 border-white"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <Folder className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-900">{category.name}</span>
                      <Badge 
                        variant="secondary"
                        className="shadow-sm"
                        style={{ 
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                          border: `1px solid ${category.color}40`
                        }}
                      >
                        {categoryProjects.length} projects
                      </Badge>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateProject(category.id);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Category Projects */}
                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      {categoryProjects.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          No projects in this category
                        </div>
                      ) : (
                        categoryProjects.map((project) => {
                          const projectTasks = tasksByProject[project.id] || [];
                          const isProjectExpanded = expandedProjects.has(project.id);
                          
                          return (
                            <div 
                              key={project.id} 
                              className="border-t border-slate-100"
                              draggable
                              onDragStart={(e) => handleDragStart(e, project)}
                            >
                              {/* Project Header */}
                              <div 
                                className="flex items-center justify-between p-4 pl-12 hover:bg-slate-50 cursor-pointer"
                                onClick={() => toggleProject(project.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                                  {isProjectExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                  <FileText className="w-4 h-4 text-slate-600" />
                                  <span 
                                    className="font-medium text-slate-800 cursor-pointer hover:text-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingProject(project);
                                      setIsProjectDetailModalOpen(true);
                                    }}
                                  >
                                    {project.name}
                                  </span>
                                  <Badge variant="outline">{projectTasks.length} tasks</Badge>
                                  <Badge variant={
                                    project.status === 'active' ? 'default' :
                                    project.status === 'completed' ? 'secondary' :
                                    'outline'
                                  }>
                                    {project.status}
                                  </Badge>
                                  <ProjectTimeTracker 
                                    projectId={project.id.toString()}
                                    projectName={project.name}
                                    workspaceId={workspace.id.toString()}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingProject(project);
                                      setIsProjectDetailModalOpen(true);
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    title="View Project Details"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCreateTask(project.id);
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    title="Add Task"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProject(project.id, project.name);
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    title="Delete Project"
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Project Tasks */}
                              {isProjectExpanded && (
                                <div className="border-t border-slate-100">
                                  {projectTasks.length === 0 ? (
                                    <div className="p-4 pl-20 text-center text-slate-500">
                                      No tasks in this project
                                    </div>
                                  ) : (
                                    projectTasks.map((task) => (
                                      <div key={task.id} className="flex items-center justify-between p-3 pl-20 hover:bg-slate-50 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                          <CheckSquare className="w-4 h-4 text-slate-600" />
                                          <span className="text-slate-800">{task.title}</span>
                                          <Badge variant={
                                            task.status === 'completed' ? 'secondary' :
                                            task.status === 'in_progress' ? 'default' :
                                            'outline'
                                          }>
                                            {task.status}
                                          </Badge>
                                          {task.assignedTo && (
                                            <Badge variant="outline">{task.assignedTo}</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                          {task.dueDate && (
                                            <>
                                              <Calendar className="w-4 h-4" />
                                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized Projects */}
            {projectsByCategory['uncategorized'] && projectsByCategory['uncategorized'].length > 0 && (
              <div className="border border-slate-200 rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(135deg, #64748b15 0%, #64748b08 100%)`,
                    borderLeft: `4px solid #64748b`
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnUncategorized}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm border-2 border-white"
                      style={{ backgroundColor: '#64748b' }}
                    ></div>
                    <Folder className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-900">Uncategorized Projects</span>
                    <Badge 
                      variant="secondary"
                      className="shadow-sm"
                      style={{ 
                        backgroundColor: '#64748b20',
                        color: '#64748b',
                        border: '1px solid #64748b40'
                      }}
                    >
                      {projectsByCategory['uncategorized'].length}
                    </Badge>
                  </div>
                </div>
                <div className="border-t border-slate-200">
                  {projectsByCategory['uncategorized'].map((project) => {
                    const projectTasks = tasksByProject[project.id] || [];
                    const isProjectExpanded = expandedProjects.has(project.id);
                    
                    return (
                      <div 
                        key={project.id} 
                        className="border-t border-slate-100"
                        draggable
                        onDragStart={(e) => handleDragStart(e, project)}
                      >
                        <div 
                          className="flex items-center justify-between p-4 pl-12 hover:bg-slate-50 cursor-pointer"
                          onClick={() => toggleProject(project.id)}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                            {isProjectExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                            <FileText className="w-4 h-4 text-slate-600" />
                            <span className="font-medium text-slate-800">{project.name}</span>
                            <Badge variant="outline">{projectTasks.length} tasks</Badge>
                            <ProjectTimeTracker 
                              projectId={project.id.toString()}
                              projectName={project.name}
                              workspaceId={workspace.id.toString()}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingProject(project);
                                setIsProjectDetailModalOpen(true);
                              }}
                              size="sm"
                              variant="ghost"
                              title="View Project Details"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateTask(project.id);
                              }}
                              size="sm"
                              variant="ghost"
                              title="Add Task"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id, project.name);
                              }}
                              size="sm"
                              variant="ghost"
                              title="Delete Project"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isProjectExpanded && (
                          <div className="border-t border-slate-100">
                            {projectTasks.length === 0 ? (
                              <div className="p-4 pl-20 text-center text-slate-500">
                                No tasks in this project
                              </div>
                            ) : (
                              projectTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 pl-20 hover:bg-slate-50 border-t border-slate-50">
                                  <div className="flex items-center gap-3">
                                    <CheckSquare className="w-4 h-4 text-slate-600" />
                                    <span className="text-slate-800">{task.title}</span>
                                    <Badge variant={
                                      task.status === 'completed' ? 'secondary' :
                                      task.status === 'in_progress' ? 'default' :
                                      'outline'
                                    }>
                                      {task.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Category Modal */}
      <CreateCategoryModal 
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        workspaceId={workspace.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/categories`] });
        }}
      />

      {/* Create Project Modal */}
      <CreateProjectModal 
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        workspaceId={workspace.id}
        categoryId={selectedCategoryId}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal 
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        workspaceId={workspace.id}
        projectId={selectedProjectId}
        projects={projects}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/tasks`] });
        }}
      />

      {/* Project Detail Modal */}
      <ProjectDetailModal 
        isOpen={isProjectDetailModalOpen}
        onClose={() => {
          setIsProjectDetailModalOpen(false);
          setViewingProject(null);
        }}
        project={viewingProject}
        workspaceId={workspace.id}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/projects`] });
          queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspace.id}/categories`] });
        }}
      />
    </div>
  );
}

// Create Category Modal Component
function CreateCategoryModal({ isOpen, onClose, workspaceId, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6b7280');
  
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const response = await apiRequest(`/api/workspaces/${workspaceId}/categories`, "POST", data);
      return response.json();
    },
    onSuccess: (data) => {
      onSuccess();
      onClose();
      setName('');
      setDescription('');
      setColor('#6b7280');
    },
    onError: (error: Error) => {
      console.error('Error creating category:', error);
    }
  });

  const handleSubmit = () => {
    if (name.trim()) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim(),
        color
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter category description (optional)"
              className="w-full p-2 border border-slate-300 rounded-md resize-none h-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#6b7280"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Project Modal Component  
function CreateProjectModal({ isOpen, onClose, workspaceId, categoryId, categories, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  categoryId: number | null;
  categories: WorkspaceCategory[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(categoryId);
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState('medium');
  const [budget, setBudget] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    company: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });
  
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };
    
    if (showCustomerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerSuggestions]);
  
  // Fetch clients for autocomplete
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/http-clients'],
    queryFn: async () => {
      const response = await apiRequest('/api/http-clients', "GET");
      const clientData = await response.json();
      
      // Format clients for autocomplete with consistent field names
      return clientData.map((client: any) => ({
        id: client.customerId,
        name: client.fullName || client.company || '',
        company: client.company || client.fullName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || ''
      }));
    },
  });
  
  // Fetch employees for user assignment
  const { data: employeesData } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await apiRequest('/api/employees', "GET");
      return response.json();
    },
  });
  
  const employees = employeesData?.employees || [];
  
  // Handle customer name input and autocomplete
  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    if (value.length > 0) {
      const suggestions = clients.filter((client: any) => 
        client.fullName?.toLowerCase().includes(value.toLowerCase()) ||
        client.company?.toLowerCase().includes(value.toLowerCase()) ||
        client.email?.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setCustomerSuggestions(suggestions);
      setShowCustomerSuggestions(true); // Always show dropdown when typing
    } else {
      setShowCustomerSuggestions(false);
      setSelectedCustomer(null);
    }
  };
  
  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.company || customer.fullName || '');
    setShowCustomerSuggestions(false);
  };
  
  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      // Generate a unique customer ID
      const customerId = `CLIENT_${Date.now()}_${customerData.fullName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const formattedCustomerData = {
        customerId,
        fullName: customerData.fullName,
        company: customerData.company || customerData.fullName,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        zip: customerData.zip,
        notes: customerData.notes
      };
      
      const response = await apiRequest('/api/http-clients', "POST", formattedCustomerData);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      // Update the customer state with the new customer
      setSelectedCustomer({
        id: newCustomer.customerId,
        name: newCustomer.fullName,
        company: newCustomer.company,
        email: newCustomer.email
      });
      setCustomerName(newCustomer.company || newCustomer.fullName);
      setShowCreateCustomerModal(false);
      // Reset the form
      setNewCustomerData({
        company: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: ''
      });
    },
    onError: (error) => {
      console.error('Failed to create customer:', error);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('API Request: POST', `/api/workspaces/${workspaceId}/projects`, data);
      const response = await apiRequest(`/api/workspaces/${workspaceId}/projects`, "POST", data);
      return response;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setSelectedCategoryId(null);
      setCustomerName('');
      setSelectedCustomer(null);
      setAssignedUsers([]);
      setStatus('active');
      setPriority('medium');
      setBudget('');
      setEstimatedHours('');
      setStartDate('');
      setEndDate('');
      setTags('');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
    }
  });

  const handleSubmit = () => {
    if (name.trim()) {
      const projectData = {
        name: name.trim(),
        description: description.trim(),
        categoryId: selectedCategoryId,
        customerName: customerName.trim(),
        customerId: selectedCustomer?.id || null,
        customerCompany: selectedCustomer?.company || '',
        assignedUsers,
        status,
        priority,
        budget: budget ? parseFloat(budget) : 0,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
        startDate: startDate || null,
        endDate: endDate || null,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      
      createMutation.mutate(projectData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description"
                className="w-full p-2 border border-slate-300 rounded-md resize-none h-20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border border-slate-300 rounded-md"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-sm font-medium mb-1">Customer *</label>
              <div className="flex gap-2">
                <Input
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => {
                    // Show dropdown when focused if there's text
                    if (customerName.length > 0) {
                      setShowCustomerSuggestions(true);
                    }
                  }}
                  placeholder="Start typing customer name or company..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewCustomerData({
                      company: customerName.trim(),
                      fullName: customerName.trim(),
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      state: '',
                      zip: '',
                      notes: ''
                    });
                    setShowCreateCustomerModal(true);
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Client
                </Button>
              </div>
              {customerName.length > 0 && showCustomerSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {customerSuggestions.length > 0 ? (
                    customerSuggestions.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 hover:bg-slate-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="font-medium">{customer.company || customer.fullName}</div>
                        {customer.email && (
                          <div className="text-sm text-slate-600">{customer.email}</div>
                        )}
                      </div>
                    ))
                  ) : customerName.length > 0 ? (
                    <div className="p-2 text-slate-500 text-sm">No customers found matching "{customerName}"</div>
                  ) : null}
                  
                  {/* Always show "Create new client" button */}
                  <div
                    className="p-2 hover:bg-blue-50 cursor-pointer border-t border-slate-200 bg-blue-25"
                    onClick={() => {
                      setNewCustomerData({
                        ...newCustomerData,
                        company: customerName.trim(),
                        fullName: customerName.trim()
                      });
                      setShowCreateCustomerModal(true);
                      setShowCustomerSuggestions(false);
                    }}
                  >
                    <div className="font-medium text-blue-600">
                      + Create new client{customerName.trim() ? `: "${customerName}"` : ''}
                    </div>
                    <div className="text-sm text-blue-500">Add a new client to your database</div>
                  </div>
                </div>
              )}
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-800">
                    Selected: {selectedCustomer.company || selectedCustomer.name}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Team Members</label>
              <div className="border border-slate-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="text-sm text-slate-500">No employees available</div>
                ) : (
                  employees.map((employee: any) => (
                    <div key={employee.userId} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`user-${employee.userId}`}
                        checked={assignedUsers.includes(employee.userId)}
                        onChange={() => toggleUserAssignment(employee.userId)}
                        className="mr-2"
                      />
                      <label 
                        htmlFor={`user-${employee.userId}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {employee.firstName} {employee.lastName}
                        <span className="text-slate-500 ml-1">({employee.department})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              {assignedUsers.length > 0 && (
                <div className="mt-2 text-sm text-slate-600">
                  {assignedUsers.length} team member(s) assigned
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Budget ($)</label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estimated Hours</label>
                <Input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas"
              />
              <div className="text-xs text-slate-500 mt-1">
                e.g. installation, audio, video, crestron
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || !customerName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Customer Creation Modal */}
      <CreateCustomerModal
        isOpen={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        customerData={newCustomerData}
        setCustomerData={setNewCustomerData}
        onSubmit={() => createCustomerMutation.mutate(newCustomerData)}
        isSubmitting={createCustomerMutation.isPending}
      />
    </Dialog>
  );
}

// Create Customer Modal Component
function CreateCustomerModal({ isOpen, onClose, customerData, setCustomerData, onSubmit, isSubmitting }: {
  isOpen: boolean;
  onClose: () => void;
  customerData: any;
  setCustomerData: (data: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <Input
                value={customerData.company}
                onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <Input
                value={customerData.fullName}
                onChange={(e) => setCustomerData({ ...customerData, fullName: e.target.value })}
                placeholder="Enter contact person name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                type="tel"
                value={customerData.phone}
                onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              value={customerData.address}
              onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
              placeholder="Enter street address"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <Input
                value={customerData.city}
                onChange={(e) => setCustomerData({ ...customerData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <Input
                value={customerData.state}
                onChange={(e) => setCustomerData({ ...customerData, state: e.target.value })}
                placeholder="Enter state"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ZIP Code</label>
              <Input
                value={customerData.zip}
                onChange={(e) => setCustomerData({ ...customerData, zip: e.target.value })}
                placeholder="Enter ZIP code"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={customerData.notes}
              onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
              placeholder="Enter any additional notes"
              className="w-full p-2 border border-slate-300 rounded-md resize-none h-20"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={onSubmit}
            disabled={!customerData.company.trim() || !customerData.fullName.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Task Modal Component
function CreateTaskModal({ isOpen, onClose, workspaceId, projectId, projects, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
  projectId: number | null;
  projects: WorkspaceProject[];
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId);
  
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; projectId: number | null }) => {
      const response = await apiRequest(`/api/workspaces/${workspaceId}/tasks`, "POST", data);
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
      setSelectedProjectId(null);
    }
  });

  const handleSubmit = () => {
    if (title.trim()) {
      createMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        projectId: selectedProjectId
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              className="w-full p-2 border border-slate-300 rounded-md resize-none h-20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full p-2 border border-slate-300 rounded-md"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}