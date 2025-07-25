import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWorkspaces } from "@/hooks/useLocalData";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SyncStatus } from "@/components/SyncStatus";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FolderOpen, Users, Folder, CheckSquare, BarChart3, Upload, Clock, Archive, Trash2, Edit } from "lucide-react";
import { WorkspaceView } from "@/components/WorkspaceView";
import { WorkspaceTemplates } from "@/components/WorkspaceTemplates";
import { WorkspaceStatsCard } from "@/components/WorkspaceStatsCard";
import { BulkOperations } from "@/components/BulkOperations";
import { DragDropWorkspace } from "@/components/DragDropWorkspace";
import { FileUploadProgress } from "@/components/FileUploadProgress";
import { TimeTracker } from "@/components/TimeTracker";
import { ActivityFeed } from "@/components/ActivityFeed";
import { WorkspaceColorCustomizer } from "@/components/WorkspaceColorCustomizer";
import { AutoSaveManager } from "@/components/AutoSaveManager";
import type { Workspace } from "@shared/schema";

export default function ProjectsPage() {
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isEditWorkspaceModalOpen, setIsEditWorkspaceModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [showWorkspaceView, setShowWorkspaceView] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Define mutations for workspace operations
  const deleteWorkspace = useMutation({
    mutationFn: async (workspaceId: number) => {
      const response = await apiRequest(`/api/workspaces/${workspaceId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  const updateWorkspace = useMutation({
    mutationFn: async (data: { id: number; name: string; description: string; color: string }) => {
      const response = await apiRequest(`/api/workspaces/${data.id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  const createWorkspace = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const response = await apiRequest('/api/workspaces', "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    }
  });

  // Handle workspace deletion with local-first approach
  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    if (confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      deleteWorkspace.mutate(parseInt(workspaceId), {
        onSuccess: () => {
          toast({
            title: "Workspace deleted",
            description: `Workspace "${workspaceName}" has been deleted successfully.`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error deleting workspace",
            description: "Failed to delete workspace. Please try again.",
            variant: "destructive",
          });
        }
      });
    }
  };

  // Handle workspace editing with local-first approach
  const handleEditWorkspace = (data: { id: number; name: string; description: string; color: string }) => {
    updateWorkspace.mutate(data, {
      onSuccess: () => {
        setIsEditWorkspaceModalOpen(false);
        setEditingWorkspace(null);
        toast({
          title: "Workspace updated",
          description: `Workspace "${data.name}" has been updated successfully.`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error updating workspace",
          description: "Failed to update workspace. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Handle workspace creation
  const handleWorkspaceCreated = (workspace: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    toast({
      title: "Workspace created",
      description: `Workspace "${workspace.name}" has been created successfully.`,
    });
  };

  // Fetch workspaces with standard query for now to fix white screen
  const workspacesQuery = useQuery({
    queryKey: ['/api/workspaces'],
    queryFn: async () => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });
  
  // Handle workspace creation from templates
  const handleWorkspaceCreatedFromTemplate = (workspace: Workspace) => {
    queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    toast({
      title: "Workspace created",
      description: `Workspace "${workspace.name}" has been created successfully.`,
    });
  };



  // Show workspace view if a workspace is selected
  if (showWorkspaceView && selectedWorkspace) {
    return (
      <WorkspaceView 
        workspace={selectedWorkspace} 
        onBack={() => {
          setShowWorkspaceView(false);
          setSelectedWorkspace(null);
        }} 
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-full">
        {/* Enhanced Header */}
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Workspaces
                </h1>
              </div>
              <SyncStatus />
            </div>
            <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
              Organize projects into separate workspaces with categories, projects, and tasks for enhanced collaboration
            </p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => setIsWorkspaceModalOpen(true)}
          >
            <Plus className="w-5 h-5 mr-3" />
            Create Workspace
          </Button>
        </div>

        {/* Enhanced Productivity Toolbar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 mb-10 shadow-lg shadow-slate-200/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Clock className="h-3 w-3 text-white" />
                </div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Productivity Tools
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <WorkspaceTemplates />
                <Button 
                  variant="outline" 
                  size="default" 
                  title="Time Tracker" 
                  className="flex items-center gap-2 rounded-xl border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300 transition-all duration-200"
                >
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Timer
                </Button>
                <Button 
                  variant="outline" 
                  size="default" 
                  title="File Upload" 
                  className="flex items-center gap-2 rounded-xl border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300 transition-all duration-200"
                >
                  <Upload className="h-4 w-4 text-blue-600" />
                  Upload
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline" 
                size="default" 
                title="Bulk Operations" 
                className="flex items-center gap-2 rounded-xl border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300 transition-all duration-200"
              >
                <CheckSquare className="h-4 w-4 text-purple-600" />
                Bulk Edit
              </Button>
              <Button 
                variant="outline" 
                size="default" 
                title="Activity Feed" 
                className="flex items-center gap-2 rounded-xl border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300 transition-all duration-200"
              >
                <Archive className="h-4 w-4 text-orange-600" />
                Activity
              </Button>
              <Button 
                variant="outline" 
                size="default" 
                title="Analytics" 
                className="flex items-center gap-2 rounded-xl border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300 transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4 text-pink-600" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="space-y-8">
          {workspacesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                  <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : !workspacesQuery.data || workspacesQuery.data.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 max-w-2xl mx-auto">
                <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-8 shadow-sm">
                  <FolderOpen className="w-12 h-12 text-slate-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">No workspaces yet</h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Create your first workspace to organize projects into categories with tasks and team collaboration.
                  Each workspace provides a dedicated environment for your team's work.
                </p>
                <Button 
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 px-8 py-4 text-lg"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  Create First Workspace
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
              {workspacesQuery.data.filter(Boolean).map((workspace: Workspace) => (
                <div
                  key={workspace.id}
                  className="group relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200/40 hover:border-slate-300/60 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] cursor-pointer"
                  style={{ 
                    background: `linear-gradient(135deg, ${workspace.color}10 0%, rgba(255,255,255,0.8) 50%, ${workspace.color}05 100%)`
                  }}
                  onClick={() => {
                    setSelectedWorkspace(workspace);
                    setShowWorkspaceView(true);
                  }}
                >
                  {/* Modern card header */}
                  <div className="relative p-8">
                    {/* Gradient overlay */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, ${workspace.color}, ${workspace.color}80)` }}
                    ></div>
                    
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div
                            className="w-12 h-12 rounded-2xl shadow-lg border-2 border-white/80 flex items-center justify-center backdrop-blur-sm"
                            style={{ backgroundColor: workspace.color }}
                          >
                            <FolderOpen className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-100/80 px-3 py-1 rounded-full">
                          <Users className="w-3 h-3" />
                          <span>0 members</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <WorkspaceColorCustomizer 
                          workspaceId={workspace.id.toString()}
                          currentColor={workspace.color || '#3b82f6'}
                          workspaceName={workspace.name}
                          onColorChanged={(newColor) => {
                            updateWorkspace.mutate({ id: workspace.id, color: newColor });
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWorkspace(workspace);
                            setIsEditWorkspaceModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-xl hover:bg-white/80"
                          title={`Edit ${workspace.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkspace(workspace.id.toString(), workspace.name);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-white/80"
                          title={`Delete ${workspace.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Modern card content */}
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                        {workspace.name}
                      </h3>
                      <p className="text-slate-500 text-base mb-6 line-clamp-2 leading-relaxed font-medium">
                        {workspace.description || 'No description provided'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <span className="font-medium">0 categories</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <span className="font-medium">0 projects</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <span className="font-medium">0 tasks</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkspace(workspace);
                              setShowWorkspaceView(true);
                            }}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Open Workspace
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workspace Creation Modal */}
      <CreateWorkspaceModal 
        isOpen={isWorkspaceModalOpen} 
        onClose={() => setIsWorkspaceModalOpen(false)} 
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
}

// Workspace Creation Modal Component
function CreateWorkspaceModal({ 
  isOpen, 
  onClose, 
  onWorkspaceCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onWorkspaceCreated: (workspace: any) => void; 
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      console.log('Creating workspace with data:', data);
      
      // Use relative URL to work with Vite proxy
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      console.log('Raw response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Success result:', result);
      return result;
    },
    onSuccess: (newWorkspace) => {
      console.log('Mutation onSuccess called with:', newWorkspace);
      onWorkspaceCreated(newWorkspace);
      onClose();
      setName('');
      setDescription('');
      setColor('#3b82f6');
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    },
    onError: (error) => {
      console.error('Mutation onError called with:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      setIsCreating(false);
    }
  });

  const handleSubmit = () => {
    if (name.trim()) {
      setIsCreating(true);
      createWorkspaceMutation.mutate({
        name: name.trim(),
        description: description.trim(),
        color
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter workspace description"
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
                placeholder="#3b82f6"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || isCreating}
            className="bg-slate-800 hover:bg-slate-700"
          >
            {isCreating ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Workspace Modal Component
function EditWorkspaceModal({ 
  isOpen, 
  workspace,
  onClose, 
  onWorkspaceUpdated 
}: { 
  isOpen: boolean;
  workspace: Workspace | null;
  onClose: () => void;
  onWorkspaceUpdated: (data: { id: number; name: string; description: string; color: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form with workspace data when modal opens
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setDescription(workspace.description || '');
      setColor(workspace.color || '#3b82f6');
    }
  }, [workspace]);

  const handleSubmit = async () => {
    if (!name.trim() || !workspace) return;

    setIsUpdating(true);
    try {
      onWorkspaceUpdated({
        id: workspace.id,
        name: name.trim(),
        description: description.trim(),
        color: color
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!workspace) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Workspace Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter workspace description"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-600">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || isUpdating}
            className="bg-slate-800 hover:bg-slate-700"
          >
            {isUpdating ? 'Updating...' : 'Update Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}