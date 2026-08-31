import React from 'react';

export default function LoadingSpinner({ full, label = 'Loading…' }) {
  return (
    <div className={full ? 'min-h-screen flex items-center justify-center' : 'flex items-center justify-center py-10'}>
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
