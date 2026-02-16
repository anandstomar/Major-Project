import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Anchor, UploadCloud, CheckSquare, Calendar, 
  BarChart2, Bell, Settings, Menu, Search as SearchIcon, User, LogOut
} from 'lucide-react';
import { NavItem } from '../types';
import { SmartSearch } from './SmartSearch';
import { Logo } from './ui/Assets';

// Product-focused navigation (DevOps/GitOps removed)
const NAV_ITEMS: NavItem[] = [
  { id: '1', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: '2', label: 'Anchors', icon: Anchor, path: '/anchors' },
  { id: '3', label: 'Ingest', icon: UploadCloud, path: '/ingest' },
  { id: '4', label: 'Validator', icon: CheckSquare, path: '/validator' },
  { id: '5', label: 'Scheduler', icon: Calendar, path: '/scheduler' },
  { id: '6', label: 'Search', icon: SearchIcon, path: '/search' },
  { id: '7', label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { id: '8', label: 'Notifications', icon: Bell, path: '/notifications' },
];

interface LayoutProps {
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex font-sans text-[#1f1e1d]">
      {/* Sidebar - Light Theme Enterprise */}
      <aside 
        className={`${collapsed ? 'w-20' : 'w-72'} bg-white border-r border-[#e0e0dc] flex flex-col transition-all duration-300 fixed h-full z-20`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-[#f1f0ee] shrink-0 bg-white">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
             <div className="shrink-0">
               <Logo />
             </div>
             {!collapsed && (
                <div className="flex flex-col">
                    <span className="font-bold text-[#1f1e1d] tracking-tight text-lg leading-none">ANCHOR</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Enterprise</span>
                </div>
             )}
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all group relative ${
                  isActive 
                    ? 'bg-[#f4f2f0] text-[#BE3F2F]' 
                    : 'text-[#5d5c58] hover:bg-[#fcfbf9] hover:text-[#1f1e1d]'
                }`}
                title={collapsed ? item.label : ''}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#BE3F2F] rounded-r-full" />}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#BE3F2F]' : 'text-[#8c8b88] group-hover:text-[#5d5c58]'} />
                {!collapsed && <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>}
                {/* Badge for Notifications (Example) */}
                {item.id === '8' && !collapsed && (
                  <span className="ml-auto bg-[#BE3F2F] text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">4</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions (Profile & Collapse) */}
        <div className="p-3 space-y-2 border-t border-[#f1f0ee] bg-white">
           <NavLink 
             to="/settings"
             className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all hover:bg-[#fcfbf9] ${location.pathname === '/settings' ? 'bg-[#f4f2f0] text-[#BE3F2F]' : 'text-[#5d5c58]'}`}
             title="Settings"
           >
              <User size={20} strokeWidth={2} />
              {!collapsed && <span className="text-sm font-medium">Profile</span>}
           </NavLink>

           <button 
             onClick={onLogout}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-[#5d5c58] hover:bg-[#fcfbf9] hover:text-[#BE3F2F]`}
             title="Log Out"
           >
              <LogOut size={20} strokeWidth={2} />
              {!collapsed && <span className="text-sm font-medium">Log Out</span>}
           </button>

           <button 
             onClick={() => setCollapsed(!collapsed)}
             className="w-full flex items-center justify-center p-2 rounded-md hover:bg-[#f4f2f0] text-[#8c8b88] transition-colors"
           >
             <Menu size={20} />
           </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-72'}`}>
        {/* Top Header */}
        <header className="h-16 bg-[#fbfbfa]/90 backdrop-blur-sm sticky top-0 z-10 px-8 flex items-center justify-between">
           {/* Global Search Trigger */}
           <div 
             className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[#e0e0dc] rounded shadow-sm w-[480px] text-gray-500 cursor-pointer hover:border-[#BE3F2F]/30 transition-all group"
             onClick={() => setIsSearchOpen(true)}
           >
              <SearchIcon size={16} className="text-[#8c8b88] group-hover:text-[#BE3F2F]" />
              <span className="text-sm truncate">Search anchors, requests, or logs...</span>
              <div className="ml-auto text-[10px] bg-[#f4f2f0] border border-[#e0e0dc] px-1.5 py-0.5 rounded text-[#5d5c58] font-medium">⌘K</div>
           </div>

           {/* Right Actions */}
           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4">
                 <button className="text-sm font-medium text-[#5d5c58] hover:text-[#BE3F2F] transition-colors">Documentation</button>
                 <span className="px-3 py-1 text-[11px] font-bold bg-white text-[#1f1e1d] rounded border border-[#e0e0dc] tracking-wide shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    US-WEST-1
                 </span>
              </div>
              
              <div className="h-6 w-px bg-[#e0e0dc] mx-2" />

              <div className="flex items-center gap-4">
                <button className="relative text-[#5d5c58] hover:text-[#1f1e1d] transition-colors">
                   <Bell size={20} />
                   <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#BE3F2F] rounded-full border border-[#fbfbfa]"></span>
                </button>
                <NavLink to="/settings">
                    <div className="w-9 h-9 bg-white border border-[#e0e0dc] rounded-full flex items-center justify-center text-[#BE3F2F] font-semibold hover:shadow-md transition-all">
                        JD
                    </div>
                </NavLink>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-[1600px] w-full mx-auto">
           <Outlet />
        </div>
      </main>
      
      {/* Global Modals */}
      <SmartSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};