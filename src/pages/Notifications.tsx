import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Send, ShieldAlert, User, Users as UsersIcon, CheckSquare } from 'lucide-react';
import { Notification, UserProfile } from '../types';
import { subscribeToNotifications, markNotificationAsRead, createNotification } from '../services/db';

interface NotificationsProps {
  profile: UserProfile | null;
  users: UserProfile[];
}

export const Notifications: React.FC<NotificationsProps> = ({ profile, users }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [targetUser, setTargetUser] = useState<string>('all');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');

  const isAdmin = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'super admin';

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToNotifications(profile.uid, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      if (notif.id) {
        await handleMarkAsRead(notif.id);
      }
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !message.trim()) return;

    setSending(true);
    setSendSuccess('');
    setSendError('');

    try {
      const uidsToNotify: string[] = [];
      if (targetUser === 'all') {
        // All users except current sender
        users.forEach(u => {
          if (u.uid !== profile.uid && u.status === 'Active') {
            uidsToNotify.push(u.uid);
          }
        });
      } else if (targetUser === 'users') {
        // Just role == 'User'
        users.forEach(u => {
          if (u.role?.toLowerCase() === 'user' && u.uid !== profile.uid && u.status === 'Active') {
            uidsToNotify.push(u.uid);
          }
        });
      } else if (targetUser === 'admins') {
        // Just role == 'Admin'
        users.forEach(u => {
          if (u.role?.toLowerCase() === 'admin' && u.uid !== profile.uid && u.status === 'Active') {
            uidsToNotify.push(u.uid);
          }
        });
      } else {
        uidsToNotify.push(targetUser);
      }

      if (uidsToNotify.length === 0) {
        throw new Error('No active recipient users found matching selection.');
      }

      // Send to all
      for (const uid of uidsToNotify) {
        await createNotification(uid, `[Broadcast] ${message.trim()}`);
      }

      setSendSuccess(`Successfully sent notification to ${uidsToNotify.length} user(s).`);
      setMessage('');
    } catch (err: any) {
      setSendError(err.message || 'Failed to send notifications.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" /> Notifications Manager
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with immediate action alerts and broadcast administrative notifications.
          </p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
          >
            <CheckSquare className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns - Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Inbox Alert Log</span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full font-semibold">
                {notifications.length} Total
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                  <Bell className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
                  <p className="text-sm font-medium">Your notification box is empty</p>
                  <p className="text-xs mt-1">We'll alert you here when changes occur.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-5 transition-all flex gap-4 items-start ${
                      !notif.read
                        ? 'bg-blue-50/10 dark:bg-blue-950/5 border-l-4 border-l-blue-600'
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      !notif.read ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <p className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed ${!notif.read ? 'font-medium' : ''}`}>
                          {notif.message}
                        </p>
                        {!notif.read && notif.id && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id!)}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" /> Read
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>
                          {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {notif.requestNo && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">Request {notif.requestNo}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 column - Admin Broadcast Option */}
        <div className="space-y-4">
          {isAdmin ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" /> Send Admin Notification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Send manual alert notifications directly to active system users or custom groups.
              </p>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Recipient Group
                  </label>
                  <select
                    value={targetUser}
                    onChange={(e) => setTargetUser(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">📢 All Users (Global Broadcast)</option>
                    <option value="users">👤 Regular Users only</option>
                    <option value="admins">🛠️ Admins only</option>
                    <option disabled className="text-slate-400 dark:text-slate-600">────────────────</option>
                    {users
                      .filter(u => u.uid !== profile?.uid && u.status === 'Active')
                      .map(u => (
                        <option key={u.uid} value={u.uid}>
                          👤 {u.name} ({u.role || 'User'})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Alert Message
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter manual announcement alert message..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    maxLength={300}
                    required
                  />
                </div>

                {sendSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-xl text-xs font-medium">
                    {sendSuccess}
                  </div>
                )}

                {sendError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl text-xs font-medium">
                    {sendError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Sending...' : 'Broadcast Alert'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 p-5 rounded-2xl flex flex-col items-center text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-slate-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Standard Account Mode</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                  Only Admins can send notifications. Contact support to request elevation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
