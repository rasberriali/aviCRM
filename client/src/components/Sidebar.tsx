import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Home,
  Edit3,
  BarChart3,
  FolderOpen,
  Users,
  FileText,
  Clock,
  DollarSign,
  Building,
  Wrench,
  CheckSquare,
  Calendar,
  Settings,
  TrendingUp,
  Folder,
  Terminal,
  Grid3X3,
  Shield,
  UserCog,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHttpAuth } from '@/hooks/useHttpAuth';

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useHttpAuth();

  // Check if user has admin permissions
  const hasAdminAccess = user?.permissions?.admin === true;

  // CRM navigation items
  const navigationItems = [
    {
      section: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: BarChart3, active: location === '/dashboard' },
      ]
    },
    {
      section: 'Projects & Tasks',
      items: [
        { name: 'Projects & Workspaces', path: '/projects', icon: FolderOpen, active: location === '/projects' },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare, active: location === '/tasks' },
        { name: 'Time Tracking', path: '/timetracking', icon: Clock, active: location === '/timetracking' },
        { name: 'Calendar', path: '/calendar', icon: Calendar, active: location === '/calendar' },
      ]
    },
    {
      section: 'Sales & Clients',
      items: [
        { name: 'Clients', path: '/clients', icon: Users, active: location === '/clients' },
        { name: 'Sales', path: '/sales', icon: TrendingUp, active: location === '/sales' },
        { name: 'Invoices', path: '/invoices', icon: FileText, active: location === '/invoices' },
        { name: 'Accounting', path: '/accounting', icon: DollarSign, active: location === '/accounting' },
      ]
    },
    {
      section: 'Company',
      items: [
        { name: 'Employees', path: '/employees', icon: Building, active: location === '/employees' },
        { name: 'Departments', path: '/departments', icon: Building, active: location === '/departments' },
        { name: 'Parts Inventory', path: '/parts', icon: Wrench, active: location === '/parts' },
        { name: 'Settings', path: '/settings', icon: Settings, active: location === '/settings' },
      ]
    },
    ...(hasAdminAccess ? [{
      section: 'Administration',
      items: [
        { name: 'Task Management', path: '/administration', icon: Shield, active: location === '/administration' },
        { name: 'User Management', path: '/user-management', icon: UserCog, active: location === '/user-management' },
      ]
    }] : []),
    {
      section: 'Resources',
      items: [
        { name: 'File Manager', path: '/files', icon: Folder, active: location === '/files' },
        { name: 'Suppliers', path: '/suppliers', icon: Grid3X3, active: location === '/suppliers' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/60 h-full flex flex-col shadow-lg">
      <div className="p-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Building className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              AVI CRM
            </h2>
            <p className="text-xs text-slate-500 font-medium">Audio Video Integrations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">
              {section.section}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-4 h-11 px-3 rounded-xl transition-all duration-200 ${
                        item.active 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20 transform scale-[1.02]' 
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                      }`}
                    >
                      <div className={`p-1 rounded-lg ${
                        item.active 
                          ? 'bg-white/20' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <IconComponent size={14} />
                      </div>
                      <span className="font-medium text-sm">{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info section */}
      <div className="p-4 border-t border-neutral-300">
        <div className="text-xs text-neutral-500">
          System Status: Online
        </div>
      </div>
    </aside>
  );
}