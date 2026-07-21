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
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { ServiceRequest, UserProfile, RequestStatus } from '../types';
import {
  submitRequest,
  updateRequestStatus,
  getTechnicians,
  getDepartments,
  getMachines,
  createNotification,
  addCommentToRequest
} from '../services/db';

interface RequestsProps {
  requests: ServiceRequest[];
  profile: UserProfile | null;
  users: UserProfile[];
  setTab?: (tab: string) => void;
}

export const Requests: React.FC<RequestsProps> = ({ requests, profile, users, setTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  // New Request Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalFormData, setModalFormData] = useState({
    title: '',
    department: '',
    category: '',
    priority: 'Medium' as ServiceRequest['priority'],
    description: '',
    attachments: [] as string[]
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (showCreateModal && profile) {
      setModalFormData({
        title: '',
        department: profile.department || 'Production',
        category: '',
        priority: 'Medium',
        description: '',
        attachments: []
      });
    }
  }, [showCreateModal, profile]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
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

  // Additional Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSatisfied, setFeedbackSatisfied] = useState<boolean | null>(null);

  // Admin Actions Panel States
  const [adminStage, setAdminStage] = useState('');
  const [adminPriority, setAdminPriority] = useState('');
  const [adminDept, setAdminDept] = useState('');
  const [adminTech, setAdminTech] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [completionRemark, setCompletionRemark] = useState('');
  const [showCompletionForm, setShowCompletionForm] = useState(false);

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

      // Add actual comments and replies from the comments thread
      if (selectedRequest.comments && selectedRequest.comments.length > 0) {
        selectedRequest.comments.forEach(c => {
          initialComments.push({
            sender: c.authorName,
            role: c.authorRole,
            text: c.text,
            time: c.time
          });
          if (c.replies && c.replies.length > 0) {
            c.replies.forEach(r => {
              initialComments.push({
                sender: r.authorName,
                role: 'Reply',
                text: r.text,
                time: r.time
              });
            });
          }
        });
      }

      setCommentsList(initialComments);

      // Initialize feedback and admin values from selectedRequest
      setFeedbackRating(selectedRequest.feedbackRating || 0);
      setFeedbackComment(selectedRequest.feedbackComment || '');
      setFeedbackSatisfied(selectedRequest.feedbackSatisfied !== undefined ? selectedRequest.feedbackSatisfied : null);
      
      setAdminStage(selectedRequest.stage || 'Submitted');
      setAdminPriority(selectedRequest.priority || 'Medium');
      setAdminDept(selectedRequest.department || 'Production');
      setAdminTech(selectedRequest.assignedTo || '');
      setEstimatedCompletion(selectedRequest.estimatedCompletionDate || '');
      setCompletionRemark(selectedRequest.completionRemark || '');
    }
  }, [selectedRequest]);

  if (!profile) return null;

  // Determine which requests a user can see
  const filteredRequests = requests.filter(req => {
    // Role permissions
    const roleLower = profile.role?.toLowerCase() || '';
    let isVisible = false;
    if (roleLower === 'admin' || roleLower === 'super admin') {
      isVisible = true; // Can see everything
    } else if (roleLower === 'user') {
      isVisible = req.createdBy === profile.uid || req.createdByEmail === profile.email; // Only requests they submitted
    }

    if (!isVisible) return false;

    // Search query match (Request ID, Title/Service, Status/Stage, Department, Priority, Date)
    const matchesSearch =
      req.requestNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.title && req.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.stage && req.stage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      req.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.priority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.requestedDate && req.requestedDate.includes(searchQuery)) ||
      (req.createdAt && req.createdAt.includes(searchQuery));

    // Filter matches
    const matchesDept = filterDept ? req.department === filterDept : true;
    const matchesStatus = filterStatus ? (req.status === filterStatus || req.stage === filterStatus) : true;
    const matchesPriority = filterPriority ? req.priority === filterPriority : true;
    const matchesTech = filterTech ? req.assignedToName === filterTech : true;

    // Date Range
    let matchesDateRange = true;
    if (filterStartDate && req.createdAt) {
      const itemDate = req.createdAt.split('T')[0];
      matchesDateRange = matchesDateRange && itemDate >= filterStartDate;
    }
    if (filterEndDate && req.createdAt) {
      const itemDate = req.createdAt.split('T')[0];
      matchesDateRange = matchesDateRange && itemDate <= filterEndDate;
    }

    return matchesSearch && matchesDept && matchesStatus && matchesPriority && matchesTech && matchesDateRange;
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

  const handleAddComment = async (replyToCommentId?: string) => {
    if (!newComment.trim() || !selectedRequest) return;
    setActionLoading(true);
    try {
      await addCommentToRequest(selectedRequest.id!, newComment, profile, selectedRequest, replyToCommentId);
      
      const updatedComments = selectedRequest.comments ? [...selectedRequest.comments] : [];
      if (replyToCommentId) {
        const commentIdx = updatedComments.findIndex(c => c.id === replyToCommentId);
        if (commentIdx !== -1) {
          const comment = updatedComments[commentIdx];
          const replies = comment.replies ? [...comment.replies] : [];
          replies.push({
            authorName: profile.name,
            text: newComment,
            time: new Date().toISOString()
          });
          updatedComments[commentIdx] = { ...comment, replies };
        }
      } else {
        updatedComments.push({
          id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          authorId: profile.uid,
          authorName: profile.name,
          authorRole: profile.role,
          text: newComment,
          time: new Date().toISOString(),
          replies: []
        });
      }
      setSelectedRequest({ ...selectedRequest, comments: updatedComments });
      setNewComment('');
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminUpdate = async (type: 'stage' | 'priority' | 'department' | 'assign' | 'complete' | 'reject') => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const updates: Partial<ServiceRequest> = {};
      const nowStr = new Date().toISOString();

      if (type === 'stage') {
        if (!adminStage) return;
        updates.stage = adminStage as any;
        if (adminStage === 'Completed') {
          updates.status = 'Completed';
          updates.completedAt = nowStr;
          updates.completedBy = profile.uid;
          updates.completedByName = profile.name;
          updates.completionRemark = completionRemark || 'Completed by Admin';
        } else if (adminStage === 'Rejected') {
          updates.status = 'Rejected';
        } else if (adminStage === 'In Progress') {
          updates.status = 'In Progress';
        } else {
          updates.status = 'In Progress';
        }
      } else if (type === 'priority') {
        if (!adminPriority) return;
        updates.priority = adminPriority as any;
      } else if (type === 'department') {
        if (!adminDept) return;
        updates.department = adminDept;
      } else if (type === 'assign') {
        if (!adminTech) return;
        const techObj = technicians.find(t => t.uid === adminTech);
        updates.assignedTo = adminTech;
        updates.assignedToName = techObj ? techObj.name : 'Officer';
        updates.assignedToEmail = techObj ? techObj.email : '';
        updates.stage = 'Assigned';
        updates.status = 'Assigned';
        if (estimatedCompletion) {
          updates.estimatedCompletionDate = estimatedCompletion;
        }
      } else if (type === 'complete') {
        updates.status = 'Completed';
        updates.stage = 'Completed';
        updates.completedAt = nowStr;
        updates.completedBy = profile.uid;
        updates.completedByName = profile.name;
        updates.completionRemark = completionRemark || 'Task completed successfully.';
      } else if (type === 'reject') {
        updates.status = 'Rejected';
        updates.stage = 'Rejected';
      }

      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      setSelectedRequest({ ...selectedRequest, ...updates });
      alert('Request updated successfully.');
      setShowCompletionForm(false);
    } catch (err: any) {
      alert('Failed to update request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedRequest) return;
    if (feedbackRating === 0) {
      alert('Please select a star rating first.');
      return;
    }
    setActionLoading(true);
    try {
      const updates = {
        feedbackRating,
        feedbackComment,
        feedbackSatisfied: feedbackSatisfied === true,
      };
      await updateRequestStatus(selectedRequest.id!, updates, profile, selectedRequest);
      setSelectedRequest({ ...selectedRequest, ...updates });
      alert('Thank you for your feedback!');
    } catch (err: any) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!modalFormData.title.trim()) {
      setToast({ type: 'error', message: 'Please provide a service title.' });
      return;
    }
    if (!modalFormData.category) {
      setToast({ type: 'error', message: 'Please select a category.' });
      return;
    }
    if (!modalFormData.department) {
      setToast({ type: 'error', message: 'Please select a department.' });
      return;
    }
    if (!modalFormData.description.trim()) {
      setToast({ type: 'error', message: 'Please provide a detailed description.' });
      return;
    }

    setActionLoading(true);
    try {
      const reqPayload: Partial<ServiceRequest> = {
        title: modalFormData.title,
        service: modalFormData.title,
        category: modalFormData.category,
        department: modalFormData.department,
        priority: modalFormData.priority,
        description: modalFormData.description,
        attachments: modalFormData.attachments,
        requester: profile.name,
        contact: profile.phone || '',
        location: 'General',
        machine: 'General',
        timeNeeded: '2 hours',
        equipment: '',
        tools: '',
        requestedDate: new Date().toISOString().split('T')[0],
        requestedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),

        requesterUid: profile.uid,
        requesterName: profile.name,
        requesterEmail: profile.email,
        currentStage: 'Submitted',
      };

      await submitRequest(reqPayload, profile);

      setToast({ type: 'success', message: 'Request submitted successfully!' });
      setShowCreateModal(false);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to submit request.' });
    } finally {
      setActionLoading(false);
    }
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
            {profile.role?.toLowerCase() === 'user' ? 'My Requests' : 'All Requests'} ({filteredRequests.length})
          </button>
          {profile.role?.toLowerCase() === 'user' ? (
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

        {/* Search Bar & Action Buttons (Only shown on list) */}
        {activeSubTab === 'list' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
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
            {profile?.role?.toLowerCase() === 'user' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/10 transition-all whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Request
              </button>
            )}
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
              <option value="">All Statuses / Stages</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Parts">Waiting for Parts</option>
              <option value="Waiting for Approval">Waiting for Approval</option>
              <option value="Approved">Approved</option>
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
            {/* Assigned Tech Filter */}
            <select
              value={filterTech}
              onChange={(e) => setFilterTech(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white py-1.5 px-3 border border-slate-100 dark:border-slate-800/80 rounded-lg outline-none"
            >
              <option value="">All Assigned Officers</option>
              {technicians.map(t => <option key={t.uid} value={t.name}>{t.name}</option>)}
            </select>
            {/* Start Date Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-lg py-1 px-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white outline-none border-none text-[11px] p-0"
              />
            </div>
            {/* End Date Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-lg py-1 px-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white outline-none border-none text-[11px] p-0"
              />
            </div>
            {/* Clear Filters Button */}
            {(filterDept || filterStatus || filterPriority || filterTech || filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterDept('');
                  setFilterStatus('');
                  setFilterPriority('');
                  setFilterTech('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-[11px] font-semibold text-red-600 hover:text-red-500 underline transition-colors pl-1"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Requests Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    {profile.role === 'User' ? (
                      <>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Request ID</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Title</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Stage</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Created Date</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Service Title</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Requester</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Technician</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.requestNo}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 cursor-pointer group transition-colors"
                      onClick={() => setSelectedRequest(req)}
                    >
                      {profile.role === 'User' ? (
                        <>
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-white">{req.requestNo}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">{req.title || req.service}</td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${statusColors[req.status]}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">{req.currentStage || req.stage || 'Submitted'}</td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] font-bold tracking-wide ${priorityColors[req.priority]}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
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
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Service Request Workspace</span>
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
              
              {/* 1. Modern Timeline/Stepper */}
              <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100/30 dark:border-slate-800/20">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Request Workflow Progress</h4>
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 overflow-x-auto pb-2">
                  {[
                    'Submitted',
                    'Under Review',
                    'Assigned',
                    'In Progress',
                    'Waiting for Parts',
                    'Waiting for Approval',
                    'Approved',
                    'Completed'
                  ].map((stage, idx, arr) => {
                    const currentStageVal = selectedRequest.stage || 'Submitted';
                    const isCurrent = currentStageVal === stage;
                    
                    // Workflow index matching to check if stage is completed
                    const stageOrder = [
                      'Submitted',
                      'Under Review',
                      'Assigned',
                      'In Progress',
                      'Waiting for Parts',
                      'Waiting for Approval',
                      'Approved',
                      'Completed'
                    ];
                    
                    const isRejected = currentStageVal === 'Rejected';
                    const isCompleted = !isRejected && (
                      currentStageVal === 'Completed' || (stageOrder.indexOf(currentStageVal) >= stageOrder.indexOf(stage))
                    );

                    let stepColor = 'text-slate-400 bg-slate-100 dark:bg-slate-800';
                    if (isCurrent) {
                      stepColor = isRejected ? 'text-white bg-red-600' : 'text-white bg-blue-600 animate-pulse';
                    } else if (isCompleted) {
                      stepColor = 'text-white bg-green-500';
                    }

                    return (
                      <div key={stage} className="flex-1 flex items-center gap-2">
                        <div className="flex items-center gap-2 min-w-[125px]">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${stepColor}`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[10px] font-bold truncate ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-500' : 'text-slate-400'}`}>
                              {stage}
                            </p>
                          </div>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`hidden md:block flex-1 h-0.5 min-w-[15px] ${isCompleted ? 'bg-green-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedRequest.stage === 'Rejected' && (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-xl border border-red-100 dark:border-red-900/30 text-xs font-semibold flex items-center gap-1.5">
                    <X className="w-4 h-4" /> This request has been Rejected.
                  </div>
                )}
              </div>

              {/* 2. User Tracking Info Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Current Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${statusColors[selectedRequest.status]}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Current Stage</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{selectedRequest.currentStage || selectedRequest.stage || 'Submitted'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Assigned Department</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedRequest.department || 'General'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Assigned Officer</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedRequest.assignedToName || 'Unassigned'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Priority Level</span>
                  <span className={`text-xs font-bold ${
                    selectedRequest.priority === 'Urgent' ? 'text-red-600' :
                    selectedRequest.priority === 'High' ? 'text-amber-600' :
                    selectedRequest.priority === 'Medium' ? 'text-blue-600' : 'text-slate-500'
                  }`}>{selectedRequest.priority}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Created Date</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleDateString()} {new Date(selectedRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Estimated Completion</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{selectedRequest.estimatedCompletionDate || 'Not specified'}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Completion Date</span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">{selectedRequest.completedAt ? new Date(selectedRequest.completedAt).toLocaleDateString() : 'Pending'}</span>
                </div>
              </div>

              {/* Requester & Asset Metadata Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100/30 dark:border-slate-800/20">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Requester Details</h4>
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-500">Name:</span> {selectedRequest.requester}</p>
                    <p><span className="font-semibold text-slate-500">Email:</span> {selectedRequest.createdByEmail || 'N/A'}</p>
                    <p><span className="font-semibold text-slate-500">Contact:</span> {selectedRequest.contact || 'None'}</p>
                    <p><span className="font-semibold text-slate-500">Department:</span> {selectedRequest.department}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Asset & Service Details</h4>
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <p><span className="font-semibold text-slate-500">Asset/Machine:</span> {selectedRequest.machine}</p>
                    <p><span className="font-semibold text-slate-500">Location:</span> {selectedRequest.location}</p>
                    <p><span className="font-semibold text-slate-500">Service Required:</span> {selectedRequest.service}</p>
                    <p><span className="font-semibold text-slate-500">Category:</span> {selectedRequest.category || 'General'}</p>
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
                    {selectedRequest.attachments.map((fileData, idx) => {
                      const isImage = fileData.startsWith('data:image/');
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950/20">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-mono">Attachment #{idx + 1}</span>
                          </div>
                          {isImage ? (
                            <a href={fileData} download={`attachment_${idx + 1}.png`} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">Download Image</a>
                          ) : (
                            <a href={fileData} download={`attachment_${idx + 1}`} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">Download File</a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Admin & Operations Control Panel */}
              {(profile.role?.toLowerCase() === 'admin' || profile.role?.toLowerCase() === 'super admin') && (
                <div className="p-5 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Operations Administrative Workspace
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Change Workflow Stage */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Update Stage</label>
                      <select
                        value={adminStage}
                        onChange={(e) => {
                          setAdminStage(e.target.value);
                          if (e.target.value === 'Completed') setShowCompletionForm(true);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting for Parts">Waiting for Parts</option>
                        <option value="Waiting for Approval">Waiting for Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <button
                        onClick={() => handleAdminUpdate('stage')}
                        disabled={actionLoading}
                        className="mt-1.5 w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded transition-colors"
                      >
                        Apply Stage Update
                      </button>
                    </div>

                    {/* Change Priority Level */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Change Priority</label>
                      <select
                        value={adminPriority}
                        onChange={(e) => setAdminPriority(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                      <button
                        onClick={() => handleAdminUpdate('priority')}
                        disabled={actionLoading}
                        className="mt-1.5 w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded transition-colors"
                      >
                        Change Priority
                      </button>
                    </div>

                    {/* Transfer Department */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Transfer Department</label>
                      <select
                        value={adminDept}
                        onChange={(e) => setAdminDept(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      >
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <button
                        onClick={() => handleAdminUpdate('department')}
                        disabled={actionLoading}
                        className="mt-1.5 w-full py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded transition-colors"
                      >
                        Transfer Department
                      </button>
                    </div>
                  </div>

                  {/* Technician Officer Assignment / SLA Planning */}
                  <div className="border-t border-blue-100/50 dark:border-blue-900/20 pt-4 space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block">Technician Assignment & SLA Planning</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <select
                        value={adminTech}
                        onChange={(e) => setAdminTech(e.target.value)}
                        className="text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      >
                        <option value="">Select Technician...</option>
                        {technicians.map(t => <option key={t.uid} value={t.uid}>{t.name} ({t.department})</option>)}
                      </select>
                      <input
                        type="text"
                        value={estimatedCompletion}
                        onChange={(e) => setEstimatedCompletion(e.target.value)}
                        placeholder="Est. Completion (e.g. 2 days)"
                        className="text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      />
                      <button
                        onClick={() => handleAdminUpdate('assign')}
                        disabled={actionLoading}
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign & Set SLA
                      </button>
                    </div>
                  </div>

                  {/* Complete / Reject Shortcuts with Remarks */}
                  <div className="border-t border-blue-100/50 dark:border-blue-900/20 pt-4 space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block">Completion / Rejection Actions</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={completionRemark}
                        onChange={(e) => setCompletionRemark(e.target.value)}
                        placeholder="Resolution comments or rejection explanation..."
                        className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-850 rounded-lg outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdminUpdate('complete')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Mark as Completed
                        </button>
                        <button
                          onClick={() => handleAdminUpdate('reject')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" /> Reject Request
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Technician Direct Updates */}
              {profile.role === 'Technician' && selectedRequest.assignedTo === profile.uid && (
                <div className="p-5 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-purple-800 dark:text-purple-400">Technician Officer Workspace</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      id="techRemarkInput"
                      placeholder="Enter technical comments or resolution applied..."
                      className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-2.5 px-3.5 border border-slate-250 dark:border-slate-800 rounded-xl outline-none"
                    />
                    <div className="flex items-center gap-2">
                      {selectedRequest.status === 'Assigned' && (
                        <button
                          onClick={() => handleTechnicianUpdate('In Progress')}
                          className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
                        >
                          Start Job (Set In Progress)
                        </button>
                      )}
                      {selectedRequest.status === 'In Progress' && (
                        <button
                          onClick={() => {
                            const input = document.getElementById('techRemarkInput') as HTMLInputElement;
                            handleTechnicianUpdate('Completed');
                          }}
                          className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition-all"
                        >
                          Mark Job Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. User Feedback Form (Only for Creator after request is Completed) */}
              {selectedRequest.createdBy === profile.uid && selectedRequest.status === 'Completed' && (
                <div className="p-5 bg-amber-50/25 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider">Submit Service Feedback</h4>
                  </div>
                  
                  <div className="space-y-3.5">
                    {/* Satisfied Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Are you satisfied with the resolution?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFeedbackSatisfied(true)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                            feedbackSatisfied === true
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackSatisfied(false)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${
                            feedbackSatisfied === false
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> No
                        </button>
                      </div>
                    </div>

                    {/* Stars Rating */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quality of Service Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= feedbackRating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Comment */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block">Share your feedback comments</label>
                      <textarea
                        rows={2}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="What went well? Any other remarks..."
                        className="w-full text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-3 border border-slate-250 dark:border-slate-800 rounded-xl outline-none resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitFeedback}
                      disabled={actionLoading}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/10"
                    >
                      Submit Feedback
                    </button>
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

              {/* History Audit Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <History className="w-4 h-4" /> Operations Audit History
                </h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 pl-8">
                  <div className="relative">
                    <span className="absolute -left-8 top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Submitted Request</p>
                    <p className="text-[10px] text-slate-400">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedRequest.hodStatus !== 'Pending' && (
                    <div className="relative">
                      <span className={`absolute -left-8 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${selectedRequest.hodStatus === 'Approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">HOD Decision: {selectedRequest.hodStatus}</p>
                      {selectedRequest.hodComments && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">"Comments: {selectedRequest.hodComments}"</p>}
                      <p className="text-[10px] text-slate-400">{new Date(selectedRequest.hodApprovedAt || selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedRequest.prodStatus !== 'Pending' && (
                    <div className="relative">
                      <span className={`absolute -left-8 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${selectedRequest.prodStatus === 'Approved' ? 'bg-blue-500' : 'bg-red-500'}`} />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">Production Decision: {selectedRequest.prodStatus}</p>
                      {selectedRequest.assignedToName && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned Officer: {selectedRequest.assignedToName}</p>}
                      {selectedRequest.prodComments && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">"Comments: {selectedRequest.prodComments}"</p>}
                      <p className="text-[10px] text-slate-400">{new Date(selectedRequest.prodApprovedAt || selectedRequest.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedRequest.timeline && selectedRequest.timeline.length > 0 && (
                    selectedRequest.timeline.map((event, eventIdx) => (
                      <div key={eventIdx} className="relative">
                        <span className="absolute -left-8 top-1 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white dark:border-slate-900" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{event.stage}</p>
                        {event.remarks && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">"{event.remarks}"</p>}
                        <p className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                  {selectedRequest.status === 'Completed' && (
                    <div className="relative">
                      <span className="absolute -left-8 top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">Completed</p>
                      {selectedRequest.completionRemark && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">"Remarks: {selectedRequest.completionRemark}"</p>}
                      <p className="text-[10px] text-slate-400">{selectedRequest.completedAt ? new Date(selectedRequest.completedAt).toLocaleString() : ''}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Rich Chat, Comments & Nested Replies */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" /> Service Communication & Discussions
                </h4>

                <div className="space-y-4 bg-slate-50 dark:bg-slate-950/20 p-5 rounded-2xl max-h-[350px] overflow-y-auto">
                  {/* Custom display of comments with replies */}
                  {selectedRequest.comments && selectedRequest.comments.length > 0 ? (
                    selectedRequest.comments.map((comment) => (
                      <div key={comment.id} className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                        <div className="text-xs space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{comment.authorName}</span>
                              <span className="text-[9px] font-semibold uppercase text-slate-400 ml-1.5">({comment.authorRole})</span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              {new Date(comment.time).toLocaleDateString()} {new Date(comment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans text-[11px] mt-1">{comment.text}</p>
                          
                          {/* Reply Trigger */}
                          <div className="flex justify-end mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const replyText = prompt(`Reply to ${comment.authorName}:`);
                                if (replyText) {
                                  setNewComment(replyText);
                                  // Call handleAddComment with replyToCommentId
                                  handleAddComment(comment.id);
                                }
                              }}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-500 transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                        </div>

                        {/* Nest Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="space-y-2.5 pl-6 border-l-2 border-slate-200 dark:border-slate-800">
                            {comment.replies.map((reply, replyIdx) => (
                              <div key={replyIdx} className="text-xs bg-slate-50/50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="flex justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{reply.authorName} <span className="text-[8px] font-semibold uppercase text-slate-400 ml-1">(Replied)</span></span>
                                  <span className="text-[9px] text-slate-400">
                                    {new Date(reply.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    /* Fallback to CommentsList simulation if empty */
                    commentsList.map((c, idx) => (
                      <div key={idx} className="text-xs space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-2xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.sender} <span className="text-[9px] font-semibold uppercase text-slate-400 ml-1">({c.role})</span></span>
                          <span className="text-[9px] text-slate-400">{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Submit New Comment Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a message or operation update..."
                    className="flex-1 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2.5 px-4 border border-slate-200 dark:border-slate-800 rounded-xl outline-none"
                  />
                  <button
                    onClick={() => handleAddComment()}
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

      {/* ================= NEW REQUEST MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">User Workspace</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Create Service Request
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleModalSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Service Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Service Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalFormData.title}
                  onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                  placeholder="e.g. Mold injector heating element repair"
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={modalFormData.department}
                    onChange={(e) => setModalFormData({ ...modalFormData, department: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none transition-all"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                    {!departments.includes('Production') && <option value="Production">Production</option>}
                    {!departments.includes('Maintenance') && <option value="Maintenance">Maintenance</option>}
                    {!departments.includes('Quality') && <option value="Quality">Quality</option>}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={modalFormData.category}
                    onChange={(e) => setModalFormData({ ...modalFormData, category: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none transition-all"
                  >
                    <option value="">Select Category...</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Software/IT">Software / IT</option>
                    <option value="Civil">Civil / Infrastructure</option>
                    <option value="Safety">Safety / General</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={modalFormData.priority}
                  onChange={(e) => setModalFormData({ ...modalFormData, priority: e.target.value as ServiceRequest['priority'] })}
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none transition-all"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={modalFormData.description}
                  onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                  placeholder="Provide detailed information regarding the issue..."
                  className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none transition-all resize-none"
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Attachment (Optional)
                </label>
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors relative cursor-pointer font-sans">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file: any) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setModalFormData(prev => ({
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
                  <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-500">Click or drag files to upload</p>
                </div>
                {modalFormData.attachments && modalFormData.attachments.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {modalFormData.attachments.map((fileData, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[100px]">File #{i+1}</span>
                        <button
                          type="button"
                          onClick={() => setModalFormData(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, idx) => idx !== i)
                          }))}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FLOATING TOAST ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-700 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-fade-in transition-all">
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
            {toast.type === 'success' ? <Check className="w-4.5 h-4.5" /> : <X className="w-4.5 h-4.5" />}
          </div>
          <div>
            <p className="text-xs font-bold">{toast.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
