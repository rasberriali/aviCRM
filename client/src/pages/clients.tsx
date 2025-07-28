import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Upload, FileText, Users, Building, Phone, Mail, Filter, Download, Trash2, FolderOpen, AlertTriangle, ChevronDown, ChevronUp, Network } from "lucide-react";
import { ContactRelationshipManager } from "@/components/contact-relationship-manager";

const clientSchema = z.object({
  customerId: z.string().optional(), // Auto-generated unique ID
  fullName: z.string().min(1, "Full name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phoneCell: z.string().optional(),
  phoneHome: z.string().optional(),
  phoneWork: z.string().optional(),
  phoneFax: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  priority: z.string().default("medium"),
  status: z.string().default("active"),
  dateAdded: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  customerId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  originalId?: number;
  title?: string;
  email?: string;
  phoneCell?: string;
  phoneHome?: string;
  phoneWork?: string;
  phoneFax?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  priority: string;
  status: string;
  dateAdded: string;
  profileFolderPath?: string;
}

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isIncompleteProfilesExpanded, setIsIncompleteProfilesExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      customerId: "",
      fullName: "",
      firstName: "",
      lastName: "",
      company: "",
      title: "",
      email: "",
      phoneCell: "",
      phoneHome: "",
      phoneWork: "",
      phoneFax: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      notes: "",
      priority: "medium",
      status: "active",
      dateAdded: "",
    },
  });

  const editForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      customerId: "",
      fullName: "",
      firstName: "",
      lastName: "",
      company: "",
      title: "",
      email: "",
      phoneCell: "",
      phoneHome: "",
      phoneWork: "",
      phoneFax: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      notes: "",
      priority: "medium",
      status: "active",
      dateAdded: "",
    },
  });

  

  // Fetch clients from file-based system with upload capability
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      
      const response = await fetch('/api/clients/download');
      if (response.ok) {
        const csvData = await response.json();
        // Convert CSV format to client format
        const convertedClients = csvData.map((csvClient: any) => {
          // Parse name into separate fields
          const fullName = csvClient.name || '';
          let firstName = '';
          let lastName = '';
          let title = csvClient.clientType || ''; // Get title from clientType field
          
          // Simple name parsing - split on space
          const nameParts = fullName.trim().split(' ');
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else if (nameParts.length === 1) {
            firstName = nameParts[0];
          }

          return {
            customerId: `CLIENT_${csvClient.id}_${csvClient.name?.replace(/\s+/g, '_') || 'UNKNOWN'}`,
            fullName: fullName,
            firstName: firstName,
            lastName: lastName,
            title: title,
            company: csvClient.companyName || '',
            email: csvClient.email || '',
            phoneWork: csvClient.phone || '',
            phoneCell: csvClient.phone || '',
            address: csvClient.streetAddress || '',
            city: csvClient.city || '',
            state: csvClient.state || '',
            zipCode: csvClient.zip || '',
            country: csvClient.country || '',
            notes: csvClient.additionalContact || '',
            priority: "medium",
            status: "active",
            dateAdded: new Date().toISOString(),
            originalId: csvClient.id // Keep original ID for updates
          };
        });
        setClients(convertedClients);
      } else {
        console.error('Failed to fetch clients');
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Handle search term changes and filter results
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = clients.filter(client => 
        client.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneCell?.includes(searchTerm) ||
        client.customerId?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8); // Limit to 8 results
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.client-search-container')) {
        setShowSearchDropdown(false);
      }
    };

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchDropdown]);

  // Generate unique customer ID
  const generateCustomerId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `CUST_${timestamp}_${random}`.toUpperCase();
  };

  // Create client and profile folder
  const handleCreateClient = async (data: ClientFormData) => {
    try {
      const customerId = generateCustomerId();
      const clientData: Client = {
        ...data,
        customerId,
        dateAdded: new Date().toISOString(),
        profileFolderPath: `/customer_profiles/${customerId}`,
        priority: data.priority || "medium",
        status: data.status || "active"
      };

      // Add client to the list and upload to server
      const newCsvClient = {
        id: clients.length + 1,
        name: clientData.fullName || '',
        companyName: clientData.company || '',
        streetAddress: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        country: clientData.country || '',
        zip: clientData.zipCode || '',
        phone: clientData.phoneWork || clientData.phoneCell || '',
        email: clientData.email || '',
        clientType: '',
        additionalContact: clientData.notes || '',
        attachments: '0',
        openBalance: '0.00'
      };

      // Add to existing clients and upload
      const allCsvClients = [...clients.map(client => ({
        id: client.originalId || 1,
        name: client.fullName || '',
        companyName: client.company || '',
        streetAddress: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        zip: client.zipCode || '',
        phone: client.phoneWork || client.phoneCell || '',
        email: client.email || '',
        clientType: '',
        additionalContact: client.notes || '',
        attachments: '0',
        openBalance: '0.00'
      })), newCsvClient];

      const response = await fetch('/api/clients/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: allCsvClients }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Client profile created successfully",
        });
        setShowAddClient(false);
        form.reset();
        await fetchClients();
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client profile",
        variant: "destructive",
      });
    }
  };

  // This function is now handled by the updateClient mutation above

  // Delete client using file upload system
  const deleteClientProfile = async (customerId: string) => {
    try {
      // Filter out the client to delete
      const updatedClients = clients.filter(client => client.customerId !== customerId);
      
      // Convert remaining clients to CSV format
      const csvClients = updatedClients.map(client => ({
        id: client.originalId || 1,
        name: client.fullName || '',
        companyName: client.company || '',
        streetAddress: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        zip: client.zipCode || '',
        phone: client.phoneWork || client.phoneCell || '',
        email: client.email || '',
        clientType: '',
        additionalContact: client.notes || '',
        attachments: '0',
        openBalance: '0.00'
      }));

      const response = await fetch('/api/clients/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: csvClients }),
      });

      if (response.ok) {
        setClients(updatedClients);
        toast({
          title: "Success",
          description: "Client deleted successfully and updated on server",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  // Create client mutation
  const createClient = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const customerId = generateCustomerId();
      const clientData = {
        ...data,
        customerId,
        dateAdded: new Date().toISOString(),
        profileFolderPath: `/customer_profiles/${customerId}`,
        priority: data.priority || "medium",
        status: data.status || "active"
      };

      // Use the handleCreateClient function instead of API call
      await handleCreateClient(data);
      return clientData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAddClient(false);
      form.reset();
      fetchClients(); // Refresh the client list
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  // Import contacts mutation
  const importContacts = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      console.log('Starting import with:', { fileType: file.type, fileName: file.name, size: file.size });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/http-clients/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      const result = await response.json();
      console.log('Import successful:', result);
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowImport(false);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.importedCount} contacts`,
      });
      fetchClients(); // Refresh the client list
    },
    onError: (error: any) => {
      console.error('Import mutation error:', error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import contacts. Please check file format.",
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteClient = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete client');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  // Update client using file upload system
  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientFormData }) => {
      // Find the client being updated
      const clientToUpdate = clients.find(c => c.customerId === id);
      if (!clientToUpdate) {
        throw new Error('Client not found');
      }

      // Convert updated client data back to CSV format
      // Combine firstName, lastName, and title into name field for CSV
      let combinedName = '';
      if (data.firstName && data.lastName) {
        combinedName = `${data.firstName} ${data.lastName}`;
        if (data.title) {
          combinedName = `${data.title} ${combinedName}`;
        }
      } else if (data.fullName) {
        combinedName = data.fullName;
      }

      const updatedClient = {
        id: clientToUpdate.originalId || 1,
        name: combinedName,
        companyName: data.company || '',
        streetAddress: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        zip: data.zipCode || '',
        phone: data.phoneWork || data.phoneCell || '',
        email: data.email || '',
        clientType: data.title || '', // Store title in clientType field
        additionalContact: data.notes || '',
        attachments: '0',
        openBalance: '0.00'
      };

      // Update the client in the array
      const updatedClients = clients.map(client => {
        if (client.customerId === id) {
          return {
            ...client,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            title: data.title || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            company: data.company || '',
            email: data.email || '',
            phoneWork: data.phoneWork || '',
            phoneCell: data.phoneCell || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            country: data.country || '',
            notes: data.notes || ''
          };
        }
        return client;
      });

      // Convert all clients back to CSV format for upload
      const csvClients = updatedClients.map(client => {
        // Combine firstName, lastName, and title into name field for CSV
        let combinedName = '';
        if (client.firstName && client.lastName) {
          combinedName = `${client.firstName} ${client.lastName}`;
          if (client.title) {
            combinedName = `${client.title} ${combinedName}`;
          }
        } else if (client.fullName) {
          combinedName = client.fullName;
        }

        return {
          id: client.originalId || 1,
          name: combinedName,
          companyName: client.company || '',
          streetAddress: client.address || '',
          city: client.city || '',
          state: client.state || '',
          country: client.country || '',
          zip: client.zipCode || '',
          phone: client.phoneWork || client.phoneCell || '',
          email: client.email || '',
          clientType: client.title || '', // Store title in clientType field
          additionalContact: client.notes || '',
          attachments: '0',
          openBalance: '0.00'
        };
      });

      // Upload the updated client data
      const response = await fetch('/api/clients/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: csvClients }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update client');
      }

      return { updatedClients };
    },
    onSuccess: (data) => {
      // Update local state with the new client data
      setClients(data.updatedClients);
      setShowClientModal(false);
      setSelectedClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully and uploaded to server",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const confirmDeleteClient = (customerId: string) => {
    if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      deleteClientProfile(customerId);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    editForm.reset({
      customerId: client.customerId || "",
      fullName: client.fullName || "",
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      company: client.company || "",
      title: client.title || "",
      email: client.email || "",
      phoneCell: client.phoneCell || "",
      phoneHome: client.phoneHome || "",
      phoneWork: client.phoneWork || "",
      phoneFax: client.phoneFax || "",
      website: client.website || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      country: client.country || "",
      notes: client.notes || "",
      priority: client.priority || "medium",
      status: client.status || "active",
      dateAdded: client.dateAdded || "",
    });
    setShowClientModal(true);
  };

  const onEditSubmit = (data: ClientFormData) => {
    if (selectedClient) {
      updateClient.mutate({ id: selectedClient.customerId, data });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.vcf') && !fileName.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a VCF or CSV file",
        variant: "destructive",
      });
      return;
    }

    importContacts.mutate({ file });
  };

  const onSubmit = (data: ClientFormData) => {
    createClient.mutate(data);
  };

  // Function to check if a client profile is incomplete
  const isProfileIncomplete = (client: any) => {
    const issues = [];
    
    // Check for missing contact information
    if (!client.email && !client.phoneCell && !client.phoneHome && !client.phoneWork) {
      issues.push('No contact information (email or phone)');
    }
    
    // Check for missing address
    if (!client.address || !client.city || !client.state) {
      issues.push('Missing address information');
    }
    
    // Check for very minimal name info
    if (!client.fullName || client.fullName.length < 2) {
      issues.push('Incomplete name information');
    }
    
    // Check for company info when it looks like a business
    if (client.fullName && client.fullName.includes('LLC') || client.fullName.includes('INC') || client.fullName.includes('CORP')) {
      if (!client.company) {
        issues.push('Business name but no company field');
      }
    }
    
    return issues;
  };

  // Get incomplete profiles
  const incompleteProfiles = clients.filter((client: any) => {
    const issues = isProfileIncomplete(client);
    return issues.length > 0;
  }).map((client: any) => ({
    ...client,
    issues: isProfileIncomplete(client)
  }));

  // Get unique companies for filter
  const companies = Array.from(new Set(clients.map((client: any) => client.company).filter(Boolean)));

  const filteredClients = clients.filter((client: any) => {
    const matchesSearch = !searchTerm || 
      client.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phoneCell?.includes(searchTerm);
    
    const matchesCompany = !selectedCompany || selectedCompany === "all" || client.company === selectedCompany;
    
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your client relationships and contacts</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Contacts
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Contacts</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Import contacts from VCF (vCard) or CSV files. Supports Samsung phone exports and most contact formats.
                </p>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">VCF or CSV files only</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vcf,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importContacts.isPending}
                  >
                    {importContacts.isPending ? "Importing..." : "Choose File"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneCell"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cell Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddClient(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createClient.isPending}>
                      {createClient.isPending ? "Creating..." : "Create Client"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative client-search-container">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search clients by name, email, company, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchDropdown(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (searchTerm.trim()) {
                setShowSearchDropdown(true);
              }
            }}
            className="pl-10"
          />
          
          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchTerm.trim() && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((client) => (
                <div
                  key={client.customerId}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => {
                    handleClientClick(client);
                    setShowSearchDropdown(false);
                  }}
                >
                  <div className="font-medium text-sm">{client.fullName}</div>
                  {client.company && (
                    <div className="text-xs text-gray-500">{client.company}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    {client.email && <span>{client.email}</span>}
                    {client.phoneCell && client.email && <span> • </span>}
                    {client.phoneCell && <span>{client.phoneCell}</span>}
                  </div>
                  <div className="text-xs text-gray-300">ID: {client.customerId}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* No Results Message */}
          {showSearchDropdown && searchTerm.trim() && searchResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              <div className="px-4 py-3 text-gray-500 text-sm">
                No clients found matching "{searchTerm}"
              </div>
            </div>
          )}
        </div>
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company || "unknown"}>
                {company || "Unknown Company"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setSearchTerm(""); setSelectedCompany(""); }}>
          <Filter className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Companies</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
              <Building className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">With Email</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c: any) => c.email).length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">With Phone</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c: any) => c.phoneCell || c.phoneWork || c.phoneHome).length}
                </p>
              </div>
              <Phone className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incomplete Profiles</p>
                <p className="text-2xl font-bold text-red-600">{incompleteProfiles.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incomplete Profiles Section */}
      {incompleteProfiles.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Incomplete Customer Profiles ({incompleteProfiles.length})
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  These customer profiles are missing important information. Click on any profile to edit and complete.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsIncompleteProfilesExpanded(!isIncompleteProfilesExpanded)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                {isIncompleteProfilesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isIncompleteProfilesExpanded && (
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {incompleteProfiles.slice(0, 20).map((client: any) => (
                  <div 
                    key={client.customerId}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                    onClick={() => handleClientClick(client)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {client.fullName || 'Unnamed Client'}
                        </h4>
                        {client.company && (
                          <Badge variant="outline" className="text-xs">
                            {client.company}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.issues.map((issue: string, index: number) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      Fix Issues
                    </Button>
                  </div>
                ))}
                {incompleteProfiles.length > 20 && (
                  <div className="text-center text-sm text-gray-500 pt-2 border-t">
                    Showing first 20 of {incompleteProfiles.length} incomplete profiles
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Clients List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Clients ({filteredClients.length})</h2>
        
        {isLoadingClients ? (
          <div className="text-center py-8">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by adding your first client"}
              </p>
              <Button onClick={() => setShowAddClient(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClients.map((client: Client) => (
                  <div key={client.customerId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => handleClientClick(client)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{client.fullName}</h3>
                            {client.company && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{client.company}</p>
                            )}
                            {client.title && (
                              <p className="text-xs text-gray-500">{client.title}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-4">
                            {client.email && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">{client.email}</span>
                              </div>
                            )}
                            {(client.phoneCell || client.phoneWork || client.phoneHome) && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">{client.phoneCell || client.phoneWork || client.phoneHome}</span>
                              </div>
                            )}
                            {client.status && (
                              <Badge variant="outline" className="text-xs">
                                {client.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteClient(client.customerId);
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {client.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {client.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500">
                        Added {new Date(client.dateAdded).toLocaleDateString()}
                      </p>
                      <Badge variant={
                        client.priority === 'urgent' ? 'destructive' :
                        client.priority === 'high' ? 'default' :
                        client.priority === 'medium' ? 'secondary' : 'outline'
                      }>
                        {client.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Client Edit Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client - {selectedClient?.fullName}</DialogTitle>
            <DialogDescription>
              Edit client information, manage branches and contacts, view invoices, and manage projects.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Client Information</TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Contact Network
              </TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="phoneCell"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cell Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="phoneWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="phoneHome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="phoneFax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fax</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowClientModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateClient.isPending}>
                      {updateClient.isPending ? "Updating..." : "Update Client"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              {selectedClient && (
                <ContactRelationshipManager 
                  client={{
                    id: selectedClient.customerId || selectedClient.fullName.replace(/\s+/g, '_'),
                    fullName: selectedClient.fullName,
                    company: selectedClient.company || selectedClient.fullName,
                    email: selectedClient.email || "",
                    phoneCell: selectedClient.phoneCell || "",
                    address: {
                      street: selectedClient.address,
                      city: selectedClient.city,
                      state: selectedClient.state,
                      zip: selectedClient.zipCode,
                      country: selectedClient.country
                    }
                  }}
                  onUpdate={() => {
                    // Refresh client data when contacts/locations are updated
                    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Client Invoices</h3>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">Invoice integration with HTTP server coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Client Projects</h3>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">Project integration with HTTP server coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}