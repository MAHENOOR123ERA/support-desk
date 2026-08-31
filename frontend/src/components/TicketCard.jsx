import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge, CategoryBadge } from './Badges.jsx';

export default function TicketCard({ ticket }) {
  return (
    <Link
      to={`/tickets/${ticket._id}`}
      className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-mono">{ticket.ticketNumber}</p>
          <h3 className="font-medium text-slate-900 truncate">{ticket.subject}</h3>
          <p className="text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <CategoryBadge category={ticket.category} />
        <span>
          {ticket.agent ? `Agent: ${ticket.agent.name || ticket.agent.email}` : 'Unassigned'}
        </span>
      </div>
    </Link>
  );
}
