import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// Types for API responses
interface Invoice {
  id: number;
  number: string;
  customerName: string;
  date: string;
  amount: number;
  status: string;
  dueDate?: string;
  description?: string;
  lineItems?: Array<{ description: string; quantity: number; rate: number; amount: number }>;
}
interface Quote extends Invoice {}
interface SalesOrder extends Invoice {}
interface SalesMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  outstanding: number;
  overdueCount: number;
  activeCustomers: number;
  newCustomers: number;
  conversionRate: number;
}
interface QuickBooksStatus {
  connected: boolean;
  lastSync?: string;
}
interface QuickBooksSyncResult {
  invoiceCount: number;
}
interface QuickBooksConnectResult {
  authUrl: string;
}

export default function Sales() {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickBooksConnected, setIsQuickBooksConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [view, setView] = useState<'invoices' | 'quotes' | 'orders'>('invoices');

  // Data fetching
  const { data: invoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    queryFn: () => fetch('/api/invoices', { credentials: 'include' }).then(res => res.json()),
    retry: false,
  });

  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery<Quote[]>({
    queryKey: ['/api/quotes'],
    queryFn: () => fetch('/api/quotes', { credentials: 'include' }).then(res => res.json()),
    retry: false,
  });

  const { data: salesOrders = [], isLoading: isLoadingOrders } = useQuery<SalesOrder[]>({
    queryKey: ['/api/sales-orders'],
    queryFn: () => fetch('/api/sales-orders', { credentials: 'include' }).then(res => res.json()),
    retry: false,
  });

  const { data: salesMetricsRaw } = useQuery<SalesMetrics>({
    queryKey: ['/api/sales/metrics'],
    queryFn: () => fetch('/api/sales/metrics', { credentials: 'include' }).then(res => res.json()),
    retry: false,
  });
  const salesMetrics: SalesMetrics = salesMetricsRaw || {
    totalRevenue: 0,
    revenueGrowth: 0,
    outstanding: 0,
    overdueCount: 0,
    activeCustomers: 0,
    newCustomers: 0,
    conversionRate: 0,
  };

  // QuickBooks connection status
  const { data: qbStatusRaw } = useQuery<QuickBooksStatus>({
    queryKey: ['/api/quickbooks/status'],
    queryFn: () => fetch('/api/quickbooks/status', { credentials: 'include' }).then(res => res.json()),
    retry: false,
  });
  const qbStatus: QuickBooksStatus = qbStatusRaw || { connected: false };

  useEffect(() => {
    if (qbStatus.connected) {
      setIsQuickBooksConnected(true);
    }
  }, [qbStatus]);

  // QuickBooks sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/quickbooks/sync', 'POST', {});
      return res.json() as Promise<QuickBooksSyncResult>;
    },
    onMutate: () => {
      setSyncStatus('syncing');
    },
    onSuccess: (data: QuickBooksSyncResult) => {
      setSyncStatus('success');
      toast({
        title: "Sync Complete",
        description: `Synced ${data.invoiceCount} invoices from QuickBooks`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales/metrics'] });
    },
    onError: (error) => {
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "Failed to sync with QuickBooks. Please check your connection.",
        variant: "destructive",
      });
    },
  });

  // QuickBooks connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/quickbooks/connect', 'POST', {});
      return res.json() as Promise<QuickBooksConnectResult>;
    },
    onSuccess: (data: QuickBooksConnectResult) => {
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
      }
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate QuickBooks connection",
        variant: "destructive",
      });
    },
  });

  // Filter data based on current view and filters
  const getCurrentData = () => {
    switch (view) {
      case 'quotes':
        return quotes;
      case 'orders':
        return salesOrders;
      default:
        return invoices;
    }
  };

  const filteredData = (getCurrentData() as (Invoice | Quote | SalesOrder)[]).filter((item: any) => {
    const matchesSearch = item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = itemDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Calendar },
      viewed: { color: 'bg-yellow-100 text-yellow-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleQuickBooksConnect = () => {
    connectMutation.mutate();
  };

  const handleSync = () => {
    if (!isQuickBooksConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to QuickBooks first",
        variant: "destructive",
      });
      return;
    }
    syncMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Management</h1>
          <p className="text-muted-foreground">
            Manage invoices, quotes, and sales orders with QuickBooks integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isQuickBooksConnected ? (
            <Button 
              onClick={handleQuickBooksConnect}
              disabled={connectMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect QuickBooks
            </Button>
          ) : (
            <Button 
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync QuickBooks'}
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New {view.slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* QuickBooks Status */}
      {isQuickBooksConnected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">QuickBooks Connected</span>
            </div>
            <div className="text-sm text-green-600">
              Last sync: {qbStatus.lastSync ? new Date(qbStatus.lastSync).toLocaleString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesMetrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +{salesMetrics.revenueGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesMetrics.outstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {salesMetrics.overdueCount || 0} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesMetrics.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +{salesMetrics.newCustomers || 0} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesMetrics.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Quotes to orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-2">
        <Button
          variant={view === 'invoices' ? 'default' : 'outline'}
          onClick={() => setView('invoices')}
        >
          Invoices ({invoices.length})
        </Button>
        <Button
          variant={view === 'quotes' ? 'default' : 'outline'}
          onClick={() => setView('quotes')}
        >
          Quotes ({quotes.length})
        </Button>
        <Button
          variant={view === 'orders' ? 'default' : 'outline'}
          onClick={() => setView('orders')}
        >
          Sales Orders ({salesOrders.length})
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Search ${view}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No {view} found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.number}</TableCell>
                    <TableCell>{item.customerName}</TableCell>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(item);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice/Quote/Order Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice ? `View ${view.slice(0, -1)}` : `New ${view.slice(0, -1)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Number</label>
                    <div className="text-lg font-bold">{selectedInvoice.number}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div>{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Customer</label>
                    <div>{selectedInvoice.customerName}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <div className="text-lg font-bold">{formatCurrency(selectedInvoice.amount)}</div>
                  </div>
                </div>
                {selectedInvoice.lineItems && (
                  <div>
                    <label className="text-sm font-medium">Line Items</label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.lineItems.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.rate)}</TableCell>
                            <TableCell>{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Form for creating new {view.slice(0, -1)} will be implemented here
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}