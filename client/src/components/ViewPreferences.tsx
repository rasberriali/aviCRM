import React, { useState, useEffect } from 'react';
import { Settings, Grid, List, Calendar, BarChart3, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ViewPreferences {
  // Layout preferences
  viewMode: 'grid' | 'list' | 'kanban' | 'timeline';
  density: 'compact' | 'comfortable' | 'spacious';
  sidebarCollapsed: boolean;
  
  // Display preferences
  showCompletedTasks: boolean;
  showEstimatedTime: boolean;
  showAssignees: boolean;
  showPriority: boolean;
  showDueDates: boolean;
  showProgress: boolean;
  
  // Sorting and grouping
  sortBy: 'name' | 'created' | 'updated' | 'priority' | 'dueDate';
  sortOrder: 'asc' | 'desc';
  groupBy: 'none' | 'status' | 'priority' | 'assignee' | 'project';
  
  // Filter preferences
  defaultFilter: 'all' | 'active' | 'assigned' | 'recent';
  
  // Performance preferences
  itemsPerPage: number;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  
  // Theme preferences
  theme: 'light' | 'dark' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

interface ViewPreferencesProps {
  onPreferencesChange?: (preferences: ViewPreferences) => void;
}

const DEFAULT_PREFERENCES: ViewPreferences = {
  viewMode: 'grid',
  density: 'comfortable',
  sidebarCollapsed: false,
  showCompletedTasks: false,
  showEstimatedTime: true,
  showAssignees: true,
  showPriority: true,
  showDueDates: true,
  showProgress: true,
  sortBy: 'updated',
  sortOrder: 'desc',
  groupBy: 'none',
  defaultFilter: 'active',
  itemsPerPage: 20,
  autoRefresh: true,
  refreshInterval: 60,
  theme: 'light',
  accentColor: '#3b82f6',
  fontSize: 'medium'
};

export function ViewPreferences({ onPreferencesChange }: ViewPreferencesProps) {
  const [preferences, setPreferences] = useState<ViewPreferences>(DEFAULT_PREFERENCES);
  const [isOpen, setIsOpen] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('viewPreferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Error parsing view preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('viewPreferences', JSON.stringify(preferences));
    onPreferencesChange?.(preferences);
  }, [preferences, onPreferencesChange]);

  const updatePreference = <K extends keyof ViewPreferences>(
    key: K,
    value: ViewPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const getViewModeIcon = (mode: string) => {
    switch (mode) {
      case 'grid': return <Grid className="h-4 w-4" />;
      case 'list': return <List className="h-4 w-4" />;
      case 'kanban': return <BarChart3 className="h-4 w-4" />;
      case 'timeline': return <Calendar className="h-4 w-4" />;
      default: return <Grid className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          View Options
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">View Preferences</h3>
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              Reset
            </Button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {/* Layout Section */}
          <div className="p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Layout</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="view-mode" className="text-sm">View Mode</Label>
                  <Select 
                    value={preferences.viewMode} 
                    onValueChange={(value: any) => updatePreference('viewMode', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <Grid className="h-4 w-4" />
                          Grid View
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          List View
                        </div>
                      </SelectItem>
                      <SelectItem value="kanban">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Kanban Board
                        </div>
                      </SelectItem>
                      <SelectItem value="timeline">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Timeline View
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="density" className="text-sm">Density</Label>
                  <Select 
                    value={preferences.density} 
                    onValueChange={(value: any) => updatePreference('density', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Display Options */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Display Options</Label>
              <div className="space-y-3">
                {[
                  { key: 'showCompletedTasks', label: 'Show Completed Tasks' },
                  { key: 'showEstimatedTime', label: 'Show Estimated Time' },
                  { key: 'showAssignees', label: 'Show Assignees' },
                  { key: 'showPriority', label: 'Show Priority' },
                  { key: 'showDueDates', label: 'Show Due Dates' },
                  { key: 'showProgress', label: 'Show Progress' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm">{label}</Label>
                    <Switch
                      id={key}
                      checked={preferences[key as keyof ViewPreferences] as boolean}
                      onCheckedChange={(checked) => updatePreference(key as keyof ViewPreferences, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sorting and Grouping */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Sorting & Grouping</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sort-by" className="text-sm">Sort By</Label>
                  <Select 
                    value={preferences.sortBy} 
                    onValueChange={(value: any) => updatePreference('sortBy', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="created">Created Date</SelectItem>
                      <SelectItem value="updated">Last Updated</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sort-order" className="text-sm">Sort Order</Label>
                  <Select 
                    value={preferences.sortOrder} 
                    onValueChange={(value: any) => updatePreference('sortOrder', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="group-by" className="text-sm">Group By</Label>
                  <Select 
                    value={preferences.groupBy} 
                    onValueChange={(value: any) => updatePreference('groupBy', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="assignee">Assignee</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Performance */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Performance</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Items Per Page: {preferences.itemsPerPage}</Label>
                  <Slider
                    value={[preferences.itemsPerPage]}
                    onValueChange={([value]) => updatePreference('itemsPerPage', value)}
                    min={10}
                    max={100}
                    step={10}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
                  <Switch
                    id="auto-refresh"
                    checked={preferences.autoRefresh}
                    onCheckedChange={(checked) => updatePreference('autoRefresh', checked)}
                  />
                </div>

                {preferences.autoRefresh && (
                  <div>
                    <Label className="text-sm">Refresh Interval: {preferences.refreshInterval}s</Label>
                    <Slider
                      value={[preferences.refreshInterval]}
                      onValueChange={([value]) => updatePreference('refreshInterval', value)}
                      min={10}
                      max={300}
                      step={10}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Theme */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Appearance</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="theme" className="text-sm">Theme</Label>
                  <Select 
                    value={preferences.theme} 
                    onValueChange={(value: any) => updatePreference('theme', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="font-size" className="text-sm">Font Size</Label>
                  <Select 
                    value={preferences.fontSize} 
                    onValueChange={(value: any) => updatePreference('fontSize', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="accent-color" className="text-sm">Accent Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={preferences.accentColor}
                      onChange={(e) => updatePreference('accentColor', e.target.value)}
                      className="w-8 h-8 border rounded"
                    />
                    <span className="text-xs font-mono">{preferences.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Preferences saved automatically</span>
            <Badge variant="secondary" className="text-xs">
              {getViewModeIcon(preferences.viewMode)}
              <span className="ml-1">{preferences.viewMode}</span>
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for accessing view preferences
export function useViewPreferences() {
  const [preferences, setPreferences] = useState<ViewPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = localStorage.getItem('viewPreferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Error parsing view preferences:', error);
      }
    }
  }, []);

  const updatePreference = <K extends keyof ViewPreferences>(
    key: K,
    value: ViewPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    localStorage.setItem('viewPreferences', JSON.stringify(newPreferences));
  };

  return {
    preferences,
    updatePreference,
    resetToDefaults: () => {
      setPreferences(DEFAULT_PREFERENCES);
      localStorage.setItem('viewPreferences', JSON.stringify(DEFAULT_PREFERENCES));
    }
  };
}