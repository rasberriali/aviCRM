import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Edit, Archive, Upload, Download, Eye } from "lucide-react";
import type { WorkspaceProject, WorkspaceCategory } from "@shared/schema";

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: WorkspaceProject | null;
  workspaceId: number;
  categories: WorkspaceCategory[];
  onSuccess: () => void;
}

export function ProjectDetailModal({ isOpen, onClose, project, workspaceId, categories, onSuccess }: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<WorkspaceProject>>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<WorkspaceProject>) => {
      const response = await apiRequest(`/api/workspaces/${workspaceId}/projects/${project?.id}`, "PUT", updates);
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setEditedProject({});
      onSuccess();
    }
  });

  // Archive project mutation
  const archiveProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/workspaces/${workspaceId}/projects/${project?.id}/archive`, "POST");
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  // Fetch project data when modal opens
  const { data: files = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/projects/${project?.id}/files`],
    enabled: isOpen && !!project?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/projects/${project?.id}/invoices`],
    enabled: isOpen && !!project?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/projects/${project?.id}/change-orders`],
    enabled: isOpen && !!project?.id,
  });

  const handleSaveChanges = () => {
    if (project && Object.keys(editedProject).length > 0) {
      updateProjectMutation.mutate(editedProject);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', project.id.toString());

      const response = await fetch(`/api/workspaces/${workspaceId}/projects/${project.id}/files`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Refresh files list
        window.location.reload(); // Simple refresh for now
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {isEditing ? (
                <Input
                  value={editedProject.name || project.name}
                  onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold"
                />
              ) : (
                project.name
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveChanges} 
                    size="sm"
                    disabled={updateProjectMutation.isPending}
                  >
                    {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    onClick={() => {
                      if (confirm('Archive this project? It will be hidden but preserved.')) {
                        archiveProjectMutation.mutate();
                      }
                    }}
                    variant="outline" 
                    size="sm"
                    disabled={archiveProjectMutation.isPending}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">Project Details</TabsTrigger>
            <TabsTrigger value="client">Client Info</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Description</label>
                  {isEditing ? (
                    <Textarea
                      value={editedProject.description || project.description}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{project.description}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  {isEditing ? (
                    <Select 
                      value={editedProject.status || project.status} 
                      onValueChange={(value) => setEditedProject(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="mt-1">{project.status}</Badge>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Priority</label>
                  {isEditing ? (
                    <Select 
                      value={editedProject.priority || project.priority} 
                      onValueChange={(value) => setEditedProject(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="mt-1">{project.priority}</Badge>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Category</label>
                  {isEditing ? (
                    <Select 
                      value={editedProject.categoryId?.toString() || project.categoryId?.toString()} 
                      onValueChange={(value) => setEditedProject(prev => ({ ...prev, categoryId: parseInt(value) }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {categories.find(c => c.id === project.categoryId)?.name || 'Uncategorized'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Budget</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedProject.budget || project.budget}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, budget: parseFloat(e.target.value) }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">${project.budget?.toLocaleString() || '0'}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Estimated Hours</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedProject.estimatedHours || project.estimatedHours}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{project.estimatedHours || '0'} hours</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">Start Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedProject.startDate || project.startDate}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">End Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedProject.endDate || project.endDate}
                      onChange={(e) => setEditedProject(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="client" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Customer Name</label>
                <p className="mt-1 text-sm text-slate-900">{project.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Company</label>
                <p className="mt-1 text-sm text-slate-900">{project.customerCompany}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Customer ID</label>
                <p className="mt-1 text-sm text-slate-900">{project.customerId}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">Project Files</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploadingFile}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFile ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </div>

            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-900">{file.name}</span>
                      <span className="text-xs text-slate-500">{file.size}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No files uploaded yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-600">Customer Invoices</label>
              
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice: any, index: number) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">Invoice #{invoice.number}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Date: {new Date(invoice.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-slate-600">
                            Status: <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'pending' ? 'secondary' : 'destructive'
                            }>{invoice.status}</Badge>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">${invoice.amount?.toLocaleString()}</p>
                          <p className="text-sm text-slate-600">
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No invoices found for this customer
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="change-orders" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600">Change Orders</label>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  New Change Order
                </Button>
              </div>
              
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order: any, index: number) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">Change Order #{order.number}</h4>
                          <p className="text-sm text-slate-600 mt-1">{order.description}</p>
                          <p className="text-sm text-slate-600">
                            Status: <Badge>{order.status}</Badge>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">${order.amount?.toLocaleString()}</p>
                          <p className="text-sm text-slate-600">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No change orders for this project
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-600">Project Tasks</label>
              <div className="text-center py-8 text-slate-500">
                Task management integration coming soon
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}