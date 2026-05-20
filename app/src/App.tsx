import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { Layout } from '@/components/Layout';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Spinner } from '@/components/ui/spinner';
import './App.css';

const Overview = lazy(() => import('@/screens/Overview').then((module) => ({ default: module.Overview })));
const Profiles = lazy(() => import('@/screens/Profiles').then((module) => ({ default: module.Profiles })));
const Devices = lazy(() => import('@/screens/Devices').then((module) => ({ default: module.Devices })));
const Services = lazy(() => import('@/screens/Services').then((module) => ({ default: module.Services })));
const Rules = lazy(() => import('@/screens/Rules').then((module) => ({ default: module.Rules })));
const QuickActions = lazy(() => import('@/screens/QuickActions').then((module) => ({ default: module.QuickActions })));
const NetworkHealth = lazy(() => import('@/screens/NetworkHealth').then((module) => ({ default: module.NetworkHealth })));
const Settings = lazy(() => import('@/screens/Settings').then((module) => ({ default: module.Settings })));

function AppContent() {
  const darkMode = useAppStore((state) => state.darkMode);
  const loadAllData = useAppStore((state) => state.loadAllData);
  const loadDeviceSchedules = useAppStore((state) => state.loadDeviceSchedules);
  const syncSchedulerToken = useAppStore((state) => state.syncSchedulerToken);
  const settings = useAppStore((state) => state.settings);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadDeviceSchedules();
  }, [loadDeviceSchedules]);

  useEffect(() => {
    syncSchedulerToken();
  }, [syncSchedulerToken, settings.apiToken, settings.demoMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Layout>
      <Suspense fallback={<div className="flex min-h-96 items-center justify-center"><Spinner className="size-6 text-muted-foreground" /></div>}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/services" element={<Services />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/actions" element={<QuickActions />} />
          <Route path="/network" element={<NetworkHealth />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
