import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Shield, Zap, Building2 } from 'lucide-react';
import { Link } from 'wouter';

export default function Landing() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="text-primary" size={32} />
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Business CRM</h1>
              <p className="text-sm text-neutral-600">Complete Business Management System</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/custom-login">
              <Button variant="outline" className="border-success text-success hover:bg-success hover:text-white">
                Server Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Complete Business Management Solution
            </h2>
            <p className="text-xl text-neutral-600 mb-8">
              Comprehensive CRM with SFTP file management, project tracking, client management, and enterprise-grade security.
            </p>
          </div>

          {/* Authentication Options */}
          <div className="max-w-md mx-auto mb-12">
            <Card className="border-success">
              <CardHeader className="text-center">
                <Server className="h-8 w-8 text-success mx-auto mb-2" />
                <CardTitle>Server Authentication</CardTitle>
                <CardDescription>
                  Sign in using your server credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/custom-login">
                  <Button 
                    variant="outline"
                    className="w-full border-success text-success hover:bg-success hover:text-white"
                    size="lg"
                  >
                    Server Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <Server className="text-primary mx-auto mb-2" size={48} />
                <CardTitle>SFTP Integration</CardTitle>
                <CardDescription>
                  Seamlessly connect to any SFTP server with support for key-based and password authentication
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="text-primary mx-auto mb-2" size={48} />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Advanced user permissions, role-based access control, and encrypted credential storage
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="text-primary mx-auto mb-2" size={48} />
                <CardTitle>Desktop Performance</CardTitle>
                <CardDescription>
                  Native desktop experience with drag-and-drop uploads, bulk operations, and offline capabilities
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Connection Info */}
          <Card className="mt-12 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Ready to Connect</CardTitle>
              <CardDescription>
                Sign in to start managing your files on the MyDrive SFTP server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-neutral-100 rounded-lg p-4 font-mono text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-neutral-600">Server:</span>
                  <span className="font-semibold">165.23.126.88:21</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Connection:</span>
                  <span className="text-success font-semibold">Ready</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 px-6 py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-neutral-500">
          <p>&copy; 2024 MyDrive Desktop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
