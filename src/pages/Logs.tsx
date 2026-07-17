import React, { useState, useEffect } from 'react';
import { AdminLog, UserLog, LoginLog, AuditTrail } from '../types';
import { getAdminLogs, getUserLogs, getLoginLogs, getAuditTrail } from '../services/db';
import { RefreshCw, Shield, History, LogIn, ClipboardList } from 'lucide-react';

export const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'user' | 'login' | 'audit'>('admin');
  const [loading, setLoading] = useState(false);

  // Lists
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);

  const loadAllLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'admin') {
        const data = await getAdminLogs();
        setAdminLogs(data);
      } else if (activeTab === 'user') {
        const data = await getUserLogs();
        setUserLogs(data);
      } else if (activeTab === 'login') {
        const data = await getLoginLogs();
        setLoginLogs(data);
      } else if (activeTab === 'audit') {
        const data = await getAuditTrail();
        setAuditTrails(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllLogs();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Admin Action Logs
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'user'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            User Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Login Audits
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Request Audit Trail
          </button>
        </div>

        <button
          onClick={loadAllLogs}
          disabled={loading}
          className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </button>
      </div>

      {/* Grid displays based on selected category */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {activeTab === 'admin' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Name</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metadata (Browser/Device)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {adminLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/10">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">{new Date(log.time).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-900 dark:text-white font-bold">{log.adminName}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{log.adminEmail}</td>
                    <td className="py-3.5 px-4 text-xs text-blue-600 dark:text-blue-400 font-semibold">{log.action}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 truncate max-w-[200px]">{log.browser} ({log.device})</td>
                  </tr>
                ))}
                {adminLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'user' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Name</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Action</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {userLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/10">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">{new Date(log.time).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-900 dark:text-white font-bold">{log.userName}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{log.userEmail}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 border dark:bg-slate-800 dark:border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 truncate max-w-[250px]">{log.details || 'None'}</td>
                  </tr>
                ))}
                {userLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'login' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">User Email</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Browser & Device</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">OS</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {loginLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/10">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">{log.date} {log.time}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-900 dark:text-white font-bold">{log.email}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{log.role}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">{log.browser} ({log.device})</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{log.os}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        log.status === 'Success' ? 'bg-green-50 text-green-700 dark:bg-green-950/25 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/25 dark:text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {loginLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">No login audits available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request No</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Changed</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Old Value</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Value</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {auditTrails.map((trail, i) => (
                  <tr key={i} className="hover:bg-slate-50/10">
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">{new Date(trail.changedAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-900 dark:text-white font-bold">{trail.requestNo}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-blue-600 dark:text-blue-400">{trail.fieldChanged}</td>
                    <td className="py-3.5 px-4 text-xs text-red-600 dark:text-red-400 font-medium line-through decoration-red-400/50">{trail.oldValue}</td>
                    <td className="py-3.5 px-4 text-xs text-green-600 dark:text-green-400 font-bold">{trail.newValue}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-bold">{trail.changedBy}</td>
                  </tr>
                ))}
                {auditTrails.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">No request update history.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
