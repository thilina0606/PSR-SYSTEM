import React, { useState } from 'react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../services/db';
import { User, Phone, Building, Save, Mail, Shield, RefreshCw } from 'lucide-react';

interface ProfileProps {
  profile: UserProfile | null;
  onRefreshProfile: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ profile, onRefreshProfile }) => {
  const [phone, setPhone] = useState(profile?.phone || '');
  const [department, setDepartment] = useState(profile?.department || 'Production');
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await updateUserProfile(profile.uid, {
        name,
        phone,
        department
      });
      onRefreshProfile();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs">
      <div className="mb-6 text-center sm:text-left">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">My Account Directory Profile</h2>
        <p className="text-xs text-slate-500 mt-1">Configure your contact coordinates and active plant location settings.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Email - Readonly */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Email Address (Readonly)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              readOnly
              value={profile.email}
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Phone Contact */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Phone / Extension Coordinates
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. Ext 240 / +12345"
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Department Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Primary Facility Department
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building className="w-4 h-4" />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white outline-none appearance-none"
            >
              <option value="Production" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Production</option>
              <option value="Quality Control" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Quality Control</option>
              <option value="Warehouse" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Warehouse</option>
              <option value="Engineering" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Engineering</option>
              <option value="Assembly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Assembly</option>
            </select>
          </div>
        </div>

        {/* Role setting info */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
            Authorized System Role: <span className="text-blue-600 dark:text-blue-400">{profile.role}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save My Profile
          </button>
        </div>
      </form>
    </div>
  );
};
