import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import TicketCard from '../components/TicketCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import StatsBar from '../components/StatsBar.jsx';

// Optional supervisor view: all tickets + desk-wide statistics.
export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [ticketsRes, statsRes] = await Promise.all([
          api.get('/api/tickets'),
          api.get('/api/stats'),
        ]);
        setTickets(ticketsRes.data.tickets);
        setStats(statsRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner full />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Admin overview</h1>
      <p className="text-sm text-slate-500 mb-6">All tickets across the support desk</p>

      {stats && <StatsBar stats={stats} />}

      <div className="grid sm:grid-cols-2 gap-3">
        {tickets.map((t) => (
          <TicketCard key={t._id} ticket={t} />
        ))}
      </div>
    </div>
  );
}
