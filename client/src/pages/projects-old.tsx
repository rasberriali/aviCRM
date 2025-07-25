import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useToast } from '@/hooks/use-toast';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { Plus, Users, Calendar, DollarSign, Clock, ChevronDown, ChevronRight, Edit2, Trash2, Eye, FileText, Info, GripVertical, User, AlertTriangle, Palette, UserCheck, Play, CheckCircle, ListTodo, Upload, Download, X, Folder } from 'lucide-react';
import { ChromePicker } from 'react-color';
import { TaskManagementModal } from '@/components/TaskManagementModal';
import { WorkspaceView } from '@/components/WorkspaceView';

interface Project {
  id: string;
  name: string;
  description: string;
  clientName: string;
  status: string;
  category: string;
  priority: string;
  budget: number;
  spent: number;
  estimatedHours: number;
  actualHours: number;
  startDate: string;
  endDate: string;
  assignedUsers: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  files: string[];
  tags: string[];
}

interface Workspace {
  id: number;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceCategory {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceProject {
  id: number;
  workspaceId: number;
  categoryId?: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours: number;
  budget: number;
  spent: number;
  assignedUsers: string[];
  tags: string[];
  color: string;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceTask {
  id: number;
  workspaceId: number;
  categoryId?: number;
  projectId?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours: number;
  dueDate?: string;
  completedAt?: string;
  archived: boolean;
  position: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Projects() {
  const { user } = useHttpAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wsConnected, setWsConnected] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isProjectViewModalOpen, setIsProjectViewModalOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [categoryColors, setCategoryColors] = useState<{[key: string]: string}>({});
  const [categoryPositions, setCategoryPositions] = useState<{[key: string]: number}>({});
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedCategoryForColor, setSelectedCategoryForColor] = useState<string>('');
  const [currentPickerColor, setCurrentPickerColor] = useState('#f1f5f9');
  const [isRenameCategoryModalOpen, setIsRenameCategoryModalOpen] = useState(false);
  const [renamingCategory, setRenamingCategory] = useState<string>('');
  const [newCategoryNameForRename, setNewCategoryNameForRename] = useState('');
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [projectInvoices, setProjectInvoices] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isTaskManagementModalOpen, setIsTaskManagementModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showWorkspaceView, setShowWorkspaceView] = useState(false);
  const [workspaceCategories, setWorkspaceCategories] = useState<WorkspaceCategory[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProject[]>([]);
  const [workspaceTasks, setWorkspaceTasks] = useState<WorkspaceTask[]>([]);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedTo: '',
    estimatedHours: 0,
    dueDate: ''
  });
  const [changeOrderRequest, setChangeOrderRequest] = useState({
    description: '',
    amount: '',
    reason: '',
    urgency: 'normal'
  });
  const [isSubmittingChangeOrder, setIsSubmittingChangeOrder] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [customStatusValue, setCustomStatusValue] = useState('');
  const [customPriorityValue, setCustomPriorityValue] = useState('');
  const [statusColors, setStatusColors] = useState<{[key: string]: string}>({
    'active': '#10b981',
    'completed': '#6b7280',
    'on-hold': '#f59e0b',
    'cancelled': '#ef4444'
  });
  const [priorityColors, setPriorityColors] = useState<{[key: string]: string}>({
    'low': '#10b981',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'urgent': '#dc2626'
  });
  const [isStatusColorPickerOpen, setIsStatusColorPickerOpen] = useState(false);
  const [isPriorityColorPickerOpen, setIsPriorityColorPickerOpen] = useState(false);
  const [currentStatusColorPicker, setCurrentStatusColorPicker] = useState('#10b981');
  const [currentPriorityColorPicker, setCurrentPriorityColorPicker] = useState('#10b981');
  const [editingStatusKey, setEditingStatusKey] = useState<string>('');
  const [editingPriorityKey, setEditingPriorityKey] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phoneCell: '',
    phoneOffice: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });
  const { toast } = useToast();

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    clientName: '',
    status: 'active',
    category: '',
    priority: 'medium',
    budget: 0,
    estimatedHours: 0,
    startDate: '',
    endDate: '',
    assignedUsers: [] as string[],
    tags: [] as string[]
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Projects WebSocket connected');
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', topic: 'projects' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'projects_updated') {
          fetchProjects();
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      console.log('Projects WebSocket disconnected');
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchWorkspaces();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerDropdown]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/proxy/projects', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Server returns array directly, not wrapped in { projects: [] }
        const projectsArray = Array.isArray(data) ? data : (data.projects || []);
        setProjects(projectsArray);
        
        // Extract unique categories from projects
        const projectCategories: string[] = [];
        if (projectsArray && projectsArray.length > 0) {
          projectsArray.forEach((p: Project) => {
            if (p.category && typeof p.category === 'string') {
              projectCategories.push(p.category);
            }
          });
        }
        const uniqueCategories = Array.from(new Set(projectCategories));
        setCategories(uniqueCategories);
      } else {
        console.error('Failed to fetch projects:', response.status);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/http-clients');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      } else {
        console.error('Failed to fetch clients');
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    if (categories.includes(newCategoryName.trim())) {
      toast({
        title: "Error",
        description: "Category already exists",
        variant: "destructive"
      });
      return;
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const projectData = {
        id: `CAT_${Date.now()}`,
        name: `${newCategoryName.trim()} - Category Template`,
        description: `Template project for ${newCategoryName.trim()} category`,
        clientName: 'Internal',
        status: 'active',
        category: newCategoryName.trim(),
        priority: 'low',
        budget: 0,
        estimatedHours: 0,
        startDate: currentDate,
        endDate: currentDate,
        assignedUsers: [],
        tags: ['template'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        spent: 0,
        actualHours: 0,
        files: [],
        createdBy: 'current_user'
      };

      console.log('Sending project data:', projectData);
      
      const response = await fetch('/api/proxy/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        toast({
          title: "Success",
          description: `Category "${newCategoryName.trim()}" created successfully`
        });
        setIsCategoryModalOpen(false);
        setNewCategoryName('');
        fetchProjects();
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        console.error('Response status:', response.status);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Category creation error:', error);
      toast({
        title: "Error", 
        description: "Failed to create category. Please check the console for details.",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, type } = result;

    // Handle category reordering
    if (type === 'category') {
      const newCategories = Array.from(categories);
      const [reorderedItem] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, reorderedItem);
      setCategories(newCategories);
      
      // Save new category positions persistently
      const newPositions: {[key: string]: number} = {};
      newCategories.forEach((category, index) => {
        newPositions[category] = index;
      });
      setCategoryPositions(newPositions);
      await saveCategoryPositions(newPositions);
      return;
    }

    // Handle project dragging between categories
    if (type === 'project') {
      const sourceCategory = source.droppableId.replace('projects-', '');
      const destCategory = destination.droppableId.replace('projects-', '');
      
      // Find the project being moved
      const projectToMove = groupedProjects[sourceCategory][source.index];
      
      // Update the project's category
      const updatedProject = {
        ...projectToMove,
        category: destCategory,
        updatedAt: new Date().toISOString()
      };

      try {
        const response = await fetch(`/api/proxy/projects/${projectToMove.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedProject)
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: `Project moved to ${destCategory}`
          });
          fetchProjects(); // Refresh to show changes
        } else {
          throw new Error('Failed to update project');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move project",
          variant: "destructive"
        });
      }
    }
  };

  const handleViewProject = (project: Project) => {
    setViewingProject(project);
    setIsProjectViewModalOpen(true);
    // Fetch project-specific data
    fetchProjectFiles(project.id, project.clientName);
    fetchProjectInvoices(project.id, project.clientName);
    fetchProjectTasks(project.id);
    fetchEmployees();
  };

  const defaultColors = [
    '#f1f5f9', '#f4f4f5', '#f5f5f5', '#fafafa', '#f5f5f4',
    '#eff6ff', '#eef2ff', '#faf5ff', '#f0fdf4', '#f0fdfa'
  ];

  const hexToRgba = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getCategoryColor = (category: string, index: number) => {
    const customColor = categoryColors[category];
    console.log(`Getting color for category "${category}":`, customColor, 'Available colors:', categoryColors);
    if (customColor) {
      return {
        backgroundColor: hexToRgba(customColor, 0.15),
        borderColor: customColor,
        borderLeftColor: customColor
      };
    }
    const defaultColor = defaultColors[index % defaultColors.length];
    return {
      backgroundColor: hexToRgba(defaultColor, 0.15),
      borderColor: hexToRgba(defaultColor, 0.4),
      borderLeftColor: defaultColor
    };
  };

  const handleColorChange = (color: any) => {
    setCurrentPickerColor(color.hex);
  };

  const applyColorChange = async () => {
    const newColors = {
      ...categoryColors,
      [selectedCategoryForColor]: currentPickerColor
    };
    setCategoryColors(newColors);
    
    // Save to server instead of localStorage
    try {
      await fetch('/api/category-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryName: selectedCategoryForColor, 
          color: currentPickerColor 
        }),
      });
    } catch (error) {
      console.error('Error saving category color:', error);
    }
    
    setIsColorPickerOpen(false);
    setSelectedCategoryForColor('');
  };

  const openColorPicker = (category: string) => {
    const existingColor = categoryColors[category];
    setCurrentPickerColor(existingColor || '#f1f5f9');
    setSelectedCategoryForColor(category);
    setIsColorPickerOpen(true);
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This will permanently delete all projects in this category.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Category "${categoryName}" deleted successfully. Removed ${result.deletedProjects} projects.`
        });
        fetchProjects();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  const openRenameModal = (categoryName: string) => {
    setRenamingCategory(categoryName);
    setNewCategoryNameForRename(categoryName);
    setIsRenameCategoryModalOpen(true);
  };

  const handleRenameCategory = async () => {
    if (!newCategoryNameForRename.trim() || newCategoryNameForRename.trim() === renamingCategory) {
      setIsRenameCategoryModalOpen(false);
      return;
    }

    try {
      console.log('Starting category rename from:', renamingCategory, 'to:', newCategoryNameForRename.trim());
      console.log('Total projects available:', projects.length);
      
      // Get all projects in this category from the complete projects list (excluding template projects)
      const categoryProjects = projects.filter(p => 
        p.category === renamingCategory && !p.tags?.includes('template')
      );
      
      console.log('Found category projects:', categoryProjects.length);
      console.log('Category projects:', categoryProjects.map(p => ({ id: p.id, name: p.name, tags: p.tags })));
      
      // Update all projects to the new category name
      for (const project of categoryProjects) {
        const response = await fetch(`/api/proxy/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...project,
            category: newCategoryNameForRename.trim(),
            updatedAt: new Date().toISOString()
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update project ${project.name}`);
        }
      }

      // Find and update the old category template instead of deleting/recreating
      const oldCategoryTemplate = projects.find(p => 
        p.category === renamingCategory && p.tags?.includes('template')
      );
      
      console.log('Looking for template in category:', renamingCategory);
      console.log('All projects with templates:', projects.filter(p => p.tags?.includes('template')));
      console.log('Found category template:', oldCategoryTemplate);
      
      if (oldCategoryTemplate) {
        const updatedTemplate = {
          ...oldCategoryTemplate,
          name: `${newCategoryNameForRename.trim()} - Category Template`,
          description: `Template project for ${newCategoryNameForRename.trim()} category`,
          category: newCategoryNameForRename.trim(),
          updatedAt: new Date().toISOString()
        };

        const response = await fetch(`/api/proxy/projects/${oldCategoryTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTemplate)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update category template');
        }
      } else {
        throw new Error('Category template not found');
      }

      toast({
        title: "Success",
        description: `Category renamed from "${renamingCategory}" to "${newCategoryNameForRename.trim()}"`
      });
      
      setIsRenameCategoryModalOpen(false);
      setRenamingCategory('');
      setNewCategoryNameForRename('');
      fetchProjects();
    } catch (error) {
      console.error('Rename category error:', error);
      console.error('Error details:', error?.message || 'Unknown error');
      console.error('Error stack:', error?.stack || 'No stack trace available');
      toast({
        title: "Error",
        description: error?.message || "Failed to rename category",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting project:', projectId, projectName);
      
      const response = await fetch(`/api/proxy/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        toast({
          title: "Success",
          description: `Project "${projectName}" deleted successfully`
        });
        fetchProjects();
      } else {
        const errorText = await response.text();
        console.error('Delete failed:', errorText);
        throw new Error(errorText || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project",
        variant: "destructive"
      });
    }
  };

  const handleRenameProject = async (project: Project, newName: string) => {
    if (!newName.trim() || newName.trim() === project.name) {
      return;
    }

    try {
      const response = await fetch(`/api/proxy/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...project,
          name: newName.trim(),
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Project renamed to "${newName.trim()}"`
        });
        fetchProjects();
      } else {
        throw new Error('Failed to rename project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename project",
        variant: "destructive"
      });
    }
  };

  const fetchProjectFiles = async (projectId: string, clientName: string) => {
    try {
      const response = await fetch(`/api/project-files/${projectId}?clientName=${encodeURIComponent(clientName)}`);
      if (response.ok) {
        const files = await response.json();
        setProjectFiles(files);
      }
    } catch (error) {
      console.error('Error fetching project files:', error);
    }
  };

  const fetchProjectInvoices = async (projectId: string, clientName: string) => {
    try {
      const response = await fetch(`/api/project-invoices/${projectId}?clientName=${encodeURIComponent(clientName)}`);
      if (response.ok) {
        const invoices = await response.json();
        setProjectInvoices(invoices);
      }
    } catch (error) {
      console.error('Error fetching project invoices:', error);
    }
  };

  const fetchProjectTasks = async (projectId: string) => {
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      if (response.ok) {
        const tasks = await response.json();
        setProjectTasks(tasks);
      }
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const employeeData = await response.json();
        // Handle the API response structure {success: true, employees: [...], total: 0}
        setEmployees(Array.isArray(employeeData) ? employeeData : (employeeData.employees || []));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  // Workspace fetch functions
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setWorkspaces([]);
    }
  };

  const fetchWorkspaceData = async (workspaceId: number) => {
    try {
      // Fetch categories, projects, and tasks for the workspace
      const [categoriesRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/categories`),
        fetch(`/api/workspaces/${workspaceId}/projects`),
        fetch(`/api/workspaces/${workspaceId}/tasks`)
      ]);

      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        setWorkspaceCategories(categories);
      }

      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        setWorkspaceProjects(projects);
      }

      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        setWorkspaceTasks(tasks);
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    }
  };

  const createWorkspace = async () => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workspaceForm)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Workspace created successfully"
        });
        setIsWorkspaceModalOpen(false);
        setWorkspaceForm({ name: '', description: '', color: '#3b82f6' });
        fetchWorkspaces();
      } else {
        throw new Error('Failed to create workspace');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !viewingProject) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', viewingProject.id);
    formData.append('clientName', viewingProject.clientName);

    try {
      const response = await fetch('/api/project-files/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "File uploaded successfully"
        });
        fetchProjectFiles(viewingProject.id, viewingProject.clientName);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleFileDelete = async (fileName: string) => {
    if (!viewingProject || !confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const response = await fetch('/api/project-files/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          projectId: viewingProject.id,
          clientName: viewingProject.clientName
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "File deleted successfully"
        });
        fetchProjectFiles(viewingProject.id, viewingProject.clientName);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const handleCreateTask = async () => {
    if (!viewingProject || !taskForm.title.trim()) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...taskForm,
          projectId: viewingProject.id,
          createdBy: user?.id
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task created successfully"
        });
        setIsCreateTaskModalOpen(false);
        setTaskForm({
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          assignedTo: '',
          estimatedHours: 0,
          dueDate: ''
        });
        fetchProjectTasks(viewingProject.id);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'done' && { completedAt: new Date().toISOString() })
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Task status updated"
        });
        if (viewingProject) {
          fetchProjectTasks(viewingProject.id);
        }
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return { backgroundColor: '#f1f5f9', color: '#334155' };
      case 'in_progress': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'review': return { backgroundColor: '#fef3c7', color: '#d97706' };
      case 'done': return { backgroundColor: '#dcfce7', color: '#166534' };
      default: return { backgroundColor: '#f1f5f9', color: '#334155' };
    }
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'medium': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'high': return { backgroundColor: '#fed7aa', color: '#c2410c' };
      case 'urgent': return { backgroundColor: '#fecaca', color: '#dc2626' };
      default: return { backgroundColor: '#dbeafe', color: '#1e40af' };
    }
  };

  const handleSubmitChangeOrder = async () => {
    if (!viewingProject || !changeOrderRequest.description.trim()) return;

    setIsSubmittingChangeOrder(true);
    try {
      const response = await fetch('/api/change-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: viewingProject.id,
          projectName: viewingProject.name,
          clientName: viewingProject.clientName,
          ...changeOrderRequest,
          submittedBy: 'current-user', // Will be updated with actual user
          submittedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Change order request submitted to accounting"
        });
        setChangeOrderRequest({
          description: '',
          amount: '',
          reason: '',
          urgency: 'normal'
        });
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit change order request",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingChangeOrder(false);
    }
  };

  const getUrgentProjectsCount = (categoryProjects: Project[]) => {
    return categoryProjects.filter(project => project.priority === 'urgent').length;
  };

  const generateUrgentNotification = (project: Project) => {
    // Create urgent notification for dashboard and notification center
    const notification = {
      id: `urgent_${project.id}_${Date.now()}`,
      type: 'urgent_priority',
      title: 'Urgent Project Priority',
      message: `Project "${project.name}" has been marked as URGENT priority`,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store notification in localStorage for dashboard display
    const existingNotifications = JSON.parse(localStorage.getItem('urgentNotifications') || '[]');
    existingNotifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (existingNotifications.length > 50) {
      existingNotifications.splice(50);
    }
    
    localStorage.setItem('urgentNotifications', JSON.stringify(existingNotifications));

    // Show immediate toast notification
    toast({
      title: "🚨 Urgent Priority Set",
      description: `Project "${project.name}" requires immediate attention`,
      variant: "destructive"
    });

    console.log('Generated urgent notification for project:', project.name);
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleStatusEdit = (status: string) => {
    setEditingStatusKey(status);
    setCustomStatusValue(status);
    setIsEditingStatus(true);
  };

  const handlePriorityEdit = (priority: string) => {
    setEditingPriorityKey(priority);
    setCustomPriorityValue(priority);
    setIsEditingPriority(true);
  };

  const handleStatusColorEdit = (status: string) => {
    setEditingStatusKey(status);
    setCurrentStatusColorPicker(statusColors[status] || '#10b981');
    setIsStatusColorPickerOpen(true);
  };

  const handlePriorityColorEdit = (priority: string) => {
    setEditingPriorityKey(priority);
    setCurrentPriorityColorPicker(priorityColors[priority] || '#10b981');
    setIsPriorityColorPickerOpen(true);
  };

  const saveCustomStatus = async () => {
    if (!customStatusValue.trim() || !viewingProject) return;

    const oldStatus = viewingProject.status;
    const newStatus = customStatusValue.trim().toLowerCase().replace(/\s+/g, '_');

    try {
      const updatedProject = {
        ...viewingProject,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/proxy/projects/${viewingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProject)
      });

      if (response.ok) {
        // If it's a new status, inherit the color from the previous status or use default
        if (!statusColors[newStatus]) {
          setStatusColors(prev => ({
            ...prev,
            [newStatus]: statusColors[oldStatus] || '#10b981'
          }));
        }

        setViewingProject(updatedProject);
        setIsEditingStatus(false);
        setCustomStatusValue('');
        fetchProjects();
        
        toast({
          title: "Success",
          description: `Status updated to "${customStatusValue.trim()}"`
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const saveCustomPriority = async () => {
    if (!customPriorityValue.trim() || !viewingProject) return;

    const newPriority = customPriorityValue.trim().toLowerCase();
    
    // Only allow 4 fixed priority levels
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(newPriority)) {
      toast({
        title: "Invalid Priority",
        description: "Priority must be one of: Low, Medium, High, or Urgent",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedProject = {
        ...viewingProject,
        priority: newPriority,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/proxy/projects/${viewingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProject)
      });

      if (response.ok) {
        setViewingProject(updatedProject);
        setIsEditingPriority(false);
        setCustomPriorityValue('');
        fetchProjects();
        
        // Generate urgent notification
        if (newPriority === 'urgent') {
          generateUrgentNotification(updatedProject);
        }
        
        toast({
          title: "Success",
          description: `Priority updated to "${newPriority.charAt(0).toUpperCase() + newPriority.slice(1)}"`
        });
      } else {
        throw new Error('Failed to update priority');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive"
      });
    }
  };

  const saveStatusColor = async () => {
    const newColors = {
      ...statusColors,
      [editingStatusKey]: currentStatusColorPicker
    };
    setStatusColors(newColors);
    
    // Save to server
    try {
      await fetch('/api/status-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: editingStatusKey, 
          color: currentStatusColorPicker 
        }),
      });
    } catch (error) {
      console.error('Error saving status color:', error);
    }
    
    setIsStatusColorPickerOpen(false);
    setEditingStatusKey('');
  };

  const savePriorityColor = async () => {
    const newColors = {
      ...priorityColors,
      [editingPriorityKey]: currentPriorityColorPicker
    };
    setPriorityColors(newColors);
    
    // Save to server
    try {
      await fetch('/api/priority-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priority: editingPriorityKey, 
          color: currentPriorityColorPicker 
        }),
      });
    } catch (error) {
      console.error('Error saving priority color:', error);
    }
    
    setIsPriorityColorPickerOpen(false);
    setEditingPriorityKey('');
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchCategoryPositions();
      await fetchProjects();
      await fetchCategoryColors();
      await fetchStatusColors();
      await fetchPriorityColors();
      await fetchClients();
    };
    loadData();
  }, []);

  // Re-sort categories when positions change
  useEffect(() => {
    if (Object.keys(categoryPositions).length > 0 && categories.length > 0) {
      const sortedCategories = [...categories].sort((a, b) => {
        const posA = categoryPositions[a] ?? 999;
        const posB = categoryPositions[b] ?? 999;
        return posA - posB;
      });
      
      // Only update if the order actually changed
      const orderChanged = !categories.every((cat, index) => cat === sortedCategories[index]);
      if (orderChanged) {
        setCategories(sortedCategories);
      }
    }
  }, [categoryPositions, categories]);

  const fetchCategoryColors = async () => {
    try {
      const response = await fetch('/api/category-colors');
      if (response.ok) {
        const colors = await response.json();
        console.log('Fetched category colors:', colors);
        setCategoryColors(colors);
      }
    } catch (error) {
      console.error('Error fetching category colors:', error);
    }
  };

  const fetchStatusColors = async () => {
    try {
      const response = await fetch('/api/status-colors');
      if (response.ok) {
        const colors = await response.json();
        console.log('Fetched status colors:', colors);
        setStatusColors(colors);
      }
    } catch (error) {
      console.error('Error fetching status colors:', error);
    }
  };

  const fetchPriorityColors = async () => {
    try {
      const response = await fetch('/api/priority-colors');
      if (response.ok) {
        const colors = await response.json();
        console.log('Fetched priority colors:', colors);
        setPriorityColors(colors);
      }
    } catch (error) {
      console.error('Error fetching priority colors:', error);
    }
  };

  const fetchCategoryPositions = async () => {
    try {
      const response = await fetch('/api/category-positions');
      if (response.ok) {
        const positions = await response.json();
        const positionMap = positions.reduce((acc: {[key: string]: number}, item: any) => {
          acc[item.categoryName] = item.position;
          return acc;
        }, {});
        setCategoryPositions(positionMap);
      }
    } catch (error) {
      console.error('Error fetching category positions:', error);
    }
  };

  const saveCategoryPositions = async (newPositions: {[key: string]: number}) => {
    try {
      const positionsArray = Object.entries(newPositions).map(([categoryName, position]) => ({
        categoryName,
        position
      }));
      
      await fetch('/api/category-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: positionsArray }),
      });
    } catch (error) {
      console.error('Error saving category positions:', error);
    }
  };

  // Status and priority colors are now saved automatically via API calls
  // No need for localStorage saving

  const handleCreateProject = async () => {
    // Validate required fields
    if (!projectForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return;
    }

    if (!projectForm.clientName.trim()) {
      toast({
        title: "Validation Error", 
        description: "Client name is required",
        variant: "destructive"
      });
      return;
    }

    if (!projectForm.category.trim()) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive"
      });
      return;
    }

    try {
      let customerToUse = selectedCustomer;
      
      // Validate that a customer is selected
      if (!selectedCustomer) {
        toast({
          title: "Validation Error",
          description: "Please select a customer or create a new customer first",
          variant: "destructive"
        });
        return;
      }

      const projectData = {
        ...projectForm,
        id: 'PROJ_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        spent: 0,
        actualHours: 0,
        files: [],
        createdBy: user?.id || 'current_user',
        // Include customer profile folder path for file routing
        customerProfilePath: customerToUse?.profileFolderPath || null,
        customerId: customerToUse?.customerId || null
      };

      console.log('Creating project with data:', projectData);

      const response = await fetch('/api/proxy/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Project creation successful:', result);
        
        toast({
          title: "Success",
          description: "Project created successfully"
        });
        setIsModalOpen(false);
        resetForm();
        fetchProjects();
      } else {
        const errorData = await response.text();
        console.error('Project creation failed:', errorData);
        throw new Error(errorData || 'Failed to create project');
      }
    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`http://165.23.126.88:8888/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa('aviuser:aviserver'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...selectedProject,
          ...projectForm,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Project updated successfully"
        });
        setIsModalOpen(false);
        setSelectedProject(null);
        resetForm();
        fetchProjects();
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive"
      });
    }
  };



  const handleCreateCustomer = async () => {
    // Validate required fields
    if (!customerForm.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const newCustomerData = {
        customerId: `CLIENT_${Date.now()}_${customerForm.fullName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
        fullName: customerForm.fullName.trim(),
        company: customerForm.company.trim() || customerForm.fullName.trim(),
        email: customerForm.email.trim(),
        phoneCell: customerForm.phoneCell.trim(),
        phoneOffice: customerForm.phoneOffice.trim(),
        address: customerForm.address.trim(),
        city: customerForm.city.trim(),
        state: customerForm.state.trim(),
        zip: customerForm.zip.trim(),
        notes: customerForm.notes.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'current_user'
      };

      const response = await fetch('/api/http-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCustomerData)
      });

      if (response.ok) {
        const createdCustomer = await response.json();
        
        // Update the clients list and select the new customer
        await fetchClients();
        setSelectedCustomer(createdCustomer);
        setCustomerSearchTerm(createdCustomer.fullName || '');
        setProjectForm({ 
          ...projectForm, 
          clientName: createdCustomer.fullName || createdCustomer.company || ''
        });
        setShowCustomerDropdown(false);

        // Reset and close the customer modal
        setCustomerForm({
          fullName: '',
          company: '',
          email: '',
          phoneCell: '',
          phoneOffice: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          notes: ''
        });
        setIsCustomerModalOpen(false);

        toast({
          title: "Success",
          description: `Customer "${createdCustomer.fullName}" created successfully`
        });
      } else {
        const errorText = await response.text();
        console.error('Customer creation failed:', errorText);
        throw new Error('Failed to create customer');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create customer",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setProjectForm({
      name: '',
      description: '',
      clientName: '',
      status: 'active',
      category: '',
      priority: 'medium',
      budget: 0,
      estimatedHours: 0,
      startDate: '',
      endDate: '',
      assignedUsers: [],
      tags: []
    });
    // Clear customer selection state
    setSelectedCustomer(null);
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setProjectForm({
      name: project.name,
      description: project.description,
      clientName: project.clientName,
      status: project.status,
      category: project.category,
      priority: project.priority,
      budget: project.budget,
      estimatedHours: project.estimatedHours,
      startDate: project.startDate,
      endDate: project.endDate,
      assignedUsers: project.assignedUsers,
      tags: project.tags
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedProject(null);
    resetForm();
    setIsModalOpen(true);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const color = statusColors[status] || '#6b7280';
    return {
      backgroundColor: color + '20',
      color: color,
      borderColor: color + '60',
      border: '1px solid'
    };
  };

  const getPriorityColor = (priority: string) => {
    const color = priorityColors[priority] || '#6b7280';
    return {
      backgroundColor: color + '20', 
      color: color,
      borderColor: color + '60',
      border: '1px solid'
    };
  };

  // Filter and group projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const category = project.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects & Workspaces</h1>
          <p className="text-slate-600 mt-1">
            Manage your projects and track progress
            {wsConnected && <span className="ml-2 text-green-600">● Live</span>}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <Button 
          className="bg-slate-800 hover:bg-slate-700"
          onClick={() => setIsWorkspaceModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Workspace
        </Button>
      </div>

      {/* Workspaces Section */}
      <div className="space-y-6 mt-6">
        {workspacesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : workspacesQuery.error ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Error loading workspaces: {workspacesQuery.error.message}</p>
          </div>
        ) : !workspacesQuery.data || workspacesQuery.data.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-slate-50 rounded-lg p-8">
              <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No workspaces yet</h3>
              <p className="text-slate-500 mb-6">
                Create your first workspace to organize projects into categories with tasks and team collaboration.
              </p>
              <Button 
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Workspace
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspacesQuery.data.map((workspace) => (
              <div
                key={workspace.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedWorkspace(workspace);
                  setShowWorkspaceView(true);
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: workspace.color }}
                  ></div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>0 members</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {workspace.name}
                </h3>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                  {workspace.description}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Folder className="w-4 h-4" />
                      <span>0 projects</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckSquare className="w-4 h-4" />
                      <span>0 tasks</span>
                    </div>
                  </div>
                  <span className="text-xs">
                    {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; color: string }) => {
      const response = await apiRequest("POST", "/api/workspaces", data);
      return response.json();
    },
    onSuccess: (newWorkspace) => {
      onWorkspaceCreated(newWorkspace);
      onClose();
      setName('');
      setDescription('');
      setColor('#3b82f6');
      // Force refresh of workspaces
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
    },
    onError: (error) => {
      console.error('Error creating workspace:', error);
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
                  
                  return (
                    <Draggable key={category} draggableId={category} index={index}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${snapshot.isDragging ? 'shadow-lg' : ''} border-2 border-l-8`}
                          style={{
                            backgroundColor: categoryColorStyles.backgroundColor,
                            borderColor: categoryColorStyles.borderColor,
                            borderLeftColor: categoryColorStyles.borderLeftColor,
                            borderLeftWidth: '8px',
                            ...provided.draggableProps.style
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCategory(category)}
                                  className="p-0 h-auto"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                                <CardTitle className="text-lg">{category}</CardTitle>
                                <Badge variant="secondary">{categoryProjects.length}</Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openColorPicker(category)}
                                  className="ml-2 p-1 h-auto hover:bg-slate-200"
                                  title="Change category color"
                                >
                                  <Palette className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRenameModal(category);
                                  }}
                                  className="p-1 h-auto hover:bg-slate-200"
                                  title="Rename category"
                                >
                                  <Edit2 className="w-4 h-4 text-slate-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(category);
                                  }}
                                  className="p-1 h-auto hover:bg-red-100 hover:text-red-600"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-4 h-4 text-slate-500" />
                                </Button>
                              </div>
                              
                              {urgentCount > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full">
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-700">
                                    {urgentCount} urgent
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          {isExpanded && (
                            <CardContent>
                              <Droppable droppableId={`projects-${category}`} type="project">
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-2 min-h-[120px] p-3 rounded-lg transition-all duration-200 ${
                                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 shadow-inner' : 'border border-transparent'
                                    }`}
                                  >
                                    {categoryProjects.map((project, projectIndex) => (
                                      <Draggable key={project.id} draggableId={project.id} index={projectIndex}>
                                        {(provided, snapshot) => (
                                          <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                                              snapshot.isDragging ? 'shadow-lg rotate-1 scale-105 z-50' : ''
                                            } ${expandedProjects.has(project.id) ? 'p-4' : 'p-3'}`}
                                            style={{
                                              borderLeftColor: categoryColorStyles.borderLeftColor,
                                              borderLeftWidth: '4px',
                                              ...provided.draggableProps.style
                                            }}
                                            onClick={(e) => {
                                              // Don't trigger if clicking on action buttons or drag handle
                                              const target = e.target as HTMLElement;
                                              if (!target.closest('button') && !target.closest('[data-rbd-drag-handle-draggable-id]')) {
                                                handleViewProject(project);
                                              }
                                            }}
                                          >
                                            {/* Compact Header */}
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div
                                                  {...provided.dragHandleProps}
                                                  className="cursor-grab active:cursor-grabbing"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <h4 className="font-semibold text-gray-900 truncate text-sm">{project.name}</h4>
                                                  <p className="text-xs text-gray-600 truncate">{project.clientName}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <Badge style={getStatusColor(project.status) as any} className="text-xs px-1.5 py-0.5 rounded-full font-medium">
                                                    {project.status.replace('_', ' ')}
                                                  </Badge>
                                                  <Badge style={getPriorityColor(project.priority) as any} className="text-xs px-1.5 py-0.5 rounded-full font-medium">
                                                    {project.priority}
                                                  </Badge>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-1 ml-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleProjectExpansion(project.id);
                                                  }}
                                                  className="h-7 w-7 p-0"
                                                >
                                                  {expandedProjects.has(project.id) ? 
                                                    <ChevronDown className="w-3 h-3" /> : 
                                                    <ChevronRight className="w-3 h-3" />
                                                  }
                                                </Button>

                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newName = prompt('Enter new project name:', project.name);
                                                    if (newName) {
                                                      handleRenameProject(project, newName);
                                                    }
                                                  }}
                                                  className="h-7 w-7 p-0"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProject(project.id, project.name);
                                                  }}
                                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            
                                            {/* Expanded Details */}
                                            {expandedProjects.has(project.id) && (
                                              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                                                <p className="text-xs text-gray-500">{project.description}</p>
                                                
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                  <div>
                                                    <span className="text-gray-500">Budget:</span>
                                                    <div className="font-medium">${project.budget?.toLocaleString() || 0}</div>
                                                    <div className="text-xs text-gray-400">${project.spent?.toLocaleString() || 0} spent</div>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-500">Progress:</span>
                                                    <div className="font-medium">{project.actualHours || 0}h / {project.estimatedHours || 0}h</div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                      <div
                                                        className="bg-blue-600 h-1.5 rounded-full"
                                                        style={{
                                                          width: `${Math.min(
                                                            ((project.actualHours || 0) / (project.estimatedHours || 1)) * 100,
                                                            100
                                                          )}%`
                                                        }}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                </div>

                                                {(project.startDate || project.endDate) && (
                                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                                    {project.startDate && (
                                                      <div>
                                                        <span className="text-gray-500">Start:</span>
                                                        <div className="font-medium">{new Date(project.startDate).toLocaleDateString()}</div>
                                                      </div>
                                                    )}
                                                    {project.endDate && (
                                                      <div>
                                                        <span className="text-gray-500">Due:</span>
                                                        <div className="font-medium">{new Date(project.endDate).toLocaleDateString()}</div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                <div className="flex items-center justify-between text-xs">
                                                  <div className="text-gray-500">
                                                    {project.assignedUsers?.length || 0} user(s) assigned
                                                  </div>
                                                  <div className="text-gray-500">
                                                    Created: {new Date(project.createdAt || '').toLocaleDateString()}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </CardContent>
                          )}
                        </Card>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Project Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div className="relative customer-search-container">
                <label className="text-sm font-medium">Customer</label>
                <div className="relative">
                  <Input
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                      // Clear selected customer when typing
                      if (selectedCustomer && e.target.value !== selectedCustomer.fullName) {
                        setSelectedCustomer(null);
                        setProjectForm({ ...projectForm, clientName: '' });
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={selectedCustomer ? selectedCustomer.fullName : "Search or enter customer name..."}
                    className={selectedCustomer ? "bg-green-50 border-green-300" : ""}
                  />
                  {selectedCustomer && (
                    <div className="absolute right-2 top-2 text-green-600">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  )}
                  
                  {/* Customer Dropdown */}
                  {showCustomerDropdown && customerSearchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {clients
                        .filter(client => 
                          client.fullName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          client.company?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          client.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                        )
                        .slice(0, 5)
                        .map((client) => (
                          <div
                            key={client.customerId}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              setSelectedCustomer(client);
                              setCustomerSearchTerm(client.fullName || '');
                              setProjectForm({ 
                                ...projectForm, 
                                clientName: client.fullName || client.company || ''
                              });
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div className="font-medium text-sm">{client.fullName}</div>
                            {client.company && (
                              <div className="text-xs text-gray-500">{client.company}</div>
                            )}
                            {client.email && (
                              <div className="text-xs text-gray-400">{client.email}</div>
                            )}
                          </div>
                        ))}
                      
                      {/* Create new customer option */}
                      {customerSearchTerm && 
                       !clients.some(client => 
                         client.fullName?.toLowerCase() === customerSearchTerm.toLowerCase()
                       ) && (
                        <div
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 border-t border-gray-200"
                          onClick={() => {
                            setCustomerForm({ 
                              ...customerForm, 
                              fullName: customerSearchTerm,
                              company: customerSearchTerm
                            });
                            setIsCustomerModalOpen(true);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div className="text-sm font-medium">+ Create new customer: "{customerSearchTerm}"</div>
                        </div>
                      )}
                      
                      {clients.filter(client => 
                        client.fullName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        client.company?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        client.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No customers found matching "{customerSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Enter project description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={projectForm.category}
                  onValueChange={(value) => setProjectForm({ ...projectForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Enter custom category</SelectItem>
                  </SelectContent>
                </Select>
                {projectForm.category === '__custom__' && (
                  <Input
                    className="mt-2"
                    placeholder="Enter new category name"
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={projectForm.priority}
                  onValueChange={(value) => setProjectForm({ ...projectForm, priority: value })}
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
              <div>
                <label className="text-sm font-medium">Budget</label>
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter budget"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Estimated Hours</label>
              <Input
                type="number"
                value={projectForm.estimatedHours}
                onChange={(e) => setProjectForm({ ...projectForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                placeholder="Enter estimated hours"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={selectedProject ? handleUpdateProject : handleCreateProject}
                className="bg-slate-800 hover:bg-slate-700"
              >
                {selectedProject ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Creation Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name (e.g., Residential, Commercial, Corporate)"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
            </div>
            
            <div className="text-sm text-slate-600">
              <p>Categories help organize your projects. Common examples:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Residential Projects</li>
                <li>Commercial Installations</li>
                <li>Corporate Events</li>
                <li>Maintenance & Support</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                className="bg-slate-800 hover:bg-slate-700"
                disabled={!newCategoryName.trim()}
              >
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Project View Modal */}
      <Dialog open={isProjectViewModalOpen} onOpenChange={setIsProjectViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {viewingProject?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingProject && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="details">Project Details</TabsTrigger>
                <TabsTrigger value="client">Client Info</TabsTrigger>
                <TabsTrigger value="tasks" onClick={() => {
                  setSelectedProject(viewingProject);
                  setIsTaskManagementModalOpen(true);
                }}>Tasks</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Description</label>
                      <p className="mt-1 text-sm text-slate-900">{viewingProject.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Status</label>
                      <div className="mt-1 flex items-center gap-2">
                        {isEditingStatus ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customStatusValue}
                              onChange={(e) => setCustomStatusValue(e.target.value)}
                              placeholder="Enter status"
                              className="w-32 h-8"
                              onKeyPress={(e) => e.key === 'Enter' && saveCustomStatus()}
                            />
                            <Button size="sm" onClick={saveCustomStatus} className="h-8 px-2">
                              ✓
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsEditingStatus(false)} className="h-8 px-2">
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge 
                              style={getStatusColor(viewingProject.status) as any} 
                              className="text-xs px-2 py-1 rounded-full font-medium cursor-pointer hover:opacity-80"
                              onClick={() => handleStatusEdit(viewingProject.status)}
                            >
                              {viewingProject.status.replace('_', ' ')}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusColorEdit(viewingProject.status)}
                              className="h-6 w-6 p-0"
                              style={{ backgroundColor: statusColors[viewingProject.status] || '#6b7280' }}
                              title="Change color"
                            >
                              <div className="w-3 h-3 rounded-full border border-white/50"></div>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Priority</label>
                      <div className="mt-1 flex items-center gap-2">
                        {isEditingPriority ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={customPriorityValue}
                              onChange={(e) => setCustomPriorityValue(e.target.value)}
                              placeholder="Enter priority"
                              className="w-32 h-8"
                              onKeyPress={(e) => e.key === 'Enter' && saveCustomPriority()}
                            />
                            <Button size="sm" onClick={saveCustomPriority} className="h-8 px-2">
                              ✓
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsEditingPriority(false)} className="h-8 px-2">
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge 
                              style={getPriorityColor(viewingProject.priority) as any} 
                              className="text-xs px-2 py-1 rounded-full font-medium cursor-pointer hover:opacity-80"
                              onClick={() => handlePriorityEdit(viewingProject.priority)}
                            >
                              {viewingProject.priority}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePriorityColorEdit(viewingProject.priority)}
                              className="h-6 w-6 p-0"
                              style={{ backgroundColor: priorityColors[viewingProject.priority] || '#6b7280' }}
                              title="Change color"
                            >
                              <div className="w-3 h-3 rounded-full border border-white/50"></div>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Category</label>
                      <p className="mt-1 text-sm text-slate-900">{viewingProject.category}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Budget</label>
                      <p className="mt-1 text-sm text-slate-900">${viewingProject.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Spent</label>
                      <p className="mt-1 text-sm text-slate-900">${viewingProject.spent.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Start Date</label>
                      <p className="mt-1 text-sm text-slate-900">
                        {new Date(viewingProject.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">End Date</label>
                      <p className="mt-1 text-sm text-slate-900">
                        {new Date(viewingProject.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-600">Progress</label>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>{viewingProject.actualHours}h / {viewingProject.estimatedHours}h</span>
                      <span>{Math.round((viewingProject.actualHours / viewingProject.estimatedHours) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-slate-600 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((viewingProject.actualHours / viewingProject.estimatedHours) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                {viewingProject.tags && viewingProject.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Tags</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {viewingProject.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="client" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Client Name</label>
                    <p className="mt-1 text-lg font-medium text-slate-900">{viewingProject.clientName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Project Created By</label>
                    <p className="mt-1 text-sm text-slate-900">{viewingProject.createdBy}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Created Date</label>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(viewingProject.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Last Updated</label>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(viewingProject.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="tasks" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Project Tasks</h3>
                    <Button
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                  </div>

                  {/* My Tasks Section */}
                  {projectTasks.filter(task => task.assignedTo === user?.id).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Your Tasks ({projectTasks.filter(task => task.assignedTo === user?.id).length})
                      </h4>
                      <div className="space-y-2">
                        {projectTasks
                          .filter(task => task.assignedTo === user?.id)
                          .map((task) => (
                            <div key={task.id} className="bg-white rounded-lg p-3 border border-blue-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-slate-900">{task.title}</h5>
                                  {task.description && (
                                    <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge style={getTaskStatusColor(task.status)} className="text-xs">
                                      {task.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    <Badge style={getTaskPriorityColor(task.priority)} className="text-xs">
                                      {task.priority.toUpperCase()}
                                    </Badge>
                                    {task.dueDate && (
                                      <span className="text-xs text-slate-500">
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                    disabled={task.status === 'done'}
                                    className="h-7 px-2"
                                  >
                                    <Play className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                                    disabled={task.status === 'done'}
                                    className="h-7 px-2"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* All Tasks Section */}
                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">All Tasks ({projectTasks.length})</h4>
                    {projectTasks.length > 0 ? (
                      <div className="space-y-3">
                        {projectTasks.map((task) => {
                          const assignedEmployee = Array.isArray(employees) ? employees.find(emp => emp.employeeId === task.assignedTo) : null;
                          return (
                            <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h5 className="font-medium text-slate-900">{task.title}</h5>
                                    <Badge style={getTaskStatusColor(task.status)} className="text-xs">
                                      {task.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                    <Badge style={getTaskPriorityColor(task.priority)} className="text-xs">
                                      {task.priority.toUpperCase()}
                                    </Badge>
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                                  )}
                                  
                                  <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {assignedEmployee && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {assignedEmployee.firstName} {assignedEmployee.lastName}
                                      </span>
                                    )}
                                    {task.estimatedHours && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {task.estimatedHours}h estimated
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                    <span>
                                      Created: {new Date(task.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {['todo', 'in_progress', 'review', 'done'].map((status) => (
                                    <Button
                                      key={status}
                                      variant={task.status === status ? "default" : "ghost"}
                                      size="sm"
                                      onClick={() => handleUpdateTaskStatus(task.id, status)}
                                      className="h-7 px-2 text-xs"
                                      style={task.status === status ? getTaskStatusColor(status) : {}}
                                    >
                                      {status.replace('_', ' ').toUpperCase()}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No tasks created for this project yet</p>
                        <Button
                          onClick={() => setIsCreateTaskModalOpen(true)}
                          variant="outline"
                          size="sm"
                          className="mt-3"
                        >
                          Create First Task
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="team" className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Assigned Users</label>
                  {viewingProject.assignedUsers && viewingProject.assignedUsers.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {viewingProject.assignedUsers.map((user, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-900">{user}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No users assigned to this project</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="files" className="space-y-4">
                <div className="space-y-4">
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
                        {uploadingFile ? 'Uploading...' : 'Upload File'}
                      </Button>
                    </div>
                  </div>
                  
                  {projectFiles.length > 0 ? (
                    <div className="space-y-2">
                      {projectFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <div>
                              <span className="text-sm font-medium text-slate-900">{file.name}</span>
                              <div className="text-xs text-slate-500">
                                Size: {file.size} | Modified: {new Date(file.lastModified).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/api/project-files/download?fileName=${encodeURIComponent(file.name)}&projectId=${viewingProject.id}&clientName=${encodeURIComponent(viewingProject.clientName)}`, '_blank')}
                            >
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileDelete(file.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 mb-2">No files uploaded for this project</p>
                      <p className="text-xs text-slate-400">Files are stored in /mnt/server_data/customer_profiles/customer_files/</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="space-y-4">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-600">Project Invoices</label>
                  
                  {projectInvoices.length > 0 ? (
                    <div className="space-y-3">
                      {projectInvoices.map((invoice, index) => (
                        <div key={index} className="p-4 bg-slate-50 rounded-lg border">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900">Invoice #{invoice.number}</h4>
                              <p className="text-sm text-slate-600 mt-1">Date: {new Date(invoice.date).toLocaleDateString()}</p>
                              <p className="text-sm text-slate-600">Status: <span className={`px-2 py-1 rounded text-xs ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{invoice.status}</span></p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">${invoice.amount.toLocaleString()}</p>
                              <p className="text-sm text-slate-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {invoice.description && (
                            <p className="text-sm text-slate-600 mt-2">{invoice.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                      <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No invoices associated with this project</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="change-orders" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-4 block">Submit Change Order Request</label>
                    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                          <textarea
                            value={changeOrderRequest.description}
                            onChange={(e) => setChangeOrderRequest(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            rows={3}
                            placeholder="Describe the change order request..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                            <input
                              type="number"
                              value={changeOrderRequest.amount}
                              onChange={(e) => setChangeOrderRequest(prev => ({ ...prev, amount: e.target.value }))}
                              className="w-full p-2 border border-slate-300 rounded-md text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Urgency</label>
                            <select
                              value={changeOrderRequest.urgency}
                              onChange={(e) => setChangeOrderRequest(prev => ({ ...prev, urgency: e.target.value }))}
                              className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
                          <input
                            type="text"
                            value={changeOrderRequest.reason}
                            onChange={(e) => setChangeOrderRequest(prev => ({ ...prev, reason: e.target.value }))}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Client request, scope change, etc."
                          />
                        </div>
                        
                        <Button
                          onClick={handleSubmitChangeOrder}
                          disabled={isSubmittingChangeOrder || !changeOrderRequest.description.trim()}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                          {isSubmittingChangeOrder ? 'Submitting...' : 'Submit to Accounting'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Note:</p>
                    <p>Change order requests are sent directly to the accounting department for review and approval. You will be notified once the request has been processed.</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Color Picker Modal */}
      <Dialog open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Choose Color for "{selectedCategoryForColor}"
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center gap-4">
            <ChromePicker
              color={currentPickerColor}
              onChange={handleColorChange}
              disableAlpha={true}
            />
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: currentPickerColor }}
              ></div>
              <div className="text-sm text-gray-600">
                <div className="font-medium">Selected Color</div>
                <div className="font-mono text-xs">{currentPickerColor.toUpperCase()}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsColorPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={applyColorChange}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Color
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Category Modal */}
      <Dialog open={isRenameCategoryModalOpen} onOpenChange={setIsRenameCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Current name: {renamingCategory}</div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 mb-2">
                  New category name
                </label>
                <Input
                  id="newCategoryName"
                  value={newCategoryNameForRename}
                  onChange={(e) => setNewCategoryNameForRename(e.target.value)}
                  placeholder="Enter new category name"
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRenameCategoryModalOpen(false);
                  setRenamingCategory('');
                  setNewCategoryNameForRename('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRenameCategory}>
                Rename Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Color Picker Modal */}
      <Dialog open={isStatusColorPickerOpen} onOpenChange={setIsStatusColorPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status Color</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Changing color for status: <span className="font-medium">{editingStatusKey}</span>
              </div>
            </div>
            
            <div className="flex justify-center mb-4">
              <ChromePicker
                color={currentStatusColorPicker}
                onChange={(color) => setCurrentStatusColorPicker(color.hex)}
                disableAlpha={true}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsStatusColorPickerOpen(false);
                  setEditingStatusKey('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveStatusColor} className="bg-blue-600 hover:bg-blue-700">
                Apply Color
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Priority Color Picker Modal */}
      <Dialog open={isPriorityColorPickerOpen} onOpenChange={setIsPriorityColorPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Priority Color</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Changing color for priority: <span className="font-medium">{editingPriorityKey}</span>
              </div>
            </div>
            
            <div className="flex justify-center mb-4">
              <ChromePicker
                color={currentPriorityColorPicker}
                onChange={(color) => setCurrentPriorityColorPicker(color.hex)}
                disableAlpha={true}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsPriorityColorPickerOpen(false);
                  setEditingPriorityKey('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={savePriorityColor} className="bg-blue-600 hover:bg-blue-700">
                Apply Color
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={isCreateTaskModalOpen} onOpenChange={setIsCreateTaskModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Task Title *
              </label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Enter task title"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Enter task description"
                className="w-full p-3 border border-slate-300 rounded-md resize-none h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priority
                </label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign To
                </label>
                <Select
                  value={taskForm.assignedTo}
                  onValueChange={(value) => setTaskForm({ ...taskForm, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.employeeId} value={employee.employeeId}>
                        {employee.firstName} {employee.lastName} ({employee.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estimated Hours
                </label>
                <Input
                  type="number"
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Due Date
              </label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateTaskModalOpen(false);
                  setTaskForm({
                    title: '',
                    description: '',
                    status: 'todo',
                    priority: 'medium',
                    assignedTo: '',
                    estimatedHours: 0,
                    dueDate: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!taskForm.title.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Creation Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-red-600">Customer Name *</label>
                <Input
                  value={customerForm.fullName}
                  onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                  placeholder="Enter customer full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={customerForm.company}
                  onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cell Phone</label>
                <Input
                  value={customerForm.phoneCell}
                  onChange={(e) => setCustomerForm({ ...customerForm, phoneCell: e.target.value })}
                  placeholder="Enter cell phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Office Phone</label>
                <Input
                  value={customerForm.phoneOffice}
                  onChange={(e) => setCustomerForm({ ...customerForm, phoneOffice: e.target.value })}
                  placeholder="Enter office phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Enter street address"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={customerForm.state}
                  onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="text-sm font-medium">ZIP Code</label>
                <Input
                  value={customerForm.zip}
                  onChange={(e) => setCustomerForm({ ...customerForm, zip: e.target.value })}
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                placeholder="Enter any additional notes"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  setCustomerForm({
                    fullName: '',
                    company: '',
                    email: '',
                    phoneCell: '',
                    phoneOffice: '',
                    address: '',
                    city: '',
                    state: '',
                    zip: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={!customerForm.fullName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="workspaces" className="mt-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Workspaces</h2>
                <p className="text-slate-600">Organize projects into separate workspaces for better management</p>
              </div>
              <Button 
                className="bg-slate-800 hover:bg-slate-700"
                onClick={() => setIsWorkspaceModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.length > 0 ? (
                workspaces.map((workspace) => (
                  <Card 
                    key={workspace.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedWorkspace(workspace);
                      setShowWorkspaceView(true);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: workspace.color }}
                        ></div>
                        {workspace.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">
                        {workspace.description || "No description provided"}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {workspaceProjects.filter(p => p.workspaceId === workspace.id).length} Projects
                        </span>
                        <span className="text-slate-500">
                          {workspaceTasks.filter(t => t.workspaceId === workspace.id).length} Tasks
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Folder className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No workspaces yet</h3>
                  <p className="text-slate-600 mb-4">Create your first workspace to organize your projects</p>
                  <Button 
                    onClick={() => setIsWorkspaceModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workspace
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workspace Creation Modal */}
      <Dialog open={isWorkspaceModalOpen} onOpenChange={setIsWorkspaceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                placeholder="Workspace name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={workspaceForm.description}
                onChange={(e) => setWorkspaceForm({ ...workspaceForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={workspaceForm.color}
                  onChange={(e) => setWorkspaceForm({ ...workspaceForm, color: e.target.value })}
                  className="w-10 h-10 border border-slate-300 rounded cursor-pointer"
                />
                <Input
                  value={workspaceForm.color}
                  onChange={(e) => setWorkspaceForm({ ...workspaceForm, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsWorkspaceModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createWorkspace}
                disabled={!workspaceForm.name.trim()}
                className="bg-slate-800 hover:bg-slate-700"
              >
                Create Workspace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Management Modal */}
      <TaskManagementModal
        isOpen={isTaskManagementModalOpen}
        onClose={() => setIsTaskManagementModalOpen(false)}
        project={selectedProject}
      />
    </div>
  );
}