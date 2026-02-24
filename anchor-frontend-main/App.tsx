import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Anchors } from './components/Anchors';
import { LandingPage } from './components/landingPage'; // Ensure casing matches your file
import { 
  Ingest, Validator, Scheduler, SearchPage, Analytics, 
  Notifications, Settings 
} from './components/MockViews';
import { EscrowList } from './components/EscrowCard';
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

  const handleLogin = (token?: string) => {
    if (token && typeof token === 'string') {
      localStorage.setItem("access_token", token);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/signup" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup onLogin={handleLogin} />} 
        />

        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/anchors" element={<Anchors />} />
          <Route path="/dashboard/ingest" element={<Ingest />} />
          <Route path="/dashboard/validator" element={<Validator />} />
          <Route path="/dashboard/escrow" element={<EscrowList />} />
          <Route path="/dashboard/scheduler" element={<Scheduler />} />
          <Route path="/dashboard/search" element={<SearchPage />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="/dashboard/settings" element={<Settings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {isAuthenticated && <ChatAssistant />}
    </BrowserRouter>
  );
}