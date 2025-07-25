import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Trash2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source?: string;
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'log'>('all');
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const originalConsole = useRef<any>({});

  // Scroll to bottom when new logs are added
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Override console methods to capture logs
  useEffect(() => {
    // Store original console methods
    originalConsole.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    const addLog = (level: LogEntry['level'], ...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      const newLog: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        source: 'console'
      };

      setLogs(prevLogs => [...prevLogs, newLog]);
      
      // Call original console method
      originalConsole.current[level](...args);
    };

    // Override console methods
    console.log = (...args) => addLog('log', ...args);
    console.error = (...args) => addLog('error', ...args);
    console.warn = (...args) => addLog('warn', ...args);
    console.info = (...args) => addLog('info', ...args);
    console.debug = (...args) => addLog('debug', ...args);

    // Cleanup function to restore original console
    return () => {
      console.log = originalConsole.current.log;
      console.error = originalConsole.current.error;
      console.warn = originalConsole.current.warn;
      console.info = originalConsole.current.info;
      console.debug = originalConsole.current.debug;
    };
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Shift + T + Y
      if (event.shiftKey && event.key.toLowerCase() === 't') {
        const handleSecondKey = (e: KeyboardEvent) => {
          if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            setIsOpen(true);
            document.removeEventListener('keydown', handleSecondKey);
          }
        };

        // Add temporary listener for Y key
        setTimeout(() => {
          document.addEventListener('keydown', handleSecondKey);
          // Remove listener after 1 second if Y is not pressed
          setTimeout(() => {
            document.removeEventListener('keydown', handleSecondKey);
          }, 1000);
        }, 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  const copyLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      toast({
        title: "Copied",
        description: "Console logs copied to clipboard",
      });
    });
  };

  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warn': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'debug': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Debug Console
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Shift+T+Y to open
              </Badge>
              <Badge variant="outline" className="text-xs">
                {filteredLogs.length} logs
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="all">All Logs</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
              <option value="log">Logs</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={copyLogs}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden border rounded-lg bg-black text-green-400 font-mono text-sm">
          <div className="h-full overflow-y-auto p-4 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No console logs yet. Open your browser's developer tools to see more detailed logs.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 hover:bg-gray-900 px-2 py-1 rounded">
                  <span className="text-gray-400 text-xs shrink-0 w-20">
                    {log.timestamp}
                  </span>
                  <Badge 
                    className={`${getLevelColor(log.level)} text-white text-xs shrink-0 w-16 justify-center`}
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="flex-1 break-all whitespace-pre-wrap">
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          This console captures JavaScript logs from the application. For server logs, check the workflow console.
        </div>
      </DialogContent>
    </Dialog>
  );
}