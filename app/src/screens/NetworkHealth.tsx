import { useAppStore } from '@/store/appStore';
import {
  Globe,
  Activity,
  MapPin,
  Wifi,
  WifiOff,
  Shield,
  Server,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

export function NetworkHealth() {
  const networkStats = useAppStore((state) => state.networkStats);
  const ipInfo = useAppStore((state) => state.ipInfo);
  const analyticsLevels = useAppStore((state) => state.analyticsLevels);
  const storageRegions = useAppStore((state) => state.storageRegions);

  // Sort by latency
  const sortedStats = [...networkStats].sort((a, b) => (a.latency || 999) - (b.latency || 999));
  const currentPop = networkStats.find((n) => n.pop === ipInfo?.pop);
  const getServices = (pop: { services?: Partial<Record<'dns' | 'doh' | 'dot' | 'proxy', boolean>> }) =>
    pop.services ?? {};

  // Chart data
  const latencyData = sortedStats.map((s) => ({
    name: s.pop.toUpperCase(),
    latency: s.latency || 0,
    location: s.location,
  }));

  const serviceAvailability = [
    { name: 'DNS', available: networkStats.filter((n) => getServices(n).dns).length, total: networkStats.length },
    { name: 'DoH', available: networkStats.filter((n) => getServices(n).doh).length, total: networkStats.length },
    { name: 'DoT', available: networkStats.filter((n) => getServices(n).dot).length, total: networkStats.length },
    { name: 'Proxy', available: networkStats.filter((n) => getServices(n).proxy).length, total: networkStats.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Network Health</h2>
        <p className="text-muted-foreground mt-1">
          Control D infrastructure status and your connection details
        </p>
      </div>

      {/* Current Connection */}
      {ipInfo && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Your Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs">Location</span>
                </div>
                <p className="text-sm font-medium">{ipInfo.city}, {ipInfo.country}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Server className="w-3.5 h-3.5" />
                  <span className="text-xs">Datacenter</span>
                </div>
                <p className="text-sm font-medium">{ipInfo.pop?.toUpperCase()}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-xs">IP Address</span>
                </div>
                <p className="text-sm font-mono">{ipInfo.ip}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-xs">ISP</span>
                </div>
                <p className="text-sm font-medium">{ipInfo.org}</p>
              </div>
            </div>

            {currentPop && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
                    <span className="text-sm">Connected to {currentPop.location}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">{currentPop.latency}ms</p>
                      <p className="text-xs text-muted-foreground">Latency</p>
                    </div>
                    <div className="flex gap-2">
                      {Object.entries(getServices(currentPop)).map(([service, available]) => (
                        <Badge
                          key={service}
                          variant={available ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {available ? (
                            <Wifi className="w-3 h-3 mr-1" />
                          ) : (
                            <WifiOff className="w-3 h-3 mr-1" />
                          )}
                          {service.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              POP Latency
            </CardTitle>
            <CardDescription>Response time across all datacenters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}ms`, 'Latency']}
                  />
                  <Bar dataKey="latency" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {latencyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === ipInfo?.pop?.toUpperCase() ? '#3b82f6' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Availability */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Service Availability
            </CardTitle>
            <CardDescription>Available services across all POPs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceAvailability.map((service) => (
                <div key={service.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{service.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {service.available}/{service.total} POPs
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(service.available / service.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((service.available / service.total) * 100)}% availability
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POP Details Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Datacenter Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3">POP</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3">Location</th>
                  <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">DNS</th>
                  <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">DoH</th>
                  <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">DoT</th>
                  <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3">Proxy</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-2 px-3">Latency</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((pop) => (
                  <tr
                    key={pop.pop}
                    className={cn(
                      'border-b border-border/50',
                      pop.pop === ipInfo?.pop ? 'bg-primary/5' : ''
                    )}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {pop.pop === ipInfo?.pop && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
                        )}
                        <span className="text-sm font-mono">{pop.pop.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm">{pop.location}</td>
                    <td className="py-2.5 px-3 text-center">
                      {getServices(pop).dns ? (
                        <Wifi className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getServices(pop).doh ? (
                        <Wifi className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getServices(pop).dot ? (
                        <Wifi className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getServices(pop).proxy ? (
                        <Wifi className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={cn(
                        'text-sm font-medium',
                        (pop.latency || 0) < 50 ? 'text-emerald-500' :
                        (pop.latency || 0) < 100 ? 'text-amber-500' : 'text-red-500'
                      )}>
                        {pop.latency}ms
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Storage & Analytics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Storage Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storageRegions.map((region) => (
                <div
                  key={region.PK}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-medium">{region.name}</p>
                    <p className="text-xs text-muted-foreground">{region.location}</p>
                  </div>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Analytics Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analyticsLevels.map((level) => (
                <div
                  key={level.PK}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-medium">{level.name}</p>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Level {level.PK}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

