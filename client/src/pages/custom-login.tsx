import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Lock, User } from 'lucide-react';

export default function CustomLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await fetch('/api/auth/custom-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: async (data) => {
      if (data.mustChangePassword) {
        // User needs to change their temporary password
        setCurrentUser(data.user);
        setShowPasswordChange(true);
        toast({
          title: "Password Change Required",
          description: "Please change your temporary password to continue.",
          variant: "destructive"
        });
      } else {
        // Normal login flow
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.username}!`
        });
        
        // Immediately set the user data in the query cache
        queryClient.setQueryData(["/api/auth/custom-user"], data.user);
        
        // Also invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/custom-user"] });
        
        // Small delay to ensure auth state updates before navigation
        setTimeout(() => {
          setLocation('/dashboard');
        }, 100);
      }
    },
    onError: (error: any) => {
      setError(error.message || 'Login failed');
      toast({
        title: "Login Failed",
        description: error.message || 'Invalid credentials',
        variant: "destructive"
      });
    }
  });

  const passwordChangeMutation = useMutation({
    mutationFn: async ({ usernameOrEmail, currentPassword, newPassword }: { 
      usernameOrEmail: string; 
      currentPassword: string; 
      newPassword: string; 
    }) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, currentPassword, newPassword }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password change failed');
      }
      
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Password Changed Successfully",
        description: "Your password has been updated. You can now access the system."
      });
      
      // Set user data in cache and redirect
      queryClient.setQueryData(["/api/auth/custom-user"], currentUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/custom-user"] });
      
      setTimeout(() => {
        setLocation('/dashboard');
      }, 100);
    },
    onError: (error: any) => {
      setError(error.message || 'Password change failed');
      toast({
        title: "Password Change Failed",
        description: error.message || 'Failed to update password',
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    loginMutation.mutate({ username: username.trim(), password });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please enter both new password and confirmation');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    passwordChangeMutation.mutate({ 
      usernameOrEmail: username, 
      currentPassword: password, 
      newPassword 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {showPasswordChange ? 'Change Password' : 'Business CRM Login'}
          </CardTitle>
          <CardDescription>
            {showPasswordChange 
              ? 'Your temporary password must be changed before continuing'
              : 'Enter your credentials to access the system'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordChange ? (
            // Login Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Employee ID or email address"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          ) : (
            // Password Change Form
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Welcome, {currentUser?.firstName}!</strong><br />
                  For security, you must change your temporary password before accessing the system.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    disabled={passwordChangeMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={passwordChangeMutation.isPending}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={passwordChangeMutation.isPending || !newPassword || !confirmPassword}
              >
                {passwordChangeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 text-center">
              Authentication verified against server credentials
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}