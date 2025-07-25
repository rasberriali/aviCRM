import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Star,
  Users,
  Network,
  Building,
  UserCircle,
  Contact,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: number;
  clientId: string | number;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  email?: string;
  phoneCell?: string;
  phoneWork?: string;
  phoneHome?: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
  preferredContact: string;
  locationId?: number;
}

interface Location {
  id: number;
  clientId: string | number;
  name: string;
  locationName?: string; // Keep for backward compatibility
  address: any;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  isActive: boolean;
  notes?: string;
}

interface Client {
  id: string | number;
  fullName: string;
  company?: string;
  email?: string;
  phoneCell?: string;
  address: any;
}

interface ContactRelationshipManagerProps {
  client: Client;
  onUpdate?: () => void;
}

export function ContactRelationshipManager({ client, onUpdate }: ContactRelationshipManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  // Load contacts and locations
  useEffect(() => {
    loadContacts();
    loadLocations();
  }, [client.id]);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/locations`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address || typeof address !== 'object') return '';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getContactInitials = (contact: Contact) => {
    return `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
  };

  const getLocationIcon = (location: Location) => {
    const name = (location.locationName || location.name || '').toLowerCase();
    if (name.includes('warehouse') || name.includes('storage')) return Building;
    if (name.includes('office') || name.includes('headquarters')) return Building2;
    return MapPin;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Contact Network
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage locations and contacts for {client.company || client.fullName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddLocation(true)}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Add Location
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddContact(true)}
            className="flex items-center gap-2"
          >
            <UserCircle className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Tabs defaultValue="network" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network View
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Locations ({locations.length})
          </TabsTrigger>
        </TabsList>

        {/* Network View - Visual relationship map */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-6">
                {/* Company Center */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{client.company || client.fullName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Primary Company</p>
                  </div>
                </div>

                {/* Locations connected to company */}
                {locations.length > 0 && (
                  <div className="w-full">
                    <Separator className="my-4" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                      Locations ({locations.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {locations.map((location) => {
                        const IconComponent = getLocationIcon(location);
                        const locationContacts = contacts.filter(c => c.locationId === location.id);
                        
                        return (
                          <Card key={location.id} className="relative border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <h5 className="font-medium">{location.name || location.locationName}</h5>
                                    {location.isPrimary && (
                                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingLocation(location)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {formatAddress(location.address) && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {formatAddress(location.address)}
                                </p>
                              )}
                              
                              {/* Contacts at this location */}
                              {locationContacts.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Contacts ({locationContacts.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {locationContacts.map((contact) => (
                                      <div
                                        key={contact.id}
                                        className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                                        onClick={() => setEditingContact(contact)}
                                      >
                                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                                          {getContactInitials(contact)}
                                        </div>
                                        <span className="text-xs">{contact.firstName} {contact.lastName}</span>
                                        {contact.isPrimary && <Star className="h-3 w-3 text-yellow-500" />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Unassigned contacts */}
                {contacts.filter(c => !c.locationId).length > 0 && (
                  <div className="w-full">
                    <Separator className="my-4" />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                      General Contacts ({contacts.filter(c => !c.locationId).length})
                    </h4>
                    <div className="flex flex-wrap justify-center gap-3">
                      {contacts.filter(c => !c.locationId).map((contact) => (
                        <div
                          key={contact.id}
                          className="flex flex-col items-center space-y-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => setEditingContact(contact)}
                        >
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                            {getContactInitials(contact)}
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">{contact.firstName} {contact.lastName}</p>
                            {contact.title && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">{contact.title}</p>
                            )}
                            {contact.isPrimary && <Star className="h-3 w-3 text-yellow-500 mx-auto mt-1" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts List View */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => {
              const location = locations.find(l => l.id === contact.locationId);
              
              return (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getContactInitials(contact)}
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary && <Star className="inline h-4 w-4 text-yellow-500 ml-1" />}
                          </h4>
                          {contact.title && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{contact.title}</p>
                          )}
                          {contact.department && (
                            <Badge variant="outline" className="text-xs mt-1">{contact.department}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${contact.email}`} className="hover:text-blue-600">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      
                      {(contact.phoneCell || contact.phoneWork) && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phoneCell || contact.phoneWork}</span>
                        </div>
                      )}

                      {location && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{location.locationName}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Locations List View */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((location) => {
              const IconComponent = getLocationIcon(location);
              const locationContacts = contacts.filter(c => c.locationId === location.id);
              
              return (
                <Card key={location.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {location.locationName}
                            {location.isPrimary && <Star className="inline h-4 w-4 text-yellow-500 ml-1" />}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {locationContacts.length} contact{locationContacts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLocation(location)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm">
                      {formatAddress(location.address) && (
                        <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{formatAddress(location.address)}</span>
                        </div>
                      )}
                      
                      {location.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{location.phone}</span>
                        </div>
                      )}

                      {location.email && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${location.email}`} className="hover:text-blue-600">
                            {location.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Show contacts at this location */}
                    {locationContacts.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Contacts at this location:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {locationContacts.map((contact) => (
                            <Badge
                              key={contact.id}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                              onClick={() => setEditingContact(contact)}
                            >
                              {contact.firstName} {contact.lastName}
                              {contact.isPrimary && <Star className="h-3 w-3 text-yellow-500 ml-1" />}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        clientId={client.id}
        locations={locations}
        onSuccess={() => {
          loadContacts();
          setShowAddContact(false);
          onUpdate?.();
        }}
      />

      {/* Add Location Dialog */}
      <AddLocationDialog
        open={showAddLocation}
        onOpenChange={setShowAddLocation}
        clientId={client.id}
        onSuccess={() => {
          loadLocations();
          setShowAddLocation(false);
          onUpdate?.();
        }}
      />

      {/* Edit Contact Dialog */}
      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          locations={locations}
          onClose={() => setEditingContact(null)}
          onSuccess={() => {
            loadContacts();
            setEditingContact(null);
            onUpdate?.();
          }}
        />
      )}

      {/* Edit Location Dialog */}
      {editingLocation && (
        <EditLocationDialog
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSuccess={() => {
            loadLocations();
            setEditingLocation(null);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

// Add Contact Dialog Component
function AddContactDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  locations, 
  onSuccess 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | number;
  locations: Location[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    title: '',
    department: '',
    email: '',
    phoneCell: '',
    phoneWork: '',
    phoneHome: '',
    locationId: '',
    isPrimary: false,
    preferredContact: 'email',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Adding contact for client:', clientId, 'with data:', formData);
      
      const response = await fetch(`/api/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          locationId: formData.locationId && formData.locationId !== 'none' ? parseInt(formData.locationId) : null
        })
      });

      const responseText = await response.text();
      console.log('Contact creation response:', response.status, responseText);

      if (response.ok) {
        toast({ title: "Contact added successfully" });
        onSuccess();
        setFormData({
          firstName: '',
          lastName: '',
          title: '',
          department: '',
          email: '',
          phoneCell: '',
          phoneWork: '',
          phoneHome: '',
          locationId: '',
          isPrimary: false,
          preferredContact: 'email',
          notes: ''
        });
      } else {
        const errorMessage = responseText || 'Failed to add contact';
        console.error('Contact creation failed:', errorMessage);
        toast({ 
          title: "Failed to add contact", 
          description: errorMessage,
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({ 
        title: "Error adding contact", 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="phoneCell">Cell Phone</Label>
              <Input
                id="phoneCell"
                value={formData.phoneCell}
                onChange={(e) => setFormData({ ...formData, phoneCell: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phoneWork">Work Phone</Label>
              <Input
                id="phoneWork"
                value={formData.phoneWork}
                onChange={(e) => setFormData({ ...formData, phoneWork: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phoneHome">Home Phone</Label>
              <Input
                id="phoneHome"
                value={formData.phoneHome}
                onChange={(e) => setFormData({ ...formData, phoneHome: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={formData.locationId} onValueChange={(value) => setFormData({ ...formData, locationId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.locationName || location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preferredContact">Preferred Contact</Label>
              <Select value={formData.preferredContact} onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isPrimary">Mark as primary contact</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Location Dialog Component
function AddLocationDialog({ 
  open, 
  onOpenChange, 
  clientId, 
  onSuccess 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | number;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    locationName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    phone: '',
    email: '',
    isPrimary: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: formData.locationName,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country
          },
          phone: formData.phone,
          email: formData.email,
          isPrimary: formData.isPrimary,
          notes: formData.notes
        })
      });

      if (response.ok) {
        toast({ title: "Location added successfully" });
        onSuccess();
        setFormData({
          locationName: '',
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'USA',
          phone: '',
          email: '',
          isPrimary: false,
          notes: ''
        });
      } else {
        toast({ title: "Failed to add location", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error adding location", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="locationName">Location Name *</Label>
            <Input
              id="locationName"
              placeholder="e.g., Main Office, Warehouse, Branch #2"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isPrimary">Mark as primary location</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Contact Dialog Component
function EditContactDialog({ 
  contact, 
  locations, 
  onClose, 
  onSuccess 
}: {
  contact: Contact;
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    title: contact.title || '',
    department: contact.department || '',
    email: contact.email || '',
    phoneCell: contact.phoneCell || '',
    phoneWork: contact.phoneWork || '',
    phoneHome: contact.phoneHome || '',
    locationId: contact.locationId?.toString() || '',
    isPrimary: contact.isPrimary || false,
    preferredContact: contact.preferredContact || 'email',
    notes: contact.notes || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${contact.clientId}/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          locationId: formData.locationId ? parseInt(formData.locationId) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      toast({
        title: "Success",
        description: "Contact updated successfully"
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* Title and Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Department"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
            />
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Cell Phone</label>
              <Input
                value={formData.phoneCell}
                onChange={(e) => setFormData({ ...formData, phoneCell: e.target.value })}
                placeholder="Cell phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Work Phone</label>
              <Input
                value={formData.phoneWork}
                onChange={(e) => setFormData({ ...formData, phoneWork: e.target.value })}
                placeholder="Work phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Home Phone</label>
              <Input
                value={formData.phoneHome}
                onChange={(e) => setFormData({ ...formData, phoneHome: e.target.value })}
                placeholder="Home phone"
              />
            </div>
          </div>

          {/* Location and Primary Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Location</label>
              <Select
                value={formData.locationId}
                onValueChange={(value) => setFormData({ ...formData, locationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id.toString()}>
                      {location.name || location.locationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Preferred Contact Method</label>
              <Select
                value={formData.preferredContact}
                onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Primary Contact Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="isPrimary" className="text-sm font-medium">
              Primary Contact
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Location Dialog Component
function EditLocationDialog({ 
  location, 
  onClose, 
  onSuccess 
}: {
  location: Location;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: location.name || location.locationName || '',
    address: location.address || '',
    city: location.city || '',
    state: location.state || '',
    zip: location.zip || '',
    isPrimary: location.isPrimary || false,
    notes: location.notes || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${location.clientId}/locations/${location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      toast({
        title: "Success",
        description: "Location updated successfully"
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Location Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Office, Warehouse, etc."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ZIP</label>
              <Input
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="ZIP code"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrimaryLocation"
              checked={formData.isPrimary}
              onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="isPrimaryLocation" className="text-sm font-medium">
              Primary Location
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}