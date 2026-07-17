import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { updateUserProfile, deleteUser, createNotification } from '../services/db';
import { adminCreateUser, sendPasswordReset } from '../services/auth';
import { 
  Trash2, Shield, Search, Check, RefreshCw, AlertCircle, 
  UserPlus, Edit2, Key, ChevronLeft, ChevronRight, X, 
  UserCheck, UserX, Building2, Phone, Mail, Filter
} from 'lucide-react';

interface UsersProps {
  users: UserProfile[];
  profile: UserProfile | null;
}

export const Users: React.FC<UsersProps> = ({ users, profile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // UI Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Loading & error state
  const [loadingUid, setLoadingUid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDept, setFormDept] = useState('Production');
  const [formRole, setFormRole] = useState<UserRole>('Department User');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  if (!profile) return null;

  // Authorization check - only Super Admin or Admin can view/manage
  const hasManagementAccess = profile.role === 'Super Admin' || profile.role === 'Admin';
  if (!hasManagementAccess) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-center gap-4 text-red-800 dark:text-red-400">
        <AlertCircle className="w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-sm">Access Restricted</h3>
          <p className="text-xs mt-1">You do not have administrative credentials to manage user accounts. Please contact your administrator if you believe this is in error.</p>
        </div>
      </div>
    );
  }

  // Filter lists
  const departments = ['Production', 'Quality Control', 'Warehouse', 'Engineering', 'Assembly'];
  const rolesList: UserRole[] = ['Department User', 'Technician', 'Production Manager', 'Admin', 'Super Admin'];

  // Handle filter & search logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesDept = deptFilter === 'All' || u.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  // Set current page back if out of bounds
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormDept('Production');
    setFormRole('Department User');
    setFormStatus('Active');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormDept(user.department || 'Production');
    setFormRole(user.role);
    setFormStatus(user.status);
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!formEmail || !formPassword || !formName) {
      setErrorMsg('Please fill in Name, Email, and initial Password.');
      setActionLoading(false);
      return;
    }

    if (formPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setActionLoading(false);
      return;
    }

    try {
      await adminCreateUser(
        formEmail,
        formPassword,
        formName,
        formDept,
        formRole,
        formPhone,
        profile.email
      );
      setSuccessMsg(`User ${formName} has been created successfully.`);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        resetForm();
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Build the update payload
      const updates: Partial<UserProfile> = {
        name: formName,
        phone: formPhone,
        department: formDept,
        role: formRole,
        status: formStatus,
      };

      await updateUserProfile(selectedUser.uid, updates, profile.email);
      
      // Notify user of profile update if they are active
      if (formStatus === 'Active') {
        await createNotification(
          selectedUser.uid,
          `Your profile details have been updated by ${profile.name}.`,
          'N/A'
        );
      }

      setSuccessMsg(`User ${formName} updated successfully.`);
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSelectedUser(null);
        resetForm();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    if (!confirm(`Are you sure you want to change status of ${user.name} to ${newStatus}?`)) return;

    setLoadingUid(user.uid);
    try {
      await updateUserProfile(user.uid, { status: newStatus }, profile.email);
      await createNotification(
        user.uid,
        `Your account status has been changed to ${newStatus} by Admin.`,
        'N/A'
      );
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setLoadingUid(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.uid === profile.uid) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Are you sure you want to PERMANENTLY delete user ${user.name}? This action is irreversible.`)) return;

    setLoadingUid(user.uid);
    try {
      await deleteUser(user.uid, profile.email);
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    } finally {
      setLoadingUid(null);
    }
  };

  const handleSendResetEmail = async (user: UserProfile) => {
    if (!confirm(`Send a password reset email to ${user.name} (${user.email})?`)) return;

    setLoadingUid(user.uid);
    try {
      await sendPasswordReset(user.email);
      alert(`Password reset email has been successfully sent to ${user.email}`);
    } catch (err: any) {
      alert('Failed to send reset email: ' + err.message);
    } finally {
      setLoadingUid(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Create User CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Enterprise User Administration</h2>
          <p className="text-xs text-slate-500 mt-1">Manage user profiles, secure credentials, assignments, and authorization levels safely.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Bento Grid Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Search User</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Role Filter</label>
          <div className="relative">
            <Shield className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none transition-all appearance-none"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Roles</option>
              {rolesList.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r}</option>)}
            </select>
          </div>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Department Filter</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none transition-all appearance-none"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Departments</option>
              {departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d}</option>)}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Status Filter</label>
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none transition-all appearance-none"
            >
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
              <option value="Active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Active Only</option>
              <option value="Inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee Name</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email & Phone</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Setting</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {paginatedUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                  {/* Name */}
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">UID: {user.uid.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>

                  {/* Email & Phone */}
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {user.email}
                      </span>
                      {user.phone ? (
                        <span className="text-slate-400 text-[10px] flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {user.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">No phone registered</span>
                      )}
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {user.department || 'N/A'}
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> {user.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-xs">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      disabled={loadingUid === user.uid || user.uid === profile.uid}
                      className="focus:outline-none transition-transform active:scale-95 disabled:opacity-50"
                      title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                    >
                      {user.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-100 dark:border-green-900/20">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                          <UserX className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-xs text-right">
                    {loadingUid === user.uid ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400 inline-block" />
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Password Reset Option */}
                        <button
                          onClick={() => handleSendResetEmail(user)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded border border-slate-100 dark:border-slate-800"
                          title="Send Password Reset Email"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Edit User Button */}
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded border border-slate-100 dark:border-slate-800"
                          title="Edit User Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete User Button */}
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.uid === profile.uid}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded border border-slate-100 dark:border-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Delete user permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination controls */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {Math.min(startIndex + pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-600 dark:text-slate-300">{totalItems}</span> employees
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-200/60 dark:border-slate-800 rounded-lg hover:text-slate-600 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-200/60 dark:border-slate-800 rounded-lg hover:text-slate-600 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE USER OVERLAY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" /> Create New Account
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  FULL NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  EMAIL ADDRESS <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. john@company.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  INITIAL PASSWORD <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Minimum 6 characters"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. +1234567890"
                />
              </div>

              {/* Department & Role Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    DEPARTMENT
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    ASSIGNED ROLE
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {rolesList.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER OVERLAY MODAL */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-500" /> Edit Profile Settings
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Email (Read-only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  EMAIL ADDRESS (UNMODIFIABLE)
                </label>
                <input
                  type="email"
                  disabled
                  value={formEmail}
                  className="w-full px-3 py-2 border border-slate-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 rounded-xl text-xs text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  FULL NAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. +1234567890"
                />
              </div>

              {/* Department & Role Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    DEPARTMENT
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {departments.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    ASSIGNED ROLE
                  </label>
                  {/* Super admin can change role of anyone except themselves */}
                  {profile.role === 'Super Admin' && selectedUser.uid !== profile.uid ? (
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {rolesList.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={formRole}
                      className="w-full px-3 py-2 border border-slate-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 rounded-xl text-xs text-slate-400 cursor-not-allowed outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Status Switch */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  ACCOUNT ACCESS STATUS
                </label>
                <select
                  value={formStatus}
                  disabled={selectedUser.uid === profile.uid}
                  onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="Active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Active (Full Access)</option>
                  <option value="Inactive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Inactive (Access Suspended)</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
