import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  XCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { ServiceRequest, AdminLog, UserLog } from '../types';
import { BarChart, DoughnutChart, LineChart } from '../components/Charts';

interface DashboardProps {
  requests: ServiceRequest[];
  adminLogs: AdminLog[];
  userLogs: UserLog[];
  setTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, adminLogs, userLogs, setTab }) => {
  // 1. Calculate KPI Metrics
  const total = requests.length;
  const pendingHOD = requests.filter(r => r.hodStatus === 'Pending' && r.status !== 'Cancelled' && r.status !== 'Rejected').length;
  const pendingProd = requests.filter(r => r.hodStatus === 'Approved' && r.prodStatus === 'Pending' && r.status !== 'Cancelled' && r.status !== 'Rejected').length;
  const assigned = requests.filter(r => r.status === 'Assigned').length;
  const inProgress = requests.filter(r => r.status === 'In Progress').length;
  const completed = requests.filter(r => r.status === 'Completed').length;
  const rejected = requests.filter(r => r.status === 'Rejected' || r.hodStatus === 'Rejected' || r.prodStatus === 'Rejected').length;
  const cancelled = requests.filter(r => r.status === 'Cancelled').length;

  // 2. Prepare Chart Data
  // Department Stats
  const byDept: Record<string, number> = {};
  // Priority Stats
  const byPriority: Record<string, number> = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
  // Status Distribution
  const byStatus: Record<string, number> = {};
  // Monthly Stats
  const byMonth: Record<string, number> = {};

  requests.forEach(r => {
    // Dept
    if (r.department) {
      byDept[r.department] = (byDept[r.department] || 0) + 1;
    }
    // Priority
    if (r.priority) {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    }
    // Status
    if (r.status) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    }
    // Month (YYYY-MM)
    if (r.createdAt) {
      const month = r.createdAt.substring(0, 7); // e.g. "2026-07"
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });

  const cards = [
    { label: 'Total Requests', value: total, icon: FileText, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800' },
    { label: 'Pending HOD', value: pendingHOD, icon: Clock, color: 'text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30' },
    { label: 'Pending Prod', value: pendingProd, icon: AlertTriangle, color: 'text-blue-600 bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30' },
    { label: 'Assigned', value: assigned, icon: UserCheck, color: 'text-cyan-600 bg-cyan-50/50 border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/30' },
    { label: 'In Progress', value: inProgress, icon: Play, color: 'text-purple-600 bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-600 bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' },
    { label: 'Rejected', value: rejected, icon: XCircle, color: 'text-red-600 bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' },
    { label: 'Cancelled', value: cancelled, icon: HelpCircle, color: 'text-slate-500 bg-slate-100/50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const IconComp = card.icon;
          return (
            <div
              key={index}
              className={`p-4 border rounded-2xl flex items-center justify-between shadow-xs transition-transform duration-200 hover:-translate-y-0.5 bg-white dark:bg-slate-900 ${card.color.split(' ').slice(1).join(' ')}`}
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block truncate">
                  {card.label}
                </span>
                <span className={`text-xl font-extrabold block leading-none ${card.color.split(' ')[0]}`}>
                  {card.value}
                </span>
              </div>
              <div className={`p-2 rounded-xl shrink-0 ${card.color.split(' ')[0]} bg-white dark:bg-slate-950/50 border border-slate-100/50 dark:border-slate-800`}>
                <IconComp className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <DoughnutChart data={byPriority} title="Priority Distribution" />
        </div>
        <div className="md:col-span-1">
          <BarChart data={byDept} title="Requests by Department" />
        </div>
        <div className="md:col-span-1">
          <LineChart data={byMonth} title="Requests Trend (Monthly)" />
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Service Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Service Requests</h3>
            <button
              onClick={() => setTab('requests')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-800">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Req No</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Required</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.requestNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="py-3 px-3 text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</td>
                    <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{req.service}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">{req.department}</td>
                    <td className="py-3 px-3 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                        req.status === 'Completed' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                        req.status === 'In Progress' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' :
                        req.status === 'Assigned' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400' :
                        'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">No requests submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Admin & User Activity logs combined */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Activity Logs</h3>
            <button
              onClick={() => setTab('logs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              View System Logs
            </button>
          </div>
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {userLogs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex gap-3 items-start border-l-2 border-slate-100 dark:border-slate-800 pl-3 py-0.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    <span className="font-bold">{log.userName}</span> ({log.role}) performed <span className="font-semibold text-blue-600 dark:text-blue-400">{log.action}</span>
                  </p>
                  {log.details && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{log.details}</p>}
                </div>
                <span className="text-[9px] text-slate-400 shrink-0">
                  {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {userLogs.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400">No recent activity logs.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
