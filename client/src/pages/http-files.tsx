import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FolderPlus, 
  RefreshCw, 
  Download, 
  Trash2, 
  Folder, 
  File,
  ArrowLeft,
  Home,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderTree,
  FolderDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from 'jszip';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
  modified: string;
  children?: FileItem[];
  isExpanded?: boolean;
  isLoaded?: boolean;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export default function HttpFiles() {
  const [treeData, setTreeData] = useState<FileItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [fileSystemWatcher, setFileSystemWatcher] = useState<boolean>(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
    visible: boolean;
  } | null>(null);
  const { toast } = useToast();

  // Use proxy for better browser compatibility
  const SERVER_URL = '';
  const AUTH_HEADER = 'Basic ' + btoa('aviuser:aviserver');

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // WebSocket connection for real-time file system monitoring
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setWsConnected(true);
      setFileSystemWatcher(true);
      setWebSocket(ws);
      toast({
        title: "File Monitor Active",
        description: "Real-time file system monitoring enabled",
        variant: "default"
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'file_system_change':
            // Auto-refresh the current directory if it matches the changed path
            if (message.data.path === currentPath) {
              console.log(`[FILE_MONITOR] Refreshing view for changed directory: /${message.data.path}`);
              loadFiles(currentPath);
              
              toast({
                title: "Directory Updated",
                description: `Files changed in /${message.data.path || 'root'}`,
                variant: "default"
              });
            }
            break;
            
          case 'file_deleted':
            // Show success message and refresh
            toast({
              title: "File deleted",
              description: `${message.data.name} has been deleted successfully`,
              variant: "default"
            });
            loadFiles(currentPath);
            break;
            
          case 'file_renamed':
          case 'directory_uploaded':
            // Refresh current view when files are modified
            loadFiles(currentPath);
            break;
            
          case 'error':
            // Show error message from server
            toast({
              title: "Operation failed",
              description: message.message || "An error occurred",
              variant: "destructive"
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      setFileSystemWatcher(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      setFileSystemWatcher(false);
    };
    
    return () => {
      ws.close();
    };
  }, [currentPath, toast]);

  const loadFiles = async (path = currentPath) => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/files/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_HEADER
        },
        body: JSON.stringify({ path }),
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      setFiles(data.files || []);
      setDirectories(data.directories || []);
      
      // Initialize tree data on root load
      if (path === '') {
        const treeItems: FileItem[] = [
          // Add directories first
          ...data.directories.map((dir: FileItem) => ({
            ...dir,
            children: [],
            isExpanded: false,
            isLoaded: false
          })),
          // Add files
          ...data.files.map((file: FileItem) => ({
            ...file,
            children: undefined,
            isExpanded: false,
            isLoaded: true
          }))
        ];
        setTreeData(treeItems);
      }
      
      // Show status message
      if (data.files.length === 0 && data.directories.length === 0) {
        toast({
          title: "Directory Empty",
          description: `No files found in /${path || 'root'}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Load files error:', error);
      toast({
        title: "Connection Error",
        description: `Cannot reach file server: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFolderChildren = async (folderPath: string): Promise<FileItem[]> => {
    try {
      const response = await fetch(`${SERVER_URL}/api/files/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_HEADER
        },
        body: JSON.stringify({ path: folderPath })
      });

      if (!response.ok) throw new Error('Failed to load folder contents');

      const data = await response.json();
      return [
        // Add directories first
        ...data.directories.map((dir: FileItem) => ({
          ...dir,
          children: [],
          isExpanded: false,
          isLoaded: false
        })),
        // Add files
        ...data.files.map((file: FileItem) => ({
          ...file,
          children: undefined,
          isExpanded: false,
          isLoaded: true
        }))
      ];
    } catch (error) {
      console.error('Load folder error:', error);
      return [];
    }
  };

  const toggleFolder = async (item: FileItem) => {
    const isExpanded = expandedFolders.has(item.path);
    const newExpanded = new Set(expandedFolders);
    
    if (isExpanded) {
      newExpanded.delete(item.path);
    } else {
      newExpanded.add(item.path);
      
      // Load children if not loaded
      if (!item.isLoaded) {
        const children = await loadFolderChildren(item.path);
        setTreeData(prevTree => 
          updateTreeItem(prevTree, item.path, { 
            children, 
            isLoaded: true, 
            isExpanded: true 
          })
        );
      }
    }
    
    setExpandedFolders(newExpanded);
  };

  const updateTreeItem = (items: FileItem[], targetPath: string, updates: Partial<FileItem>): FileItem[] => {
    return items.map(item => {
      if (item.path === targetPath) {
        return { ...item, ...updates };
      }
      if (item.children) {
        return { ...item, children: updateTreeItem(item.children, targetPath, updates) };
      }
      return item;
    });
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedItem(null);
    loadFiles(folderPath);
  };

  const handleContextMenu = (event: React.MouseEvent, item: FileItem) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item,
      visible: true
    });
  };

  const contextMenuDownload = async (item: FileItem) => {
    setContextMenu(null);
    if (item.type === 'file') {
      await downloadFile(item.path, item.name);
    } else {
      toast({
        title: "Download Folder",
        description: "Use the main interface to download folders as ZIP files",
        variant: "default"
      });
    }
  };

  const contextMenuDelete = async (item: FileItem) => {
    setContextMenu(null);
    const confirmDelete = confirm(`Are you sure you want to delete "${item.name}"?`);
    if (confirmDelete) {
      await deleteFile(item.path, item.name);
    }
  };



  // Tree Node Component with enhanced visual design
  const TreeNode = ({ items, level }: { items: FileItem[], level: number }) => {
    return (
      <>
        {items.map((item) => (
          <div key={item.path}>
            <div
              className={cn(
                "flex items-center p-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700",
                currentPath === item.path && "bg-slate-200 dark:bg-slate-600 shadow-sm",
                selectedItem?.path === item.path && "bg-slate-150 dark:bg-slate-650 border border-slate-300 dark:border-slate-600"
              )}
              style={{ paddingLeft: `${level * 20 + 12}px` }}
              onClick={() => {
                if (item.type === 'directory') {
                  navigateToFolder(item.path);
                }
                setSelectedItem(item);
              }}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              {item.type === 'directory' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 mr-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(item);
                  }}
                >
                  {expandedFolders.has(item.path) ? (
                    <ChevronDown className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                  )}
                </Button>
              )}
              {item.type === 'directory' ? (
                expandedFolders.has(item.path) ? (
                  <FolderOpen className="h-4 w-4 mr-3 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 mr-3 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                )
              ) : (
                <File className="h-4 w-4 mr-3 text-slate-500 dark:text-slate-500 flex-shrink-0" style={{ marginLeft: item.type === 'directory' ? '0' : '20px' }} />
              )}
              <span className="truncate font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
            </div>
            {item.type === 'directory' && 
             expandedFolders.has(item.path) && 
             item.children && 
             item.children.length > 0 && (
              <div className="mt-2">
                <TreeNode items={item.children} level={level + 1} />
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  const uploadFolderAsZip = async (files: File[]) => {
    const folderName = files[0].webkitRelativePath?.split('/')[0] || 'uploaded-folder';
    
    toast({ title: "Creating zip file...", description: `Compressing ${files.length} files` });
    
    // Create zip file
    const zip = new JSZip();
    
    for (const file of files) {
      const relativePath = file.webkitRelativePath || file.name;
      zip.file(relativePath, file);
    }
    
    // Generate zip blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFileName = `${folderName}.zip`;
    
    setUploadProgress([{
      fileName: zipFileName,
      progress: 0,
      status: 'uploading' as const
    }]);
    
    // Upload zip file
    const formData = new FormData();
    formData.append('zipfile', zipBlob, zipFileName);
    formData.append('extractPath', currentPath);
    
    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress([{ fileName: zipFileName, progress, status: 'uploading' }]);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setUploadProgress([{ fileName: zipFileName, status: 'completed', progress: 100 }]);
              toast({ 
                title: "Zip extracted successfully", 
                description: `Extracted ${response.extractedFiles} files${response.originalZipDeleted ? ' (original zip deleted)' : ''}` 
              });
              
              // Clear progress immediately and reload files
              setTimeout(() => {
                setUploadProgress([]);
                loadFiles();
              }, 1000);
            } else {
              setUploadProgress([{ fileName: zipFileName, status: 'error', progress: 0 }]);
              toast({ title: "Extraction failed", description: response.error || "Unknown error", variant: "destructive" });
              // Clear upload progress after error
              setTimeout(() => setUploadProgress([]), 2000);
            }
          } catch (e) {
            setUploadProgress([{ fileName: zipFileName, status: 'error', progress: 0 }]);
            toast({ title: "Upload failed", description: "Invalid response", variant: "destructive" });
            // Clear upload progress after error
            setTimeout(() => setUploadProgress([]), 3000);
          }
        } else {
          setUploadProgress([{ fileName: zipFileName, status: 'error', progress: 0 }]);
          toast({ title: "Upload failed", description: `Server error: ${xhr.status}`, variant: "destructive" });
          // Clear upload progress after error
          setTimeout(() => setUploadProgress([]), 3000);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadProgress([{ fileName: zipFileName, status: 'error', progress: 0 }]);
        toast({ title: "Upload failed", variant: "destructive" });
        // Clear upload progress after error
        setTimeout(() => setUploadProgress([]), 3000);
      });

      xhr.open('POST', `${SERVER_URL}/api/files/upload-zip`);
      xhr.setRequestHeader('Authorization', AUTH_HEADER);
      xhr.send(formData);
      
    } catch (error) {
      setUploadProgress([{ fileName: zipFileName, status: 'error', progress: 0 }]);
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const uploadFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    
    // Check if this is a folder upload (files have webkitRelativePath)
    const isFolder = files.some(file => (file as any).webkitRelativePath);
    
    if (isFolder) {
      return uploadFolderAsZip(files);
    }
    
    const progressMap: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploadProgress(progressMap);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      
      // For directory uploads, preserve the path structure
      const relativePath = (file as any).webkitRelativePath || file.name;
      const fileName = currentPath ? `${currentPath}/${relativePath}` : relativePath;
      
      // Create form data with the file and proper filename
      formData.append('file', file, fileName);

      try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(prev => prev.map(p => 
              p.fileName === file.name ? { ...p, progress } : p
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              setUploadProgress(prev => prev.map(p => 
                p.fileName === file.name ? { ...p, status: 'completed', progress: 100 } : p
              ));
              
              if (response.extracted || response.extractedFiles) {
                toast({
                  title: "Zip file extracted",
                  description: `${file.name} extracted ${response.extractedFiles || 'successfully'} files`
                });
                // Refresh file list immediately for zip extractions
                setTimeout(() => loadFiles(), 500);
              } else if (response.success) {
                toast({
                  title: "File uploaded",
                  description: `${file.name} uploaded successfully${response.renamed ? ' (renamed due to duplicate)' : ''}`
                });
                // Refresh file list immediately for regular uploads
                setTimeout(() => loadFiles(), 200);
              }
            } catch (e) {
              console.log('Upload response parse error:', e);
              setUploadProgress(prev => prev.map(p => 
                p.fileName === file.name ? { ...p, status: 'completed', progress: 100 } : p
              ));
              toast({
                title: "File uploaded",
                description: `${file.name} uploaded successfully`
              });
            }
          } else {
            console.log('Upload failed with status:', xhr.status, xhr.responseText);
            setUploadProgress(prev => prev.map(p => 
              p.fileName === file.name ? { ...p, status: 'error' } : p
            ));
            toast({
              title: "Upload failed",
              description: `Failed to upload ${file.name}`,
              variant: "destructive"
            });
          }
        });

        xhr.addEventListener('error', () => {
          setUploadProgress(prev => prev.map(p => 
            p.fileName === file.name ? { ...p, status: 'error' } : p
          ));
        });

        xhr.open('POST', `${SERVER_URL}/api/files/upload`);
        xhr.setRequestHeader('Authorization', AUTH_HEADER);
        xhr.send(formData);

        // Wait for this upload to complete before starting the next
        await new Promise(resolve => {
          xhr.addEventListener('loadend', resolve);
        });

      } catch (error) {
        setUploadProgress(prev => prev.map(p => 
          p.fileName === file.name ? { ...p, status: 'error' } : p
        ));
      }
    }

    // Clear progress after a delay and reload files
    setTimeout(() => {
      setUploadProgress([]);
      loadFiles();
    }, 1000);

    toast({
      title: "Upload Complete",
      description: `${files.length} files uploaded successfully`
    });
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/files/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_HEADER
        },
        body: JSON.stringify({ 
          path: currentPath, 
          name: newFolderName.trim() 
        })
      });

      if (!response.ok) throw new Error('Failed to create folder');

      setNewFolderName('');
      loadFiles();
      toast({
        title: "Success",
        description: "Folder created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.join('/');
    navigateToFolder(newPath);
  };

  const navigateToDirectory = (dirPath: string) => {
    navigateToFolder(dirPath);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/files/download?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': AUTH_HEADER
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `Downloading ${fileName}`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download file",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (filePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      console.log(`Deleting file: ${filePath}`);
      
      const response = await fetch(`${SERVER_URL}/api/files/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_HEADER
        },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "File deleted",
          description: `${fileName} has been deleted successfully`
        });

        // Reload the file list
        loadFiles();
      } else {
        throw new Error(result.error || 'Delete failed');
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">HTTP-based file management system</p>
        </div>
        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
          HTTP Upload System
        </Badge>
      </div>

      {/* Mini Navigation Bar */}
      <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Navigation Controls */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPath('')}
                disabled={!currentPath}
                className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600 disabled:bg-slate-300 disabled:text-slate-500"
              >
                <Home className="h-4 w-4 mr-2" />
                Root
              </Button>
              {currentPath && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateUp}
                  className="bg-slate-600 hover:bg-slate-700 text-white border-slate-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Up
                </Button>
              )}
              <div className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                <span className="font-mono">/{currentPath}</span>
              </div>
            </div>

            {/* File Operations */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                className="bg-slate-600 hover:bg-slate-700 text-white"
                onClick={() => {
                  const folderName = prompt('Enter folder name:');
                  if (folderName) {
                    // Create folder logic here
                    toast({
                      title: "Feature coming soon",
                      description: "Folder creation will be implemented"
                    });
                  }
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              
              <Button
                size="sm"
                className="bg-slate-600 hover:bg-slate-700 text-white"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              
              <Button
                size="sm"
                className="bg-slate-600 hover:bg-slate-700 text-white"
                onClick={() => document.getElementById('folder-upload')?.click()}
              >
                <FolderDown className="h-4 w-4 mr-2" />
                Upload Folder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress - Only show when active */}
      {uploadProgress.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="bg-slate-50 dark:bg-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Upload Progress
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setUploadProgress([])}
                className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">{progress.fileName}</span>
                    <span className="text-slate-500">{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                  {progress.status === 'error' && (
                    <p className="text-red-600 text-xs">Upload failed</p>
                  )}
                  {progress.status === 'completed' && (
                    <p className="text-green-600 text-xs">Upload completed</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Windows Explorer Style File Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree Navigation Panel */}
        <Card className="lg:col-span-1 border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm font-semibold">
                <FolderTree className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-800 dark:text-slate-200">Directory Tree</span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => loadFiles('')} disabled={loading} className="border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-slate-600' : 'text-slate-500'}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 bg-slate-25 dark:bg-slate-900">
            {loading ? (
              <div className="text-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Root folder */}
                <div
                  className={cn(
                    "flex items-center p-2 rounded-lg text-sm cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700",
                    currentPath === '' && "bg-slate-200 dark:bg-slate-600 shadow-sm"
                  )}
                  onClick={() => navigateToFolder('')}
                >
                  <Home className="h-4 w-4 mr-2 text-slate-600 dark:text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Root</span>
                </div>
                
                {/* Tree items */}
                <TreeNode items={treeData} level={0} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Details Panel */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="bg-slate-50 dark:bg-slate-800 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center font-semibold">
                <File className="h-5 w-5 mr-2 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-800 dark:text-slate-200">Contents: /{currentPath}</span>
              </CardTitle>
              <div className="flex items-center space-x-3">
                {currentPath && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateUp}
                    className="border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Up
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => loadFiles()} disabled={loading} className="border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-slate-600' : 'text-slate-500'}`} />
                </Button>
                
                {/* File System Monitor Status */}
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <div className={cn(
                    "w-2 h-2 rounded-full shadow-sm",
                    fileSystemWatcher ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  )} />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {fileSystemWatcher ? "Live Monitor" : "Static View"}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-green-600" />
                <p className="text-muted-foreground">Loading contents...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Directories in current path */}
                {directories.map((directory) => (
                  <div
                    key={directory.path}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-200 hover:shadow-sm group border border-slate-200 dark:border-slate-700"
                    onClick={() => navigateToFolder(directory.path)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <Folder className="h-6 w-6 text-slate-600 dark:text-slate-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-base">{directory.name}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full inline-block mt-1">
                          {new Date(directory.modified).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(directory.path, directory.name);
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteFile(directory.path, directory.name);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Files in current path */}
                {files.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:shadow-sm"
                    onClick={() => setSelectedItem(file)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <File className="h-5 w-5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{file.name}</span>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {formatFileSize(file.size)}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {new Date(file.modified).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => downloadFile(file.path, file.name)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteFile(file.path, file.name);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {directories.length === 0 && files.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Folder className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Directory is empty</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload files or create folders to get started</p>
                    <div className="flex justify-center space-x-2">
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        New Folder
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden Upload Inputs for Mini Nav Bar */}
      <input
        id="file-upload"
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            uploadFiles(files);
          }
        }}
      />
      <input
        id="folder-upload"
        type="file"
        webkitdirectory="true"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            uploadFolderAsZip(files);
          }
        }}
      />

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => contextMenuDownload(contextMenu.item)}
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400 flex items-center gap-2"
            onClick={() => contextMenuDelete(contextMenu.item)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}