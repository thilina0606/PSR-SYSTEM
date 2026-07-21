import React, { useState, useEffect } from 'react';
import { Check, Paperclip, X } from 'lucide-react';
import { ServiceRequest, UserProfile } from '../types';
import { submitRequest, getDepartments, getMachines } from '../services/db';

interface CreateRequestProps {
  profile: UserProfile | null;
  onSuccess?: () => void;
}

export const CreateRequest: React.FC<CreateRequestProps> = ({ profile, onSuccess }) => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [machines, setMachines] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form State
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

  useEffect(() => {
    async function loadAuxData() {
      try {
        const depts = await getDepartments();
        setDepartments(depts.map(d => d.name));

        const machs = await getMachines();
        setMachines(machs.map(m => m.name));
      } catch (err) {
        console.error('Error loading aux data:', err);
      }
    }
    loadAuxData();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        requester: profile.name,
        contact: profile.phone || '',
        department: profile.department || '',
      }));
    }
  }, [profile]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (profile.role?.toLowerCase() !== 'user') {
      setFormError('Only users with the role "User" are authorized to create service requests.');
      return;
    }

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

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="p-6 text-center text-slate-500">
        Please sign in to submit a service request.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs">
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
          {/* Service Required / Title */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Service Required / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value, title: e.target.value })}
              className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
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
              className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-sans"
              placeholder="Provide a comprehensive and actionable description..."
            />
          </div>

          {/* Equipment Needed */}
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
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
          >
            Submit Service Request
          </button>
        </div>
      </form>
    </div>
  );
};
