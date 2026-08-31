import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import TicketCard from '../components/TicketCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatsBar from '../components/StatsBar.jsx';

export default function CustomerDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/api/tickets'),
        api.get('/api/stats'),
      ]);
      setTickets(ticketsRes.data.tickets);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load your tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">My tickets</h1>
          <p className="text-sm text-slate-500">Track the status of your support requests</p>
        </div>
        <Link
          to="/tickets/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700"
        >
          + New ticket
        </Link>
      </div>

      {stats && <StatsBar stats={stats} />}

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>You haven't submitted any tickets yet.</p>
        </div>
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
