import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  User, 
  Globe, 
  Database, 
  Palette, 
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  FolderPlus
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const setupDirectoriesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sftp/setup-directories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to setup directories");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success", 
        description: `Directory setup completed. Time tracking: ${data.timetrackingReady ? 'Ready' : 'Needs permission'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to setup directories",
        variant: "destructive",
      });
    },
  });

  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to sync users");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Synced ${data.users?.length || 0} users from SFTP server`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync users",
        variant: "destructive",
      });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/sftp/update-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update credentials");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message || "SFTP credentials updated successfully",
      });
      setPassword(""); // Clear password for security
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update SFTP credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    updateCredentialsMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              SFTP Server Configuration
              {updateCredentialsMutation.isSuccess && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Update credentials for SFTP server (165.23.126.88)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter SFTP username"
                  disabled={updateCredentialsMutation.isPending}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter SFTP password"
                  disabled={updateCredentialsMutation.isPending}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={updateCredentialsMutation.isPending}
                className="w-full"
              >
                {updateCredentialsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  "Update & Test Connection"
                )}
              </Button>
              
              {updateCredentialsMutation.error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <XCircle className="h-4 w-4" />
                  Connection failed. Please check credentials.
                </div>
              )}
              
              {updateCredentialsMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Connection successful! SFTP credentials updated.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Directory Setup
              {setupDirectoriesMutation.isSuccess && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Create required CRM directories with proper permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sets up /var/crm/timetracking, /var/crm/backups, and other required directories 
              for the CRM system to function properly.
            </p>
            
            <Button 
              onClick={() => setupDirectoriesMutation.mutate()}
              disabled={setupDirectoriesMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {setupDirectoriesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up directories...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Setup CRM Directories
                </>
              )}
            </Button>
            
            {setupDirectoriesMutation.error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                <XCircle className="h-4 w-4" />
                Directory setup failed. Check server permissions.
              </div>
            )}
            
            {setupDirectoriesMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                <CheckCircle className="h-4 w-4" />
                CRM directories created successfully!
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              User Synchronization
              {syncUsersMutation.isSuccess && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Import users from SFTP server for authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Syncs user accounts from /var/users.json on the SFTP server to enable 
              proper authentication and time tracking functionality.
            </p>
            
            <Button 
              onClick={() => syncUsersMutation.mutate()}
              disabled={syncUsersMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {syncUsersMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing users...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Sync Users from Server
                </>
              )}
            </Button>
            
            {syncUsersMutation.error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                <XCircle className="h-4 w-4" />
                User sync failed. Check server connection.
              </div>
            )}
            
            {syncUsersMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                <CheckCircle className="h-4 w-4" />
                Users synchronized successfully!
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Connection Info</CardTitle>
            <CardDescription>
              Current SFTP server configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium">Server:</dt>
                <dd>165.23.126.88</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Port:</dt>
                <dd>22</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Protocol:</dt>
                <dd>SFTP/SSH</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}