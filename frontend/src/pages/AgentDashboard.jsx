import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getSocket } from '../socket';
import TicketCard from '../components/TicketCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatsBar from '../components/StatsBar.jsx';
import { STATUSES, PRIORITIES } from '../constants.js';

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', mine: false });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.mine) params.mine = 'true';
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/api/tickets', { params }),
        api.get('/api/stats'),
      ]);
      setTickets(ticketsRes.data.tickets);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: new tickets and updates refresh the list live.
  useEffect(() => {
    let socket;
    (async () => {
      socket = await getSocket();
      const refresh = () => load();
      socket.on('ticket:new', refresh);
      socket.on('ticket:updated', refresh);
    })();
    return () => {
      if (socket) {
        socket.off('ticket:new');
        socket.off('ticket:updated');
      }
    };
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Agent dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Unassigned tickets and tickets assigned to you, live-updated.</p>

      {stats && <StatsBar stats={stats} />}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => setFilters((f) => ({ ...f, mine: !f.mine }))}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            filters.mine ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
          }`}
        >
          My tickets only
        </button>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No tickets match these filters.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}
