const mongoose = require('mongoose');

const CATEGORIES = ['Billing', 'Technical', 'Account', 'Shipping', 'General', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['New', 'Assigned', 'In Progress', 'Resolved'];

const AISuggestionSchema = new mongoose.Schema(
  {
    category: { type: String, enum: CATEGORIES },
    priority: { type: String, enum: PRIORITIES },
    summary: { type: String },
    raw: { type: String }, // raw AI text response, for audit/debug
    generatedAt: { type: Date },
    failed: { type: Boolean, default: false },
    error: { type: String },
  },
  { _id: false }
);

const TicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    category: { type: String, enum: CATEGORIES, default: 'General' },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    status: { type: String, enum: STATUSES, default: 'New' },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    aiSuggestion: { type: AISuggestionSchema, default: null },
    aiReviewed: { type: Boolean, default: false }, // true once agent confirms/edits AI output
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    resolutionNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },

    reopenCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TicketSchema.index({ subject: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', TicketSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;
