import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Check,
  X,
  UserCheck,
  Send,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  Wrench,
  Paperclip,
  TrendingUp,
  MessageSquare,
  History,
  AlertCircle
} from 'lucide-react';
import { ServiceRequest, UserProfile, RequestStatus } from '../types';
import {
  submitRequest,
  updateRequestStatus,
  getTechnicians,
  getDepartments,
  getMachines,
  createNotification
} from '../services/db';

interface RequestsProps {
  requests: ServiceRequest[];
  profile: UserProfile | null;
  users: UserProfile[];
}

export const Requests: React.FC<RequestsProps> = ({ requests, profile, users }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  
  // Cache data
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [machines, setMachines] = useState<string[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTech, setFilterTech] = useState('');

  // New Request Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    department: '',
    machine: 'General',
    priority: 'Medium' as ServiceRequest['priority'],
    attachments: [] as string[],
    requester: '',
    contact: '',
    location: '',
    service: '',
    timeNeeded: '2 hours',
    equipment: '',
    tools: '',
    requestedDate: new Date().toISOString().split('T')[0],
    requestedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  });

  // Modal Comments State
  const [newComment, setNewComment] = useState('');
  const [commentsList, setCommentsList] = useState<{ sender: string; role: string; text: string; time: string }[]>([]);

  // Form handling UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    async function loadAuxData() {
      try {
        const techs = await getTechnicians();
        setTechnicians(techs);

        const depts = await getDepartments();
        setDepartments(depts.map(d => d.name));

        const machs = await getMachines();
        setMachines(machs.map(m => m.name));
      } catch (err) {
        console.error('Error loading ancillary data:', err);
      }
    }
    loadAuxData();
  }, []);

  useEffect(() => {
    if (profile && !formData.requester) {
      setFormData(prev => ({
        ...prev,
        requester: profile.name,
        contact: profile.phone || '',
        department: profile.department || 'Production'
      }));
    }
  }, [profile]);

  // Load comments when selectedRequest changes
  useEffect(() => {
    if (selectedRequest) {
      // Setup some default comments or simulate from structured comment notes
      const initialComments = [
        { sender: selectedRequest.createdByName, role: 'Requester', text: `Submitted request. Reason: ${selectedRequest.description}`, time: selectedRequest.createdAt }
      ];
      if (selectedRequest.hodStatus !== 'Pending') {
        initialComments.push({
          sender: selectedRequest.hodApprovedBy || 'HOD',
          role: 'Head of Department',
          text: `HOD Status set to: ${selectedRequest.hodStatus}. Comments: ${selectedRequest.hodComments || 'None'}`,
          time: selectedRequest.hodApprovedAt || selectedRequest.createdAt
        });
      }
      if (selectedRequest.prodStatus !== 'Pending') {
        initialComments.push({
          sender: selectedRequest.prodApprovedBy || 'Production Manager',
          role: 'Production Manager',
          text: `Production Status set to: ${selectedRequest.prodStatus}. Technician Assigned: ${selectedRequest.assignedToName || 'None'}. Comments: ${selectedRequest.prodComments || 'None'}`,
          time: selectedRequest.prodApprovedAt || selectedRequest.createdAt
        });
      }
      if (selectedRequest.technicianComments) {
        initialComments.push({
          sender: selectedRequest.assignedToName || 'Technician',
          role: 'Technician',
          text: `Job Comments: ${selectedRequest.technicianComments}`,
          time: selectedRequest.completedAt || selectedRequest.updatedAt
        });
      }
      setCommentsList(initialComments);
    }
  }, [selectedRequest]);

  if (!profile) return null;

  // Determine which requests a user can see
  const filteredRequests = requests.filter(req => {
    // Role permissions
    let isVisible = false;
    if (profile.role === 'Super Admin' || profile.role === 'Admin' || profile.role === 'Production Manager') {
      isVisible = true; // Can see everything
    } else if (profile.role === 'Technician') {
      isVisible = req.assignedTo === profile.uid; // Only their assigned jobs
    } else if (profile.role === 'Department User' || profile.role === 'User') {
      isVisible = req.createdBy === profile.uid || req.createdByEmail === profile.email; // Only requests they submitted
    }

    if (!isVisible) return false;

    // Search query match
    const matchesSearch =
      req.requestNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter matches
    const matchesDept = filterDept ? req.department === filterDept : true;
    const matchesStatus = filterStatus ? req.status === filterStatus : true;
    const matchesPriority = filterPriority ? req.priority === filterPriority : true;
    const matchesTech = filterTech ? req.assignedToName === filterTech : true;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority && matchesTech;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (!formData.department || !formData.service || !formData.description || !formData.category) {
        throw new Error('Please fill in all required fields marked with an asterisk (*).');
      }
      const requestNo = await submitRequest(formData, profile);
      setFormSuccess(`Request ${requestNo} submitted successfully!`);
      // Reset
      setFormData(prev => ({
        ...prev,
        title: '',
        category: '',
        description: '',
        service: '',
        equipment: '',
        tools: '',
        attachments: [],
      }));
      setTimeout(() => {
        setActiveSubTab('list');
        setFormSuccess('');
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approval / Assignment Actions
  const handleHODDecision = async (decision: 'Approved' | 'Rejected') => {
    if (!selectedRequest) return;
    const comments = prompt(decision === 'Approved' ? 'Enter optional HOD approval comments:' : 'Enter reason for HOD rejection (required):');
    if (decision === 'Rejected' && !comments) {
      alert('You must provide a rejection reason.');
      return;
    }
    if (comments === null) return; // cancelled

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Partial<ServiceRequest> = {
        hodStatus: decision,
        hodComments: comments,
        hodApprovedBy: profile.name,
        hodApprovedAt: now,
        status: decision === 'Rejected' ? 'Rejected' : 'Approved',
        prodStatus: decision === 'Rejected' ? 'Rejected' : 'Pending'
      };

      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      
      // Notify creator
      await createNotification(
        selectedRequest.createdBy,
        `Your request ${selectedRequest.requestNo} HOD status is now: ${decision}. Comments: ${comments}`,
        selectedRequest.requestNo
      );

      // Refresh Modal
      setSelectedRequest({ ...selectedRequest, ...updates });
      alert(`Request has been ${decision.toLowerCase()} by HOD.`);
    } catch (err: any) {
      alert('Failed to update request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProductionDecision = async (decision: 'Approved' | 'Rejected', technicianUid?: string) => {
    if (!selectedRequest) return;
    let technicianName = '';
    let technicianEmail = '';

    if (decision === 'Approved') {
      if (!technicianUid) {
        alert('Please select a technician first.');
        return;
      }
      const tech = technicians.find(t => t.uid === technicianUid);
      if (tech) {
        technicianName = tech.name;
        technicianEmail = tech.email;
      }
    }

    const comments = prompt(decision === 'Approved' ? 'Enter optional assignment notes:' : 'Enter reason for production rejection (required):');
    if (decision === 'Rejected' && !comments) {
      alert('You must provide a rejection reason.');
      return;
    }
    if (comments === null) return;

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Partial<ServiceRequest> = {
        prodStatus: decision,
        prodComments: comments,
        prodApprovedBy: profile.name,
        prodApprovedAt: now,
        status: decision === 'Rejected' ? 'Rejected' : 'Assigned',
        assignedTo: technicianUid || '',
        assignedToName: technicianName,
        assignedToEmail: technicianEmail
      };

      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      
      // Notify technician and requester
      if (technicianUid) {
        await createNotification(
          technicianUid,
          `You have been assigned request ${selectedRequest.requestNo}: ${selectedRequest.service}`,
          selectedRequest.requestNo
        );
      }
      await createNotification(
        selectedRequest.createdBy,
        `Your request ${selectedRequest.requestNo} production status is: ${decision}. Technician assigned: ${technicianName}`,
        selectedRequest.requestNo
      );

      setSelectedRequest({ ...selectedRequest, ...updates });
      alert(`Request assigned and approved successfully.`);
    } catch (err: any) {
      alert('Failed to process production decision: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTechnicianUpdate = async (status: 'In Progress' | 'Completed') => {
    if (!selectedRequest) return;
    let remarks = '';
    if (status === 'Completed') {
      const promptRemarks = prompt('Enter final completion remarks / solution applied:');
      if (promptRemarks === null) return;
      remarks = promptRemarks;
    }

    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Partial<ServiceRequest> = {
        status,
        updatedAt: now,
        ...(status === 'Completed' ? { completedAt: now, technicianComments: remarks } : {})
      };

      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      
      // Notify requester
      await createNotification(
        selectedRequest.createdBy,
        `Technician updated request ${selectedRequest.requestNo} status to: ${status}. ${remarks ? `Remarks: ${remarks}` : ''}`,
        selectedRequest.requestNo
      );

      setSelectedRequest({ ...selectedRequest, ...updates });
      alert(`Status updated successfully to ${status}`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;
    if (!confirm('Are you sure you want to cancel this request?')) return;

    setActionLoading(true);
    try {
      const updates: Partial<ServiceRequest> = {
        status: 'Cancelled'
      };
      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      setSelectedRequest({ ...selectedRequest, ...updates });
      alert('Request cancelled successfully.');
    } catch (err: any) {
      alert('Failed to cancel request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedRequest) return;
    const commentObj = {
      sender: profile.name,
      role: profile.role,
      text: newComment,
      time: new Date().toISOString()
    };
    setCommentsList([...commentsList, commentObj]);
    setNewComment('');
  };

  const priorityColors = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/40',
    Medium: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    High: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    Urgent: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
  };

  const statusColors = {
    Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
    Approved: 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400',
    Assigned: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400',
    'In Progress': 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400',
    Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
    Rejected: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
    Cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <div className="space-y-6">
      {/* Tab bar / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeSubTab === 'list'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Requests ({filteredRequests.length})
          </button>
          {profile.role === 'User' ? (
            <button
              onClick={() => setActiveSubTab('create')}
              className={`px-4 py-2 text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                activeSubTab === 'create'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Plus className="w-4 h-4" />
              New Service Request
            </button>
          ) : null}
        </div>

        {/* Search Bar (Only shown on list) */}
        {activeSubTab === 'list' && (
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request number, service, user..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
            />
          </div>
        )}
      </div>

      {activeSubTab === 'create' ? (
        /* ================= NEW REQUEST FORM ================= */
        <div className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">New Service Request</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please provide accurate description and details of the required manufacturing/production maintenance service.</p>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service Requested */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Service Required / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value, title: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  placeholder="e.g. Injection Molding M1 motor overheating"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Category...</option>
                  <option value="Electrical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Electrical</option>
                  <option value="Mechanical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mechanical</option>
                  <option value="Software/IT" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Software / IT</option>
                  <option value="Civil" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Civil / Infrastructure</option>
                  <option value="Safety" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Safety / General</option>
                  <option value="Other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Other</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Department...</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{dept}</option>
                  ))}
                </select>
              </div>

              {/* Machine */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Associated Asset / Machine
                </label>
                <select
                  value={formData.machine}
                  onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="General" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">General / Facility</option>
                  {machines.map(mach => (
                    <option key={mach} value={mach} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{mach}</option>
                  ))}
                </select>
              </div>

              {/* Requester Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Requester Name
                </label>
                <input
                  type="text"
                  value={formData.requester}
                  onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                />
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  placeholder="e.g. Ext 412"
                />
              </div>

              {/* Specific Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Location in Factory
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  placeholder="e.g. Floor 2, Assembly bay B"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as ServiceRequest['priority'] })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white outline-none appearance-none"
                >
                  <option value="Low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Low</option>
                  <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Medium</option>
                  <option value="High" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">High</option>
                  <option value="Urgent" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Urgent</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none"
                  placeholder="Explain the specific issue, signs of failure, and urgency..."
                />
              </div>

              {/* Equipment Required */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Safety Equipment Required
                </label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  placeholder="e.g. Safety harness, ear plugs"
                />
              </div>

              {/* Tools Required */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Tools Required
                </label>
                <input
                  type="text"
                  value={formData.tools}
                  onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                  placeholder="e.g. Voltmeter, Allen keys"
                />
              </div>

              {/* Attachments */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Attachments (Images or Documents)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file: any) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setFormData(prev => ({
                              ...prev,
                              attachments: [...prev.attachments, reader.result as string]
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">Drag and drop files here, or click to browse</p>
                  <p className="text-[10px] text-slate-400 mt-1">Supports images, PDF, and text files</p>
                </div>
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.attachments.map((fileData, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">Attachment #{i+1}</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, idx) => idx !== i)
                          }))}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
              >
                Submit Service Request
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-6 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-4">
          {/* List Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </div>
            {/* Dept Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white py-1.5 px-3 border border-slate-100 dark:border-slate-800/80 rounded-lg outline-none"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white py-1.5 px-3 border border-slate-100 dark:border-slate-800/80 rounded-lg outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending HOD</option>
              <option value="Approved">Approved / Unassigned</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white py-1.5 px-3 border border-slate-100 dark:border-slate-800/80 rounded-lg outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Requests Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Service Title</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Requester</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Technician</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.requestNo}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 cursor-pointer group transition-colors"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{req.department}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{req.service}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">{req.requester}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] font-bold tracking-wide ${priorityColors[req.priority]}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{req.assignedToName || '-'}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${statusColors[req.status]}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(req);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-500 group-hover:underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No requests found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REQUEST DETAILS & ACTIONS MODAL ================= */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Service Request Details</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedRequest.requestNo}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[selectedRequest.status]}`}>
                    {selectedRequest.status}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Metadata Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Requester Details</h4>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-500">Name:</span> {selectedRequest.requester}</p>
                    <p><span className="font-semibold text-slate-500">Phone:</span> {selectedRequest.contact || 'None'}</p>
                    <p><span className="font-semibold text-slate-500">Department:</span> {selectedRequest.department}</p>
                    <p><span className="font-semibold text-slate-500">Asset/Machine:</span> {selectedRequest.machine}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Service Details</h4>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-500">Location:</span> {selectedRequest.location}</p>
                    <p><span className="font-semibold text-slate-500">Service Required:</span> {selectedRequest.service}</p>
                    <p><span className="font-semibold text-slate-500">Category:</span> {selectedRequest.category || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-500">Priority:</span> {selectedRequest.priority}</p>
                    <p><span className="font-semibold text-slate-500">Est. Time Needed:</span> {selectedRequest.timeNeeded}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Resources Needed</h4>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-500">Tools:</span> {selectedRequest.tools || 'None'}</p>
                    <p><span className="font-semibold text-slate-500">Safety Equipment:</span> {selectedRequest.equipment || 'None'}</p>
                    <p><span className="font-semibold text-slate-500">Scheduled Date:</span> {selectedRequest.requestedDate}</p>
                    <p><span className="font-semibold text-slate-500">Scheduled Time:</span> {selectedRequest.requestedTime}</p>
                  </div>
                </div>
              </div>

              {/* Description Detail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Detailed Request Description</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/10 p-4 rounded-xl border border-slate-100/30 dark:border-slate-800/20 leading-relaxed font-mono">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Attachments Section */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Attachments</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedRequest.attachments.map((fileData, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950/20">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-mono">Attachment #{idx + 1}</span>
                        </div>
                        {fileData.startsWith('data:image/') ? (
                          <a href={fileData} download={`attachment_${idx + 1}.png`} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">Download Image</a>
                        ) : (
                          <a href={fileData} download={`attachment_${idx + 1}`} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">Download File</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Panels depending on User Role & Request Status */}
              {profile.role === 'Super Admin' || profile.role === 'Admin' || profile.role === 'Production Manager' ? (
                <div className="p-4 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Workflow Actions
                  </h4>

                  {/* 1. HOD Action (when Status = Pending) */}
                  {selectedRequest.hodStatus === 'Pending' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Step 1: Head of Department (HOD) Review</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleHODDecision('Approved')}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Request
                        </button>
                        <button
                          onClick={() => handleHODDecision('Rejected')}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reject Request
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Production / Technician Assignment (when HODStatus = Approved and ProdStatus = Pending) */}
                  {selectedRequest.hodStatus === 'Approved' && selectedRequest.prodStatus === 'Pending' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Step 2: Assign Technician and Schedule Production Approval</p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <select
                          id="assignTechSelect"
                          className="flex-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3.5 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                        >
                          <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Technician...</option>
                          {technicians.map(t => <option key={t.uid} value={t.uid} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.name} ({t.department})</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const select = document.getElementById('assignTechSelect') as HTMLSelectElement;
                              handleProductionDecision('Approved', select?.value);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Approve & Assign
                          </button>
                          <button
                            onClick={() => handleProductionDecision('Rejected')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Technician Job Completion controls (when Assigned / In Progress) */}
              {profile.role === 'Technician' && selectedRequest.assignedTo === profile.uid && (
                <div className="p-4 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-purple-800 dark:text-purple-400">Your Work Controls</h4>
                  <div className="flex items-center gap-2">
                    {selectedRequest.status === 'Assigned' && (
                      <button
                        onClick={() => handleTechnicianUpdate('In Progress')}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors"
                      >
                        Start Job (Set to In Progress)
                      </button>
                    )}
                    {selectedRequest.status === 'In Progress' && (
                      <button
                        onClick={() => handleTechnicianUpdate('Completed')}
                        className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition-colors"
                      >
                        Complete Job (Save Remarks)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cancel Request Option (by Creator when request is still pending) */}
              {selectedRequest.createdBy === profile.uid && selectedRequest.status === 'Pending' && (
                <div className="pt-2">
                  <button
                    onClick={handleCancelRequest}
                    className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel My Request
                  </button>
                </div>
              )}

              {/* History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <History className="w-4 h-4" /> Activity History & Timeline
                </h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 pl-8">
                  {/* Step 1 */}
                  <div className="relative">
                    <span className="absolute -left-8 top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Submitted Request</p>
                    <p className="text-[10px] text-slate-400">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                  {/* Step 2 */}
                  {selectedRequest.hodStatus !== 'Pending' && (
                    <div className="relative">
                      <span className={`absolute -left-8 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${selectedRequest.hodStatus === 'Approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">HOD Review: {selectedRequest.hodStatus}</p>
                      {selectedRequest.hodComments && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Comments: {selectedRequest.hodComments}</p>}
                      <p className="text-[10px] text-slate-400">{new Date(selectedRequest.hodApprovedAt || selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {/* Step 3 */}
                  {selectedRequest.prodStatus !== 'Pending' && (
                    <div className="relative">
                      <span className={`absolute -left-8 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${selectedRequest.prodStatus === 'Approved' ? 'bg-blue-500' : 'bg-red-500'}`} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Production Review: {selectedRequest.prodStatus}</p>
                      {selectedRequest.assignedToName && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned Tech: {selectedRequest.assignedToName}</p>}
                      {selectedRequest.prodComments && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Comments: {selectedRequest.prodComments}</p>}
                      <p className="text-[10px] text-slate-400">{new Date(selectedRequest.prodApprovedAt || selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {/* Step 4 */}
                  {selectedRequest.status === 'Completed' && (
                    <div className="relative">
                      <span className="absolute -left-8 top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Completed</p>
                      {selectedRequest.technicianComments && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Remarks: {selectedRequest.technicianComments}</p>}
                      <p className="text-[10px] text-slate-400">{new Date(selectedRequest.completedAt || selectedRequest.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat & Comments Section */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" /> Communication Thread / Comments
                </h4>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl max-h-[200px] overflow-y-auto">
                  {commentsList.map((c, idx) => (
                    <div key={idx} className="text-xs space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-2xs">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.sender} <span className="text-[9px] font-semibold uppercase text-slate-400 ml-1">({c.role})</span></span>
                        <span className="text-[9px] text-slate-400">{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{c.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a message or technical update..."
                    className="flex-1 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2.5 px-4 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
