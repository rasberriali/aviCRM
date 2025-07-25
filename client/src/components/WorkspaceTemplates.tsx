import React, { useState } from 'react';
import { Copy, FolderOpen, Users, Code, Briefcase, Star, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  categories: {
    name: string;
    description: string;
    projects: {
      name: string;
      description: string;
      tasks: {
        name: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        estimatedHours?: number;
      }[];
    }[];
  }[];
}

const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'av-installation',
    name: 'AV Installation Project',
    description: 'Complete audio-visual installation workflow',
    category: 'AV Integration',
    icon: <Briefcase className="h-6 w-6" />,
    color: '#3b82f6',
    categories: [
      {
        name: 'Pre-Installation',
        description: 'Planning and preparation phase',
        projects: [
          {
            name: 'Site Survey',
            description: 'Initial site assessment and measurements',
            tasks: [
              { name: 'Schedule site visit', description: 'Coordinate with client for site access', priority: 'high' },
              { name: 'Measure room dimensions', description: 'Document all relevant measurements', priority: 'high' },
              { name: 'Assess power requirements', description: 'Evaluate electrical needs', priority: 'medium' },
              { name: 'Document existing infrastructure', description: 'Photo and note current setup', priority: 'medium' }
            ]
          },
          {
            name: 'System Design',
            description: 'Create detailed installation plan',
            tasks: [
              { name: 'Create equipment list', description: 'Specify all required components', priority: 'high' },
              { name: 'Design cable routing', description: 'Plan optimal cable paths', priority: 'high' },
              { name: 'Create installation drawings', description: 'Technical diagrams and layouts', priority: 'medium' },
              { name: 'Client approval', description: 'Get sign-off on design', priority: 'high' }
            ]
          }
        ]
      },
      {
        name: 'Installation',
        description: 'Physical installation and setup',
        projects: [
          {
            name: 'Equipment Installation',
            description: 'Mount and connect all equipment',
            tasks: [
              { name: 'Mount displays', description: 'Install screens and projectors', priority: 'high', estimatedHours: 4 },
              { name: 'Run cables', description: 'Install all necessary cabling', priority: 'high', estimatedHours: 8 },
              { name: 'Install control systems', description: 'Set up automation and control', priority: 'high', estimatedHours: 6 },
              { name: 'Connect audio equipment', description: 'Wire speakers and audio components', priority: 'medium', estimatedHours: 3 }
            ]
          }
        ]
      },
      {
        name: 'Testing & Commissioning',
        description: 'System testing and client handover',
        projects: [
          {
            name: 'System Testing',
            description: 'Comprehensive system validation',
            tasks: [
              { name: 'Audio testing', description: 'Test all audio components', priority: 'high', estimatedHours: 2 },
              { name: 'Video testing', description: 'Verify all video signals', priority: 'high', estimatedHours: 2 },
              { name: 'Control system testing', description: 'Test automation and controls', priority: 'high', estimatedHours: 3 },
              { name: 'Client training', description: 'Train end users on system operation', priority: 'medium', estimatedHours: 2 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'software-development',
    name: 'Software Development',
    description: 'Agile software development workflow',
    category: 'Development',
    icon: <Code className="h-6 w-6" />,
    color: '#10b981',
    categories: [
      {
        name: 'Planning',
        description: 'Project planning and requirements',
        projects: [
          {
            name: 'Requirements Gathering',
            description: 'Define project scope and requirements',
            tasks: [
              { name: 'Stakeholder interviews', description: 'Gather requirements from users', priority: 'high' },
              { name: 'Create user stories', description: 'Document functional requirements', priority: 'high' },
              { name: 'Technical architecture', description: 'Design system architecture', priority: 'medium' },
              { name: 'Project timeline', description: 'Create development schedule', priority: 'medium' }
            ]
          }
        ]
      },
      {
        name: 'Development',
        description: 'Active development phase',
        projects: [
          {
            name: 'Frontend Development',
            description: 'User interface development',
            tasks: [
              { name: 'Setup development environment', description: 'Configure dev tools and dependencies', priority: 'high' },
              { name: 'Create UI components', description: 'Build reusable interface components', priority: 'high' },
              { name: 'Implement user flows', description: 'Connect components into workflows', priority: 'medium' },
              { name: 'Responsive design', description: 'Ensure mobile compatibility', priority: 'medium' }
            ]
          },
          {
            name: 'Backend Development',
            description: 'Server-side development',
            tasks: [
              { name: 'Database design', description: 'Create data models and schema', priority: 'high' },
              { name: 'API development', description: 'Build REST/GraphQL endpoints', priority: 'high' },
              { name: 'Authentication system', description: 'Implement user authentication', priority: 'medium' },
              { name: 'Integration testing', description: 'Test API functionality', priority: 'medium' }
            ]
          }
        ]
      },
      {
        name: 'Testing & Deployment',
        description: 'Quality assurance and release',
        projects: [
          {
            name: 'Quality Assurance',
            description: 'Testing and bug fixing',
            tasks: [
              { name: 'Unit testing', description: 'Write and run unit tests', priority: 'high' },
              { name: 'Integration testing', description: 'Test system integration', priority: 'high' },
              { name: 'User acceptance testing', description: 'Client testing and feedback', priority: 'medium' },
              { name: 'Performance testing', description: 'Load and performance testing', priority: 'low' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    description: 'New client integration process',
    category: 'Client Management',
    icon: <Users className="h-6 w-6" />,
    color: '#f59e0b',
    categories: [
      {
        name: 'Initial Contact',
        description: 'First client interactions',
        projects: [
          {
            name: 'Lead Qualification',
            description: 'Assess client needs and fit',
            tasks: [
              { name: 'Initial consultation', description: 'Understand client requirements', priority: 'high' },
              { name: 'Needs assessment', description: 'Detailed requirement analysis', priority: 'high' },
              { name: 'Proposal creation', description: 'Create detailed project proposal', priority: 'medium' },
              { name: 'Contract negotiation', description: 'Finalize terms and agreements', priority: 'high' }
            ]
          }
        ]
      },
      {
        name: 'Project Setup',
        description: 'Initialize client project',
        projects: [
          {
            name: 'Account Setup',
            description: 'Create client accounts and access',
            tasks: [
              { name: 'CRM setup', description: 'Add client to management system', priority: 'high' },
              { name: 'Project folder creation', description: 'Set up file storage structure', priority: 'high' },
              { name: 'Team assignment', description: 'Assign project team members', priority: 'medium' },
              { name: 'Kickoff meeting', description: 'Initial project meeting', priority: 'high' }
            ]
          }
        ]
      },
      {
        name: 'Project Execution',
        description: 'Active project work',
        projects: [
          {
            name: 'Project Management',
            description: 'Ongoing project coordination',
            tasks: [
              { name: 'Weekly check-ins', description: 'Regular client communication', priority: 'medium' },
              { name: 'Progress reporting', description: 'Status updates and reports', priority: 'medium' },
              { name: 'Issue resolution', description: 'Handle problems and changes', priority: 'high' },
              { name: 'Quality assurance', description: 'Ensure deliverable quality', priority: 'high' }
            ]
          }
        ]
      }
    ]
  }
];

interface WorkspaceTemplatesProps {
  onCreateFromTemplate: (template: WorkspaceTemplate, customName?: string) => void;
}

export function WorkspaceTemplates({ onCreateFromTemplate }: WorkspaceTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkspaceTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFromTemplateMutation = useMutation({
    mutationFn: async (data: { template: WorkspaceTemplate; name: string; description: string }) => {
      const workspaceData = {
        name: data.name,
        description: data.description,
        color: data.template.color
      };
      
      const workspace = await apiRequest('POST', '/api/workspaces', workspaceData);
      const workspaceId = workspace.id;
      
      // Create categories, projects, and tasks
      for (const category of data.template.categories) {
        const categoryData = {
          workspaceId,
          name: category.name,
          description: category.description,
          color: data.template.color
        };
        
        const createdCategory = await apiRequest('POST', '/api/workspace-categories', categoryData);
        const categoryId = createdCategory.id;
        
        for (const project of category.projects) {
          const projectData = {
            workspaceId,
            categoryId,
            name: project.name,
            description: project.description,
            status: 'planning' as const,
            priority: 'medium' as const
          };
          
          const createdProject = await apiRequest('POST', '/api/workspace-projects', projectData);
          const projectId = createdProject.id;
          
          for (const task of project.tasks) {
            const taskData = {
              workspaceId,
              projectId,
              name: task.name,
              description: task.description,
              status: 'todo' as const,
              priority: task.priority,
              estimatedHours: task.estimatedHours
            };
            
            await apiRequest('POST', '/api/workspace-tasks', taskData);
          }
        }
      }
      
      return workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: "Workspace created",
        description: "New workspace created from template successfully"
      });
      setSelectedTemplate(null);
      setCustomName('');
      setCustomDescription('');
      setIsCreating(false);
    },
    onError: (error) => {
      console.error('Error creating workspace from template:', error);
      toast({
        title: "Error creating workspace",
        description: "Failed to create workspace from template",
        variant: "destructive"
      });
    }
  });

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    
    const name = customName || selectedTemplate.name;
    const description = customDescription || selectedTemplate.description;
    
    createFromTemplateMutation.mutate({
      template: selectedTemplate,
      name,
      description
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Copy className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Workspace Templates</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKSPACE_TEMPLATES.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: template.color + '20', color: template.color }}
                >
                  {template.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {template.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {template.description}
              </CardDescription>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium">Includes:</div>
                <div className="space-y-1">
                  {template.categories.map((category) => (
                    <div key={category.name} className="flex items-center gap-2 text-sm text-gray-600">
                      <FolderOpen className="h-3 w-3" />
                      <span>{category.name}</span>
                      <span className="text-xs text-gray-400">
                        ({category.projects.length} projects)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCustomName(template.name);
                      setCustomDescription(template.description);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Workspace from Template</DialogTitle>
                  </DialogHeader>
                  
                  {selectedTemplate && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: selectedTemplate.color + '20', color: selectedTemplate.color }}
                        >
                          {selectedTemplate.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{selectedTemplate.name}</h3>
                          <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="workspace-name">Workspace Name</Label>
                          <Input
                            id="workspace-name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Enter workspace name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="workspace-description">Description</Label>
                          <Textarea
                            id="workspace-description"
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            placeholder="Enter workspace description"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Template Preview:</h4>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {selectedTemplate.categories.map((category) => (
                              <div key={category.name} className="space-y-1">
                                <div className="flex items-center gap-2 font-medium">
                                  <FolderOpen className="h-4 w-4" />
                                  {category.name}
                                </div>
                                {category.projects.map((project) => (
                                  <div key={project.name} className="ml-6 space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Briefcase className="h-3 w-3" />
                                      {project.name}
                                    </div>
                                    {project.tasks.map((task) => (
                                      <div key={task.name} className="ml-6 flex items-center gap-2 text-xs text-gray-600">
                                        <CheckSquare className="h-3 w-3" />
                                        {task.name}
                                        <Badge variant="outline" className="text-xs">
                                          {task.priority}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateFromTemplate}
                          disabled={!customName || createFromTemplateMutation.isPending}
                          className="flex-1"
                        >
                          {createFromTemplateMutation.isPending ? 'Creating...' : 'Create Workspace'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTemplate(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}