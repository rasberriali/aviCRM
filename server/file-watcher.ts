import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { WebSocket } from 'ws';

export interface FileWatcherNotification {
  type: 'task_update' | 'file_change' | 'connection_established' | 'unread_notifications';
  employeeId: string;
  message: string;
  data?: any;
  timestamp: string;
}

export class FileSystemWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private wsConnections: WebSocket[] = [];
  private watchedDirectory = './employee_profiles';

  constructor() {
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.watchedDirectory)) {
      fs.mkdirSync(this.watchedDirectory, { recursive: true });
      console.log(`[FILE WATCHER] Created directory: ${this.watchedDirectory}`);
    }
  }

  public addWebSocketConnection(ws: WebSocket) {
    this.wsConnections.push(ws);
    console.log(`[FILE WATCHER] Added WebSocket connection. Total connections: ${this.wsConnections.length}`);
  }

  public removeWebSocketConnection(ws: WebSocket) {
    const index = this.wsConnections.indexOf(ws);
    if (index > -1) {
      this.wsConnections.splice(index, 1);
      console.log(`[FILE WATCHER] Removed WebSocket connection. Total connections: ${this.wsConnections.length}`);
    }
  }

  public startWatching() {
    if (this.watcher) {
      console.log('[FILE WATCHER] Already watching');
      return;
    }

    console.log(`[FILE WATCHER] Starting to watch: ${this.watchedDirectory}`);
    
    this.watcher = chokidar.watch(`${this.watchedDirectory}/**/taskdashboard.json`, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      usePolling: true, // Use polling for better reliability
      interval: 1000 // Check every second
    });

    this.watcher
      .on('add', (filePath) => {
        console.log(`[FILE WATCHER] File added: ${filePath}`);
        this.handleFileChange(filePath, 'added');
      })
      .on('change', (filePath) => {
        console.log(`[FILE WATCHER] File changed: ${filePath}`);
        this.handleFileChange(filePath, 'changed');
      })
      .on('unlink', (filePath) => {
        console.log(`[FILE WATCHER] File removed: ${filePath}`);
        this.handleFileChange(filePath, 'removed');
      })
      .on('error', (error) => {
        console.error('[FILE WATCHER] Error:', error);
      })
      .on('ready', () => {
        console.log('[FILE WATCHER] Initial scan complete. Ready for changes');
      });
  }

  private handleFileChange(filePath: string, changeType: 'added' | 'changed' | 'removed') {
    try {
      // Extract employee ID from file path
      const employeeId = this.extractEmployeeIdFromPath(filePath);
      
      if (!employeeId) {
        console.warn(`[FILE WATCHER] Could not extract employee ID from path: ${filePath}`);
        return;
      }

      console.log(`[FILE WATCHER] Processing ${changeType} for employee ${employeeId}`);

      // Read the taskdashboard.json file if it exists
      if (changeType !== 'removed' && fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const tasks = JSON.parse(fileContent);
        
        // Find new or updated tasks
        const newTasks = tasks.filter((task: any) => task.status === 'assigned');
        
        if (newTasks.length > 0) {
          const notification: FileWatcherNotification = {
            type: 'task_update',
            employeeId,
            message: `New tasks assigned to employee ${employeeId}`,
            data: {
              tasks: newTasks,
              changeType,
              filePath
            },
            timestamp: new Date().toISOString()
          };

          this.broadcastNotification(notification);
        }
      }

    } catch (error) {
      console.error(`[FILE WATCHER] Error processing file change: ${error}`);
    }
  }

  private extractEmployeeIdFromPath(filePath: string): string | null {
    // Extract employee ID from path like './employee_profiles/3/taskdashboard.json'
    const match = filePath.match(/employee_profiles[\/\\](\d+)[\/\\]taskdashboard\.json/);
    return match ? match[1] : null;
  }

  private broadcastNotification(notification: FileWatcherNotification) {
    console.log(`[FILE WATCHER] Broadcasting notification to ${this.wsConnections.length} connections`);
    
    const message = JSON.stringify(notification);
    
    // Send to all active WebSocket connections
    this.wsConnections.forEach((ws, index) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
          console.log(`[FILE WATCHER] Sent notification to connection ${index + 1}`);
        } catch (error) {
          console.error(`[FILE WATCHER] Error sending to connection ${index + 1}:`, error);
        }
      } else {
        console.log(`[FILE WATCHER] Connection ${index + 1} is not open, state: ${ws.readyState}`);
      }
    });

    // Clean up closed connections
    this.wsConnections = this.wsConnections.filter(ws => ws.readyState === WebSocket.OPEN);
  }

  public stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[FILE WATCHER] Stopped watching');
    }
  }

  public getWatchedDirectory(): string {
    return this.watchedDirectory;
  }

  public isWatching(): boolean {
    return this.watcher !== null;
  }
}