import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, FolderOpen, CheckSquare, Clock, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DragDropItem {
  id: string;
  type: 'category' | 'project' | 'task';
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  workspaceId: string;
  categoryId?: string;
  projectId?: string;
  position: number;
}

interface DragDropWorkspaceProps {
  workspaceId: string;
  categories: any[];
  projects: any[];
  tasks: any[];
  onItemMoved: () => void;
}

export function DragDropWorkspace({
  workspaceId,
  categories,
  projects,
  tasks,
  onItemMoved
}: DragDropWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const moveItemMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      itemType: string;
      newParentId?: string;
      newPosition: number;
    }) => {
      let endpoint = '';
      let updateData: any = { position: data.newPosition };

      switch (data.itemType) {
        case 'category':
          endpoint = `/api/workspace-categories/${data.itemId}`;
          break;
        case 'project':
          endpoint = `/api/workspace-projects/${data.itemId}`;
          if (data.newParentId) {
            updateData.categoryId = data.newParentId;
          }
          break;
        case 'task':
          endpoint = `/api/workspace-tasks/${data.itemId}`;
          if (data.newParentId) {
            updateData.projectId = data.newParentId;
          }
          break;
      }

      return apiRequest('PUT', endpoint, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace-tasks'] });
      onItemMoved();
      toast({
        title: "Item moved",
        description: "Item has been successfully moved"
      });
    },
    onError: (error) => {
      console.error('Error moving item:', error);
      toast({
        title: "Error moving item",
        description: "Failed to move item",
        variant: "destructive"
      });
    }
  });

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);

    if (!result.destination) {
      return;
    }

    const { source, destination, draggableId } = result;
    
    // If dropped in same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Parse the draggable ID to get item type and ID
    const [itemType, itemId] = draggableId.split('-');
    
    // Parse destination to get new parent ID if applicable
    const destinationParts = destination.droppableId.split('-');
    let newParentId: string | undefined;
    
    if (destinationParts.length > 1) {
      newParentId = destinationParts[1];
    }

    moveItemMutation.mutate({
      itemId,
      itemType,
      newParentId,
      newPosition: destination.index
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
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
    switch (priority?.toLowerCase()) {
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
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`space-y-4 ${isDragging ? 'select-none' : ''}`}>
        {categories.map((category) => (
          <Droppable key={category.id} droppableId={`category-${category.id}`} type="project">
            {(provided, snapshot) => (
              <Card 
                className={`${snapshot.isDraggedOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" style={{ color: category.color }} />
                    {category.name}
                    <Badge variant="secondary" className="ml-auto">
                      {projects.filter(p => p.categoryId === category.id).length} projects
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projects
                      .filter(project => project.categoryId === category.id)
                      .sort((a, b) => a.position - b.position)
                      .map((project, index) => (
                        <Draggable
                          key={project.id}
                          draggableId={`project-${project.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${
                                snapshot.isDragging 
                                  ? 'rotate-2 shadow-lg' 
                                  : 'hover:shadow-md'
                              } transition-all duration-200`}
                            >
                              <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="mt-1 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-4 w-4 text-gray-400" />
                                    </div>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-medium">{project.name}</h4>
                                        {project.status && (
                                          <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                                            {project.status}
                                          </Badge>
                                        )}
                                        {project.priority && (
                                          <Badge className={`text-xs ${getPriorityColor(project.priority)}`}>
                                            {project.priority}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {project.description && (
                                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                                      )}

                                      {/* Project Tasks */}
                                      <Droppable droppableId={`project-${project.id}`} type="task">
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`space-y-2 min-h-[50px] p-2 rounded border-2 border-dashed ${
                                              snapshot.isDraggedOver 
                                                ? 'border-green-500 bg-green-50' 
                                                : 'border-gray-200'
                                            }`}
                                          >
                                            {tasks
                                              .filter(task => task.projectId === project.id)
                                              .sort((a, b) => a.position - b.position)
                                              .map((task, taskIndex) => (
                                                <Draggable
                                                  key={task.id}
                                                  draggableId={`task-${task.id}`}
                                                  index={taskIndex}
                                                >
                                                  {(provided, snapshot) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className={`${
                                                        snapshot.isDragging 
                                                          ? 'rotate-1 shadow-lg' 
                                                          : ''
                                                      } transition-all duration-200`}
                                                    >
                                                      <div className="flex items-center gap-2 p-2 bg-white rounded border hover:shadow-sm">
                                                        <div
                                                          {...provided.dragHandleProps}
                                                          className="cursor-grab active:cursor-grabbing"
                                                        >
                                                          <GripVertical className="h-3 w-3 text-gray-400" />
                                                        </div>
                                                        
                                                        <CheckSquare className="h-4 w-4 text-gray-400" />
                                                        
                                                        <div className="flex-1">
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{task.name}</span>
                                                            {task.status && (
                                                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                                                {task.status}
                                                              </Badge>
                                                            )}
                                                            {task.priority && (
                                                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                                                {task.priority}
                                                              </Badge>
                                                            )}
                                                          </div>
                                                          
                                                          <div className="flex items-center gap-2 mt-1">
                                                            {task.assignedTo && (
                                                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <User className="h-3 w-3" />
                                                                {task.assignedTo}
                                                              </div>
                                                            )}
                                                            
                                                            {task.estimatedHours && (
                                                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Clock className="h-3 w-3" />
                                                                {task.estimatedHours}h
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))}
                                            {provided.placeholder}
                                            
                                            {tasks.filter(task => task.projectId === project.id).length === 0 && (
                                              <div className="text-center py-4 text-gray-400 text-sm">
                                                Drop tasks here or create new ones
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </Droppable>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                    
                    {projects.filter(p => p.categoryId === category.id).length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No projects in this category. Drop projects here or create new ones.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}