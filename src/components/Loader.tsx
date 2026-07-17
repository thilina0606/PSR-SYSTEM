import React from 'react';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ fullPage = false, message = 'Loading...' }) => {
  if (fullPage) {
    return (
      <div id="loadingOverlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
          <div className="absolute w-8 h-8 rounded-full border-4 border-slate-700 border-b-indigo-400 animate-spin animate-reverse"></div>
        </div>
        <p className="mt-4 font-medium text-slate-200 text-sm tracking-wider uppercase animate-pulse">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-blue-500 animate-spin"></div>
      {message && <p className="mt-2 text-xs font-medium tracking-wide">{message}</p>}
    </div>
  );
};

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
        </td>
      ))}
    </tr>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-3">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-2/3"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="flex-1 h-44 bg-slate-100 dark:bg-slate-700/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
