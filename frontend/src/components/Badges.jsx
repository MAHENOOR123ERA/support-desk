import React from 'react';

const STATUS_STYLES = {
  New: 'bg-slate-100 text-slate-700',
  Assigned: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-green-100 text-green-700',
};

const PRIORITY_STYLES = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority] || 'bg-slate-100 text-slate-700'}`}>
      {priority}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
      {category}
    </span>
  );
}
