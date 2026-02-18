import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Anchors } from './components/Anchors';
import { 
  Ingest, Validator, Scheduler, SearchPage, Analytics, 
  Notifications, Settings 
} from './components/MockViews';
import { ChatAssistant } from './components/ChatAssistant';
import { Login, Signup } from './components/Auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setIsInitializing(false); 
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchTrigger = document.querySelector('[class*="cursor-pointer"]') as HTMLElement;
        if(searchTrigger) searchTrigger.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#fcfbf9]">
          <span className="text-sm text-[#5d5c58]">Verifying session...</span>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <Signup onLogin={() => setIsAuthenticated(true)} />} />
        
        <Route path="/" element={isAuthenticated ? <Layout onLogout={() => {
            localStorage.removeItem("access_token");
            setIsAuthenticated(false);
        }} /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="anchors" element={<Anchors />} />
          <Route path="ingest" element={<Ingest />} />
          <Route path="validator" element={<Validator />} />
          <Route path="scheduler" element={<Scheduler />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      {isAuthenticated && <ChatAssistant />}
    </HashRouter>
  );
}