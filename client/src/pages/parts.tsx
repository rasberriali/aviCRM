import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, AlertTriangle, CheckCircle2, ShoppingCart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertProjectPartSchema, type ProjectPart, type Project } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const partFormSchema = z.object({
  partName: z.string().min(1, 'Part name is required'),
  description: z.string().optional(),
  partNumber: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  vendor: z.string().optional(),
  unitPrice: z.number().min(0, 'Price must be positive'),
  quantityNeeded: z.number().min(1, 'Quantity must be at least 1'),
  status: z.string().default('needed'),
  priority: z.string().default('medium'),
  notes: z.string().optional(),
});

type PartFormData = z.infer<typeof partFormSchema>;

export default function PartsPage() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ProjectPart | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'PROJECT_PART_ADDED' || data.type === 'PROJECT_PART_UPDATED' || data.type === 'PROJECT_PART_DELETED') {
        // Invalidate parts queries to refresh data
        if (selectedProject) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'parts'] });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/parts/needed'] });
      }
    };

    return () => socket.close();
  }, [queryClient, selectedProject]);

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
  });

  // Fetch parts for selected project
  const { data: projectParts = [], isLoading: partsLoading } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'parts'],
    enabled: !!selectedProject,
  });

  // Fetch all needed parts (for managers)
  const { data: neededParts = [], isLoading: neededPartsLoading } = useQuery({
    queryKey: ['/api/parts/needed'],
  });

  // Show loading state if any data is still loading
  const isLoading = projectsLoading || neededPartsLoading || (selectedProject && partsLoading);

  const form = useForm<PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partName: '',
      description: '',
      partNumber: '',
      category: '',
      vendor: '',
      unitPrice: 0,
      quantityNeeded: 1,
      status: 'needed',
      priority: 'medium',
      notes: '',
    },
  });

  // Create part mutation
  const createPartMutation = useMutation({
    mutationFn: async (data: PartFormData) => {
      if (!selectedProject) throw new Error('No project selected');
      return apiRequest(`/api/projects/${selectedProject}/parts`, 'POST', JSON.stringify(data));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Part added successfully",
      });
      setIsPartDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parts/needed'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update part mutation
  const updatePartMutation = useMutation({
    mutationFn: async (data: Partial<PartFormData> & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/parts/${id}`, 'PUT', JSON.stringify(updateData));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Part updated successfully",
      });
      setEditingPart(null);
      setIsPartDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/parts/needed'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PartFormData) => {
    if (editingPart) {
      updatePartMutation.mutate({ ...data, id: editingPart.id });
    } else {
      createPartMutation.mutate(data);
    }
  };

  const handleEditPart = (part: ProjectPart) => {
    setEditingPart(part);
    form.reset({
      partName: part.partName,
      description: part.description || '',
      partNumber: part.partNumber || '',
      category: part.category,
      vendor: part.vendor || '',
      unitPrice: typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) || 0 : (part.unitPrice || 0),
      quantityNeeded: part.quantityNeeded,
      status: part.status,
      priority: part.priority,
      notes: part.notes || '',
    });
    setIsPartDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'ordered':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'needed':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ordered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'needed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredNeededParts = (neededParts as ProjectPart[] || []).filter((part: ProjectPart) =>
    (part.partName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.partNumber && part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.vendor && part.vendor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProjectParts = (projectParts as ProjectPart[] || []).filter((part: ProjectPart) =>
    (part.partName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.partNumber && part.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.vendor && part.vendor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTotalValue = (parts: ProjectPart[]) => {
    return parts.reduce((total, part) => {
      const unitPrice = typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) || 0 : (part.unitPrice || 0);
      return total + (part.quantityNeeded * unitPrice);
    }, 0);
  };

  // Show loading state if data is still loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading parts data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Management</h1>
          <p className="text-muted-foreground">
            Track project parts, manage inventory, and coordinate ordering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </div>
      </div>

      {/* Needed Parts Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Parts Needed for Ordering
          </CardTitle>
          <CardDescription>
            Parts across all projects that need to be ordered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {neededPartsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredNeededParts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? 'No parts found matching your search' : 'No parts currently needed for ordering'}
            </p>
          ) : (
            <>
              <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Parts Needed: {filteredNeededParts.length}</span>
                  <span>Estimated Value: ${getTotalValue(filteredNeededParts).toFixed(2)}</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNeededParts.map((part: ProjectPart) => (
                  <Card key={part.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleEditPart(part)}>
                    <CardContent className="p-4">
                                              <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-sm truncate">{part.partName}</h3>
                          {getStatusIcon(part.status)}
                        </div>
                        <div className="space-y-2">
                          {part.partNumber && (
                            <p className="text-xs text-muted-foreground">
                              Part #: {part.partNumber}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(part.status)}>
                              {part.status}
                            </Badge>
                            <span className="text-sm font-medium">Qty: {part.quantityNeeded}</span>
                          </div>
                          {part.unitPrice && (typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) > 0 : part.unitPrice > 0) && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Unit: ${(typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) : part.unitPrice).toFixed(2)}</span>
                              <span className="font-medium">Total: ${(part.quantityNeeded * (typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) : part.unitPrice)).toFixed(2)}</span>
                            </div>
                          )}
                          {part.vendor && (
                            <p className="text-xs text-muted-foreground">
                              Vendor: {part.vendor}
                            </p>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Project Parts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Project Parts
          </CardTitle>
          <CardDescription>
            Manage parts for specific projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="flex gap-4 items-center">
            <Select value={selectedProject?.toString() || ''} onValueChange={(value) => setSelectedProject(parseInt(value))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {(projects as Project[] || []).map((project: Project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedProject && (
              <Dialog open={isPartDialogOpen} onOpenChange={setIsPartDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingPart(null);
                    form.reset();
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPart ? 'Edit Part' : 'Add New Part'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPart ? 'Update part details and status.' : 'Add a new part to the selected project.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="partName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Part Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter part name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="partNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Part Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter part number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Electronics, Hardware" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter part description" 
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="quantityNeeded"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity Needed</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unitPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="needed">Needed</SelectItem>
                                  <SelectItem value="ordered">Ordered</SelectItem>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="installed">Installed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="vendor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vendor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsPartDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createPartMutation.isPending || updatePartMutation.isPending}
                        >
                          {createPartMutation.isPending || updatePartMutation.isPending ? 'Saving...' : 
                           editingPart ? 'Update Part' : 'Add Part'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Project Parts List */}
          {selectedProject && (
            <div>
              {partsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredProjectParts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'No parts found matching your search' : 'No parts found for this project. Add your first part above.'}
                </p>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Total Parts: {filteredProjectParts.length}</span>
                      <span>Project Parts Value: ${getTotalValue(filteredProjectParts).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjectParts.map((part: ProjectPart) => (
                      <Card key={part.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleEditPart(part)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-sm truncate">{part.partName}</h3>
                            {getStatusIcon(part.status)}
                          </div>
                          {part.description && (
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {part.description}
                            </p>
                          )}
                          <div className="space-y-2">
                            {part.partNumber && (
                              <p className="text-xs text-muted-foreground">
                                Part #: {part.partNumber}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <Badge className={getStatusColor(part.status)}>
                                {part.status}
                              </Badge>
                              <span className="text-sm font-medium">Qty: {part.quantityNeeded}</span>
                            </div>
                            {part.unitPrice && (typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) > 0 : part.unitPrice > 0) && (
                              <div className="flex items-center justify-between text-xs">
                                <span>Unit: ${(typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) : part.unitPrice).toFixed(2)}</span>
                                <span className="font-medium">Total: ${(part.quantityNeeded * (typeof part.unitPrice === 'string' ? parseFloat(part.unitPrice) : part.unitPrice)).toFixed(2)}</span>
                              </div>
                            )}
                            {part.vendor && (
                              <p className="text-xs text-muted-foreground">
                                Vendor: {part.vendor}
                              </p>
                            )}
                            {part.category && (
                              <p className="text-xs text-muted-foreground">
                                Category: {part.category}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}