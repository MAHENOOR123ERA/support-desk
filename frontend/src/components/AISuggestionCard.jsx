import React, { useState, useEffect } from 'react';
import { CATEGORIES, PRIORITIES } from '../constants.js';

// Shows the raw AI triage result and lets an agent review/edit it before
// it's finalized and saved to the ticket. Handles the AI-failure case too.
export default function AISuggestionCard({ ticket, editable, onSave, saving }) {
  const suggestion = ticket.aiSuggestion;
  const [category, setCategory] = useState(suggestion?.category || ticket.category);
  const [priority, setPriority] = useState(suggestion?.priority || ticket.priority);
  const [summary, setSummary] = useState(suggestion?.summary || '');

  useEffect(() => {
    setCategory(ticket.aiSuggestion?.category || ticket.category);
    setPriority(ticket.aiSuggestion?.priority || ticket.priority);
    setSummary(ticket.aiSuggestion?.summary || '');
  }, [ticket._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!suggestion) return null;

  const aiFailed = suggestion.failed;

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <h4 className="font-medium text-brand-800">AI Triage Suggestion</h4>
        {ticket.aiReviewed && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Reviewed & finalized
          </span>
        )}
      </div>

      {aiFailed ? (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          ⚠️ AI triage failed: {suggestion.error || 'Unknown error.'} Please set category, priority and
          summary manually below.
        </div>
      ) : (
        <p className="text-sm text-slate-500 mb-3">
          Generated automatically from the ticket description. Review and adjust before finalizing.
        </p>
      )}

      {editable ? (
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs font-medium text-slate-500">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Priority</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-500">Summary</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short summary for the team..."
            />
          </div>
          <div className="sm:col-span-2">
            <button
              disabled={saving || !summary.trim()}
              onClick={() => onSave({ category, priority, summary })}
              className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : ticket.aiReviewed ? 'Update triage' : 'Confirm & finalize triage'}
            </button>
          </div>
        </div>
      ) : (
        !aiFailed && (
          <div className="text-sm text-slate-700 space-y-1">
            <p><span className="font-medium">Category:</span> {suggestion.category}</p>
            <p><span className="font-medium">Priority:</span> {suggestion.priority}</p>
            <p><span className="font-medium">Summary:</span> {summary}</p>
          </div>
        )
      )}
    </div>
  );
}
