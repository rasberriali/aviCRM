import React, { useState, useRef } from 'react';
import { Upload, X, FileIcon, CheckCircle, AlertCircle, Pause, Play, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  error?: string;
  speed?: number;
  timeRemaining?: number;
  xhr?: XMLHttpRequest;
}

interface FileUploadProgressProps {
  projectId?: string;
  workspaceId?: string;
  onUploadComplete?: (files: any[]) => void;
}

export function FileUploadProgress({ projectId, workspaceId, onUploadComplete }: FileUploadProgressProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const generateFileId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const addFiles = (files: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(files).map(file => ({
      id: generateFileId(),
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading immediately
    newFiles.forEach(uploadFile => {
      startUpload(uploadFile);
    });
  };

  const startUpload = (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    
    if (projectId) {
      formData.append('projectId', projectId);
    }
    if (workspaceId) {
      formData.append('workspaceId', workspaceId);
    }

    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        const currentTime = Date.now();
        const timeElapsed = (currentTime - startTime) / 1000;
        const bytesPerSecond = (event.loaded - lastLoaded) / timeElapsed;
        const timeRemaining = (event.total - event.loaded) / bytesPerSecond;

        setUploadFiles(prev => prev.map(file => 
          file.id === uploadFile.id 
            ? { 
                ...file, 
                progress,
                status: 'uploading' as const,
                speed: bytesPerSecond,
                timeRemaining
              }
            : file
        ));

        lastLoaded = event.loaded;
        startTime = currentTime;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        setUploadFiles(prev => prev.map(file => 
          file.id === uploadFile.id 
            ? { ...file, progress: 100, status: 'completed' as const }
            : file
        ));
        toast({
          title: "Upload completed",
          description: `${uploadFile.file.name} uploaded successfully`
        });
      } else {
        setUploadFiles(prev => prev.map(file => 
          file.id === uploadFile.id 
            ? { 
                ...file, 
                status: 'error' as const, 
                error: `Upload failed: ${xhr.statusText}` 
              }
            : file
        ));
      }
    });

    xhr.addEventListener('error', () => {
      setUploadFiles(prev => prev.map(file => 
        file.id === uploadFile.id 
          ? { 
              ...file, 
              status: 'error' as const, 
              error: 'Network error occurred' 
            }
          : file
      ));
    });

    xhr.addEventListener('abort', () => {
      setUploadFiles(prev => prev.map(file => 
        file.id === uploadFile.id 
          ? { ...file, status: 'paused' as const }
          : file
      ));
    });

    // Update file with xhr reference
    setUploadFiles(prev => prev.map(file => 
      file.id === uploadFile.id 
        ? { ...file, xhr, status: 'uploading' as const }
        : file
    ));

    const endpoint = projectId ? '/api/upload/project' : '/api/upload/workspace';
    xhr.open('POST', endpoint);
    xhr.send(formData);
  };

  const pauseUpload = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file?.xhr) {
      file.xhr.abort();
    }
  };

  const resumeUpload = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file && file.status === 'paused') {
      startUpload(file);
    }
  };

  const retryUpload = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file) {
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, progress: 0, status: 'pending', error: undefined }
          : f
      ));
      startUpload(file);
    }
  };

  const removeFile = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file?.xhr) {
      file.xhr.abort();
    }
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    // Reset input value to allow selecting same file again
    event.target.value = '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'uploading':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalProgress = uploadFiles.length > 0 
    ? uploadFiles.reduce((sum, file) => sum + file.progress, 0) / uploadFiles.length 
    : 0;

  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload Progress
        </CardTitle>
        <CardDescription>
          {uploadFiles.length > 0 ? (
            <div className="space-y-2">
              <div>
                {completedCount}/{uploadFiles.length} files completed
                {errorCount > 0 && `, ${errorCount} errors`}
              </div>
              <Progress value={totalProgress} className="w-full" />
            </div>
          ) : (
            "Drag and drop files or click to upload"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Drop files here</p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse your computer
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              Choose Files
            </Button>
          </div>

          {/* Upload List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Upload Queue</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                  disabled={completedCount === 0}
                >
                  Clear Completed
                </Button>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {uploadFiles.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(file.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{file.file.name}</span>
                            <Badge className={`text-xs ${getStatusColor(file.status)}`}>
                              {file.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatFileSize(file.file.size)}
                            {file.speed && file.status === 'uploading' && (
                              <span> • {formatSpeed(file.speed)}</span>
                            )}
                            {file.timeRemaining && file.status === 'uploading' && (
                              <span> • {formatTimeRemaining(file.timeRemaining)} remaining</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {file.status === 'uploading' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => pauseUpload(file.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {file.status === 'paused' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resumeUpload(file.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {file.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryUpload(file.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {file.status !== 'pending' && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="w-full" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{Math.round(file.progress)}%</span>
                            {file.error && (
                              <span className="text-red-500">{file.error}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}