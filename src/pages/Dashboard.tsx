import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  XCircle,
  HelpCircle,
  UserCheck,
  Star,
  Inbox,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Bell
} from 'lucide-react';
import { ServiceRequest, AdminLog, UserLog, UserProfile, Notification } from '../types';
import { BarChart, DoughnutChart, LineChart } from '../components/Charts';
import { subscribeToNotifications } from '../services/db';

interface DashboardProps {
  requests: ServiceRequest[];
  adminLogs: AdminLog[];
  userLogs: UserLog[];
  setTab: (tab: string) => void;
  profile: UserProfile | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, adminLogs, userLogs, setTab, profile }) => {
  const isUser = profile?.role?.toLowerCase() === 'user';

  // State for notifications (User Dashboard)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isUser && profile) {
      const unsub = subscribeToNotifications(profile.uid, (data) => {
        setNotifications(data);
      });
      return () => unsub();
    }
  }, [isUser, profile]);

  // ---------------- USER DASHBOARD CALCULATIONS ----------------
  const myRequests = requests.filter(r => r.createdBy === profile?.uid);
  const myPending = myRequests.filter(r => r.stage !== 'Completed' && r.stage !== 'Rejected').length;
  const myInProgress = myRequests.filter(r => r.stage === 'In Progress').length;
  const myCompleted = myRequests.filter(r => r.stage === 'Completed').length;
  const myRejected = myRequests.filter(r => r.stage === 'Rejected').length;

  const userCards = [
    { label: 'Pending Requests', value: myPending, icon: Clock, color: 'text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30' },
    { label: 'In Progress', value: myInProgress, icon: Play, color: 'text-purple-600 bg-purple-50/50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30' },
    { label: 'Completed', value: myCompleted, icon: CheckCircle, color: 'text-green-600 bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' },
    { label: 'Rejected', value: myRejected, icon: XCircle, color: 'text-red-600 bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' }
  ];

  // ---------------- ADMIN DASHBOARD CALCULATIONS ----------------
  const todayStr = new Date().toISOString().split('T')[0];
  const requestsToday = requests.filter(r => r.createdAt && r.createdAt.startsWith(todayStr)).length;
  const adminPending = requests.filter(r => r.stage !== 'Completed' && r.stage !== 'Rejected').length;
  const completedToday = requests.filter(r => r.completedAt && r.completedAt.startsWith(todayStr)).length;
  const adminRejected = requests.filter(r => r.stage === 'Rejected').length;

  // Calculate Average Completion Time
  const completedRequests = requests.filter(r => r.status === 'Completed' && r.createdAt && r.completedAt);
  let averageCompletionTimeStr = 'N/A';
  if (completedRequests.length > 0) {
    let totalMs = 0;
    completedRequests.forEach(r => {
      const start = new Date(r.createdAt).getTime();
      const end = new Date(r.completedAt!).getTime();
      totalMs += (end - start);
    });
    const avgHrs = (totalMs / (1000 * 60 * 60 * completedRequests.length)).toFixed(1);
    averageCompletionTimeStr = `${avgHrs} hrs`;
  }

  // Calculate Average Rating
  const ratedRequests = requests.filter(r => r.feedbackRating !== undefined && r.feedbackRating > 0);
  let avgRating = 0;
  if (ratedRequests.length > 0) {
    const totalRating = ratedRequests.reduce((acc, r) => acc + (r.feedbackRating || 0), 0);
    avgRating = Number((totalRating / ratedRequests.length).toFixed(1));
  }

  const adminCards = [
    { label: "Today's Requests", value: requestsToday, icon: FileText, color: 'text-slate-700 bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800' },
    { label: 'Pending Workflow', value: adminPending, icon: Clock, color: 'text-amber-600 bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30' },
    { label: 'Completed Today', value: completedToday, icon: CheckCircle, color: 'text-green-600 bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30' },
    { label: 'Rejected (Total)', value: adminRejected, icon: XCircle, color: 'text-red-600 bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' },
  ];

  // Prepare chart data (Admin Dashboard)
  const byDept: Record<string, number> = {};
  const byPriority: Record<string, number> = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
  const byStage: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  requests.forEach(r => {
    if (r.department) {
      byDept[r.department] = (byDept[r.department] || 0) + 1;
    }
    if (r.priority) {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    }
    const currentStage = r.stage || r.status || 'Submitted';
    byStage[currentStage] = (byStage[currentStage] || 0) + 1;

    if (r.createdAt) {
      const month = r.createdAt.substring(0, 7); // e.g. "2026-07"
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* -------------------- USER DASHBOARD -------------------- */}
      {isUser ? (
        <>
          {/* Welcome and KPI stats */}
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Welcome back, {profile?.name || 'User'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Here is an overview of your submitted service requests and tracking.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {userCards.map((card, index) => {
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Recent Requests */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Recent Requests</h3>
                <button
                  onClick={() => setTab('requests')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  View All My Requests
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-800">
                      <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Req ID</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title / Service</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {myRequests.slice(0, 5).map((req) => (
                      <tr key={req.requestNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-3 px-3 text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</td>
                        <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                          {req.service || req.title}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                            req.stage === 'Completed' || req.status === 'Completed' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                            req.stage === 'Rejected' || req.status === 'Rejected' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                          }`}>
                            {req.stage || req.status || 'Submitted'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <span className={`inline-flex items-center text-[10px] font-bold ${
                            req.priority === 'Urgent' ? 'text-red-600' :
                            req.priority === 'High' ? 'text-amber-600' :
                            req.priority === 'Medium' ? 'text-blue-600' : 'text-slate-500'
                          }`}>
                            {req.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                          You haven't submitted any requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Recent Notifications */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Notifications</h3>
              </div>
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((notif, idx) => (
                  <div
                    key={notif.id || idx}
                    className={`p-3 rounded-xl border transition-all ${
                      !notif.read
                        ? 'border-blue-100 bg-blue-50/30 dark:border-blue-900/20 dark:bg-blue-950/10'
                        : 'border-slate-100 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/10'
                    }`}
                  >
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs">No notifications yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* -------------------- ADMIN DASHBOARD -------------------- */
        <>
          {/* Welcome and KPI stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                Enterprise Operations Command
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live monitoring, department performance metrics, and workflow efficiency.
              </p>
            </div>
            {/* Efficiency Stats Block */}
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Avg. Completion Time</span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{averageCompletionTimeStr}</span>
              </div>
              <div className="px-4 py-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">System Rating</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-extrabold text-amber-500">{avgRating || 'N/A'}</span>
                  {avgRating > 0 && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {adminCards.map((card, index) => {
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <DoughnutChart data={byPriority} title="Priority Distribution" />
            </div>
            <div className="lg:col-span-1">
              <BarChart data={byDept} title="Requests by Department" />
            </div>
            <div className="lg:col-span-1">
              <LineChart data={byMonth} title="Requests Trend (Monthly)" />
            </div>
          </div>

          {/* Feedback and Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Feedback Widgets */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent User Feedback</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {ratedRequests.length} Ratings Given
                </span>
              </div>
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 flex-1">
                {ratedRequests.slice(0, 4).map((req, idx) => (
                  <div key={req.requestNo || idx} className="p-3.5 border border-slate-50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-800/10 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</span>
                        <span className="text-[10px] text-slate-400">by {req.requester}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Rating stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= (req.feedbackRating || 0)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        {/* Satisfied Indicator */}
                        {req.feedbackSatisfied !== undefined && (
                          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            req.feedbackSatisfied
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                          }`}>
                            {req.feedbackSatisfied ? (
                              <>
                                <ThumbsUp className="w-2.5 h-2.5" /> Satisfied
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="w-2.5 h-2.5" /> Unsatisfied
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {req.feedbackComment && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        "{req.feedbackComment}"
                      </p>
                    )}
                  </div>
                ))}
                {ratedRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 h-full">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs">No feedback submitted yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activities Activity Logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Activities</h3>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {userLogs.slice(0, 6).map((log, i) => (
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
        </>
      )}
    </div>
  );
};
