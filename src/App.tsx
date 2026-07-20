import React, { useState, useEffect } from 'react';
import { subscribeToAuthChanges, logoutUser, ensureFirstSuperAdmin } from './services/auth';
import {
  subscribeToRequests,
  subscribeToUsers,
  subscribeToAdminLogs,
  subscribeToUserLogs,
  isLocalMode
} from './services/db';
import { UserProfile, ServiceRequest, AdminLog, UserLog } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Requests } from './pages/Requests';
import { Users } from './pages/Users';
import { Departments } from './pages/Departments';
import { Reports } from './pages/Reports';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { CreateRequest } from './pages/CreateRequest';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global Sync States
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Page Navigation tab
  const [currentTab, setCurrentTab] = useState('requests');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Force Light (White) Mode Only
  const darkMode = false;
  const setDarkMode = () => {};

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  // Auto-seed first Super Admin on application start
  useEffect(() => {
    ensureFirstSuperAdmin().catch((err) => {
      console.error('Failed to run first Super Admin auto-seeding:', err);
    });
  }, []);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser, userProfile) => {
      setUser(currentUser);
      setProfile(userProfile);
      setAuthLoading(false);

      if (userProfile) {
        // Set the initial default view based on Role setting
        if (userProfile.role === 'Super Admin' || userProfile.role === 'Admin' || userProfile.role === 'Production Manager') {
          setCurrentTab('dashboard');
        } else if (userProfile.role === 'User') {
          setCurrentTab('create-request');
        } else {
          setCurrentTab('requests');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Enforce Tab-Based RBAC to prevent unauthorized views
  useEffect(() => {
    if (!profile) return;
    
    const isTabAllowed = (tab: string, role: string): boolean => {
      if (role === 'Super Admin' || role === 'Admin') return true;
      switch (tab) {
        case 'dashboard':
          return role === 'Production Manager';
        case 'create-request':
          return role === 'User';
        case 'requests':
          return true;
        case 'departments':
          return role === 'Production Manager';
        case 'reports':
          return role === 'Production Manager';
        case 'profile':
          return true;
        default:
          return false;
      }
    };

    if (!isTabAllowed(currentTab, profile.role)) {
      console.warn(`Access denied to tab '${currentTab}' for role '${profile.role}'. Redirecting...`);
      if (profile.role === 'User') {
        setCurrentTab('create-request');
      } else {
        setCurrentTab('requests');
      }
    }
  }, [currentTab, profile]);

  // Listen to custom local storage event for local user updates
  useEffect(() => {
    const handleLocalUsersUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile[]>;
      if (customEvent.detail) {
        setUsersList(customEvent.detail);
      }
    };
    window.addEventListener('local_users_updated', handleLocalUsersUpdated);
    return () => {
      window.removeEventListener('local_users_updated', handleLocalUsersUpdated);
    };
  }, []);

  // Real-time Database listeners when logged in
  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to requests in real time
    const unsubRequests = subscribeToRequests((data) => {
      setRequests(data);
    });

    // 2. Subscribe to Users
    const unsubUsers = subscribeToUsers((data) => {
      setUsersList(data);
    });

    // 3. Subscribe to recent Admin logs
    let unsubAdminLogs = () => {};
    if (profile.role === 'Super Admin' || profile.role === 'Admin') {
      unsubAdminLogs = subscribeToAdminLogs((data) => {
        setAdminLogs(data);
      });
    }

    // 4. Subscribe to recent User activity logs
    let unsubUserLogs = () => {};
    if (profile.role === 'Super Admin' || profile.role === 'Admin' || profile.role === 'Production Manager') {
      unsubUserLogs = subscribeToUserLogs((data) => {
        setUserLogs(data);
      });
    }

    return () => {
      unsubRequests();
      unsubUsers();
      unsubAdminLogs();
      unsubUserLogs();
    };
  }, [profile]);

  const handleLogout = async () => {
    if (user && profile) {
      try {
        await logoutUser(profile.email, profile.role);
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  const handleRefreshProfile = () => {
    console.log('Profile context refreshed successfully.');
  };

  if (authLoading) {
    return <Loader fullPage message="Authenticating Secure Session..." />;
  }

  // If not logged in, render the secure Login panel
  if (!user || !profile) {
    return <Login onAuthSuccess={() => console.log('Secure Login Success!')} />;
  }

  const localSandboxActive = isLocalMode();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        userRole={profile.role}
        userName={profile.name}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Panel Content Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          pageTitle={currentTab}
          profile={profile}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onNavigateToTab={setCurrentTab}
        />



        {/* Dynamic Route View Stage */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {currentTab === 'dashboard' && (
            <Dashboard
              requests={requests}
              adminLogs={adminLogs}
              userLogs={userLogs}
              setTab={setCurrentTab}
            />
          )}

          {currentTab === 'requests' && (
            <Requests
              requests={requests}
              profile={profile}
              users={usersList}
            />
          )}

          {currentTab === 'create-request' && (
            <CreateRequest
              profile={profile}
              onSuccess={() => setCurrentTab('requests')}
            />
          )}

          {currentTab === 'users' && (
            <Users
              users={usersList}
              profile={profile}
            />
          )}

          {currentTab === 'departments' && (
            <Departments profile={profile} />
          )}

          {currentTab === 'reports' && (
            <Reports requests={requests} />
          )}

          {currentTab === 'logs' && (
            <Logs />
          )}

          {currentTab === 'settings' && (
            <Settings profile={profile} />
          )}

          {currentTab === 'profile' && (
            <Profile
              profile={profile}
              onRefreshProfile={handleRefreshProfile}
            />
          )}
        </main>
      </div>
    </div>
  );
}
