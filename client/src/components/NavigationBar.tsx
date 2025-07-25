import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  Edit,
  Eye,
  Settings as SettingsIcon,
  User,
  Key,
  LogOut,
  ChevronDown,
  Shield,
  Folder as FolderIcon,
  CloudUpload,
  FolderOpen as ProjectIcon,
  CheckSquare,
  Clock,
  Users,
  FileText,
  Building,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export function NavigationBar() {
  const { user } = useAuth();
  // Remove hardcoded connection status

  // Fetch SFTP status
  const { data: sftpStatus } = useQuery({
    queryKey: ['/api/sftp/status'],
    refetchInterval: 30000,
  });

  const getConnectionIndicatorClass = () => {
    if (!sftpStatus) {
      return 'bg-yellow-500 animate-pulse'; // Loading
    }
    return sftpStatus.connected ? 'bg-green-500' : 'bg-red-500';
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const openProfile = () => {
    console.log('Open profile');
  };

  const openSettings = () => {
    console.log('Open settings');
  };

  const openPermissions = () => {
    console.log('Open permissions');
  };

  return (
    <nav className="bg-surface border-b border-neutral-300 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Main Navigation Menu */}
        <div className="flex items-center space-x-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-100"
              >
                <FolderIcon size={16} />
                <span className="text-sm font-medium">Files</span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FolderIcon size={16} className="mr-2" />
                File Manager
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CloudUpload size={16} className="mr-2" />
                Upload Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-100"
              >
                <ProjectIcon size={16} />
                <span className="text-sm font-medium">Projects</span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <ProjectIcon size={16} className="mr-2" />
                All Projects
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckSquare size={16} className="mr-2" />
                My Tasks
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Clock size={16} className="mr-2" />
                Time Tracking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-100"
              >
                <Users size={16} />
                <span className="text-sm font-medium">Clients</span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Users size={16} className="mr-2" />
                Client List
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText size={16} className="mr-2" />
                Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-100"
              >
                <Building size={16} />
                <span className="text-sm font-medium">Company</span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Users size={16} className="mr-2" />
                Employees
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Wrench size={16} className="mr-2" />
                Equipment
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DollarSign size={16} className="mr-2" />
                Accounting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Connection Status & User Profile */}
        <div className="flex items-center space-x-4">
          {/* SFTP Connection Status */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-neutral-100 rounded-full">
            <span
              className={`w-2 h-2 rounded-full ${getConnectionIndicatorClass()}`}
            />
            <span className="text-xs font-medium text-neutral-700">
              {sftpStatus?.server || '165.23.126.88:21'}
            </span>
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2 hover:bg-neutral-100"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user?.profileImageUrl || ''} />
                  <AvatarFallback className="text-xs">
                    {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-neutral-900">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                </span>
                <ChevronDown size={12} className="text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64" align="end">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.profileImageUrl || ''} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                    </div>
                    <div className="text-sm text-neutral-500">{user?.email}</div>
                    <Badge variant="secondary" className="text-xs text-success mt-1">
                      <Shield size={10} className="mr-1" />
                      {user?.role === 'admin' ? 'Administrator' : 'User'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <DropdownMenuItem onClick={openProfile}>
                  <User size={16} className="mr-3" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openSettings}>
                  <SettingsIcon size={16} className="mr-3" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openPermissions}>
                  <Key size={16} className="mr-3" />
                  Permissions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-error">
                  <LogOut size={16} className="mr-3" />
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
