import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Download,
  Trash2,
  Edit,
  FolderPlus,
  File,
  Folder,
  ArrowLeft,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  path: string;
}

const FILE_SERVER_URL = 'http://165.23.126.88:8888';
const AUTH_HEADER = 'Basic ' + btoa('aviuser:aviserver');

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files from server
  const { data: filesData, isLoading, refetch } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: async () => {
      const response = await fetch(`${FILE_SERVER_URL}/api/files?path=${encodeURIComponent(currentPath)}`, {
        headers: {
          'Authorization': AUTH_HEADER
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      return response.json();
    }
  });

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      setWsStatus('connecting');
      const wsUrl = `ws://165.23.126.88:8888/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        setWsStatus('connected');
        console.log('WebSocket connected');
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          switch (message.type) {
            case 'file_uploaded':
            case 'file_deleted':
            case 'file_renamed':
            case 'folder_created':
              refetch();
              toast({
                title: 'File Update',
                description: `File operation completed: ${message.type}`,
              });
              break;
            case 'welcome':
              toast({
                title: 'Connected',
                description: 'Real-time file updates enabled',
              });
              break;
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.addEventListener('close', () => {
        setWsStatus('disconnected');
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
      });

      ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('disconnected');
      });

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [refetch, toast]);

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', currentPath);

      const response = await fetch(`${FILE_SERVER_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File uploaded successfully'
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Upload failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(`${FILE_SERVER_URL}/api/files`, {
        method: 'DELETE',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File deleted successfully'
      });
      setSelectedFiles([]);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Delete failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Rename file mutation
  const renameMutation = useMutation({
    mutationFn: async ({ oldPath, newPath }: { oldPath: string; newPath: string }) => {
      const response = await fetch(`${FILE_SERVER_URL}/api/files/rename`, {
        method: 'PUT',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPath, newPath })
      });

      if (!response.ok) {
        throw new Error('Rename failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File renamed successfully'
      });
      setShowRenameDialog(false);
      setRenameTarget(null);
      setNewName('');
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Rename failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const folderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
      
      const response = await fetch(`${FILE_SERVER_URL}/api/files/mkdir`, {
        method: 'POST',
        headers: {
          'Authorization': AUTH_HEADER,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: folderPath })
      });

      if (!response.ok) {
        throw new Error('Create folder failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Folder created successfully'
      });
      setShowCreateFolderDialog(false);
      setNewFolderName('');
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Create folder failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        uploadMutation.mutate(file);
      });
    }
  };

  const handleDownload = (file: FileItem) => {
    const downloadUrl = `${FILE_SERVER_URL}/api/files/download?path=${encodeURIComponent(file.path)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('authorization', AUTH_HEADER);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles([]);
  };

  const handleGoBack = () => {
    if (currentPath !== '/') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      setCurrentPath(parentPath);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const startRename = (file: FileItem) => {
    setRenameTarget(file);
    setNewName(file.name);
    setShowRenameDialog(true);
  };

  const handleRename = () => {
    if (!renameTarget || !newName.trim()) return;
    
    const newPath = renameTarget.path.replace(renameTarget.name, newName.trim());
    renameMutation.mutate({
      oldPath: renameTarget.path,
      newPath: newPath
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  const files = filesData?.files || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">Manage files on server at 165.23.126.88</p>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                disabled={currentPath === '/'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">
                Current Path: {currentPath}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-500' : 
                  wsStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-muted-foreground">
                  {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateFolderDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || createFolderMutation.isPending}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file: FileItem) => (
                  <TableRow key={file.path}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {file.type === 'directory' ? (
                          <Folder className="h-4 w-4 text-blue-500" />
                        ) : (
                          <File className="h-4 w-4 text-gray-500" />
                        )}
                        <button
                          className="text-left hover:underline"
                          onClick={() => {
                            if (file.type === 'directory') {
                              handleNavigate(file.path);
                            }
                          }}
                        >
                          {file.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={file.type === 'directory' ? 'default' : 'secondary'}>
                        {file.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {file.type === 'file' ? formatFileSize(file.size) : '-'}
                    </TableCell>
                    <TableCell>
                      {formatDate(file.modified)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.type === 'file' && (
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => startRename(file)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(file.path)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {files.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No files found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="New name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={!newName.trim() || renameMutation.isPending}
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}