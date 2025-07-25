import React, { useState, useEffect } from 'react';
import { Clock, FolderOpen, CheckSquare, Users, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecentItem {
  id: string;
  type: 'workspace' | 'project' | 'task' | 'client';
  title: string;
  description?: string;
  workspaceName?: string;
  categoryName?: string;
  projectName?: string;
  path: string;
  lastAccessed: Date;
}

interface RecentItemsProps {
  onNavigate: (path: string) => void;
}

export function RecentItems({ onNavigate }: RecentItemsProps) {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('recentItems');
    if (stored) {
      const items = JSON.parse(stored);
      setRecentItems(items.map((item: any) => ({
        ...item,
        lastAccessed: new Date(item.lastAccessed)
      })));
    }
  }, []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'workspace': return <FolderOpen className="h-4 w-4 text-blue-500" />;
      case 'project': return <FolderOpen className="h-4 w-4 text-green-500" />;
      case 'task': return <CheckSquare className="h-4 w-4 text-orange-500" />;
      case 'client': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleItemClick = (item: RecentItem) => {
    onNavigate(item.path);
    
    // Update last accessed time
    const updatedItems = recentItems.map(i => 
      i.id === item.id 
        ? { ...i, lastAccessed: new Date() }
        : i
    );
    setRecentItems(updatedItems);
    localStorage.setItem('recentItems', JSON.stringify(updatedItems));
  };

  const clearRecentItems = () => {
    setRecentItems([]);
    localStorage.removeItem('recentItems');
  };

  if (recentItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No recent items</p>
            <p className="text-sm mt-1">Items you view will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Items
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentItems}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
        <CardDescription>
          Quick access to recently viewed items
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {recentItems.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                {getItemIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.title}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {item.type}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{item.description}</p>
                  )}
                  {item.workspaceName && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {item.workspaceName}
                      {item.categoryName && ` > ${item.categoryName}`}
                      {item.projectName && ` > ${item.projectName}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{getRelativeTime(item.lastAccessed)}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper function to add item to recent items
export function addToRecentItems(item: Omit<RecentItem, 'lastAccessed'>) {
  const stored = localStorage.getItem('recentItems');
  const existing = stored ? JSON.parse(stored) : [];
  
  // Remove existing item if it exists
  const filtered = existing.filter((i: RecentItem) => i.id !== item.id);
  
  // Add new item at the beginning
  const updated = [{ ...item, lastAccessed: new Date() }, ...filtered].slice(0, 20);
  
  localStorage.setItem('recentItems', JSON.stringify(updated));
}