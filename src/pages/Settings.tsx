import React, { useState, useEffect } from 'react';
import { SystemSettings, UserProfile } from '../types';
import { getSystemSettings, updateSystemSettings } from '../services/db';
import { Save, ToggleLeft, ToggleRight, Loader } from 'lucide-react';

interface SettingsProps {
  profile: UserProfile | null;
}

export const Settings: React.FC<SettingsProps> = ({ profile }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const data = await getSystemSettings();
      setSettings(data);
    }
    loadSettings();
  }, []);

  if (!profile || !settings) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      await updateSystemSettings(settings, profile.email);
      setSuccessMsg('Configurations saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xs">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global Application Settings</h2>
        <p className="text-xs text-slate-500 mt-1">Configure global authorization parameters and pipeline constraints.</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* App Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              System Display Name
            </label>
            <input
              type="text"
              required
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              required
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>

          {/* Maintenance Email */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              System Notification / Maintenance Contact Email
            </label>
            <input
              type="email"
              required
              value={settings.maintenanceEmail}
              onChange={(e) => setSettings({ ...settings, maintenanceEmail: e.target.value })}
              className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
          </div>

          {/* Toggle 1: Self Registration */}
          <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800/80 pt-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow Self-Registration</h4>
              <p className="text-[10px] text-slate-400">Let employees register their own accounts prior to admin approval.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, allowSelfRegistration: !settings.allowSelfRegistration })}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 focus:outline-none"
            >
              {settings.allowSelfRegistration ? (
                <ToggleRight className="w-10 h-10 text-blue-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              )}
            </button>
          </div>

          {/* Toggle 2: Require HOD Approval */}
          <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800/80 pt-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Mandate HOD Approvals</h4>
              <p className="text-[10px] text-slate-400">Require direct supervisor (HOD) approval before routing requests to production queues.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, requireHODApproval: !settings.requireHODApproval })}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 focus:outline-none"
            >
              {settings.requireHODApproval ? (
                <ToggleRight className="w-10 h-10 text-blue-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
