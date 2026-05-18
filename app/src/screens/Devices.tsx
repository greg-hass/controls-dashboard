import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Smartphone,
  Router,
  Users,
  Copy,
  CheckCircle2,
  Clock,
  Activity,
  Search,
  Filter,
  MoreHorizontal,
  Ban,
  RefreshCcw,
  Clock3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Device } from '@/types/controld';
import { toast } from 'sonner';
import {
  formatDeviceLastActivity,
  formatMinutesUntil,
  getDeviceConnectionMeta,
} from '@/services/deviceStatus';

const toSearchableText = (value: unknown) => String(value ?? '').toLowerCase();

export function Devices() {
  const devices = useAppStore((state) => state.devices);
  const profiles = useAppStore((state) => state.profiles);
  const updateDeviceProfile = useAppStore((state) => state.updateDeviceProfile);
  const disableDeviceTemporarily = useAppStore((state) => state.disableDeviceTemporarily);
  const restoreDeviceStatus = useAppStore((state) => state.restoreDeviceStatus);
  const deviceSuspensions = useAppStore((state) => state.deviceSuspensions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const profileNameById = new Map(profiles.map((profile) => [profile.PK, profile.name]));
  const disableDurations = [15, 30, 60, 240];

  const filteredDevices = devices.filter((d: Device) => {
    const matchesSearch = toSearchableText(d.name).includes(searchQuery.toLowerCase()) ||
      toSearchableText(d.profile_name).includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || d.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCopyResolver = (resolver: string) => {
    navigator.clipboard.writeText(resolver);
    setCopiedId(resolver);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDeviceIcon = (type: string) => {
    return type === 'router' ? Router : Smartphone;
  };

  const isDeviceOnline = (device: Device) => getDeviceConnectionMeta(device).online;

  const handleTempDisable = async (deviceId: string, deviceName: string, minutes: number) => {
    try {
      await disableDeviceTemporarily(deviceId, minutes);
      toast.success(`DNS paused for ${deviceName} for ${minutes} minutes`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to pause DNS');
    }
  };

  const handleRestore = async (deviceId: string, deviceName: string) => {
    try {
      await restoreDeviceStatus(deviceId);
      toast.success(`DNS restored for ${deviceName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore DNS');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Devices</h2>
          <p className="text-muted-foreground mt-1">
            Manage your endpoints and their assigned profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{devices.length} total</Badge>
          <Badge variant="outline" className="text-emerald-500">
            {devices.filter(isDeviceOnline).length} online
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="router">Routers</SelectItem>
            <SelectItem value="user">User Devices</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const Icon = getDeviceIcon(device.type);
          const resolvedProfile = profiles.find(
            (profile) => profile.PK === device.profile || profile.name === device.profile
          );
          const assignedProfileName =
            String(device.profile_name ?? '') ||
            resolvedProfile?.name ||
            profileNameById.get(device.profile) ||
            String(device.profile ?? '') ||
            'Unassigned';
          const assignedProfileValue = resolvedProfile?.PK || device.profile || '';
          const suspension = deviceSuspensions[device.PK];
          const remainingLabel = suspension ? formatMinutesUntil(suspension.expiresAt) : '';
          return (
            <Card key={device.PK} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      device.type === 'router' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        device.type === 'router' ? 'text-blue-500' : 'text-purple-500'
                      )} />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{device.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {(() => {
                          const meta = getDeviceConnectionMeta(device);
                          return (
                            <>
                              <div className={cn('w-1.5 h-1.5 rounded-full', meta.color)} />
                              <span className={cn('text-xs capitalize', meta.textColor)}>
                                {meta.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.status === 2 && (
                      <Badge variant="secondary" className="text-amber-500 border-amber-500/20">
                        Paused
                      </Badge>
                    )}
                    {device.status === 3 && (
                      <Badge variant="destructive" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {String(device.type ?? '')}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Device actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {device.status === 3 ? (
                          <DropdownMenuItem onSelect={() => handleRestore(device.PK, device.name)}>
                            <RefreshCcw className="w-4 h-4" />
                            Enable device
                          </DropdownMenuItem>
                        ) : (
                          disableDurations.map((minutes) => (
                            <DropdownMenuItem
                              key={minutes}
                              onSelect={() => handleTempDisable(device.PK, device.name, minutes)}
                            >
                              <Ban className="w-4 h-4" />
                              Disable for {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs">Profile</span>
                    </div>
                    <Select
                      value={assignedProfileValue}
                      onValueChange={(value) => updateDeviceProfile(device.PK, value)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-md border border-border/60 bg-background/50 px-2.5 text-xs shadow-none">
                        <SelectValue placeholder={assignedProfileName} />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.PK} value={p.PK} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {suspension && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>Resumes in {remainingLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-xs">Clients</span>
                    </div>
                    <p className="text-sm font-medium">{device.clients || 0}</p>
                  </div>
                </div>

                {/* Resolver */}
                {device.resolver && (
                  <div className="p-2.5 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Resolver</p>
                        <p className="text-xs font-mono truncate">{device.resolver}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleCopyResolver(device.resolver!)}
                      >
                        {copiedId === device.resolver ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Last Activity */}
                {formatDeviceLastActivity(device.last_activity) && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Last active: {formatDeviceLastActivity(device.last_activity)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No devices found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  );
}
