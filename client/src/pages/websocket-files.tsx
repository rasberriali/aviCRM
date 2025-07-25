import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Trash2, 
  FolderPlus, 
  Edit, 
  File, 
  Folder, 
  ArrowLeft,
  RefreshCw,
  MoreVertical,
  FileText,
  Image,
  Archive,
  Video,
  Music,
  Wifi,
  WifiOff,
  Clock,
  FolderUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
  modified: string;
}

interface FilesResponse {
  files: FileItem[];
  directories: FileItem[];
}

type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function WebSocketFilesPage() {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<FileItem[]>([]);
  const [wsStatus, setWsStatus] = useState<WSConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [directoryUploadProgress, setDirectoryUploadProgress] = useState<{
    dirName: string;
    uploaded: number;
    total: number;
    isUploading: boolean;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // WebSocket connection and file operations
  useEffect(() => {
    const connectWebSocket = () => {
      setWsStatus('connecting');
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      
      ws.addEventListener('open', () => {
        setWsStatus('connected');
        console.log('WebSocket connected to CRM server');
        
        // Request initial file list
        requestFileList(currentPath);
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
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
        setWsStatus('error');
      });

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentPath]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'file_list':
        setFiles(message.data.files || []);
        setDirectories(message.data.directories || []);
        setIsLoading(false);
        setLastRefresh(new Date());
        break;
      
      case 'file_uploaded':
        toast({
          title: 'File Uploaded',
          description: `${message.data.filename} uploaded successfully`,
        });
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[message.data.filename];
          return newProgress;
        });
        requestFileList(currentPath);
        break;
      
      case 'upload_error':
        console.error('Upload error:', message.data);
        toast({
          title: 'Upload Failed',
          description: message.data.error || 'Failed to upload file',
          variant: 'destructive',
        });
        if (message.data.filename) {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[message.data.filename];
            return newProgress;
          });
        }
        break;
      
      case 'file_deleted':
        const itemType = message.data.isDirectory ? 'Folder' : 'File';
        toast({
          title: `${itemType} Deleted`,
          description: `${message.data.name || 'Item'} deleted successfully`,
        });
        requestFileList(currentPath);
        setLastRefresh(new Date());
        break;
      
      case 'file_renamed':
        toast({
          title: 'File Renamed',
          description: 'File renamed successfully',
        });
        requestFileList(currentPath);
        setLastRefresh(new Date());
        break;
      
      case 'folder_created':
        toast({
          title: 'Folder Created',
          description: `Folder "${message.data.name}" created`,
        });
        requestFileList(currentPath);
        setLastRefresh(new Date());
        break;
      
      case 'upload_progress':
        setUploadProgress(prev => ({
          ...prev,
          [message.data.filename]: message.data.progress
        }));
        break;
      
      case 'directory_upload_started':
        setDirectoryUploadProgress({
          dirName: message.data.dirName,
          uploaded: 0,
          total: message.data.totalFiles,
          isUploading: true
        });
        toast({
          title: 'Directory Upload Started',
          description: `Uploading ${message.data.totalFiles} files from ${message.data.dirName}`,
        });
        break;
      
      case 'directory_upload_progress':
        setDirectoryUploadProgress(prev => prev ? {
          ...prev,
          uploaded: message.data.uploaded,
          progress: message.data.progress
        } : null);
        break;
      
      case 'directory_uploaded':
        setDirectoryUploadProgress(null);
        toast({
          title: 'Directory Upload Complete',
          description: `${message.data.dirName} uploaded successfully (${message.data.uploadedFiles} files)`,
        });
        requestFileList(currentPath);
        setLastRefresh(new Date());
        break;
      
      case 'directory_upload_error':
        toast({
          title: 'Directory Upload Failed',
          description: message.data.error,
          variant: 'destructive'
        });
        break;
      
      case 'file_download':
        // Create and trigger download
        const byteCharacters = atob(message.data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = message.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'Download Started',
          description: `${message.data.filename} download initiated`,
        });
        break;
      
      case 'error':
        toast({
          title: 'Error',
          description: message.message,
          variant: 'destructive'
        });
        setIsLoading(false);
        break;
      
      default:
        console.log('Unknown WebSocket message:', message);
    }
  };

  const sendWebSocketMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message.type);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected, state:', wsRef.current?.readyState);
      toast({
        title: 'Connection Error',
        description: 'Not connected to file server',
        variant: 'destructive'
      });
    }
  };

  const requestFileList = (path: string) => {
    setIsLoading(true);
    sendWebSocketMessage({
      type: 'list_files',
      path: path
    });
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    requestFileList(folderPath);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    navigateToFolder(parentPath);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for large files

    Array.from(files).forEach(file => {
      console.log(`Starting upload: ${file.name} (${formatFileSize(file.size)})`);
      
      // Initialize progress tracking
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 0
      }));

      // For large files (>10MB), use chunked upload
      if (file.size > 10 * 1024 * 1024) {
        uploadFileInChunks(file);
      } else {
        uploadFileDirect(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDirectoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const directoryName = filesArray[0].webkitRelativePath.split('/')[0];
    
    console.log(`Starting directory upload: ${directoryName} with ${filesArray.length} files`);
    
    toast({
      title: 'Large Directory Upload',
      description: `Processing ${filesArray.length} files from ${directoryName} in optimized batches`,
    });

    let directoryFiles: any[] = [];
    
    try {
      console.log('Starting file processing...');
      // Process files with parallel lightning-fast uploads
      directoryFiles = await Promise.all(
        filesArray.map(async (file, index) => {
          console.log(`Processing file ${index + 1}/${filesArray.length}: ${file.name}`);
          return new Promise<any>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                console.log(`File read complete: ${file.name}`);
                const arrayBuffer = reader.result as ArrayBuffer;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                
                resolve({
                  name: file.name,
                  data: base64,
                  size: file.size,
                  type: file.type,
                  relativePath: file.webkitRelativePath
                });
              } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                reject(error);
              }
            };
            reader.onerror = (error) => {
              console.error(`FileReader error for ${file.name}:`, error);
              reject(error);
            };
            reader.readAsArrayBuffer(file);
          });
        })
      );
      
      console.log(`All files processed, sending ${directoryFiles.length} files to server`);
    } catch (error) {
      console.error('Error processing directory files:', error);
      toast({
        title: 'Directory Processing Failed',
        description: 'Failed to process directory files',
        variant: 'destructive'
      });
      return;
    }

    // Initialize progress tracking for directory upload
    setDirectoryUploadProgress({
      dirName: directoryName,
      uploaded: 0,
      total: directoryFiles.length,
      isUploading: true
    });

    // For large directories, use batched upload to prevent WebSocket message size limits
    const BATCH_SIZE = 3; // Process 3 files at a time to prevent payload size exceeded
    console.log(`Processing ${directoryFiles.length} files in batches of ${BATCH_SIZE}`);
    
    if (directoryFiles.length > BATCH_SIZE) {
      // Large directory - use batched upload
      let uploadedCount = 0;
      const totalFiles = directoryFiles.length;
      
      for (let i = 0; i < directoryFiles.length; i += BATCH_SIZE) {
        const batch = directoryFiles.slice(i, i + BATCH_SIZE);
        console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1} with ${batch.length} files`);
        
        const batchMessage = {
          type: 'upload_directory_batch',
          directory: {
            name: directoryName,
            files: batch,
            batchInfo: {
              batchIndex: Math.floor(i / BATCH_SIZE),
              totalBatches: Math.ceil(totalFiles / BATCH_SIZE),
              totalFiles: totalFiles,
              isFirstBatch: i === 0,
              isLastBatch: i + BATCH_SIZE >= totalFiles
            }
          },
          path: currentPath
        };
        
        sendWebSocketMessage(batchMessage);
        
        // Small delay between batches to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      // Small directory - use original single message
      console.log('Sending directory upload message to server...');
      const message = {
        type: 'upload_directory',
        directory: {
          name: directoryName,
          files: directoryFiles
        },
        path: currentPath
      };
      
      sendWebSocketMessage(message);
    }

    // Reset directory input
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = '';
    }
  };

  const uploadFileDirect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      sendWebSocketMessage({
        type: 'upload_file',
        filename: file.name,
        path: currentPath,
        data: base64,
        size: file.size,
        isChunked: false
      });

      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 100
      }));
    };
    
    reader.onerror = () => {
      toast({
        title: 'Upload Error',
        description: `Failed to read file: ${file.name}`,
        variant: 'destructive'
      });
    };
    
    reader.readAsArrayBuffer(file);
  };

  const uploadFileInChunks = async (file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    toast({
      title: 'Large File Upload',
      description: `Uploading ${file.name} in ${totalChunks} chunks`,
    });

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const reader = new FileReader();
      
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          sendWebSocketMessage({
            type: 'upload_file_chunk',
            filename: file.name,
            path: currentPath,
            data: base64,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            chunkSize: chunk.size,
            totalSize: file.size
          });

          // Update progress
          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));

          resolve(null);
        };
        
        reader.onerror = () => reject(new Error('Failed to read chunk'));
        reader.readAsArrayBuffer(chunk);
      });

      // Small delay between chunks to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleDownload = (file: FileItem) => {
    sendWebSocketMessage({
      type: 'download_file',
      path: file.path
    });
  };

  const handleDelete = (item: FileItem) => {
    const itemType = item.type === 'directory' ? 'folder' : 'file';
    if (confirm(`Are you sure you want to delete the ${itemType} "${item.name}"?`)) {
      sendWebSocketMessage({
        type: 'delete_file',
        path: item.path,
        isDirectory: item.type === 'directory'
      });
    }
  };

  const handleRename = () => {
    if (!renameTarget || !newName.trim()) return;
    
    sendWebSocketMessage({
      type: 'rename_file',
      oldPath: renameTarget.path,
      newName: newName.trim()
    });
    
    setShowRenameDialog(false);
    setRenameTarget(null);
    setNewName('');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    sendWebSocketMessage({
      type: 'create_folder',
      path: currentPath,
      name: newFolderName.trim()
    });
    
    setShowCreateFolderDialog(false);
    setNewFolderName('');
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'json':
        return <FileText className="h-4 w-4" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-4 w-4" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="h-4 w-4" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="h-4 w-4" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (wsStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (wsStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                File Manager
                {getStatusIcon()}
                <span className="text-sm font-normal text-muted-foreground">
                  {getStatusText()}
                </span>
              </CardTitle>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">
                  Current Path: /{currentPath}
                </span>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              {/* Directory Upload Progress Bar */}
              {directoryUploadProgress && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Uploading {directoryUploadProgress.dirName}
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {directoryUploadProgress.uploaded} / {directoryUploadProgress.total} files
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.round((directoryUploadProgress.uploaded / directoryUploadProgress.total) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {Math.round((directoryUploadProgress.uploaded / directoryUploadProgress.total) * 100)}% complete
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  requestFileList(currentPath);
                  setLastRefresh(new Date());
                }}
                disabled={wsStatus !== 'connected' || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={wsStatus !== 'connected'}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => singleFileInputRef.current?.click()}
                disabled={wsStatus !== 'connected'}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Upload Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolderDialog(true)}
                disabled={wsStatus !== 'connected'}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: "" } as any)}
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={singleFileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Navigation */}
          {currentPath && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={navigateUp}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading...
            </div>
          )}

          {/* File list */}
          {!isLoading && (
            <div className="space-y-2">
              {/* Directories */}
              {directories.map((dir) => (
                <div
                  key={dir.path}
                  className="flex items-center justify-between p-3 border-2 border-blue-200 bg-blue-50/30 rounded-lg hover:bg-blue-100/50 cursor-pointer transition-colors"
                  onClick={() => navigateToFolder(dir.path)}
                >
                  <div className="flex items-center space-x-3">
                    <Folder className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{dir.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                          Folder
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Modified: {formatDate(dir.modified)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(dir);
                          setNewName(dir.name);
                          setShowRenameDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dir);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50/30 rounded-lg hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          File
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Modified: {formatDate(file.modified)}
                        </span>
                      </div>
                      {uploadProgress[file.name] && (
                        <div className="mt-1">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameTarget(file);
                          setNewName(file.name);
                          setShowRenameDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(file)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {!isLoading && files.length === 0 && directories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No files or folders found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs for lightning-fast uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        multiple
      />
      
      <input
        type="file"
        ref={singleFileInputRef}
        onChange={handleDirectoryUpload}
        style={{ display: 'none' }}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
      />
    </div>
  );
}