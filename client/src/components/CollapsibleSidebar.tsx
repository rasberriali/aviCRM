import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  FolderOpen, 
  Users, 
  FileText, 
  Clock, 
  BarChart3,
  Settings,
  Package,
  UserCircle,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocation } from 'wouter';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: SidebarItem[];
}

interface CollapsibleSidebarProps {
  children?: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    path: '/dashboard'
  },
  {
    id: 'projects',
    label: 'Projects & Workspaces',
    icon: <FolderOpen className="h-5 w-5" />,
    path: '/projects'
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: <Users className="h-5 w-5" />,
    path: '/clients'
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: <FileText className="h-5 w-5" />,
    path: '/invoices'
  },
  {
    id: 'time-tracking',
    label: 'Time Tracking',
    icon: <Clock className="h-5 w-5" />,
    path: '/time-tracking'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports'
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    icon: <Package className="h-5 w-5" />,
    path: '/suppliers'
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: <UserCircle className="h-5 w-5" />,
    path: '/employees'
  },
  {
    id: 'company',
    label: 'Company',
    icon: <Building className="h-5 w-5" />,
    path: '/company'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings'
  }
];

export function CollapsibleSidebar({ children }: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location, navigate] = useLocation();

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored) {
      setIsCollapsed(JSON.parse(stored));
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleItemClick = (item: SidebarItem) => {
    navigate(item.path);
  };

  const isActiveItem = (item: SidebarItem) => {
    if (item.path === '/') {
      return location === '/';
    }
    return location.startsWith(item.path);
  };

  const SidebarItemComponent = ({ item }: { item: SidebarItem }) => {
    const isActive = isActiveItem(item);
    
    const itemContent = (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start gap-3 h-12 ${
          isCollapsed ? 'px-3' : 'px-4'
        } ${isActive ? 'bg-blue-100 text-blue-900 font-medium' : ''}`}
        onClick={() => handleItemClick(item)}
      >
        <div className="flex items-center gap-3 flex-1">
          {item.icon}
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </div>
      </Button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.label}</p>
              {item.badge && (
                <Badge variant="secondary" className="ml-2">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return itemContent;
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div 
        className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        } flex flex-col`}
      >
        {/* Header */}
        <div className={`p-4 border-b border-gray-200 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AVI CRM</h1>
              <p className="text-sm text-gray-500">Audio Video Integrations</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarItemComponent key={item.id} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-gray-200 ${
          isCollapsed ? 'text-center' : ''
        }`}>
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="text-xs text-gray-500">
              <p>Version 1.0.0</p>
              <p>© 2025 AVI Central</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}

// Hook for accessing sidebar state
export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored) {
      setIsCollapsed(JSON.parse(stored));
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return {
    isCollapsed,
    toggleSidebar
  };
}