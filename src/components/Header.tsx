import React, { useState, useEffect, useRef } from 'react';
import { Bell, Menu, Sun, Moon, Check, Inbox } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead } from '../services/db';
import { Notification, UserProfile } from '../types';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pageTitle: string;
  profile: UserProfile | null;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onNavigateToTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  pageTitle,
  profile,
  darkMode,
  setDarkMode,
  onNavigateToTab
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToNotifications(profile.uid, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [profile]);

  // Click outside listener for notification menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read && notif.id) {
      await markNotificationAsRead(notif.id);
    }
    setShowNotifMenu(false);
    onNavigateToTab('requests'); // Navigate to requests page
  };

  return (
    <header className="h-16 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight capitalize">
          {pageTitle}
        </h1>
      </div>

      {/* Action Items */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30">
                    {unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs">All caught up!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex gap-2 items-start ${
                        !notif.read ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <p className={`text-xs text-slate-700 dark:text-slate-300 leading-relaxed ${!notif.read ? 'font-medium' : ''}`}>
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!notif.read && notif.id && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id!, e)}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-800 rounded border border-slate-100 dark:border-slate-700"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Quick Profile Info */}
        <div
          onClick={() => onNavigateToTab('profile')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors border border-transparent">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
              {profile?.name}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
