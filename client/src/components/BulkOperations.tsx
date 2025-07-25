import React, { useState } from 'react';
import { CheckSquare, Users, Calendar, Tag, AlertCircle, Trash2, Edit, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BulkItem {
  id: string;
  type: 'project' | 'task';
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  workspaceId: string;
  categoryId?: string;
  projectId?: string;
}

interface BulkOperationsProps {
  items: BulkItem[];
  onItemsChanged: () => void;
}

export function BulkOperations({ items, onItemsChanged }: BulkOperationsProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [operation, setOperation] = useState<'status' | 'priority' | 'assign' | 'move' | 'delete' | 'duplicate'>('status');
  const [newValue, setNewValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { operation: string; items: string[]; value: string }) => {
      const promises = data.items.map(itemId => {
        const item = items.find(i => i.id === itemId);
        if (!item) return Promise.resolve();

        const endpoint = item.type === 'project' ? '/api/workspace-projects' : '/api/workspace-tasks';
        const updateData: any = {};

        switch (data.operation) {
          case 'status':
            updateData.status = data.value;
            break;
          case 'priority':
            updateData.priority = data.value;
            break;
          case 'assign':
            updateData.assignedTo = data.value;
            break;
          case 'move':
            if (item.type === 'project') {
              updateData.categoryId = data.value;
            } else {
              updateData.projectId = data.value;
            }
            break;
        }

        return apiRequest('PUT', `${endpoint}/${itemId}`, updateData);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-tasks'] });
      onItemsChanged();
      setSelectedItems([]);
      setIsDialogOpen(false);
      toast({
        title: "Bulk operation completed",
        description: `Successfully updated ${selectedItems.length} items`
      });
    },
    onError: (error) => {
      console.error('Error performing bulk operation:', error);
      toast({
        title: "Error performing bulk operation",
        description: "Failed to update selected items",
        variant: "destructive"
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const promises = itemIds.map(itemId => {
        const item = items.find(i => i.id === itemId);
        if (!item) return Promise.resolve();

        const endpoint = item.type === 'project' ? '/api/workspace-projects' : '/api/workspace-tasks';
        return apiRequest('DELETE', `${endpoint}/${itemId}`);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-tasks'] });
      onItemsChanged();
      setSelectedItems([]);
      setIsDialogOpen(false);
      toast({
        title: "Items deleted",
        description: `Successfully deleted ${selectedItems.length} items`
      });
    },
    onError: (error) => {
      console.error('Error deleting items:', error);
      toast({
        title: "Error deleting items",
        description: "Failed to delete selected items",
        variant: "destructive"
      });
    }
  });

  const bulkDuplicateMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const promises = itemIds.map(itemId => {
        const item = items.find(i => i.id === itemId);
        if (!item) return Promise.resolve();

        const endpoint = item.type === 'project' ? '/api/workspace-projects' : '/api/workspace-tasks';
        const duplicateData = {
          ...item,
          title: `${item.title} (Copy)`,
          id: undefined
        };

        return apiRequest('POST', endpoint, duplicateData);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-tasks'] });
      onItemsChanged();
      setSelectedItems([]);
      setIsDialogOpen(false);
      toast({
        title: "Items duplicated",
        description: `Successfully duplicated ${selectedItems.length} items`
      });
    },
    onError: (error) => {
      console.error('Error duplicating items:', error);
      toast({
        title: "Error duplicating items",
        description: "Failed to duplicate selected items",
        variant: "destructive"
      });
    }
  });

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleBulkOperation = () => {
    if (selectedItems.length === 0) return;

    setIsProcessing(true);

    if (operation === 'delete') {
      bulkDeleteMutation.mutate(selectedItems);
    } else if (operation === 'duplicate') {
      bulkDuplicateMutation.mutate(selectedItems);
    } else {
      bulkUpdateMutation.mutate({
        operation,
        items: selectedItems,
        value: newValue
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Bulk Operations
        </CardTitle>
        <CardDescription>
          Select multiple items to perform batch operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                Select All ({selectedItems.length} of {items.length} selected)
              </span>
            </div>
            
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Bulk Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Edit {selectedItems.length} Items</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="operation">Operation</Label>
                        <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select operation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="status">Change Status</SelectItem>
                            <SelectItem value="priority">Change Priority</SelectItem>
                            <SelectItem value="assign">Assign To</SelectItem>
                            <SelectItem value="move">Move To</SelectItem>
                            <SelectItem value="duplicate">Duplicate</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {operation === 'status' && (
                        <div>
                          <Label htmlFor="status">New Status</Label>
                          <Select value={newValue} onValueChange={setNewValue}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {operation === 'priority' && (
                        <div>
                          <Label htmlFor="priority">New Priority</Label>
                          <Select value={newValue} onValueChange={setNewValue}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {operation === 'assign' && (
                        <div>
                          <Label htmlFor="assignee">Assign To</Label>
                          <Input
                            id="assignee"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="Enter username or email"
                          />
                        </div>
                      )}

                      {operation === 'delete' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">Delete Confirmation</span>
                          </div>
                          <p className="text-sm text-red-700 mt-2">
                            This action cannot be undone. Are you sure you want to delete {selectedItems.length} items?
                          </p>
                        </div>
                      )}

                      {operation === 'duplicate' && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-800">
                            <Copy className="h-5 w-5" />
                            <span className="font-medium">Duplicate Items</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-2">
                            This will create {selectedItems.length} new items with "(Copy)" appended to their names.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={handleBulkOperation}
                          disabled={isProcessing || (operation !== 'delete' && operation !== 'duplicate' && !newValue)}
                          className="flex-1"
                        >
                          {isProcessing ? 'Processing...' : 'Apply Operation'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Items list */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    selectedItems.includes(item.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemSelect(item.id)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                      {item.assignedTo && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {item.assignedTo}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}