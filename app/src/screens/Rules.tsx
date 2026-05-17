import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  ListChecks,
  Plus,
  Trash2,
  Search,
  Folder,
  Globe,
  Ban,
  Route,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CustomRule, RuleFolder, Profile } from '@/types/controld';

const toSearchableText = (value: unknown) => String(value ?? '').toLowerCase();

export function Rules() {
  const customRules = useAppStore((state) => state.customRules);
  const ruleFolders = useAppStore((state) => state.ruleFolders);
  const profiles = useAppStore((state) => state.profiles);
  const createCustomRule = useAppStore((state) => state.createCustomRule);
  const deleteCustomRule = useAppStore((state) => state.deleteCustomRule);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.PK || '');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    hostname: '',
    action: 'block',
    group: '',
  });

  const filteredRules = customRules.filter((r: CustomRule) =>
    toSearchableText(r.hostname).includes(searchQuery.toLowerCase()) ||
    toSearchableText(r.group).includes(searchQuery.toLowerCase())
  );

  const rulesByFolder = filteredRules.reduce((acc: Record<string, CustomRule[]>, r: CustomRule) => {
    const folder = r.group || 'Uncategorized';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(r);
    return acc;
  }, {});

  const handleCreateRule = () => {
    if (!newRule.hostname || !selectedProfile) return;
    createCustomRule(selectedProfile, newRule);
    setNewRule({ hostname: '', action: 'block', group: '' });
    setShowAddDialog(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block': return <Ban className="w-3.5 h-3.5 text-red-500" />;
      case 'allow': return <Shield className="w-3.5 h-3.5 text-emerald-500" />;
      case 'redirect': return <Route className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Globe className="w-3.5 h-3.5" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'allow': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'redirect': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Custom Rules</h2>
          <p className="text-muted-foreground mt-1">
            Manage custom DNS rules and redirects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{customRules.length} rules</Badge>
          <Badge variant="outline">{ruleFolders.length} folders</Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedProfile} onValueChange={setSelectedProfile}>
          <SelectTrigger className="w-[180px]">
            <Shield className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p: Profile) => (
              <SelectItem key={p.PK} value={p.PK}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Rule</DialogTitle>
              <DialogDescription>
                Create a new DNS rule for {profiles.find((p) => p.PK === selectedProfile)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Hostname</label>
                <Input
                  placeholder="example.com"
                  value={newRule.hostname}
                  onChange={(e) => setNewRule({ ...newRule, hostname: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Action</label>
                <Select
                  value={newRule.action}
                  onValueChange={(value) => setNewRule({ ...newRule, action: value as 'block' | 'allow' | 'redirect' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="redirect">Redirect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRule.action === 'redirect' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Target IP</label>
                  <Input
                    placeholder="192.168.1.100"
                    value={newRule.value || ''}
                    onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Folder</label>
                <Select
                  value={newRule.group}
                  onValueChange={(value) => setNewRule({ ...newRule, group: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleFolders.map((f: RuleFolder) => (
                      <SelectItem key={f.PK} value={f.PK}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateRule}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules by Folder */}
      <div className="space-y-4">
        {Object.entries(rulesByFolder).map(([folder, rules]) => (
          <Card key={folder} className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm">{folder}</CardTitle>
                <Badge variant="outline" className="text-xs">{rules.length} rules</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.PK}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('p-1.5 rounded', getActionColor(rule.action).split(' ')[0])}>
                        {getActionIcon(rule.action)}
                      </div>
                      <div>
                        <p className="text-sm font-mono">{rule.hostname}</p>
                        {rule.value && (
                          <p className="text-xs text-muted-foreground">
                            → {rule.value}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', getActionColor(rule.action))}>
                        {rule.action}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteCustomRule(selectedProfile, rule.hostname)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRules.length === 0 && (
          <div className="text-center py-12">
            <ListChecks className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No rules found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search' : 'Create your first custom rule'}
            </p>
          </div>
        )}
      </div>

      {/* Folders Overview */}
      {ruleFolders.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Rule Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ruleFolders.map((folder: RuleFolder) => (
                <Badge
                  key={folder.PK}
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                >
                  <Folder className="w-3 h-3 mr-1" />
                  {folder.name}
                  <span className="ml-1.5 text-muted-foreground">
                    ({customRules.filter((r: CustomRule) => r.group === folder.PK).length})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
