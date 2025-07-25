import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Eye, Edit, Send, DollarSign, Clock, CheckCircle, XCircle, Calculator, Users, TrendingUp, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Form schemas
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1'),
});

const quoteSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  title: z.string().min(1, 'Quote title is required'),
  description: z.string().min(1, 'Description is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  title: z.string().min(1, 'Invoice title is required'),
  description: z.string().min(1, 'Description is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export default function Invoices() {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingItem, setEditingItem] = useState(null);
  const [lineItems, setLineItems] = useState([{ sku: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0.08 }]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Data queries
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<any[]>({
    queryKey: ['/api/quotes'],
    queryFn: () => fetch('/api/quotes', { credentials: 'include' }).then(res => res.json()),
  });
  const quotesArr = quotes as any[];

  const { data: salesOrders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/sales-orders'],
    queryFn: () => fetch('/api/sales-orders', { credentials: 'include' }).then(res => res.json()),
  });
  const salesOrdersArr = salesOrders as any[];

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ['/api/invoices'],
    queryFn: () => fetch('/api/invoices', { credentials: 'include' }).then(res => res.json()),
  });
  const invoicesArr = invoices as any[];

  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ['/api/proxy/projects'],
    queryFn: () => fetch('/api/proxy/projects', { credentials: 'include' }).then(res => res.json()),
  });
  const projectsArr = projects as any[];

  // Client data loading function (copied from projects page)
  const fetchClients = async () => {
    try {
      const response = await fetch('/api/http-clients');
      if (response.ok) {
        const clientsData = await response.json();
        setClients(clientsData);
      } else {
        console.error('Failed to fetch clients');
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  // Filter clients based on search term
  const filteredClients = Array.isArray(clients) ? clients.filter((client: any) => {
    const searchTerm = clientSearchTerm.toLowerCase();
    if (searchTerm.length === 0) return false; // Don't show all clients if search is empty
    
    return (
      (client.fullName && client.fullName.toLowerCase().includes(searchTerm)) ||
      (client.company && client.company.toLowerCase().includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchTerm))
    );
  }).slice(0, 10) : []; // Limit to 10 results for performance

  // Debug logging
  console.log('Clients loaded:', clients?.length || 0);
  console.log('Search term:', clientSearchTerm);
  console.log('Filtered clients:', filteredClients.length);

  // Mutations
  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create quote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      toast({ title: 'Success', description: 'Quote created successfully' });
      quoteForm.reset();
      setLineItems([{ sku: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0.08 }]);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create quote', variant: 'destructive' });
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to accept quote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Success', description: 'Quote accepted and converted to sales order with pending invoice' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to accept quote', variant: 'destructive' });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert clientId to numeric and prepare invoice data
      const invoiceData = {
        ...data,
        clientId: parseInt(data.clientId) || null,
        projectId: data.projectId ? parseInt(data.projectId) : null,
        lineItems,
        total: calculateTotal(lineItems)
      };
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      if (!response.ok) throw new Error('Failed to create invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/proxy/projects'] });
      toast({ title: 'Success', description: 'Invoice created successfully' });
      invoiceForm.reset();
      setLineItems([{ sku: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0.08 }]);
      setShowInvoiceForm(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create invoice', variant: 'destructive' });
    },
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to approve invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Success', description: 'Invoice approved and ready to send' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to approve invoice', variant: 'destructive' });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to send invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Success', description: 'Invoice sent to customer' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to send invoice', variant: 'destructive' });
    },
  });

  // Form setup
  const quoteForm = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: '',
      customerName: '',
      customerEmail: '',
      title: '',
      description: '',
      validUntil: '',
      lineItems: [],
      notes: '',
      terms: '',
    },
  });

  const invoiceForm = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      projectId: '',
      customerName: '',
      customerEmail: '',
      title: '',
      description: '',
      dueDate: '',
      lineItems: [],
      notes: '',
      terms: '',
    },
  });

  // Auto-populate customer details when client is selected
  const selectedClientId = invoiceForm.watch('clientId');
  const selectedClient = clients.find((c: any) => c.customerId === selectedClientId);
  
  // Update customer name and email when client changes
  useEffect(() => {
    if (selectedClient) {
      const name = selectedClient.fullName || selectedClient.company || 'Unknown Client';
      const email = selectedClient.email || '';
      
      if (invoiceForm.getValues('customerName') !== name) {
        invoiceForm.setValue('customerName', name);
      }
      if (invoiceForm.getValues('customerEmail') !== email) {
        invoiceForm.setValue('customerEmail', email);
      }
    }
  }, [selectedClient, invoiceForm]);

  // Helper functions
  const addLineItem = () => {
    setLineItems([...lineItems, { sku: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0.08 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = (items: any[]) => {
    return items.reduce((total, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const tax = subtotal * item.taxRate;
      return total + subtotal + tax;
    }, 0);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary', color: 'gray' },
      pending: { variant: 'outline', color: 'yellow' },
      approved: { variant: 'default', color: 'blue' },
      sent: { variant: 'default', color: 'green' },
      paid: { variant: 'default', color: 'green' },
      expired: { variant: 'destructive', color: 'red' },
      rejected: { variant: 'destructive', color: 'red' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant as any}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  // Calculate statistics
  const totalQuotes = quotesArr.length;
  const pendingInvoices = invoicesArr.filter((inv: any) => inv.status === 'pending').length;
  const totalRevenue = invoicesArr
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  const avgQuoteValue = quotesArr.length > 0 ? quotesArr.reduce((sum: number, quote: any) => sum + (quote.total || 0), 0) / quotesArr.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Invoice Management</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">
              Manage sales quotes, orders, and invoices with integrated accounting workflow
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
                <div className="bg-white dark:bg-slate-800 p-8">
                  {/* Quote Header */}
                  <div className="border-b-2 border-gray-200 dark:border-gray-600 pb-6 mb-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">QUOTE</h1>
                        <p className="text-gray-600 dark:text-gray-400">Professional Services Quote</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Audio Video Integrations</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div className="font-medium">AV Solutions Company</div>
                          <div>Phone: (605) 759-4493</div>
                          <div>Email: info@audiovideointegrations.com</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Form {...quoteForm}>
                    <form onSubmit={quoteForm.handleSubmit((data) => {
                      createQuoteMutation.mutate({ ...data, lineItems });
                    })} className="space-y-8">
                      {/* Customer Information */}
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Quote To:</h3>
                          <FormField
                            control={quoteForm.control}
                            name="customerName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Customer Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Customer name" {...field} className="bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-gray-600" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={quoteForm.control}
                            name="customerEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="customer@email.com" {...field} className="bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-gray-600" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">Quote Details:</h3>
                          <FormField
                            control={quoteForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Quote Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Quote title/subject" {...field} className="bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-gray-600" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={quoteForm.control}
                            name="validUntil"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Valid Until</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} className="bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-gray-600" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={quoteForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quote Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter quote title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={quoteForm.control}
                        name="validUntil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={quoteForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter quote description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Line Items</h4>
                        <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-3 p-4 border rounded-lg">
                            <div className="col-span-2">
                              <Label className="text-xs">SKU</Label>
                              <Input
                                placeholder="SKU/Part # (optional)"
                                value={item.sku}
                                onChange={(e) => updateLineItem(index, 'sku', e.target.value)}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Description *</Label>
                              <Input
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Tax Rate</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={item.taxRate}
                                onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-2 flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(index)}
                                disabled={lineItems.length === 1}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          Total: ${calculateTotal(lineItems).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={quoteForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional notes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={quoteForm.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terms & Conditions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Terms and conditions" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" disabled={createQuoteMutation.isPending} className="w-full">
                      {createQuoteMutation.isPending ? 'Creating Quote...' : 'Create Quote'}
                    </Button>
                  </form>
                </Form>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Direct Invoice</DialogTitle>
                  <DialogDescription>
                    Create a new invoice directly without going through the quote process
                  </DialogDescription>
                </DialogHeader>
                <Form {...invoiceForm}>
                  <form onSubmit={invoiceForm.handleSubmit((data) => {
                    createInvoiceMutation.mutate({ ...data, lineItems, status: 'pending' });
                  })} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={invoiceForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client *</FormLabel>
                            <div className="relative" ref={clientDropdownRef}>
                              <FormControl>
                                <Input
                                  placeholder="Search and select a client..."
                                  value={clientSearchTerm}
                                  onChange={(e) => {
                                    setClientSearchTerm(e.target.value);
                                    setShowClientDropdown(true);
                                  }}
                                  onFocus={() => setShowClientDropdown(true)}
                                />
                              </FormControl>
                              {showClientDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredClients.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">No clients found</div>
                                  ) : (
                                    filteredClients.map((client: any) => (
                                      <button
                                        key={client.customerId}
                                        type="button"
                                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                        onClick={() => {
                                          field.onChange(client.customerId);
                                          setClientSearchTerm(client.fullName || client.company || 'Unknown Client');
                                          setShowClientDropdown(false);
                                          // Auto-fill customer name and email
                                          invoiceForm.setValue('customerName', client.fullName || client.company || '');
                                          invoiceForm.setValue('customerEmail', client.email || '');
                                        }}
                                      >
                                        <div className="font-medium">{client.fullName || client.company}</div>
                                        {client.email && (
                                          <div className="text-sm text-gray-500">{client.email}</div>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={invoiceForm.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Project</SelectItem>
                                {projectsArr.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={invoiceForm.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-filled from client" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={invoiceForm.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Auto-filled from client" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={invoiceForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter invoice title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={invoiceForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={invoiceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter invoice description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Line Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">Line Items</h4>
                        <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {lineItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg">
                            <div className="col-span-2">
                              <Label className="text-xs">SKU (optional)</Label>
                              <Input
                                placeholder="SKU"
                                value={item.sku}
                                onChange={(e) => updateLineItem(index, 'sku', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Description</Label>
                              <Input
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Tax Rate</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={item.taxRate}
                                onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLineItem(index)}
                                className="w-full"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          Total: ${calculateTotal(lineItems).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={invoiceForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional notes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={invoiceForm.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terms</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Payment terms" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" disabled={createInvoiceMutation.isPending} className="w-full">
                      {createInvoiceMutation.isPending ? 'Creating Invoice...' : 'Create Invoice'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="quotes" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Sales Quotes</TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Sales Orders</TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Active sales quotes
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingInvoices}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    From paid invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${avgQuoteValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Average quote amount
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Quotes</CardTitle>
                  <CardDescription>Latest sales quotes requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quotesArr.slice(0, 5).map((quote: any) => (
                      <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{quote.title}</p>
                          <p className="text-sm text-muted-foreground">{quote.customerName}</p>
                          <p className="text-sm font-semibold">${quote.total?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(quote.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            Valid until: {new Date(quote.validUntil).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Pending Invoices</CardTitle>
                  <CardDescription>Invoices awaiting accounting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {invoicesArr.filter((inv: any) => inv.status === 'pending').slice(0, 5).map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.title}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                          <p className="text-sm font-semibold">${invoice.total?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(invoice.status)}
                          <Button
                            size="sm"
                            onClick={() => approveInvoiceMutation.mutate(invoice.id)}
                            disabled={approveInvoiceMutation.isPending}
                            className="mt-2"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Sales Quotes</h2>
            </div>

            <div className="space-y-4">
              {quotesLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-300">Loading quotes...</p>
                </div>
              ) : (
                quotesArr.map((quote: any) => (
                  <Card key={quote.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {quote.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">
                            {quote.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                            <span>Customer: {quote.customerName}</span>
                            <span>Valid until: {new Date(quote.validUntil).toLocaleDateString()}</span>
                            <span className="font-semibold">${quote.total?.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(quote.status)}
                          {quote.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => acceptQuoteMutation.mutate(quote.id)}
                              disabled={acceptQuoteMutation.isPending}
                            >
                              Accept Quote
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Sales Orders</h2>
            </div>

            <div className="space-y-4">
              {ordersLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-300">Loading sales orders...</p>
                </div>
              ) : (
                salesOrdersArr.map((order: any) => (
                  <Card key={order.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {order.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">
                            Generated from quote: {order.originalQuoteId}
                          </p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                            <span>Customer: {order.customerName}</span>
                            <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                            <span className="font-semibold">${order.total?.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Invoices</h2>
            </div>

            <div className="space-y-4">
              {invoicesLoading ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-300">Loading invoices...</p>
                </div>
              ) : (
                invoicesArr.map((invoice: any) => (
                  <Card key={invoice.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {invoice.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">
                            Invoice #{invoice.invoiceNumber}
                          </p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                            <span>Customer: {invoice.customerName}</span>
                            <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                            <span className="font-semibold">${invoice.total?.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(invoice.status)}
                          {invoice.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => approveInvoiceMutation.mutate(invoice.id)}
                              disabled={approveInvoiceMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {invoice.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                              disabled={sendInvoiceMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          )}
                        </div>
                      </div>
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