import React from 'react';

export default function StatsBar({ stats }) {
  const items = [
    { label: 'Total tickets', value: stats.total },
    { label: 'New', value: stats.byStatus?.New || 0 },
    { label: 'In Progress', value: stats.byStatus?.['In Progress'] || 0 },
    { label: 'Resolved', value: stats.byStatus?.Resolved || 0 },
    { label: 'Avg. resolution (hrs)', value: stats.avgResolutionHours || 0 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {items.map((it) => (
        <div key={it.label} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-semibold text-brand-700">{it.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
