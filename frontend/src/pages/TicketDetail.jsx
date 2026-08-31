import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getSocket } from '../socket';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges.jsx';
import AISuggestionCard from '../components/AISuggestionCard.jsx';
import MessageThread from '../components/MessageThread.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [savingTriage, setSavingTriage] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const socketRef = useRef(null);
  const typingTimeout = useRef(null);

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get(`/api/tickets/${id}`);
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: join the ticket room, listen for new messages / status changes / typing.
  useEffect(() => {
    let socket;
    let active = true;
    (async () => {
      socket = await getSocket();
      if (!active) return;
      socketRef.current = socket;
      socket.emit('ticket:join', id);

      socket.on('message:new', ({ ticketId, message }) => {
        if (ticketId !== id) return;
        setMessages((prev) => [...prev, message]);
        setPeerTyping(false);
      });

      socket.on('ticket:updated', ({ ticket: updated }) => {
        if (updated._id !== id) return;
        setTicket(updated);
      });

      socket.on('ticket:typing', ({ userId, isTyping }) => {
        if (profile && userId === profile._id) return;
        setPeerTyping(isTyping);
      });
    })();

    return () => {
      active = false;
      if (socket) {
        socket.emit('ticket:leave', id);
        socket.off('message:new');
        socket.off('ticket:updated');
        socket.off('ticket:typing');
      }
    };
  }, [id, profile]);

  const handleTyping = () => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('ticket:typing', { ticketId: id, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('ticket:typing', { ticketId: id, isTyping: false });
    }, 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/tickets/${id}/messages`, { text });
      setText('');
    } catch (err) {
      flashToast(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClaim = async () => {
    setAssigning(true);
    try {
      const { data } = await api.patch(`/api/tickets/${id}/assign`);
      setTicket(data.ticket);
      flashToast('Ticket claimed');
    } catch (err) {
      flashToast(err.response?.data?.message || 'Failed to claim ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleTriageSave = async (payload) => {
    setSavingTriage(true);
    try {
      const { data } = await api.patch(`/api/tickets/${id}/ai-review`, payload);
      setTicket(data.ticket);
      flashToast('Triage finalized');
    } catch (err) {
      flashToast(err.response?.data?.message || 'Failed to save triage');
    } finally {
      setSavingTriage(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNote.trim()) return;
    setResolving(true);
    try {
      const { data } = await api.patch(`/api/tickets/${id}/status`, {
        status: 'Resolved',
        resolutionNote,
      });
      setTicket(data.ticket);
      setResolutionNote('');
      flashToast('Ticket resolved');
      load();
    } catch (err) {
      flashToast(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setResolving(false);
    }
  };

  const handleReopen = async () => {
    try {
      const { data } = await api.patch(`/api/tickets/${id}/reopen`);
      setTicket(data.ticket);
      flashToast('Ticket reopened');
      load();
    } catch (err) {
      flashToast(err.response?.data?.message || 'Failed to reopen ticket');
    }
  };

  if (loading) return <LoadingSpinner full />;
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-4">{error}</div>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-brand-600">← Go back</button>
      </div>
    );
  }
  if (!ticket) return null;

  const isAgentView = role === 'agent' || role === 'admin';
  const isAssignedAgent = ticket.agent && profile && String(ticket.agent._id) === String(profile._id);
  const canReply = ticket.status !== 'Resolved' && (role === 'customer' || isAssignedAgent || role === 'admin');
  const canResolve = isAgentView && ticket.status !== 'Resolved' && (isAssignedAgent || role === 'admin');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white text-sm px-4 py-2 rounded-md shadow-lg z-50">
          {toast}
        </div>
      )}

      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 mb-4">← Back</button>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400 font-mono">{ticket.ticketNumber}</p>
            <h1 className="text-lg font-semibold">{ticket.subject}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-3">{ticket.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <CategoryBadge category={ticket.category} />
          <span className="text-xs text-slate-400">
            Customer: {ticket.customer?.name || ticket.customer?.email}
          </span>
          <span className="text-xs text-slate-400">
            · Agent: {ticket.agent ? (ticket.agent.name || ticket.agent.email) : 'Unassigned'}
          </span>
        </div>

        {isAgentView && !ticket.agent && ticket.status !== 'Resolved' && (
          <button
            onClick={handleClaim}
            disabled={assigning}
            className="mt-4 bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {assigning ? 'Claiming…' : 'Claim this ticket'}
          </button>
        )}

        {isAgentView && ticket.status === 'Resolved' && (
          <button
            onClick={handleReopen}
            className="mt-4 border border-slate-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            Reopen ticket
          </button>
        )}
      </div>

      {ticket.aiSuggestion && (
        <div className="mb-5">
          <AISuggestionCard
            ticket={ticket}
            editable={isAgentView && isAssignedAgent && ticket.status !== 'Resolved'}
            onSave={handleTriageSave}
            saving={savingTriage}
          />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-medium mb-3">Conversation</h2>
        <MessageThread
          messages={messages}
          currentUserId={profile?._id}
          typingLabel={peerTyping ? 'The other party is typing…' : ''}
        />

        {canReply ? (
          <form onSubmit={handleSend} className="mt-4 flex gap-2">
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        ) : (
          <p className="text-xs text-slate-400 mt-4">
            {ticket.status === 'Resolved'
              ? 'This ticket is resolved. Reopen it to continue the conversation.'
              : 'Only the customer and assigned agent can reply.'}
          </p>
        )}

        {canResolve && (
          <form onSubmit={handleResolve} className="mt-6 border-t border-slate-100 pt-4">
            <label className="text-sm font-medium text-slate-600">Resolution note (required to resolve)</label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Summarize how this issue was resolved…"
            />
            <button
              type="submit"
              disabled={resolving || !resolutionNote.trim()}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {resolving ? 'Resolving…' : 'Mark as resolved'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
