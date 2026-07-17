import React, { useState, useEffect } from 'react';
import { Department, Machine, UserProfile } from '../types';
import {
  getDepartments,
  getMachines,
  addDepartment,
  deleteDepartment,
  addMachine,
  deleteMachine
} from '../services/db';
import { Plus, Trash2, Building, Cpu, RefreshCw, Layers } from 'lucide-react';

interface DepartmentsProps {
  profile: UserProfile | null;
}

export const Departments: React.FC<DepartmentsProps> = ({ profile }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);

  // New Dept Form
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // New Machine Form
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineCode, setNewMachineCode] = useState('');
  const [newMachineDept, setNewMachineDept] = useState('');
  const [newMachineStatus, setNewMachineStatus] = useState<'Active' | 'Maintenance' | 'Inactive'>('Active');

  const refreshData = async () => {
    setLoading(true);
    try {
      const d = await getDepartments();
      const m = await getMachines();
      setDepartments(d);
      setMachines(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!profile) return null;

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    setLoading(true);
    try {
      await addDepartment({ name: newDeptName, code: newDeptCode.toUpperCase() }, profile.email);
      setNewDeptName('');
      setNewDeptCode('');
      await refreshData();
      alert('Department added successfully!');
    } catch (err: any) {
      alert('Failed to add department: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete department ${name}?`)) return;
    setLoading(true);
    try {
      await deleteDepartment(id, name, profile.email);
      await refreshData();
      alert('Department deleted.');
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName || !newMachineCode || !newMachineDept) {
      alert('Please fill in all machine fields.');
      return;
    }
    setLoading(true);
    try {
      await addMachine({
        name: newMachineName,
        code: newMachineCode.toUpperCase(),
        department: newMachineDept,
        status: newMachineStatus
      }, profile.email);
      setNewMachineName('');
      setNewMachineCode('');
      await refreshData();
      alert('Machine added successfully!');
    } catch (err: any) {
      alert('Failed to add machine: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMachine = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete machine ${name}?`)) return;
    setLoading(true);
    try {
      await deleteMachine(id, name, profile.email);
      await refreshData();
      alert('Machine deleted.');
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Assets & Department Directories</h2>
          <p className="text-xs text-slate-500 mt-1">Configure physical production departments and manufacturing assets or machines.</p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ================= DEPARTMENTS MANAGEMENT ================= */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-4.5 h-4.5 text-blue-500" /> Create Department
            </h3>
            <form onSubmit={handleAddDept} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Department Name (e.g. Quality Control)"
                  className="w-full text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="Code (e.g. QC)"
                  className="w-full text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                />
              </div>
              <div className="sm:col-span-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Department
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Active Departments ({departments.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/20">
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dept Code</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-4 text-xs font-bold text-blue-600 dark:text-blue-400">{dept.code}</td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">{dept.name}</td>
                      <td className="py-3 px-4 text-xs text-right">
                        <button
                          onClick={() => handleDeleteDept(dept.id!, dept.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= MACHINES/ASSETS MANAGEMENT ================= */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4.5 h-4.5 text-blue-500" /> Register Machine Asset
            </h3>
            <form onSubmit={handleAddMachine} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input
                    type="text"
                    required
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    placeholder="Machine Name (e.g. CNC Lathe L1)"
                    className="w-full text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={newMachineCode}
                    onChange={(e) => setNewMachineCode(e.target.value)}
                    placeholder="Asset Code (e.g. CNC-L1)"
                    className="w-full text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <select
                    value={newMachineDept}
                    required
                    onChange={(e) => setNewMachineDept(e.target.value)}
                    className="w-full text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select Dept...</option>
                    {departments.map(d => <option key={d.id} value={d.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Machine Asset
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Active Machine Assets ({machines.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/20">
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset No</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machine Name</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {machines.map(mach => (
                    <tr key={mach.id} className="hover:bg-slate-50/20">
                      <td className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-white">{mach.code}</td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">{mach.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-medium">{mach.department}</td>
                      <td className="py-3 px-4 text-xs text-right">
                        <button
                          onClick={() => handleDeleteMachine(mach.id!, mach.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
