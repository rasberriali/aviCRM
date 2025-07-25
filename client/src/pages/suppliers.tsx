import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe, Phone, Mail } from 'lucide-react';
// import crestronLogo from '@assets/crestron-logo-1_1751897271219.png';

interface Supplier {
  id: string;
  name: string;
  website: string;
  logoUrl: string;
  description: string;
  phone?: string;
  email?: string;
  categories: string[];
  color: string;
}

const suppliers: Supplier[] = [
  {
    id: 'crestron',
    name: 'Crestron',
    website: 'https://www.crestron.com',
      logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjUwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0UzMUUyNCI+QklBTVA8L3RleHQ+PC9zdmc+',
    description: 'Leading manufacturer of automation and control solutions for commercial and residential applications.',
    phone: '1-800-237-2041',
    email: 'sales@crestron.com',
    categories: ['Control Systems', 'Audio/Video', 'Automation'],
    color: '#0066CC'
  },
  {
    id: 'biamp',
    name: 'Biamp',
    website: 'https://www.biamp.com',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjUwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0UzMUUyNCI+QklBTVA8L3RleHQ+PC9zdmc+',
    description: 'Professional audio solutions including conferencing, paging, and sound reinforcement systems.',
    phone: '1-800-826-1457',
    email: 'sales@biamp.com',
    categories: ['Audio Systems', 'Conferencing', 'Sound Reinforcement'],
    color: '#E31E24'
  },
  {
    id: 'shure',
    name: 'Shure',
    website: 'https://www.shure.com',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjUwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMDAwMCI+U0hVUkU8L3RleHQ+PC9zdmc+',
    description: 'Premium microphones, wireless systems, and audio electronics for professional applications.',
    phone: '1-800-25-SHURE',
    email: 'info@shure.com',
    categories: ['Microphones', 'Wireless Systems', 'Audio Electronics'],
    color: '#000000'
  },
  {
    id: 'tdsynnex',
    name: 'TD SYNNEX',
    website: 'https://www.tdsynnex.com',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0IHg9IjUwIiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwNTJDQyI+VEQgU1lOTkVYPC90ZXh0Pjwvc3ZnPg==',
    description: 'Global technology distributor providing comprehensive IT solutions and services.',
    phone: '1-800-756-3888',
    email: 'info@tdsynnex.com',
    categories: ['Distribution', 'IT Solutions', 'Technology Services'],
    color: '#0052CC'
  }
];

export default function Suppliers() {
  const handleVisitWebsite = (website: string) => {
    window.open(website, '_blank', 'noopener,noreferrer');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Suppliers</h1>
        <p className="text-slate-600">Quick access to our key supplier partners and their resources</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${supplier.color}15` }}
                >
                  <img
                    src={supplier.logoUrl}
                    alt={`${supplier.name} logo`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      // Fallback to text if logo fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span style="color: ${supplier.color}; font-weight: bold; font-size: 12px;">${supplier.name}</span>`;
                      }
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVisitWebsite(supplier.website)}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 line-clamp-3">
                {supplier.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {supplier.categories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${supplier.color}20`,
                      color: supplier.color
                    }}
                  >
                    {category}
                  </span>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => handleVisitWebsite(supplier.website)}
                  style={{ backgroundColor: supplier.color }}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit Website
                </Button>

                <div className="flex gap-2">
                  {supplier.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCall(supplier.phone!)}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                  )}
                  {supplier.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEmail(supplier.email!)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-semibold text-slate-900 mb-2">Need to add a supplier?</h3>
        <p className="text-sm text-slate-600">
          Contact your system administrator to add new supplier links and information.
        </p>
      </div>
    </div>
  );
}