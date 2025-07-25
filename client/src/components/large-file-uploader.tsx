import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Pause, Play, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadChunk {
  chunk: Blob;
  index: number;
  total: number;
  fileName: string;
}

interface UploadProgress {
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MAX_CONCURRENT_UPLOADS = 3;

export function LargeFileUploader({ 
  onUploadComplete, 
  projectId, 
  clientName 
}: { 
  onUploadComplete?: () => void;
  projectId?: string;
  clientName?: string;
}) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const selectFiles = () => {
    fileInputRef.current?.click();
  };

  const selectFolder = () => {
    folderInputRef.current?.click();
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    
    // Check for very large files/folders
    if (totalSize > 200 * 1024 * 1024 * 1024) { // 200GB limit
      toast({
        title: "Files too large",
        description: "Total size exceeds 200GB limit. Please split into smaller batches.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFiles(fileArray);
    
    // Initialize progress tracking
    const progressArray: UploadProgress[] = fileArray.map(file => ({
      fileName: file.name,
      loaded: 0,
      total: file.size,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
      status: 'pending'
    }));
    
    setUploadProgress(progressArray);
  };

  const createChunks = (file: File): UploadChunk[] => {
    const chunks: UploadChunk[] = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      chunks.push({
        chunk,
        index: i,
        total: totalChunks,
        fileName: file.name
      });
    }
    
    return chunks;
  };

  const uploadChunk = async (
    chunk: UploadChunk, 
    fileIndex: number,
    signal: AbortSignal
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('chunk', chunk.chunk);
    formData.append('fileName', chunk.fileName);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('totalChunks', chunk.total.toString());
    formData.append('projectId', projectId || '');
    formData.append('clientName', clientName || '');

    const startTime = Date.now();

    try {
      const response = await fetch('/api/files/upload-chunk', {
        method: 'POST',
        body: formData,
        signal
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const endTime = Date.now();
      const uploadTime = (endTime - startTime) / 1000; // seconds
      const speed = chunk.chunk.size / uploadTime; // bytes per second

      // Update progress
      setUploadProgress(prev => {
        const newProgress = [...prev];
        const fileProgress = newProgress[fileIndex];
        
        fileProgress.loaded += chunk.chunk.size;
        fileProgress.percentage = (fileProgress.loaded / fileProgress.total) * 100;
        fileProgress.speed = speed;
        fileProgress.estimatedTimeRemaining = 
          (fileProgress.total - fileProgress.loaded) / speed;
        
        if (fileProgress.loaded >= fileProgress.total) {
          fileProgress.status = 'completed';
        }
        
        return newProgress;
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Upload was paused/cancelled
      }
      
      setUploadProgress(prev => {
        const newProgress = [...prev];
        newProgress[fileIndex].status = 'error';
        return newProgress;
      });
      
      throw error;
    }
  };

  const uploadFile = async (file: File, fileIndex: number): Promise<void> => {
    const chunks = createChunks(file);
    
    setUploadProgress(prev => {
      const newProgress = [...prev];
      newProgress[fileIndex].status = 'uploading';
      return newProgress;
    });

    // Upload chunks in parallel batches
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_UPLOADS) {
      if (isPaused || abortControllerRef.current?.signal.aborted) {
        break;
      }

      const batch = chunks.slice(i, i + MAX_CONCURRENT_UPLOADS);
      const promises = batch.map(chunk => 
        uploadChunk(chunk, fileIndex, abortControllerRef.current!.signal)
      );

      await Promise.all(promises);
    }

    // Finalize upload
    if (!isPaused && !abortControllerRef.current?.signal.aborted) {
      await finalizeUpload(file.name);
    }
  };

  const finalizeUpload = async (fileName: string): Promise<void> => {
    try {
      const response = await fetch('/api/files/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          projectId,
          clientName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to finalize upload');
      }
    } catch (error) {
      console.error('Finalization error:', error);
      throw error;
    }
  };

  const startUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < selectedFiles.length; i++) {
        if (isPaused || abortControllerRef.current.signal.aborted) {
          break;
        }
        
        await uploadFile(selectedFiles[i], i);
      }

      if (!isPaused && !abortControllerRef.current.signal.aborted) {
        toast({
          title: "Upload completed",
          description: `Successfully uploaded ${selectedFiles.length} file(s)`
        });
        
        onUploadComplete?.();
        setSelectedFiles([]);
        setUploadProgress([]);
      }
    } catch (error: any) {
      toast({
        title: "Upload failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const pauseUpload = () => {
    setIsPaused(true);
    abortControllerRef.current?.abort();
  };

  const resumeUpload = () => {
    setIsPaused(false);
    startUpload();
  };

  const cancelUpload = () => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setIsPaused(false);
    setSelectedFiles([]);
    setUploadProgress([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '∞';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const totalProgress = uploadProgress.length > 0 
    ? uploadProgress.reduce((sum, p) => sum + p.percentage, 0) / uploadProgress.length
    : 0;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Large File/Folder Uploader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isUploading && selectedFiles.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={selectFiles} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>
              <Button onClick={selectFolder} variant="outline" className="flex-1">
                <FolderOpen className="w-4 h-4 mr-2" />
                Select Folder
              </Button>
            </div>
            
            <Alert>
              <AlertDescription>
                Supports files up to 200GB total. Large files will be split into chunks for reliable upload with progress tracking.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {selectedFiles.length > 0 && !isUploading && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={startUpload} className="flex-1">
                Start Upload
              </Button>
              <Button onClick={() => setSelectedFiles([])} variant="outline">
                Clear
              </Button>
            </div>
          </div>
        )}

        {uploadProgress.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Upload Progress</h4>
              <div className="flex gap-2">
                {isUploading && !isPaused && (
                  <Button onClick={pauseUpload} size="sm" variant="outline">
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                {isPaused && (
                  <Button onClick={resumeUpload} size="sm" variant="outline">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                <Button onClick={cancelUpload} size="sm" variant="destructive">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{totalProgress.toFixed(1)}%</span>
              </div>
              <Progress value={totalProgress} className="w-full" />
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="truncate font-medium">{progress.fileName}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      progress.status === 'completed' ? 'bg-green-100 text-green-700' :
                      progress.status === 'error' ? 'bg-red-100 text-red-700' :
                      progress.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {progress.status}
                    </span>
                  </div>
                  
                  <Progress value={progress.percentage} className="w-full" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
                    <span>
                      {progress.speed > 0 && (
                        <>
                          {formatFileSize(progress.speed)}/s • ETA: {formatTime(progress.estimatedTimeRemaining)}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelection(e.target.files)}
          className="hidden"
        />
        
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: "", directory: "" } as any)}
          multiple
          onChange={(e) => handleFileSelection(e.target.files)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}