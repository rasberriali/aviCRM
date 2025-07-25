import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DebugConsole } from "@/components/DebugConsole";
import { SoundWaveLoader } from "@/components/SoundWaveLoader";
import { useHttpAuth } from "@/hooks/useHttpAuth";
import { CrmLayout } from "@/components/CrmLayout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import CustomLogin from "@/pages/custom-login";
import HttpLogin from "@/pages/http-login";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import TasksPages from "@/pages/tasks";

import Parts from "@/pages/parts";
import TimeTracking from "@/pages/timetracking";
import CalendarPage from "@/pages/calendar";
import Settings from "@/pages/settings";
import Accounting from "@/pages/accounting";
import Employees from "@/pages/employees";
import Departments from "@/pages/departments";
import Sales from "@/pages/sales";
import Invoices from "@/pages/invoices";
import { useState, useEffect } from "react";

import Clients from "@/pages/clients";

import HttpFilesPage from "@/pages/http-files";
import Suppliers from "@/pages/suppliers";
import TasksPage from "@/pages/tasks-working";
import AdministrationPage from "@/pages/administration-page-simple";
import UserManagementPage from "@/pages/user-management-page";
import { MobileInstallPrompt } from "@/components/MobileInstallPrompt";
import { MobileAppModern } from "@/components/MobileAppModern";
import { MobileLogin } from "@/components/MobileLogin";
import { NotificationSocket } from "@/components/NotificationSocket";
import "./styles/mobile.css";

// Placeholder component for coming soon pages
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h2>
        <p className="text-neutral-600">This feature is under development</p>
      </div>
    </div>
  );
}

function Router() {
  const httpAuth = useHttpAuth();

  // Use only HTTP authentication
  const isAuthenticated = httpAuth.isAuthenticated;
  const isLoading = httpAuth.isLoading;
  
  // Check if device is mobile (also check for touch capability and screen size)
  // Add URLSearchParams check for testing mobile mode
  const urlParams = new URLSearchParams(window.location.search);
  const forceMobile = urlParams.get('mobile') === 'true';
  const isMobile = forceMobile || 
                  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                  ('ontouchstart' in window && window.innerWidth <= 768) ||
                  (window.navigator.maxTouchPoints > 0 && window.innerWidth <= 768);
  
  console.log('Router state:', { isAuthenticated, isLoading, user: httpAuth.user, isMobile });

  // Mobile App Logic
  if (isMobile) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <SoundWaveLoader size="lg" color="#9521c0" text="Loading mobile app..." />
        </div>
      );
    }
    
    return isAuthenticated ? (
      <>
        <NotificationSocket />
        <MobileAppModern />
      </>
    ) : <MobileLogin />;
  }

  // Desktop App Logic - Show debug info at the top
  console.log('Rendering desktop app - Auth state:', { isAuthenticated, isLoading, user: httpAuth.user });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center space-y-4">
          <SoundWaveLoader size="lg" color="#9521c0" text="Loading authentication..." />
          <p className="text-xs text-neutral-400 mt-2">Debug: isLoading={String(isLoading)}, isAuthenticated={String(isAuthenticated)}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, showing login');
    return (
      <div className="min-h-screen bg-red-50">
        <Switch>
          <Route path="/custom-login" component={CustomLogin} />
          <Route path="/http-login" component={HttpLogin} />
          <Route path="/" component={HttpLogin} />
          <Route component={HttpLogin} />
        </Switch>
      </div>
    );
  }

  // Authenticated desktop view
  console.log('User authenticated, showing CRM layout');
  return (
    <div className="min-h-screen bg-green-50">
      <NotificationSocket />
      <CrmLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/parts" component={Parts} />
          <Route path="/timetracking" component={TimeTracking} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/clients" component={Clients} />
          <Route path="/sales" component={Sales} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/tasks" component={TasksPages} />
          <Route path="/administration" component={AdministrationPage} />
          <Route path="/user-management" component={UserManagementPage} />
          <Route path="/products" component={() => <ComingSoon title="Products" />} />
          <Route path="/accounting" component={Accounting} />
          <Route path="/employees" component={Employees} />
          <Route path="/departments" component={Departments} />
          <Route path="/equipment" component={() => <ComingSoon title="Equipment Management" />} />
          <Route path="/files" component={HttpFilesPage} />
          <Route path="/suppliers" component={Suppliers} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </CrmLayout>
    </div>
  );
}

function App() {
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.add(event.code);
      
      // Check for Shift+C+8 combination (all three keys pressed)
      if (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')) {
        if (pressedKeys.has('KeyC') && pressedKeys.has('Digit8')) {
          event.preventDefault();
          setShowDebugConsole(prev => !prev);
          pressedKeys.clear(); // Clear to prevent multiple toggles
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showDebugConsole && <DebugConsole />}
        <Router />
        <MobileInstallPrompt />
        {/* Debug mobile mode button */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 z-50">
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                if (url.searchParams.get('mobile') === 'true') {
                  url.searchParams.delete('mobile');
                } else {
                  url.searchParams.set('mobile', 'true');
                }
                window.location.href = url.toString();
              }}
              className="bg-blue-500 text-white px-3 py-2 rounded text-xs"
            >
              Toggle Mobile
            </button>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
