import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import {
  Shield,
  Users,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Service } from '@/types/controld';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Overview() {
  const profiles = useAppStore((state) => state.profiles);
  const devices = useAppStore((state) => state.devices);
  const services = useAppStore((state) => state.services);
  const networkStats = useAppStore((state) => state.networkStats);
  const filters = useAppStore((state) => state.filters);
  const ipInfo = useAppStore((state) => state.ipInfo);
  const loadAllData = useAppStore((state) => state.loadAllData);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const stats = {
    profiles: profiles.length,
    devices: devices.length,
    services: services.length,
    blockedServices: services.filter((s: Service) => s.status === 0).length,
    activeFilters: filters.filter((f) => f.status === 1).length,
  };

  // Service status breakdown for chart
  const serviceStatusData = [
    { name: 'Blocked', value: services.filter((s: Service) => s.status === 0).length },
    { name: 'Allowed', value: services.filter((s: Service) => s.status === 1).length },
    { name: 'Bypass', value: services.filter((s: Service) => s.status === 2).length },
  ];

  // Top blocked categories
  const blockedByCategory = services
    .filter((s: Service) => s.status === 0)
    .reduce((acc: Record<string, number>, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {});

  const categoryChartData = Object.entries(blockedByCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Recent device activity
  const recentDevices = [...devices]
    .sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0))
    .slice(0, 5);

  // Current POP
  const currentPop = networkStats.find((n) => n.pop === ipInfo?.pop) || networkStats[0];
  const currentPopServices = currentPop?.services ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of your Control D network
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Hero image banner */}
      <div className="relative h-48 rounded-2xl overflow-hidden">
        <img
          src="/hero-bg.jpg"
          alt="Network Dashboard"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Network Protected</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              {ipInfo?.city || 'Your Network'} · {ipInfo?.pop?.toUpperCase() || 'Unknown POP'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {devices.length} devices connected across {profiles.length} profiles.
              {stats.blockedServices} services currently blocked.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profiles</p>
                <p className="text-2xl font-bold mt-1">{stats.profiles}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devices</p>
                <p className="text-2xl font-bold mt-1">{stats.devices}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold mt-1">{stats.blockedServices}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Filters</p>
                <p className="text-2xl font-bold mt-1">{stats.activeFilters}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Service Status Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Service Status
            </CardTitle>
            <CardDescription>Blocked vs Allowed services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {serviceStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {serviceStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blocked by Category */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart className="w-4 h-4 text-primary" />
              Blocked by Category
            </CardTitle>
            <CardDescription>Top blocked service categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/actions">
              <Button variant="outline" className="w-full justify-between">
                <span>Dinner Time</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/actions">
              <Button variant="outline" className="w-full justify-between">
                <span>Homework Mode</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/actions">
              <Button variant="outline" className="w-full justify-between">
                <span>Bedtime Lock</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/actions">
              <Button variant="ghost" className="w-full text-primary text-sm">
                View all actions →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Device Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDevices.map((device) => (
                <div
                  key={device.PK}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        device.status === 1 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.profile_name || 'No profile'} · {device.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {device.last_activity
                        ? `${Math.floor((Date.now() / 1000 - device.last_activity) / 60)}m ago`
                        : 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.clients} {device.clients === 1 ? 'client' : 'clients'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Status */}
      {currentPop && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Current Datacenter</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPop.location} ({currentPop.pop})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold">{currentPop.latency}ms</p>
                  <p className="text-xs text-muted-foreground">Latency</p>
                </div>
                <div className="flex gap-2">
                  {Object.entries(currentPopServices).map(([service, available]) => (
                    <Badge
                      key={service}
                      variant={available ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {service.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
