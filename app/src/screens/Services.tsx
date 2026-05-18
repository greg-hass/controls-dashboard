import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Search,
  Ban,
  Check,
  Globe,
  Gamepad2,
  Tv,
  MessageCircle,
  ShoppingCart,
  Newspaper,
  GraduationCap,
  Landmark,
  Music,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Service, ServiceCategory, Profile } from '@/types/controld';
import { collectRouteLocations } from '@/services/controldData';

const categoryIcons: Record<string, React.ReactNode> = {
  social: <Globe className="w-4 h-4" />,
  streaming: <Tv className="w-4 h-4" />,
  gaming: <Gamepad2 className="w-4 h-4" />,
  communication: <MessageCircle className="w-4 h-4" />,
  shopping: <ShoppingCart className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  education: <GraduationCap className="w-4 h-4" />,
  finance: <Landmark className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  social: 'bg-blue-500/10 text-blue-500',
  streaming: 'bg-purple-500/10 text-purple-500',
  gaming: 'bg-amber-500/10 text-amber-500',
  communication: 'bg-emerald-500/10 text-emerald-500',
  shopping: 'bg-rose-500/10 text-rose-500',
  news: 'bg-cyan-500/10 text-cyan-500',
  education: 'bg-teal-500/10 text-teal-500',
  finance: 'bg-indigo-500/10 text-indigo-500',
  music: 'bg-pink-500/10 text-pink-500',
};

const toSearchableText = (value: unknown) => String(value ?? '').toLowerCase();

export function Services() {
  const services = useAppStore((state) => state.services);
  const profileServices = useAppStore((state) => state.profileServices);
  const serviceCategories = useAppStore((state) => state.serviceCategories);
  const profiles = useAppStore((state) => state.profiles);
  const loadProfileServices = useAppStore((state) => state.loadProfileServices);
  const updateProfileServices = useAppStore((state) => state.updateProfileServices);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const selectedProfile = selectedProfileId || profiles[0]?.PK || '';
  const currentServices = selectedProfile
    ? profileServices[selectedProfile] ?? services
    : services;
  const availableRouteLocations = collectRouteLocations(currentServices);

  useEffect(() => {
    if (selectedProfile) {
      loadProfileServices(selectedProfile);
    }
  }, [loadProfileServices, selectedProfile, services.length]);

  const filteredServices = currentServices.filter((s: Service) => {
    const matchesSearch = toSearchableText(s.name).includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const servicesByCategory = filteredServices.reduce((acc: Record<string, Service[]>, s: Service) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const handleToggleService = (serviceId: string, currentStatus: number) => {
    if (!selectedProfile) return;
    const newStatus = currentStatus === 0 ? 1 : 0;
    updateProfileServices(selectedProfile, serviceId, newStatus);
  };

  const handleRouteService = (serviceId: string, location: string) => {
    if (!selectedProfile) return;
    if (location === 'default') {
      updateProfileServices(selectedProfile, serviceId, 1);
      return;
    }
    updateProfileServices(selectedProfile, serviceId, 3, location);
  };

  // Stats
  const totalBlocked = currentServices.filter((s: Service) => s.status === 0).length;
  const totalRouted = currentServices.filter((s: Service) => s.status === 3).length;
  const totalAllowed = currentServices.filter((s: Service) => s.status !== 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Services Directory</h2>
          <p className="text-muted-foreground mt-1">
            Browse and manage service blocking across profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{totalBlocked} blocked</Badge>
          <Badge variant="outline">{totalRouted} routed</Badge>
          <Badge variant="default">{totalAllowed} allowed</Badge>
        </div>
      </div>

      {/* Profile Selector */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Managing profile:</span>
            <div className="flex gap-2 flex-wrap">
              {profiles.map((profile: Profile) => (
                <Button
                  key={profile.PK}
                  variant={selectedProfile === profile.PK ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProfileId(profile.PK)}
                  className="text-xs"
                >
                  {profile.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <ScrollArea className="w-full">
          <TabsList className="w-max flex-nowrap">
            <TabsTrigger value="all" className="text-xs">
              All ({currentServices.length})
            </TabsTrigger>
            {serviceCategories.map((cat: ServiceCategory) => (
              <TabsTrigger key={cat.PK} value={cat.PK} className="text-xs">
                {String(cat.name ?? cat.PK)} ({currentServices.filter((s: Service) => s.category === cat.PK).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value={activeCategory} className="mt-4">
          {activeCategory === 'all' ? (
            <div className="space-y-6">
              {Object.entries(servicesByCategory).map(([category, svcs]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', categoryColors[category]?.split(' ')[0] || 'bg-secondary')}>
                      {categoryIcons[category] || <Globe className="w-4 h-4" />}
                    </div>
                    <h3 className="text-sm font-semibold capitalize">{category}</h3>
                    <Badge variant="outline" className="text-xs ml-2">
                      {svcs.filter((s) => s.status === 0).length} blocked
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {svcs.map((service) => (
                      <ServiceCard
                        key={service.PK}
                        service={service}
                        category={category}
                        onToggle={() => handleToggleService(service.PK, service.status)}
                        onRoute={(location) => handleRouteService(service.PK, location)}
                        fallbackRouteLocations={availableRouteLocations}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.PK}
                  service={service}
                  category={service.category}
                  onToggle={() => handleToggleService(service.PK, service.status)}
                  onRoute={(location) => handleRouteService(service.PK, location)}
                  fallbackRouteLocations={availableRouteLocations}
                />
              ))}
            </div>
          )}

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No services found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServiceCard({
  service,
  category,
  onToggle,
  onRoute,
  fallbackRouteLocations,
}: {
  service: Service;
  category: string;
  onToggle: () => void;
  onRoute: (location: string) => void;
  fallbackRouteLocations: string[];
}) {
  const routeValue = service.status === 3 && service.via ? service.via : 'default';
  const routeLocations = service.locations?.length ? service.locations : fallbackRouteLocations;

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md',
        service.status === 0
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-card border-border hover:border-primary/30'
      )}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              categoryColors[category]?.split(' ')[0] || 'bg-secondary'
            )}>
              {categoryIcons[category] || <Globe className="w-4 h-4" />}
            </div>
            <div>
            <p className="text-sm font-medium">{String(service.name ?? service.PK)}</p>
            <p className="text-xs text-muted-foreground capitalize">{category}</p>
          </div>
        </div>
        <Switch
          checked={service.status !== 0}
          onCheckedChange={() => {}}
          className="pointer-events-none"
        />
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {service.status === 0 ? (
          <>
            <Ban className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-500">Blocked</span>
          </>
        ) : service.status === 3 ? (
          <>
            <Globe className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-blue-500">Routed via {service.via}</span>
          </>
        ) : (
          <>
            <Check className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-500">Allowed</span>
          </>
        )}
      </div>
      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
        <Select value={routeValue} onValueChange={onRoute} disabled={routeLocations.length === 0}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Route location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default route</SelectItem>
            {routeLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
