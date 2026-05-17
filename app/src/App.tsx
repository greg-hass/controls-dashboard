import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { Layout } from '@/components/Layout';
import { Overview } from '@/screens/Overview';
import { Profiles } from '@/screens/Profiles';
import { Devices } from '@/screens/Devices';
import { Services } from '@/screens/Services';
import { Rules } from '@/screens/Rules';
import { QuickActions } from '@/screens/QuickActions';
import { NetworkHealth } from '@/screens/NetworkHealth';
import { Settings } from '@/screens/Settings';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './App.css';

function AppContent() {
  const darkMode = useAppStore((state) => state.darkMode);
  const loadAllData = useAppStore((state) => state.loadAllData);
  const syncDeviceSuspensions = useAppStore((state) => state.syncDeviceSuspensions);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    syncDeviceSuspensions();
  }, [syncDeviceSuspensions]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Layout>
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
