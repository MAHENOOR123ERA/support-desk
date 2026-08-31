import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CATEGORIES } from '../constants.js';

export default function NewTicket() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/tickets', { subject, description, category: category || undefined });
      navigate(`/tickets/${data.ticket._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Submit a new ticket</h1>
      <p className="text-sm text-slate-500 mb-6">
        Describe your issue and our AI assistant will suggest a category and priority for our team.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600">Subject</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Short summary of your issue"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Description</label>
          <textarea
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. I was charged twice for the same order and need one payment refunded."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Category (optional)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Let AI decide</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Submitting & running AI triage…' : 'Submit ticket'}
        </button>
      </form>
    </div>
  );
}
