import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import {
  Shield,
  LayoutDashboard,
  Users,
  Smartphone,
  Grid3X3,
  ListChecks,
  Zap,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/profiles', label: 'Profiles', icon: Users },
  { path: '/devices', label: 'Devices', icon: Smartphone },
  { path: '/services', label: 'Services', icon: Grid3X3 },
  { path: '/rules', label: 'Custom Rules', icon: ListChecks },
  { path: '/actions', label: 'Quick Actions', icon: Zap },
  { path: '/network', label: 'Network Health', icon: Globe },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const darkMode = useAppStore((state) => state.darkMode);
  const setDarkMode = useAppStore((state) => state.setDarkMode);
  const isLoading = useAppStore((state) => state.isLoading);
  const location = useLocation();
  const user = useAppStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div
              className={cn(
                'overflow-hidden transition-all duration-300',
                sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
              )}
            >
              <h1 className="text-lg font-bold text-sidebar-foreground whitespace-nowrap">
                Control D
                <span className="text-primary"> Home</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span
                  className={cn(
                    'text-sm font-medium whitespace-nowrap transition-all duration-300',
                    sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
                  )}
                >
                  {item.label}
                </span>
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/80" />
                )}

                {/* Tooltip for collapsed sidebar */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border border-border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-sidebar-border shrink-0 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full group relative"
          >
            {darkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap transition-all duration-300',
                sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
              )}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* Collapse toggle - desktop only */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 shrink-0" />
            )}
            <span
              className={cn(
                'text-sm font-medium whitespace-nowrap transition-all duration-300',
                sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'
              )}
            >
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <span className="text-sm text-muted-foreground">
                {user?.email || 'Welcome'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {settings.demoMode && (
              <Badge variant="secondary" className="text-xs">
                Demo Mode
              </Badge>
            )}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
              <span className="text-muted-foreground hidden sm:inline">Connected</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
