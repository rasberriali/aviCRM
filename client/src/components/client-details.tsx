import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, User, Phone, Mail, Edit, Trash2, Star, Network } from "lucide-react";
import { ContactRelationshipManager } from "./contact-relationship-manager";

const locationSchema = z.object({
  locationName: z.string().min(1, "Location name is required"),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
});

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phoneCell: z.string().optional(),
  phoneWork: z.string().optional(),
  phoneHome: z.string().optional(),
  locationId: z.number().optional(),
  isPrimary: z.boolean().default(false),
  preferredContact: z.string().default("email"),
  notes: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

interface ClientDetailsProps {
  clientId: number;
  clientName: string;
}

export function ClientDetails({ clientId, clientName }: ClientDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("network");
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [editingContact, setEditingContact] = useState<any>(null);

  const locationForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      locationName: "",
      address: {},
      phone: "",
      email: "",
      isPrimary: false,
      notes: "",
    },
  });

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      title: "",
      department: "",
      email: "",
      phoneCell: "",
      phoneWork: "",
      phoneHome: "",
      isPrimary: false,
      preferredContact: "email",
      notes: "",
    },
  });

  // Fetch client locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}/locations`],
    enabled: !!clientId,
  });

  // Fetch client contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}/contacts`],
    enabled: !!clientId,
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: (data: LocationFormData) =>
      apiRequest("POST", `/api/clients/${clientId}/locations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/locations`] });
      setLocationDialogOpen(false);
      locationForm.reset();
      toast({ title: "Location added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add location", variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LocationFormData> }) =>
      apiRequest("PUT", `/api/client-locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/locations`] });
      setLocationDialogOpen(false);
      setEditingLocation(null);
      locationForm.reset();
      toast({ title: "Location updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/client-locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/locations`] });
      toast({ title: "Location deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  // Contact mutations
  const createContactMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      apiRequest("POST", `/api/clients/${clientId}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      setContactDialogOpen(false);
      contactForm.reset();
      toast({ title: "Contact added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContactFormData> }) =>
      apiRequest("PUT", `/api/client-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      setContactDialogOpen(false);
      setEditingContact(null);
      contactForm.reset();
      toast({ title: "Contact updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update contact", variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/client-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
      toast({ title: "Contact deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    },
  });

  const handleLocationSubmit = (data: LocationFormData) => {
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, data });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  const handleContactSubmit = (data: ContactFormData) => {
    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, data });
    } else {
      createContactMutation.mutate(data);
    }
  };

  const openLocationDialog = (location?: any) => {
    setEditingLocation(location);
    if (location) {
      locationForm.reset({
        locationName: location.locationName || "",
        address: location.address || {},
        phone: location.phone || "",
        email: location.email || "",
        isPrimary: location.isPrimary || false,
        notes: location.notes || "",
      });
    } else {
      locationForm.reset();
    }
    setLocationDialogOpen(true);
  };

  const openContactDialog = (contact?: any) => {
    setEditingContact(contact);
    if (contact) {
      contactForm.reset({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        title: contact.title || "",
        department: contact.department || "",
        email: contact.email || "",
        phoneCell: contact.phoneCell || "",
        phoneWork: contact.phoneWork || "",
        phoneHome: contact.phoneHome || "",
        locationId: contact.locationId || undefined,
        isPrimary: contact.isPrimary || false,
        preferredContact: contact.preferredContact || "email",
        notes: contact.notes || "",
      });
    } else {
      contactForm.reset();
    }
    setContactDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{clientName} - Details</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-4">
          <ContactRelationshipManager 
            client={{
              id: clientId,
              fullName: clientName,
              company: clientName, // Using clientName as company for now
              email: "",
              phoneCell: "",
              address: {}
            }}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/locations`] });
              queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/contacts`] });
            }}
          />
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">Branch Locations</h4>
            <Button onClick={() => openLocationDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>

          {locationsLoading ? (
            <div>Loading locations...</div>
          ) : (
            <div className="grid gap-4">
              {locations.map((location: any) => (
                <Card key={location.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm">{location.locationName}</CardTitle>
                        {location.isPrimary && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLocationDialog(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocationMutation.mutate(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-600 space-y-1">
                      {location.address && (
                        <div>{`${location.address.street || ""}, ${location.address.city || ""}, ${location.address.state || ""} ${location.address.zip || ""}`.trim()}</div>
                      )}
                      {location.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {location.phone}
                        </div>
                      )}
                      {location.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {location.email}
                        </div>
                      )}
                      {location.notes && <div className="italic">{location.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">Contact Persons</h4>
            <Button onClick={() => openContactDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          {contactsLoading ? (
            <div>Loading contacts...</div>
          ) : (
            <div className="grid gap-4">
              {contacts.map((contact: any) => (
                <Card key={contact.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-600" />
                        <CardTitle className="text-sm">
                          {contact.firstName} {contact.lastName}
                        </CardTitle>
                        {contact.isPrimary && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openContactDialog(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-600 space-y-1">
                      {contact.title && <div className="font-medium">{contact.title}</div>}
                      {contact.department && <div>{contact.department}</div>}
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phoneWork && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Work: {contact.phoneWork}
                        </div>
                      )}
                      {contact.phoneCell && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Cell: {contact.phoneCell}
                        </div>
                      )}
                      {contact.notes && <div className="italic">{contact.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>
          <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit(handleLocationSubmit)} className="space-y-4">
              <FormField
                control={locationForm.control}
                name="locationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Office, Warehouse, Branch #2..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={locationForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="location@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={locationForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Primary Location</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as the main location for this client
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={locationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this location..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLocationMutation.isPending || updateLocationMutation.isPending}>
                  {editingLocation ? "Update" : "Add"} Location
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
          </DialogHeader>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(handleContactSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Manager, Director..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="IT, Sales, Operations..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={contactForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="phoneWork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="phoneCell"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cell Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 987-6543" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={contactForm.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Location</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locations.map((location: any) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.locationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={contactForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Primary Contact</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as the main contact for this client
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={contactForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes about this contact..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContactDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createContactMutation.isPending || updateContactMutation.isPending}>
                  {editingContact ? "Update" : "Add"} Contact
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}