import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  Key,
  Moon,
  Sun,
  RefreshCw,
  Database,
  Shield,
  Save,
  RotateCcw,
  Smartphone,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function Settings() {
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
  const user = useAppStore((state) => state.user);
  const loadAllData = useAppStore((state) => state.loadAllData);

  const [localSettings, setLocalSettings] = useState(settings);
  const [showToken, setShowToken] = useState(false);

  const handleSave = () => {
    setSettings(localSettings);
    toast.success('Settings saved successfully');
    if (!localSettings.demoMode && localSettings.apiToken) {
      loadAllData();
    }
  };

  const handleReset = () => {
    setLocalSettings({
      apiToken: '',
      apiBaseUrl: 'https://api.controld.com',
      theme: 'dark',
      refreshInterval: 60,
      demoMode: true,
    });
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure your Control D Home dashboard
        </p>
      </div>

      {/* Account Info */}
      {user && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Account ID</p>
                <p className="text-sm font-mono">{user.PK}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={user.status === 1 ? 'default' : 'destructive'}>
                  {user.status === 1 ? 'Active' : 'Inactive'}
              </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">2FA</p>
                <Badge variant={user.twofa === 1 ? 'default' : 'secondary'}>
                  {user.twofa === 1 ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Configuration */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Connect to your Control D account using an API token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
              API Token
              <Badge variant="outline" className="text-xs">Required for live mode</Badge>
            </label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Bearer token from controld.com/dashboard/api"
                value={localSettings.apiToken}
                onChange={(e) => setLocalSettings({ ...localSettings, apiToken: e.target.value })}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Hide' : 'Show'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Generate a token at{' '}
              <a
                href="https://controld.com/dashboard/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                controld.com/dashboard/api
              </a>
              . Use a <strong>Write</strong> token for full functionality.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">API Base URL</label>
            <Input
              placeholder="https://api.controld.com"
              value={localSettings.apiBaseUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, apiBaseUrl: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Demo Mode</p>
                <p className="text-xs text-muted-foreground">
                  Use mock data instead of live API calls
                </p>
              </div>
            </div>
            <Switch
              checked={localSettings.demoMode}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, demoMode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark themes
                </p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Refresh */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Data Refresh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Auto Refresh Interval</p>
                <p className="text-xs text-muted-foreground">
                  How often to refresh data from the API
                </p>
              </div>
            </div>
            <Select
              value={String(localSettings.refreshInterval)}
              onValueChange={(value) => setLocalSettings({ ...localSettings, refreshInterval: Number(value) })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Manual only</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Control D API</span>
              <Badge variant="outline">v1.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mode</span>
              <Badge variant={settings.demoMode ? 'secondary' : 'default'}>
                {settings.demoMode ? 'Demo' : 'Live'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Control D Home is an unofficial self-hosted dashboard for Control D DNS filtering.
              It is not affiliated with Control D or Windscribe.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="flex-1">
          <Save className="w-4 h-4 mr-1.5" />
          Save Settings
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
