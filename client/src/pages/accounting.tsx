import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useHttpAuth } from '@/hooks/useHttpAuth';
import { Calendar, DollarSign, FileText, Users, Building, TrendingUp, BarChart3, Calculator, RefreshCw, Lock, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Form schemas
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  accountSubType: z.string().min(1, 'Account sub-type is required'),
  description: z.string().optional(),
  balance: z.number().min(0),
});

const transactionSchema = z.object({
  type: z.enum(['invoice', 'payment', 'expense', 'journal_entry', 'bill', 'credit_memo']),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  accountId: z.string().min(1, 'Account is required'),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  creditLimit: z.number().optional(),
  terms: z.string().optional(),
});

const vendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  terms: z.string().optional(),
  taxId: z.string().optional(),
});

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check accounting access
  const { data: accessCheck, isLoading: accessLoading, error: accessError } = useQuery({
    queryKey: ['/api/accounting/access'],
    retry: false,
  });

  // Debug logging
  console.log('Access check result:', { accessCheck, accessLoading, accessError });

  // Fallback for network issues - if user has accounting permissions, allow access
  const { user } = useHttpAuth();
  const hasAccountingPermission = user?.permissions?.accounting === true;
  
  // If query failed but user has accounting permissions, allow access
  const effectiveAccessCheck = accessCheck || (hasAccountingPermission && !accessLoading ? { hasAccess: true, user: user?.username || 'authenticated_user' } : null);

  // Data queries
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounting/accounts'],
    enabled: effectiveAccessCheck?.hasAccess,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/accounting/transactions'],
    enabled: effectiveAccessCheck?.hasAccess,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['/api/accounting/customers'],
    enabled: effectiveAccessCheck?.hasAccess,
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['/api/accounting/vendors'],
    enabled: effectiveAccessCheck?.hasAccess,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/accounting/reports'],
    enabled: effectiveAccessCheck?.hasAccess,
  });

  // Sales data queries
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/invoices'],
    retry: false,
  });

  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['/api/quotes'],
    retry: false,
  });

  const { data: salesOrders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/sales-orders'],
    retry: false,
  });

  const { data: salesMetrics } = useQuery({
    queryKey: ['/api/sales/metrics'],
    retry: false,
  });

  const { data: qbStatus } = useQuery({
    queryKey: ['/api/quickbooks/status'],
    retry: false,
  });

  // Mutations
  const importQuickBooksMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/accounting/import-quickbooks', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Import failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: "QuickBooks data has been imported successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import QuickBooks data",
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/accounts'] });
      toast({ title: 'Success', description: 'Account created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create account', variant: 'destructive' });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/accounting/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/transactions'] });
      toast({ title: 'Success', description: 'Transaction created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create transaction', variant: 'destructive' });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/accounting/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/customers'] });
      toast({ title: 'Success', description: 'Customer created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create customer', variant: 'destructive' });
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/accounting/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/vendors'] });
      toast({ title: 'Success', description: 'Vendor created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create vendor', variant: 'destructive' });
    },
  });

  const generateProfitLossMutation = useMutation({
    mutationFn: (data: { startDate: string; endDate: string }) => 
      apiRequest('/api/accounting/reports/profit-loss', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/reports'] });
      toast({ title: 'Success', description: 'Profit & Loss report generated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to generate report', variant: 'destructive' });
    },
  });

  const generateBalanceSheetMutation = useMutation({
    mutationFn: (data: { asOfDate: string }) => 
      apiRequest('/api/accounting/reports/balance-sheet', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/reports'] });
      toast({ title: 'Success', description: 'Balance Sheet report generated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to generate report', variant: 'destructive' });
    },
  });

  const syncQuickBooksMutation = useMutation({
    mutationFn: () => apiRequest('/api/accounting/sync', { method: 'POST' }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting'] });
      toast({ title: 'Success', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to sync with QuickBooks', variant: 'destructive' });
    },
  });

  // Sales QuickBooks mutations
  const syncSalesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/quickbooks/sync', 'POST', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: `Synced ${data.invoiceCount || 0} invoices from QuickBooks`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync with QuickBooks. Please check your connection.",
        variant: "destructive",
      });
    },
  });

  const connectQuickBooksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/quickbooks/connect', 'POST', {});
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.authUrl) {
        // Calculate center position for popup
        const width = 600;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        // Try to open popup
        const popup = window.open(
          data.authUrl,
          'quickbooks-auth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (popup && !popup.closed) {
          // Popup opened successfully - monitor for completion
          toast({
            title: "QuickBooks Authorization",
            description: "Please complete authorization in the popup window",
          });

          const checkClosed = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(checkClosed);
                // Refresh QuickBooks status after popup closes
                queryClient.invalidateQueries({ queryKey: ['/api/quickbooks/status'] });
                toast({
                  title: "Authorization Complete",
                  description: "Checking QuickBooks connection status...",
                });
              }
            } catch (error) {
              // Popup might be on different domain, which is expected
            }
          }, 1000);

          // Cleanup interval after 10 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
          }, 600000);
        } else {
          // Popup blocked or failed - use redirect as fallback
          toast({
            title: "Popup Blocked",
            description: "Redirecting to QuickBooks authorization page...",
          });
          setTimeout(() => {
            window.location.href = data.authUrl;
          }, 1000);
        }
      } else {
        toast({
          title: "Error",
          description: "No authorization URL received from QuickBooks",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('QuickBooks connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate QuickBooks connection",
        variant: "destructive",
      });
    },
  });

  // Forms
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      accountType: 'asset',
      accountSubType: '',
      description: '',
      balance: 0,
    },
  });

  const transactionForm = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      accountId: '',
      description: '',
      reference: '',
    },
  });

  const customerForm = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
    },
  });

  const vendorForm = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
    },
  });

  // Access denied UI
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Loading accounting module...</p>
        </div>
      </div>
    );
  }

  if (!effectiveAccessCheck?.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the accounting module. 
              Please contact your administrator for access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Badge variant="destructive" className="mb-4">
              Restricted Access
            </Badge>
            <p className="text-sm text-gray-600">
              Current user: {effectiveAccessCheck?.user || user?.username || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Debug: accessCheck={JSON.stringify(accessCheck)}, hasAccountingPermission={hasAccountingPermission}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate dashboard metrics
  const totalAssets = (accounts || []).filter(acc => acc.accountType === 'asset').reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = (accounts || []).filter(acc => acc.accountType === 'liability').reduce((sum, acc) => sum + acc.balance, 0);
  const totalIncome = (accounts || []).filter(acc => acc.accountType === 'income').reduce((sum, acc) => sum + acc.balance, 0);
  const totalExpenses = (accounts || []).filter(acc => acc.accountType === 'expense').reduce((sum, acc) => sum + acc.balance, 0);
  const netIncome = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Accounting</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Comprehensive financial management with QuickBooks integration
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => syncQuickBooksMutation.mutate()}
              disabled={syncQuickBooksMutation.isPending}
              variant="outline"
              className="shadow-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {syncQuickBooksMutation.isPending ? 'Syncing...' : 'Sync QuickBooks'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Dashboard</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Sales</TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Transactions</TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Customers</TabsTrigger>
            <TabsTrigger value="vendors" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Vendors</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Reports</TabsTrigger>
          </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalAssets.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalLiabilities.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netIncome.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(customers || []).length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(transactions || []).slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                      <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                        ${transaction.amount.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(reports || []).slice(0, 5).map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Generated {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Sales & QuickBooks Integration</h2>
            <div className="flex gap-3">
              <Button
                onClick={() => connectQuickBooksMutation.mutate()}
                disabled={connectQuickBooksMutation.isPending || qbStatus?.connected}
                variant="outline"
                className="shadow-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {qbStatus?.connected ? 'Connected to QuickBooks' : 'Connect QuickBooks'}
              </Button>
              <Button
                onClick={() => syncSalesMutation.mutate()}
                disabled={syncSalesMutation.isPending || !qbStatus?.connected}
                className="shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncSalesMutation.isPending ? 'animate-spin' : ''}`} />
                {syncSalesMutation.isPending ? 'Syncing...' : 'Sync Data'}
              </Button>
            </div>
          </div>

          {/* QuickBooks Connection Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                QuickBooks Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {qbStatus?.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {qbStatus?.connected ? 'Connected' : 'Not Connected'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {qbStatus?.connected 
                        ? `Last sync: ${qbStatus?.lastSync ? new Date(qbStatus.lastSync).toLocaleString() : 'Never'}`
                        : 'Connect to sync invoices and customer data'
                      }
                    </p>
                  </div>
                </div>
                <Badge variant={qbStatus?.connected ? 'default' : 'secondary'}>
                  {qbStatus?.connected ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sales Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${salesMetrics?.totalRevenue?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  +{salesMetrics?.revenueGrowth || 0}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${salesMetrics?.outstanding?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  {salesMetrics?.overdueCount || 0} overdue invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.activeCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{salesMetrics?.newCustomers || 0} new this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesMetrics?.conversionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Quotes to invoices</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Data Tables */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoadingInvoices ? (
                    <p className="text-muted-foreground">Loading invoices...</p>
                  ) : !(invoices as any[]) || (invoices as any[]).length === 0 ? (
                    <p className="text-muted-foreground">No invoices found</p>
                  ) : (
                    ((invoices as any[]) || []).slice(0, 5).map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.customerName || 'Unknown Customer'}</p>
                          <p className="text-sm text-muted-foreground">{invoice.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${invoice.amount?.toLocaleString() || '0'}</p>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoadingQuotes ? (
                    <p className="text-muted-foreground">Loading quotes...</p>
                  ) : !(quotes as any[]) || (quotes as any[]).length === 0 ? (
                    <p className="text-muted-foreground">No quotes found</p>
                  ) : (
                    ((quotes as any[]) || []).slice(0, 5).map((quote: any) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{quote.customerName || 'Unknown Customer'}</p>
                          <p className="text-sm text-muted-foreground">{quote.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${quote.amount?.toLocaleString() || '0'}</p>
                          <Badge variant="outline">{quote.status || 'pending'}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Chart of Accounts</h2>
            <div className="flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="shadow-sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Import QuickBooks
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Import from QuickBooks</DialogTitle>
                    <DialogDescription>
                      Upload your QuickBooks chart of accounts file (CSV or QBO format)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".csv,.qbo,.iif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle QuickBooks file upload
                          const formData = new FormData();
                          formData.append('file', file);
                          importQuickBooksMutation.mutate(formData);
                        }
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Supported formats: CSV, QBO, IIF files from QuickBooks
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="shadow-sm">Add Account</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                  <DialogDescription>
                    Add a new account to your chart of accounts
                  </DialogDescription>
                </DialogHeader>
                <Form {...accountForm}>
                  <form onSubmit={accountForm.handleSubmit((data) => createAccountMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="asset">Asset</SelectItem>
                              <SelectItem value="liability">Liability</SelectItem>
                              <SelectItem value="equity">Equity</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="accountSubType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Sub-Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account sub-type" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Balance</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter account description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createAccountMutation.isPending}>
                      {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="grid gap-6">
            {accountsLoading ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-300">Loading accounts...</p>
              </div>
            ) : (
              (accounts || []).map((account: any) => (
                <Card key={account.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{account.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {account.accountType} - {account.accountSubType}
                      </p>
                      {account.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{account.description}</p>
                      )}
                    </div>
                    <div className="text-right ml-6">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">${account.balance.toLocaleString()}</p>
                      <Badge variant={account.active ? 'default' : 'secondary'} className="mt-2">
                        {account.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Transactions</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add Transaction</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Transaction</DialogTitle>
                  <DialogDescription>
                    Record a new financial transaction
                  </DialogDescription>
                </DialogHeader>
                <Form {...transactionForm}>
                  <form onSubmit={transactionForm.handleSubmit((data) => {
                    const transactionData = {
                      ...data,
                      lineItems: [{
                        id: `line_${Date.now()}`,
                        accountId: data.accountId,
                        description: data.description,
                        amount: data.amount,
                        debitCredit: 'debit' as const,
                      }],
                      status: 'approved' as const,
                    };
                    createTransactionMutation.mutate(transactionData);
                  })} className="space-y-4">
                    <FormField
                      control={transactionForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select transaction type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="invoice">Invoice</SelectItem>
                              <SelectItem value="payment">Payment</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="journal_entry">Journal Entry</SelectItem>
                              <SelectItem value="bill">Bill</SelectItem>
                              <SelectItem value="credit_memo">Credit Memo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transactionForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transactionForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transactionForm.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(accounts || []).map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} ({account.accountType})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transactionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter transaction description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transactionForm.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter reference number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createTransactionMutation.isPending}>
                      {createTransactionMutation.isPending ? 'Creating...' : 'Create Transaction'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {transactionsLoading ? (
              <p>Loading transactions...</p>
            ) : (
              (transactions || []).map((transaction: any) => (
                <Card key={transaction.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-semibold">{transaction.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {transaction.type} • {transaction.date}
                      </p>
                      {transaction.reference && (
                        <p className="text-sm text-muted-foreground">Ref: {transaction.reference}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${transaction.amount.toLocaleString()}</p>
                      <Badge variant={transaction.status === 'approved' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Customers</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add Customer</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Customer</DialogTitle>
                  <DialogDescription>
                    Add a new customer to your accounting system
                  </DialogDescription>
                </DialogHeader>
                <Form {...customerForm}>
                  <form onSubmit={customerForm.handleSubmit((data) => {
                    const customerData = {
                      ...data,
                      balance: 0,
                      active: true,
                    };
                    createCustomerMutation.mutate(customerData);
                  })} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={customerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter customer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={customerForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={customerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={customerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <FormField
                          control={customerForm.control}
                          name="address.street"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Street address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <FormField
                            control={customerForm.control}
                            name="address.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="City" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customerForm.control}
                            name="address.state"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="State" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={customerForm.control}
                            name="address.zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="ZIP Code" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={createCustomerMutation.isPending}>
                      {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {customersLoading ? (
              <p>Loading customers...</p>
            ) : (
              (customers || []).map((customer: any) => (
                <Card key={customer.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-semibold">{customer.name}</h3>
                      {customer.companyName && (
                        <p className="text-sm text-muted-foreground">{customer.companyName}</p>
                      )}
                      {customer.email && (
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Balance: ${customer.balance.toLocaleString()}</p>
                      <Badge variant={customer.active ? 'default' : 'secondary'}>
                        {customer.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Vendors</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add Vendor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Vendor</DialogTitle>
                  <DialogDescription>
                    Add a new vendor to your accounting system
                  </DialogDescription>
                </DialogHeader>
                <Form {...vendorForm}>
                  <form onSubmit={vendorForm.handleSubmit((data) => {
                    const vendorData = {
                      ...data,
                      balance: 0,
                      active: true,
                    };
                    createVendorMutation.mutate(vendorData);
                  })} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={vendorForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter vendor name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={vendorForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={vendorForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={vendorForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <FormField
                          control={vendorForm.control}
                          name="address.street"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Street address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <FormField
                            control={vendorForm.control}
                            name="address.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="City" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="address.state"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="State" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={vendorForm.control}
                            name="address.zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="ZIP Code" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <FormField
                      control={vendorForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter tax ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createVendorMutation.isPending}>
                      {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {vendorsLoading ? (
              <p>Loading vendors...</p>
            ) : (
              (vendors || []).map((vendor: any) => (
                <Card key={vendor.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-semibold">{vendor.name}</h3>
                      {vendor.companyName && (
                        <p className="text-sm text-muted-foreground">{vendor.companyName}</p>
                      )}
                      {vendor.email && (
                        <p className="text-sm text-muted-foreground">{vendor.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Balance: ${vendor.balance.toLocaleString()}</p>
                      <Badge variant={vendor.active ? 'default' : 'secondary'}>
                        {vendor.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Financial Reports</h2>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Generate P&L</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Profit & Loss Report</DialogTitle>
                    <DialogDescription>
                      Select date range for the Profit & Loss report
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]}
                          onChange={(e) => {
                            const endDate = (document.getElementById('endDate') as HTMLInputElement)?.value;
                            if (endDate) {
                              generateProfitLossMutation.mutate({
                                startDate: e.target.value,
                                endDate: endDate
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value;
                            if (startDate) {
                              generateProfitLossMutation.mutate({
                                startDate: startDate,
                                endDate: e.target.value
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value;
                        const endDate = (document.getElementById('endDate') as HTMLInputElement)?.value;
                        if (startDate && endDate) {
                          generateProfitLossMutation.mutate({ startDate, endDate });
                        }
                      }}
                      disabled={generateProfitLossMutation.isPending}
                    >
                      {generateProfitLossMutation.isPending ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Generate Balance Sheet</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Balance Sheet</DialogTitle>
                    <DialogDescription>
                      Select date for the Balance Sheet report
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="asOfDate">As of Date</Label>
                      <Input
                        id="asOfDate"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        const asOfDate = (document.getElementById('asOfDate') as HTMLInputElement)?.value;
                        if (asOfDate) {
                          generateBalanceSheetMutation.mutate({ asOfDate });
                        }
                      }}
                      disabled={generateBalanceSheetMutation.isPending}
                    >
                      {generateBalanceSheetMutation.isPending ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4">
            {reportsLoading ? (
              <p>Loading reports...</p>
            ) : (reports || []).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No reports generated yet</p>
                  <p className="text-muted-foreground">Generate your first financial report to get started</p>
                </CardContent>
              </Card>
            ) : (
              (reports || []).map((report: any) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Generated by {report.generatedBy} on {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                    
                    {report.type === 'profit_loss' && report.data && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Income:</span>
                          <span className="font-medium">${report.data.totalIncome?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Expenses:</span>
                          <span className="font-medium">${report.data.totalExpenses?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-semibold">Net Income:</span>
                          <span className={`font-semibold ${report.data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${report.data.netIncome?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {report.type === 'balance_sheet' && report.data && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Assets:</span>
                          <span className="font-medium">${report.data.totalAssets?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Liabilities:</span>
                          <span className="font-medium">${report.data.totalLiabilities?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-semibold">Total Equity:</span>
                          <span className="font-semibold">${report.data.totalEquity?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}