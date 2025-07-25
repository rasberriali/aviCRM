import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const HTTP_SERVER_URL = 'http://165.23.126.88:8888';
const AUTH_HEADER = 'Basic ' + btoa('aviuser:aviserver');

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  department: string;
  permissions: {
    accounting: boolean;
    projects: boolean;
    timeTracking: boolean;
    reports: boolean;
    admin: boolean;
    fileManagement: boolean;
  };
}

export function useHttpAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();

  // Check for stored user on mount
  useEffect(() => {
    console.log('Checking stored user...');
    const storedUser = localStorage.getItem('http_auth_user');
    console.log('Stored user:', storedUser);
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        console.log('Parsed user:', user);
        setUser(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('http_auth_user');
      }
    }
    
    console.log('Setting loading to false');
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoggingIn(true);
    console.log('Starting login for:', username);
    
    try {
      const requestBody = { username, password };
      console.log('Sending request:', requestBody);
      
      const response = await fetch('/api/auth/custom-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier: username, password })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Auth response data:', data);

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('http_auth_user', JSON.stringify(data.user));
        toast({
          title: 'Success',
          description: `Welcome back, ${data.user.firstName}!`
        });
        setIsLoggingIn(false);
        return true;
      } else {
        console.error('Login failed:', data);
        toast({
          title: 'Login Failed',
          description: data.message || 'Invalid credentials',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Could not connect to authentication server',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('Refreshing user data...');
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log('Refreshed user data:', data.user);
          setUser(data.user);
          localStorage.setItem('http_auth_user', JSON.stringify(data.user));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('http_auth_user');
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully'
    });
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const authState = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingIn,
    login,
    logout,
    refreshUser
  };
  
  console.log('Auth hook state:', authState);
  return authState;
}