import React, { useState, useEffect } from 'react';
import { ServiceRequest } from '../types';
import { getDepartments } from '../services/db';
import { FileDown, Printer, Filter, Calendar, ClipboardCheck } from 'lucide-react';

interface ReportsProps {
  requests: ServiceRequest[];
}

export const Reports: React.FC<ReportsProps> = ({ requests }) => {
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Filter states
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function loadDepts() {
      const depts = await getDepartments();
      setDepartments(depts.map(d => d.name));
    }
    loadDepts();
  }, []);

  // Filter logic
  const filteredRequests = requests.filter((req) => {
    const matchesDept = filterDept ? req.department === filterDept : true;
    const matchesPriority = filterPriority ? req.priority === filterPriority : true;
    const matchesStatus = filterStatus ? req.status === filterStatus : true;

    // Date range
    let matchesDate = true;
    if (req.createdAt) {
      const createdDateStr = req.createdAt.split('T')[0]; // YYYY-MM-DD
      if (dateFrom && createdDateStr < dateFrom) {
        matchesDate = false;
      }
      if (dateTo && createdDateStr > dateTo) {
        matchesDate = false;
      }
    }

    return matchesDept && matchesPriority && matchesStatus && matchesDate;
  });

  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Request No',
      'Department',
      'Requester',
      'Contact',
      'Location',
      'Service Required',
      'Machine Asset',
      'Priority',
      'Status',
      'Technician Assigned',
      'Date Submitted',
      'Date Completed'
    ];

    const rows = filteredRequests.map((req) => [
      req.requestNo,
      req.department,
      req.requester,
      req.contact || '',
      req.location,
      req.service,
      req.machine,
      req.priority,
      req.status,
      req.assignedToName || 'None',
      req.createdAt.split('T')[0],
      req.completedAt ? req.completedAt.split('T')[0] : 'N/A'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PSR_System_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4 no-print">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-blue-500" /> Filter Criteria
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Department */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Department</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-950 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Action triggers */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" /> Export Excel/CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden print-container">
        {/* Print Header (Only visible when printing) */}
        <div className="hidden print-only p-8 text-center border-b border-slate-200 mb-6 space-y-2">
          <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">Enterprise Service Requests Audit Report</h2>
          <p className="text-xs text-slate-500">Generated on: {new Date().toLocaleString()}</p>
          <div className="flex justify-center gap-6 text-xs text-slate-600 mt-2">
            {filterDept && <p>Department: {filterDept}</p>}
            {filterPriority && <p>Priority: {filterPriority}</p>}
            {filterStatus && <p>Status: {filterStatus}</p>}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center no-print">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-blue-500" /> Filtered Records ({filteredRequests.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Req No</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Service Requested</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Requester</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Date Submitted</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {filteredRequests.map((req) => (
                <tr key={req.requestNo} className="hover:bg-slate-50/10">
                  <td className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</td>
                  <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">{req.department}</td>
                  <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{req.service}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 font-medium">{req.requester}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500">{req.priority}</td>
                  <td className="py-3 px-4 text-xs text-slate-400 font-mono">{req.createdAt.split('T')[0]}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 border dark:bg-slate-800 dark:border-slate-700">
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No matching records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
