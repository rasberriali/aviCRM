import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { LogOut, User, Search, Bell, Clock, Settings } from 'lucide-react';

interface CrmLayoutProps {
  children: React.ReactNode;
}

export function CrmLayout({ children }: CrmLayoutProps) {
  const { user, logout } = useHttpAuth();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
      <TitleBar />
      
      {/* Modern Header with glassmorphism effect */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6 flex-1">
          {/* Enhanced User Info */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {user?.department} • {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          
          {/* Enhanced Global Search */}
          <div className="flex-1 max-w-lg relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search workspaces, projects, tasks..."
              className="pl-12 pr-4 py-3 w-full bg-white/60 border-slate-200/60 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all duration-200 rounded-xl shadow-sm"
            />
          </div>
        </div>
        
        {/* Enhanced Right side tools */}
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            title="Recent Items"
            className="h-9 w-9 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
          >
            <Clock className="h-4 w-4 text-slate-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="View Preferences"
            className="h-9 w-9 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
          >
            <Settings className="h-4 w-4 text-slate-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Notifications"
            className="h-9 w-9 rounded-xl hover:bg-slate-100/80 transition-all duration-200 relative"
          >
            <Bell className="h-4 w-4 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          <Button 
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 h-9 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-white relative">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}