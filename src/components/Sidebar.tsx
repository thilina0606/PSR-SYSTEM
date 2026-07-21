import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  FileBarChart,
  History,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Wrench,
  Plus
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  userRole?: UserRole | null | string;
  userName: string;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setTab,
  userRole,
  userName,
  onLogout,
  isOpen,
  setIsOpen
}) => {
  const isAllowed = (tab: string): boolean => {
    const roleLower = userRole?.toLowerCase() || '';
    if (roleLower === 'admin' || roleLower === 'super admin') {
      return ['dashboard', 'requests', 'users', 'reports', 'profile'].includes(tab);
    }
    if (roleLower === 'user') {
      return ['dashboard', 'create-request', 'requests', 'profile'].includes(tab);
    }
    return false;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-request', label: 'New Request', icon: Plus },
    { id: 'requests', label: userRole?.toLowerCase() === 'user' ? 'My Requests' : 'All Requests', icon: ClipboardList },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const filteredItems = navItems.filter(item => isAllowed(item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 z-50 flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-semibold tracking-wide">
              <Wrench className="w-5 h-5 text-blue-500" />
              <span className="text-sm uppercase tracking-wider font-bold">PSR SYSTEM</span>
            </div>
            <button
              className="lg:hidden text-slate-400 hover:text-white p-1"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            {!userRole ? (
              <div className="flex items-center gap-3 px-4 py-3 text-slate-500 text-sm font-medium">
                <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                <span>Loading navigation...</span>
              </div>
            ) : (
              filteredItems.map(item => {
                const IconComp = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                        : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {item.label}
                  </button>
                );
              })
            )}
          </nav>
        </div>

        {/* User Footer Profile Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white truncate">{userName}</h4>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase truncate">{userRole}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/50 hover:bg-red-950/20 border border-slate-700/50 hover:border-red-900/30 hover:text-red-400 rounded-lg text-xs font-medium text-slate-400 transition-colors duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
