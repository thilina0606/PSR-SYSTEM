import React, { useState } from 'react';
import { loginUser, sendPasswordReset } from '../services/auth';
import { Wrench, Shield, Mail, Lock, Check, RefreshCw, KeyRound } from 'lucide-react';

interface LoginProps {
  onAuthSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        if (!email) {
          throw new Error('Please enter your email address first.');
        }
        await sendPasswordReset(email);
        setSuccess('Password reset link sent! Check your inbox.');
        setIsForgotPassword(false);
      } else {
        if (!email || !password) {
          throw new Error('Please enter your email and password.');
        }
        await loginUser(email, password);
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {/* Logo Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/15 mb-4">
          <Wrench className="w-7 h-7 text-white" />
        </div>
        
        {/* App Branding */}
        <h2 className="text-center text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          PSR SYSTEM
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400 max-w-sm uppercase tracking-widest font-semibold">
          Production Service Request System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-800/60">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            {isForgotPassword ? 'Reset Password' : 'Sign In'}
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium leading-relaxed">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-400 text-xs rounded-xl font-medium leading-relaxed">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password (Hide for Forgot Password Mode) */}
            {!isForgotPassword && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password Links */}
            {!isForgotPassword && (
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Remember me
                  </label>
                </div>

                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isForgotPassword ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Send Reset Link
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Mode Toggles */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs">
            {isForgotPassword && (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
