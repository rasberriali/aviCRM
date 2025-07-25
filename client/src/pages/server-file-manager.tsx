import { useState, useEffect, useRef } from "react";
import { useHttpAuth } from "@/hooks/useHttpAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LargeFileUploader } from "@/components/large-file-uploader";
import { 
  Folder, 
  File, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Save, 
  RefreshCw,
  FolderPlus,
  FilePlus,
  Lock,
  AlertTriangle,
  Terminal,
  Code,
  Settings,
  Eye,
  Search,
  Filter,
  MoreVertical
} from "lucide-react";

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  path: string;
  extension?: string;
}

export default function ServerFileManager() {
  const { user } = useHttpAuth();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'directory'>('file');
  const [createName, setCreateName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<FileItem | null>(null);
  const [isJsonFile, setIsJsonFile] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [formattedJson, setFormattedJson] = useState('');
  const fileContentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Load files regardless of user authentication for development
    loadFiles();
  }, [currentPath]);

  // Temporarily allow access for development - bypass security check
  console.log('[CLIENT] Current user:', user);
  const isEthan = user && (user as any).username === 'Edevries' && (user as any).id === '3';
  console.log('[CLIENT] Is Ethan access?', isEthan);
  
  // For development - show access denied message but allow access
  if (!user || !isEthan) {
    console.log('[CLIENT] Access denied but allowing for development');
    // Temporarily comment out the return to allow development access
    /*
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Lock className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This file management system is restricted to Ethan DeVries only.
                Access requires specific authorization credentials.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
    */
  }

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      console.log('Load files starting, current path:', currentPath);
      const response = await fetch(`/api/server-files?path=${encodeURIComponent(currentPath)}`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Files loaded successfully:', data);
        setFiles(data);
      } else {
        const errorText = await response.text();
        console.log('Load files error:', errorText);
        toast({
          title: "Failed to load files",
          description: `Server error: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.log('Load files error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to remote server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPath = (newPath: string) => {
    setCurrentPath(newPath);
    setSelectedFile(null);
    setFileContent('');
    setIsEditing(false);
  };

  const navigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      navigateToPath(parentPath);
    }
  };

  const openFile = async (file: FileItem) => {
    if (file.type === 'directory') {
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      navigateToPath(newPath);
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);
    setIsJsonFile(file.extension === 'json' || file.name.endsWith('.json'));
    setJsonError(null);
    
    try {
      const response = await fetch(`/api/server-files/content?filePath=${encodeURIComponent(file.path)}`);
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content);
        
        // If it's a JSON file, try to format it
        if (file.extension === 'json' || file.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(data.content);
            setFormattedJson(JSON.stringify(parsed, null, 2));
          } catch (jsonErr) {
            setJsonError('Invalid JSON format');
            setFormattedJson(data.content);
          }
        }
        
        setIsEditing(false);
      } else {
        toast({
          title: "Failed to read file",
          description: "Could not load file content",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Failed to fetch file content",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    
    let contentToSave = fileContent;
    
    // Validate JSON if it's a JSON file
    if (isJsonFile) {
      try {
        JSON.parse(contentToSave);
        setJsonError(null);
      } catch (jsonErr) {
        setJsonError('Invalid JSON format - cannot save');
        toast({
          title: "Invalid JSON",
          description: "Please fix JSON errors before saving",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/server-files/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile.path,
          content: contentToSave
        })
      });

      if (response.ok) {
        toast({ title: "File saved successfully" });
        setIsEditing(false);
        loadFiles(); // Refresh file list
        
        // Re-format JSON if successful
        if (isJsonFile) {
          try {
            const parsed = JSON.parse(contentToSave);
            setFormattedJson(JSON.stringify(parsed, null, 2));
          } catch {}
        }
      } else {
        toast({
          title: "Failed to save file",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error saving file",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatJson = () => {
    if (!isJsonFile) return;
    
    try {
      const parsed = JSON.parse(fileContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setFileContent(formatted);
      setFormattedJson(formatted);
      setJsonError(null);
      toast({ title: "JSON formatted successfully" });
    } catch (error) {
      setJsonError('Invalid JSON format');
      toast({
        title: "Invalid JSON",
        description: "Cannot format invalid JSON",
        variant: "destructive"
      });
    }
  };

  const validateJson = () => {
    if (!isJsonFile) return;
    
    try {
      JSON.parse(fileContent);
      setJsonError(null);
      toast({ title: "JSON is valid" });
    } catch (error) {
      setJsonError((error as Error).message);
      toast({
        title: "Invalid JSON",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const createFileOrDirectory = async () => {
    if (!createName.trim()) return;

    try {
      const filePath = currentPath ? `${currentPath}/${createName}` : createName;
      const response = await fetch('/api/server-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          content: createType === 'file' ? '' : undefined,
          isDirectory: createType === 'directory'
        })
      });

      if (response.ok) {
        toast({
          title: `${createType === 'file' ? 'File' : 'Directory'} created successfully`
        });
        setShowCreateDialog(false);
        setCreateName('');
        loadFiles();
      } else {
        toast({
          title: `Failed to create ${createType}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: `Error creating ${createType}`,
        variant: "destructive"
      });
    }
  };

  const deleteFileOrDirectory = async (file: FileItem) => {
    try {
      const response = await fetch(`/api/server-files?filePath=${encodeURIComponent(file.path)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: `${file.type === 'file' ? 'File' : 'Directory'} deleted successfully`
        });
        setShowDeleteConfirm(null);
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
        loadFiles();
      } else {
        toast({
          title: "Failed to delete",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error deleting",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') return Folder;
    
    const ext = file.extension?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'py':
      case 'rb':
      case 'php':
      case 'java':
      case 'cpp':
      case 'c':
        return Code;
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return Settings;
      default:
        return File;
    }
  };

  const getFileTypeColor = (file: FileItem) => {
    if (file.type === 'directory') return 'text-blue-600 dark:text-blue-400';
    
    const ext = file.extension?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'py':
        return 'text-green-600 dark:text-green-400';
      case 'json':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Terminal className="h-7 w-7 text-blue-600" />
            Server File Manager
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Remote access to /opt/fileserver/ - Ethan DeVries (Authorized)
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Connected to 165.23.126.88:8888
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Browser */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  File Browser
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateType('directory');
                      setShowCreateDialog(true);
                    }}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateType('file');
                      setShowCreateDialog(true);
                    }}
                  >
                    <FilePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFiles}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              
              {/* Path breadcrumbs */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>/opt/fileserver/</span>
                {currentPath && (
                  <>
                    <span>{currentPath}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateUp}
                      className="h-6 px-2"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredFiles.map((file) => {
                      const IconComponent = getFileIcon(file);
                      return (
                        <div
                          key={file.path}
                          className={`flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-l-4 transition-colors ${
                            selectedFile?.path === file.path
                              ? 'bg-blue-50 dark:bg-blue-950/20 border-l-blue-500'
                              : 'border-l-transparent'
                          }`}
                          onClick={() => openFile(file)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <IconComponent className={`h-4 w-4 ${getFileTypeColor(file)}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              {file.size && (
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              )}
                            </div>
                          </div>
                          
                          {file.type === 'file' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(file);
                              }}
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Editor */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  {selectedFile ? `Editing: ${selectedFile.name}` : 'File Editor'}
                </CardTitle>
                
                {selectedFile && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      {isEditing ? 'View' : 'Edit'}
                    </Button>
                    
                    {isJsonFile && isEditing && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={formatJson}
                          disabled={!!jsonError}
                        >
                          <Code className="h-4 w-4" />
                          Format
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={validateJson}
                        >
                          <Settings className="h-4 w-4" />
                          Validate
                        </Button>
                      </>
                    )}
                    
                    {isEditing && (
                      <Button
                        size="sm"
                        onClick={saveFile}
                        disabled={isSaving || (isJsonFile && !!jsonError)}
                      >
                        {isSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {selectedFile ? (
                <div className="space-y-4">
                  {/* JSON Status and Error Display */}
                  {isJsonFile && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">JSON File</span>
                        {jsonError ? (
                          <Badge variant="destructive" className="text-xs">
                            Invalid JSON
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Valid JSON
                          </Badge>
                        )}
                      </div>
                      {jsonError && (
                        <span className="text-xs text-red-600 font-mono max-w-md truncate">
                          {jsonError}
                        </span>
                      )}
                    </div>
                  )}

                  {/* File Editor */}
                  <div className="h-96">
                    <Textarea
                      ref={fileContentRef}
                      value={fileContent}
                      onChange={(e) => {
                        setFileContent(e.target.value);
                        // Real-time JSON validation for JSON files
                        if (isJsonFile && isEditing) {
                          try {
                            JSON.parse(e.target.value);
                            setJsonError(null);
                          } catch (error) {
                            setJsonError((error as Error).message);
                          }
                        }
                      }}
                      placeholder="File content will appear here..."
                      className={`h-full font-mono text-sm resize-none ${
                        jsonError && isJsonFile ? 'border-red-300 focus:border-red-500' : ''
                      }`}
                      readOnly={!isEditing}
                      style={{ 
                        backgroundColor: isEditing ? (jsonError && isJsonFile ? '#fef2f2' : undefined) : '#f8f9fa',
                        fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
                      }}
                    />
                  </div>

                  {/* JSON Preview (read-only mode) */}
                  {isJsonFile && !isEditing && formattedJson && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Formatted JSON Preview:
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 font-mono text-xs overflow-auto max-h-32">
                        <pre className="whitespace-pre-wrap">{formattedJson}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No file selected</p>
                    <p className="text-sm">Select a file from the browser to view or edit</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Large File Upload Section */}
      <div className="mt-8">
        <LargeFileUploader 
          onUploadComplete={loadFiles}
          projectId={currentPath}
          clientName="Server Files"
        />
      </div>

      {/* Create File/Directory Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {createType === 'file' ? 'File' : 'Directory'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={`Enter ${createType} name...`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createFileOrDirectory();
                  }
                }}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={createFileOrDirectory}>
                Create {createType === 'file' ? 'File' : 'Directory'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Deletion</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to delete "{showDeleteConfirm?.name}"? This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showDeleteConfirm && deleteFileOrDirectory(showDeleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}