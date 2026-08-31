import React from 'react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MessageThread({ messages, currentUserId, typingLabel }) {
  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">No messages yet.</p>
      )}
      {messages.map((m) => {
        const mine = m.sender?._id === currentUserId;
        return (
          <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.isResolutionNote
                  ? 'bg-green-50 border border-green-200 text-green-900'
                  : mine
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
                <span className="font-medium capitalize">
                  {m.isResolutionNote ? '✅ Resolution note' : `${m.senderRole}`}
                  {m.sender?.name ? ` · ${m.sender.name}` : ''}
                </span>
                <span>{formatTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        );
      })}
      {typingLabel && (
        <p className="text-xs text-slate-400 italic">{typingLabel}</p>
      )}
    </div>
  );
}
