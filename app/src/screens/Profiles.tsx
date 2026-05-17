import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Users,
  Shield,
  ChevronRight,
  Filter as FilterIcon,
  Globe,
  Ban,
  Check,
  Search,
  SlidersHorizontal,
  ArrowRightLeft,
  Lock,
  Unlock,
  CircleDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Service, Filter } from '@/types/controld';

const toSearchableText = (value: unknown) => String(value ?? '').toLowerCase();

const SERVICE_STATUS_LABELS: Record<number, { label: string; color: string; icon: typeof Ban }> = {
  0: { label: 'Blocked', color: 'text-red-500', icon: Ban },
  1: { label: 'Allowed', color: 'text-emerald-500', icon: Check },
  2: { label: 'Bypass', color: 'text-amber-500', icon: Unlock },
};

export function Profiles() {
  const profiles = useAppStore((state) => state.profiles);
  const services = useAppStore((state) => state.services);
  const profileServices = useAppStore((state) => state.profileServices);
  const filters = useAppStore((state) => state.filters);
  const devices = useAppStore((state) => state.devices);
  const loadProfileServices = useAppStore((state) => state.loadProfileServices);
  const updateProfileServices = useAppStore((state) => state.updateProfileServices);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('services');

  const profile = profiles.find((p) => p.PK === selectedProfile);
  const profileDevices = devices.filter((d) => d.profile === selectedProfile);

  // Load per-profile services when selection changes
  useEffect(() => {
    if (selectedProfile) {
      loadProfileServices(selectedProfile);
    }
  }, [selectedProfile, loadProfileServices]);

  // Use per-profile services if available, otherwise fall back to global catalog
  const currentProfileServices = selectedProfile
    ? profileServices[selectedProfile] ?? services
    : services;

  const filteredServices = currentProfileServices.filter(
    (s: Service) =>
      toSearchableText(s.name).includes(searchQuery.toLowerCase()) ||
      toSearchableText(s.category).includes(searchQuery.toLowerCase())
  );

  const filteredFilters = filters.filter(
    (f: Filter) =>
      toSearchableText(f.name).includes(searchQuery.toLowerCase()) ||
      toSearchableText(f.category).includes(searchQuery.toLowerCase())
  );

  // Group services by category
  const servicesByCategory = filteredServices.reduce(
    (acc: Record<string, Service[]>, s: Service) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {}
  );

  const handleServiceToggle = (serviceId: string, currentStatus: number) => {
    if (!selectedProfile) return;
    // Cycle through: blocked (0) -> allowed (1) -> bypass (2) -> blocked (0)
    const newStatus = currentStatus === 0 ? 1 : currentStatus === 1 ? 2 : 0;
    updateProfileServices(selectedProfile, serviceId, newStatus);
  };

  const blockedCount = currentProfileServices.filter((s: Service) => s.status === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Profiles</h2>
        <p className="text-muted-foreground mt-1">
          Manage filtering profiles for your family
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Select a Profile
          </h3>
          {profiles.map((p) => (
            <Card
              key={p.PK}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                selectedProfile === p.PK
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/30'
              )}
              onClick={() => setSelectedProfile(p.PK)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        selectedProfile === p.PK ? 'bg-primary' : 'bg-secondary'
                      )}
                    >
                      <Users
                        className={cn(
                          'w-5 h-5',
                          selectedProfile === p.PK
                            ? 'text-primary-foreground'
                            : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 transition-transform',
                      selectedProfile === p.PK
                        ? 'rotate-90 text-primary'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {devices.filter((d) => d.profile === p.PK).length} devices
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {blockedCount} blocked
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          {profile ? (
            <Card className="glass-card h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      {profile.name}
                    </CardTitle>
                    <CardDescription>{profile.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Default Rule */}
                {profile.default_rule && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <CircleDot className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Default Rule</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {profile.default_rule.action} — applies when no specific rule matches
                      </p>
                    </div>
                  </div>
                )}

                {/* Profile Policies */}
                {profile.policies && (
                  <div className="flex flex-wrap gap-2">
                    {profile.policies.block_bypass === 1 && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Bypass Blocked
                      </Badge>
                    )}
                    {profile.policies.safesearch === 1 && (
                      <Badge variant="secondary" className="text-xs">
                        <Search className="w-3 h-3 mr-1" />
                        Safe Search
                      </Badge>
                    )}
                  </div>
                )}

                {/* Device assignment */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Devices</h4>
                  <div className="flex flex-wrap gap-2">
                    {profileDevices.length > 0 ? (
                      profileDevices.map((d) => (
                        <Badge key={d.PK} variant="secondary" className="text-xs">
                          {d.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No devices assigned</p>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="services" className="text-xs">
                      <Globe className="w-3.5 h-3.5 mr-1.5" />
                      Services
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="text-xs">
                      <FilterIcon className="w-3.5 h-3.5 mr-1.5" />
                      Filters
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <TabsContent value="services" className="mt-0">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {Object.entries(servicesByCategory).map(([category, svcs]) => (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                              <SlidersHorizontal className="w-3 h-3" />
                              {category}
                            </h5>
                            <div className="grid grid-cols-2 gap-2">
                              {svcs.map((service) => {
                                const statusMeta =
                                  SERVICE_STATUS_LABELS[service.status] ??
                                  SERVICE_STATUS_LABELS[1];
                                const StatusIcon = statusMeta.icon;
                                return (
                                  <div
                                    key={service.PK}
                                    className={cn(
                                      'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                                      service.status === 0
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : service.status === 2
                                          ? 'bg-amber-500/5 border-amber-500/20'
                                          : 'bg-secondary/30 border-border hover:border-primary/30'
                                    )}
                                    onClick={() =>
                                      handleServiceToggle(service.PK, service.status)
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      <StatusIcon
                                        className={cn('w-4 h-4', statusMeta.color)}
                                      />
                                      <div>
                                        <span className="text-sm">{service.name}</span>
                                        <p className={cn('text-[10px]', statusMeta.color)}>
                                          {statusMeta.label}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {service.status === 2 && (
                                        <ArrowRightLeft className="w-3 h-3 text-amber-500" />
                                      )}
                                      <Switch
                                        checked={service.status !== 0}
                                        onCheckedChange={() => {}}
                                        className="pointer-events-none"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {Object.keys(servicesByCategory).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            No services found matching &quot;{searchQuery}&quot;
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="filters" className="mt-0">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {filteredFilters.map((filter) => (
                          <div
                            key={filter.PK}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border transition-all',
                              filter.status === 1
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-secondary/30 border-border'
                            )}
                          >
                            <div>
                              <p className="text-sm font-medium">{filter.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {filter.description}
                                {filter.count && ` · ${filter.count.toLocaleString()} domains`}
                              </p>
                            </div>
                            <Switch
                              checked={filter.status === 1}
                              onCheckedChange={() => {}}
                            />
                          </div>
                        ))}
                        {filteredFilters.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            No filters found matching &quot;{searchQuery}&quot;
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Select a profile to manage
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a profile from the list to view and edit its settings
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
